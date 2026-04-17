// Origin allowlist for score-submit edge functions. Keeps casual abuse (browser
// consoles on other pages, random bots hitting the URL) away from the write
// path. An attacker can still spoof the Origin header with curl — this is a
// first-layer gate, not a full defence.

const DEFAULT_ALLOWED = [
    'https://maglunde.github.io',
    'http://localhost:9001',
].join(',');

function allowedSet(): Set<string> {
    const raw = Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED;
    return new Set(
        raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
    );
}

// Returns the exact Origin header when it is in the allowlist, null otherwise.
// The return value is fed into CORS headers so the response reflects the
// matched origin instead of the wildcard.
export function allowedOriginFor(req: Request): string | null {
    const origin = req.headers.get('Origin');
    if (!origin) return null;
    return allowedSet().has(origin) ? origin : null;
}
