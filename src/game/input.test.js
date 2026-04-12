import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./audio.js', function() {
	return {
		initAudio: vi.fn(),
		playBeginning: vi.fn(),
		updateLoopVolume: vi.fn(),
		pauseAudio: vi.fn(),
		resumeAudio: vi.fn(),
	};
});

vi.mock('./menu.js', function() {
	return {
		adjustSetting: vi.fn(),
		quitToMenu: vi.fn(),
	};
});

vi.mock('./sprite.js', function() {
	return {
		setMapSprite: vi.fn(),
	};
});

vi.mock('./hud.js', function() {
	return {
		saveVolume: vi.fn(),
		togglePath: vi.fn(),
	};
});

import { dir } from './constants.js';
import { initInput } from './input.js';
import { state } from './state.js';
import { resetState } from '../test/reset-state.js';
import { pauseAudio } from './audio.js';
import { quitToMenu } from './menu.js';

describe('game input', function() {
	beforeAll(function() {
		initInput(function() {});
	});

	beforeEach(function() {
		resetState();
		vi.clearAllMocks();
		state.pacman = { nextDir: dir.none };
		state.ghosts = [{ nextDir: dir.none }];
	});

	it('starts gameplay and steers pacman with arrow keys', function() {
		state.gameState = 'ready';
		state.aiMode = false;

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

		expect(state.gameState).toBe('playing');
		expect(state.pacman.nextDir).toBe(dir.left);
	});

	it('opens the pause menu with P and can quit with Escape fallback', function() {
		state.gameState = 'playing';

		document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', bubbles: true }));
		expect(state.escapeMenuActive).toBe(true);
		expect(state.paused).toBe(true);
		expect(pauseAudio).toHaveBeenCalledTimes(1);

		state.escapeMenuActive = false;
		state.paused = false;
		state.gameState = 'win';
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(quitToMenu).toHaveBeenCalledTimes(1);
	});

	it('maps a swipe to directional input on touch devices', function() {
		state.gameState = 'ready';
		state.aiMode = false;

		let touchStartEvent = new Event('touchstart', { bubbles: true });
		Object.defineProperty(touchStartEvent, 'touches', {
			value: [{ clientX: 10, clientY: 10 }],
			configurable: true,
		});
		document.dispatchEvent(touchStartEvent);

		let touchEndEvent = new Event('touchend', { bubbles: true });
		Object.defineProperty(touchEndEvent, 'changedTouches', {
			value: [{ clientX: 80, clientY: 10 }],
			configurable: true,
		});
		Object.defineProperty(touchEndEvent, 'target', {
			value: document.body,
			configurable: true,
		});
		document.dispatchEvent(touchEndEvent);

		expect(state.gameState).toBe('playing');
		expect(state.pacman.nextDir).toBe(dir.right);
	});
});
