// submit-score edge function: validates a signed session token and a plausible
// score before inserting into anonymous_scores via the service_role client.
// Runs checks in order of cost: cheap (origin, shape, signature, freshness,
// plausibility, captcha) before database writes (one-shot session, rate limit,
// insert).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { verifyToken } from '../_shared/hmac.ts';
import { allowedOriginFor } from '../_shared/origin.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';

const SESSION_SECRET   = Deno.env.get('SESSION_SECRET');
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET');

// Freshness window — a game must run at least 15s and at most 2h before submit.
const MIN_GAME_MS = 15_000;
const MAX_GAME_MS = 2 * 60 * 60 * 1000;

// Plausibility bounds derived from in-game scoring:
// per-level ceiling ≈ 240 dots × 10 + 4 big × 50 + 4 big × (200+400+800+1600) + 5000 fruit
// → ~20k. Cap at 25k for headroom.
const MAX_PER_LEVEL = 25_000;
// Advancing past level N requires clearing all dots (≈2500 pts). Lower bound 1500
// per cleared level rejects obvious level-inflated submissions.
const MIN_PER_LEVEL = 1_500;

const MAX_LEVEL = 256;

// Rate limit: 20 submit attempts per IP per hour.
const RATE_LIMIT_COUNT = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function sanitizeName(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.replace(/[\x00-\x1f\x7f]/g, '').trim();
    if (cleaned.length < 1 || cleaned.length > 16) return null;
    return cleaned;
}

async function hashIp(ip: string): Promise<string> {
    const data = new TextEncoder().encode(ip + '|' + (SESSION_SECRET ?? ''));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

Deno.serve(async (req: Request) => {
    const origin = allowedOriginFor(req);

    const pre = handleCorsPreflight(req, origin);
    if (pre) return pre;

    if (!origin) return jsonResponse({ error: 'forbidden_origin' }, 403, null);
    if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, origin);
    if (!SESSION_SECRET || !SUPABASE_URL || !SERVICE_KEY) {
        return jsonResponse({ error: 'server_misconfigured' }, 500, origin);
    }

    let body: {
        token?:          unknown;
        displayName?:    unknown;
        score?:          unknown;
        level?:          unknown;
        turnstileToken?: unknown;
    };
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: 'invalid_json' }, 400, origin);
    }

    if (typeof body.token !== 'string') return jsonResponse({ error: 'missing_token' }, 401, origin);

    const displayName = sanitizeName(body.displayName);
    if (!displayName) return jsonResponse({ error: 'invalid_name' }, 422, origin);

    const score = Number(body.score);
    const level = Number(body.level);
    if (!Number.isInteger(score) || score < 0) return jsonResponse({ error: 'invalid_score' }, 422, origin);
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
        return jsonResponse({ error: 'invalid_level' }, 422, origin);
    }

    const payload = await verifyToken(body.token, SESSION_SECRET);
    if (!payload) return jsonResponse({ error: 'bad_signature' }, 401, origin);

    const elapsed = Date.now() - payload.issued_at;
    if (elapsed < MIN_GAME_MS) return jsonResponse({ error: 'too_soon' }, 401, origin);
    if (elapsed > MAX_GAME_MS) return jsonResponse({ error: 'token_expired' }, 401, origin);

    // Plausibility: score must fit within per-level bounds.
    if (score > level * MAX_PER_LEVEL) return jsonResponse({ error: 'score_too_high' }, 422, origin);
    if (level > 1 && score < (level - 1) * MIN_PER_LEVEL) {
        return jsonResponse({ error: 'score_too_low_for_level' }, 422, origin);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    // Captcha — only enforced when TURNSTILE_SECRET is configured, so local
    // dev without the secret still works. Verified before DB writes so a bad
    // token never consumes a session row.
    if (TURNSTILE_SECRET) {
        if (typeof body.turnstileToken !== 'string' || !body.turnstileToken) {
            return jsonResponse({ error: 'missing_captcha' }, 401, origin);
        }
        const captchaOk = await verifyTurnstile(body.turnstileToken, TURNSTILE_SECRET, ip);
        if (!captchaOk) return jsonResponse({ error: 'captcha_failed' }, 401, origin);
    }

    const db = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false },
    });

    // One-shot session: unique constraint on sid. Second use fails.
    const usedInsert = await db.from('used_sessions').insert({ sid: payload.sid });
    if (usedInsert.error) {
        if (usedInsert.error.code === '23505') {
            return jsonResponse({ error: 'session_reused' }, 409, origin);
        }
        return jsonResponse({ error: 'db_error' }, 500, origin);
    }

    // Per-IP rate limit, 1h rolling window.
    const ipHash = await hashIp(ip);
    const rate = await db
        .from('submit_rate')
        .select('ip_hash, window_start, count')
        .eq('ip_hash', ipHash)
        .maybeSingle();
    if (rate.error && rate.error.code !== 'PGRST116') {
        return jsonResponse({ error: 'db_error' }, 500, origin);
    }
    const now = Date.now();
    const row = rate.data;
    if (!row) {
        await db.from('submit_rate').insert({
            ip_hash:      ipHash,
            window_start: new Date(now).toISOString(),
            count:        1,
        });
    } else {
        const windowStart = new Date(row.window_start).getTime();
        if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
            await db.from('submit_rate').update({
                window_start: new Date(now).toISOString(),
                count:        1,
            }).eq('ip_hash', ipHash);
        } else if (row.count >= RATE_LIMIT_COUNT) {
            return jsonResponse({ error: 'rate_limited' }, 429, origin);
        } else {
            await db.from('submit_rate').update({ count: row.count + 1 }).eq('ip_hash', ipHash);
        }
    }

    const insert = await db.from('anonymous_scores').insert({
        display_name: displayName,
        score,
        level,
    });
    if (insert.error) return jsonResponse({ error: 'db_error' }, 500, origin);

    return jsonResponse({ ok: true }, 200, origin);
});
