// start-game edge function: issues an HMAC-signed session token to the client.
// The token proves to submit-score that the session was started server-side and
// locks in the start time so freshness checks can reject instant or stale submits.

import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { randomSid, signToken } from '../_shared/hmac.ts';

const SESSION_SECRET = Deno.env.get('SESSION_SECRET');

Deno.serve(async (req: Request) => {
    const pre = handleCorsPreflight(req);
    if (pre) return pre;

    if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);
    if (!SESSION_SECRET) return jsonResponse({ error: 'server_misconfigured' }, 500);

    const sid = randomSid();
    const issued_at = Date.now();
    const token = await signToken({ sid, issued_at }, SESSION_SECRET);

    return jsonResponse({ token, sid, issued_at });
});
