import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadNumber, loadString, save } from './storage.js';

describe('storage', function() {
	afterEach(function() {
		localStorage.clear();
	});

	it('reads stored values and falls back when missing', function() {
		localStorage.setItem('pacman-username', 'MAG');
		expect(loadString('pacman-username', '')).toBe('MAG');
		expect(loadString('pacman-missing', 'x')).toBe('x');
	});

	it('falls back for non-numeric values and clamps numbers to range', function() {
		localStorage.setItem('pacman-speed', 'garbage');
		expect(loadNumber('pacman-speed', 1, 0.25, 8)).toBe(1);

		localStorage.setItem('pacman-speed', '100');
		expect(loadNumber('pacman-speed', 1, 0.25, 8)).toBe(8);

		localStorage.setItem('pacman-vol', '0.3');
		expect(loadNumber('pacman-vol', 0.5, 0, 1)).toBe(0.3);
	});

	it('survives a storage that throws', function() {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function() { throw new Error('SecurityError'); });
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function() { throw new Error('QuotaExceededError'); });

		expect(loadString('pacman-username', 'fallback')).toBe('fallback');
		expect(loadNumber('pacman-hi', 0, 0, Infinity)).toBe(0);
		expect(function() { save('pacman-hi', 10); }).not.toThrow();
	});
});
