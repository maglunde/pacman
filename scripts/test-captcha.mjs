// Probe the submit-score edge function to verify Turnstile + origin enforcement.
//
// Runs three scenarios. Each scenario starts a fresh session (so each run uses
// ~3 session rows and ~3 rate-limit increments; don't spam this).
//
//   1. no turnstileToken at all            → expect: "missing_captcha"
//   2. bogus turnstileToken                → expect: "captcha_failed"
//   3. missing Origin                      → expect: "forbidden_origin"
//
// Usage:
//   node scripts/test-captcha.mjs
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/test-captcha.mjs

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fxkdmkwnyesjtmwopmkj.supabase.co';
const ANON_KEY     = process.env.SUPABASE_ANON_KEY || '';
const ORIGIN       = 'https://maglunde.github.io';
const WAIT_MS      = 15_000;

if (!ANON_KEY || !ANON_KEY.startsWith('eyJ')) {
	console.error([
		'SUPABASE_ANON_KEY missing or not a JWT.',
		'The Supabase gateway requires the legacy JWT anon key (starts with "eyJ"),',
		'not the newer "sb_publishable_..." key — the latter fails with',
		'UNAUTHORIZED_INVALID_JWT_FORMAT at the gateway before reaching the edge function.',
		'',
		'Get it from: Supabase Dashboard → Settings → API → Project API keys → anon public (JWT).',
		'',
		'Then run:',
		'  SUPABASE_ANON_KEY="eyJ..." node scripts/test-captcha.mjs',
	].join('\n'));
	process.exit(1);
}

async function postJson(url, { headers, body }) {
	const res = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});
	let data = null;
	try { data = await res.json(); } catch { /* ignore */ }
	return { status: res.status, ok: res.ok, data };
}

function sleep(ms) {
	return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function submitFake({ origin, turnstileToken }) {
	const headers = {
		apikey:         ANON_KEY,
		Authorization:  'Bearer ' + ANON_KEY,
		'Content-Type': 'application/json',
	};
	if (origin) headers.Origin = origin;

	const start = await postJson(SUPABASE_URL + '/functions/v1/start-game', { headers, body: {} });
	if (!start.data?.token) {
		return { stage: 'start-game', status: start.status, error: start.data?.error || 'no_token' };
	}

	await sleep(WAIT_MS);

	const body = {
		displayName: 'CAPTCHA_TEST',
		score:       2000,
		level:       1,
		token:       start.data.token,
	};
	if (turnstileToken) body.turnstileToken = turnstileToken;

	const submit = await postJson(SUPABASE_URL + '/functions/v1/submit-score', { headers, body });
	return { stage: 'submit-score', status: submit.status, error: submit.data?.error || null, data: submit.data };
}

async function run(label, overrides) {
	process.stdout.write(label.padEnd(34, ' ') + ' → ');
	try {
		const res = await submitFake(overrides);
		if (res.error) console.log('REJECTED at ' + res.stage + ': ' + res.error + ' (HTTP ' + res.status + ')');
		else console.log('ACCEPTED (HTTP ' + res.status + ')', res.data);
	} catch (err) {
		console.log('ERROR:', err.message);
	}
}

console.log('Target:', SUPABASE_URL);
console.log('(each scenario starts a new session and waits 15s)\n');

await run('1. missing turnstileToken', { origin: ORIGIN });
await run('2. bogus turnstileToken',   { origin: ORIGIN, turnstileToken: 'fake-cf-token-xxxxxxxxxxxx' });
await run('3. missing Origin header',  {});

console.log('\nExpected when Turnstile + origin gate are enforced:');
console.log('  1 → missing_captcha');
console.log('  2 → captcha_failed');
console.log('  3 → forbidden_origin');
