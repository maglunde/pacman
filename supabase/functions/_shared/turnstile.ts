// Cloudflare Turnstile server-side verification. Returns true only when the
// remote API confirms the token is valid for TURNSTILE_SECRET. Network or API
// errors return false so a broken captcha can never silently allow a submit.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(
    token: string,
    secret: string,
    remoteIp?: string,
): Promise<boolean> {
    if (!token || !secret) return false;

    const form = new FormData();
    form.append('secret', secret);
    form.append('response', token);
    if (remoteIp && remoteIp !== 'unknown') form.append('remoteip', remoteIp);

    try {
        const res = await fetch(VERIFY_URL, { method: 'POST', body: form });
        if (!res.ok) return false;
        const data = await res.json() as { success?: boolean };
        return Boolean(data?.success);
    } catch {
        return false;
    }
}
