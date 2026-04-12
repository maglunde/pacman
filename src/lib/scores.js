import { getSupabase } from './supabase.js';
import { getPacmanTestMocks } from './test-mode.js';

const LEADERBOARD_LIMIT = 10;

export async function submitScore({ displayName, score, level }) {
	const testMocks = getPacmanTestMocks();
	if (testMocks?.submitScore) return testMocks.submitScore({ displayName, score, level });

	const client = getSupabase();
	if (!client) throw new Error('Leaderboard not available');
	const { error } = await client.from('anonymous_scores').insert({
		display_name: displayName,
		score,
		level,
	});
	if (error) throw error;
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
