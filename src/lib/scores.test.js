import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke, getTurnstileToken, turnstileEnabled } = vi.hoisted(function() {
	return {
		invoke:            vi.fn(),
		getTurnstileToken: vi.fn(),
		turnstileEnabled:  vi.fn(),
	};
});

vi.mock('./supabase.js', function() {
	return {
		getSupabase: function() {
			return {
				functions: {
					invoke,
				},
			};
		},
	};
});

vi.mock('./test-mode.js', function() {
	return {
		getPacmanTestMocks: function() {
			return null;
		},
	};
});

vi.mock('./turnstile.js', function() {
	return {
		getTurnstileToken,
		turnstileEnabled,
	};
});

import { submitScore } from './scores.js';

describe('submitScore', function() {
	beforeEach(function() {
		invoke.mockReset();
		getTurnstileToken.mockReset();
		turnstileEnabled.mockReset();
		turnstileEnabled.mockReturnValue(false);
		invoke.mockResolvedValue({ data: { ok: true }, error: null });
	});

	it('preserves specific Turnstile client errors', async function() {
		turnstileEnabled.mockReturnValue(true);
		getTurnstileToken.mockRejectedValue(new Error('Turnstile domain is not authorized for this site'));

		await expect(submitScore({
			displayName: 'PACMAN',
			score:       1200,
			level:       3,
			token:       'session-token',
		})).rejects.toThrow('Turnstile domain is not authorized for this site');
	});

	it('falls back to the generic captcha message when Turnstile gives no message', async function() {
		turnstileEnabled.mockReturnValue(true);
		getTurnstileToken.mockRejectedValue({});

		await expect(submitScore({
			displayName: 'PACMAN',
			score:       1200,
			level:       3,
			token:       'session-token',
		})).rejects.toThrow('Captcha failed, try again');
	});
});
