export function isPacmanTestMode() {
	if (typeof window === 'undefined') return false;
	return new URLSearchParams(window.location.search).get('e2e') === '1';
}

export function getPacmanTestMocks() {
	if (typeof globalThis === 'undefined') return null;
	return globalThis.__PACMAN_TEST_MOCKS__ || null;
}
