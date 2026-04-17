// Shared HMAC helpers used by start-game and submit-score.
// Signs a compact `${payloadB64}.${sigB64}` token with HMAC-SHA256 over SESSION_SECRET.

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
    let s = btoa(String.fromCharCode(...bytes));
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
    );
}

export interface SessionPayload {
    sid: string;
    issued_at: number; // ms since epoch
}

export async function signToken(payload: SessionPayload, secret: string): Promise<string> {
    const key = await importKey(secret);
    const payloadBytes = encoder.encode(JSON.stringify(payload));
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, payloadBytes));
    return `${b64url(payloadBytes)}.${b64url(sig)}`;
}

export async function verifyToken(token: string, secret: string): Promise<SessionPayload | null> {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    let payloadBytes: Uint8Array;
    let sigBytes: Uint8Array;
    try {
        payloadBytes = b64urlDecode(payloadB64);
        sigBytes = b64urlDecode(sigB64);
    } catch {
        return null;
    }
    const key = await importKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes);
    if (!ok) return null;
    try {
        const parsed = JSON.parse(new TextDecoder().decode(payloadBytes));
        if (typeof parsed?.sid !== 'string' || typeof parsed?.issued_at !== 'number') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function randomSid(): string {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    return b64url(buf);
}
