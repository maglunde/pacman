// CORS helpers. Access-Control-Allow-Origin reflects the matched origin
// returned by allowedOriginFor — never a wildcard. When the origin is not on
// the allowlist the response omits the ACAO header, which makes the browser
// drop the response and prevents leaking data to unauthorised pages.

const BASE_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary':                         'Origin',
};

export function corsHeadersFor(allowedOrigin: string | null): Record<string, string> {
    if (!allowedOrigin) return { ...BASE_HEADERS };
    return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': allowedOrigin };
}

export function jsonResponse(
    body: unknown,
    status = 200,
    allowedOrigin: string | null = null,
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeadersFor(allowedOrigin), 'content-type': 'application/json' },
    });
}

export function handleCorsPreflight(req: Request, allowedOrigin: string | null): Response | null {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeadersFor(allowedOrigin) });
    }
    return null;
}
