import { supabase } from './supabase.js';

const LEADERBOARD_LIMIT = 10;
const USER_ID_KEY = 'pacman-user-id';

function getUserId() {
	let id = localStorage.getItem(USER_ID_KEY);
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem(USER_ID_KEY, id);
	}
	return id;
}

export async function submitScore({ displayName, score, level }) {
	const { error } = await supabase.from('anonymous_scores').insert({
		display_name: displayName,
		score,
		level,
	});
	if (error) throw error;
}

export async function fetchTopScores(limit = LEADERBOARD_LIMIT) {
	const { data, error } = await supabase
		.from('anonymous_leaderboard')
		.select('display_name, score, level')
		.limit(limit);
	if (error) throw error;
	return data;
}
