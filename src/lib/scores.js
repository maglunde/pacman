import { getSupabase } from './supabase.js';
import { getPacmanTestMocks } from './test-mode.js';
import { getTurnstileToken, turnstileEnabled } from './turnstile.js';

const LEADERBOARD_LIMIT = 100;

// Called when a new game starts. Returns { token, sid, issued_at } on success,
// or null if Supabase is unavailable / the edge function fails. Never throws —
// leaderboard must degrade silently like the rest of the feature.
export async function startGameSession() {
	const testMocks = getPacmanTestMocks();
	if (testMocks?.startGameSession) return testMocks.startGameSession();

	const client = getSupabase();
	if (!client) return null;
	try {
		const { data, error } = await client.functions.invoke('start-game', { body: {} });
		if (error || !data?.token) return null;
		return { token: data.token, sid: data.sid, issued_at: data.issued_at };
	} catch {
		return null;
	}
}

export async function submitScore({ displayName, score, level, token }) {
	const testMocks = getPacmanTestMocks();
	if (testMocks?.submitScore) return testMocks.submitScore({ displayName, score, level, token });

	const client = getSupabase();
	if (!client) throw new Error('Leaderboard not available');
	if (!token) throw new Error('Session expired, restart the game');

	let turnstileToken = null;
	if (turnstileEnabled()) {
		try {
			turnstileToken = await getTurnstileToken();
		} catch (err) {
			throw new Error(err?.message || mapSubmitError('captcha_failed'));
		}
	}

	const { data, error } = await client.functions.invoke('submit-score', {
		body: { displayName, score, level, token, turnstileToken },
	});
	if (error) throw new Error(mapSubmitError(data?.error || error.message));
	if (data?.error) throw new Error(mapSubmitError(data.error));
}

function mapSubmitError(code) {
	switch (code) {
		case 'too_soon':              return 'Game was too short';
		case 'token_expired':         return 'Session expired';
		case 'bad_signature':
		case 'missing_token':         return 'Invalid session';
		case 'session_reused':        return 'Score already submitted';
		case 'score_too_high':
		case 'score_too_low_for_level': return 'Score rejected';
		case 'invalid_name':          return 'Invalid name';
		case 'rate_limited':          return 'Too many submissions, try later';
		case 'forbidden_origin':      return 'Submissions blocked from this origin';
		case 'missing_captcha':
		case 'captcha_failed':        return 'Captcha failed, try again';
		default:                      return 'Submit failed';
	}
}

export async function fetchTopScores(limit = LEADERBOARD_LIMIT) {
	const testMocks = getPacmanTestMocks();
	if (testMocks?.fetchTopScores) return testMocks.fetchTopScores(limit);

	const client = getSupabase();
	if (!client) throw new Error('Leaderboard not available');
	const { data, error } = await client
		.from('anonymous_leaderboard')
		.select('display_name, score, level')
		.order('score', { ascending: false })
		.order('display_name', { ascending: true })
		.limit(limit);
	if (error) throw error;
	return data;
}
