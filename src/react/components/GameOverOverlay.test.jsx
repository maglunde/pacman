import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const { preloadTurnstile, submitScore, quitToMenu, saveUsername } = vi.hoisted(function() {
	return {
		preloadTurnstile: vi.fn(),
		submitScore:      vi.fn(),
		quitToMenu:       vi.fn(),
		saveUsername:     vi.fn(),
	};
});

vi.mock('../../lib/turnstile.js', function() {
	return {
		preloadTurnstile,
	};
});

vi.mock('../../lib/scores.js', function() {
	return {
		submitScore,
	};
});

vi.mock('../../game/menu.js', function() {
	return {
		quitToMenu,
		saveUsername,
	};
});

vi.mock('./MenuAnimation.jsx', function() {
	return {
		ModalShell: function({ children }) {
			return <div data-testid="modal-shell">{children}</div>;
		},
	};
});

vi.mock('./MenuButton.jsx', function() {
	return {
		MenuButton: function({ label, onClick }) {
			return <button type="button" onClick={onClick}>{label}</button>;
		},
	};
});

import { GameOverOverlay } from './GameOverOverlay.jsx';

function createSnapshot(overrides = {}) {
	return {
		username: 'PACMAN',
		stateTimer: 0,
		aiMode: false,
		score: 1234,
		level: 4,
		sessionToken: 'session-token',
		aiPersonalityIdx: 0,
		...overrides,
	};
}

describe('GameOverOverlay', function() {
	afterEach(function() {
		cleanup();
	});

	beforeEach(function() {
		vi.useRealTimers();
		preloadTurnstile.mockReset();
		submitScore.mockReset();
		quitToMenu.mockReset();
		saveUsername.mockReset();
		preloadTurnstile.mockResolvedValue(undefined);
		submitScore.mockResolvedValue(undefined);
	});

	it('preloads Turnstile when the overlay mounts', function() {
		render(<GameOverOverlay snapshot={createSnapshot()} />);

		expect(preloadTurnstile).toHaveBeenCalledTimes(1);
	});

	it('submits the trimmed player name', async function() {
		render(<GameOverOverlay snapshot={createSnapshot({ username: ' PACMAN ' })} />);

		fireEvent.click(screen.getByText('SUBMIT'));

		expect(saveUsername).toHaveBeenCalledWith('PACMAN');
		expect(submitScore).toHaveBeenCalledWith({
			displayName: 'PACMAN',
			score:       1234,
			level:       4,
			token:       'session-token',
		});
	});

	it('returns to the menu after at most one second while submit continues in the background', async function() {
		vi.useFakeTimers();
		submitScore.mockReturnValue(new Promise(function() {}));

		render(<GameOverOverlay snapshot={createSnapshot()} />);

		fireEvent.click(screen.getByText('SUBMIT'));
		expect(screen.getByText('SUBMITTING...')).toBeInTheDocument();
		expect(quitToMenu).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);

		expect(quitToMenu).toHaveBeenCalledTimes(1);
	});
});
