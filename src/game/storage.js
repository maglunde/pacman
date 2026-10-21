// localStorage can be missing or throw (Safari private mode, blocked site data, sandboxed
// iframes). Saved settings are a convenience, so fall back to defaults instead of crashing.

export function loadString(key, fallback) {
	try {
		let value = localStorage.getItem(key);
		return value === null ? fallback : value;
	} catch (e) {
		return fallback;
	}
}

// Returns fallback for missing or non-numeric values, and clamps the rest to [min, max].
export function loadNumber(key, fallback, min, max) {
	let n = parseFloat(loadString(key, ''));
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

export function save(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch (e) {
		// Not persisted; the in-memory value still applies for this session.
	}
}
