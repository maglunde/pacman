import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./sprite.js', function() {
	return {
		getPacmanSpriteSet: vi.fn(function() {
			return {
				left: ['left'],
				up: ['up'],
				right: ['right'],
				down: ['down'],
			};
		}),
	};
});

vi.mock('./game-states.js', function() {
	return {
		addScore: vi.fn(function(points) {
			return points;
		}),
		addPopup: vi.fn(),
		loseLife: vi.fn(),
	};
});

vi.mock('./audio.js', function() {
	return {
		playEatGhost: vi.fn(),
		stopLoopingMusic: vi.fn(),
		playIntermission: vi.fn(),
	};
});

import { GHOST_EATEN_FREEZE_FRAMES, RESULT_STATE_FRAMES, dir } from './constants.js';
import { checkCollisions } from './collision.js';
import { state } from './state.js';
import { resetState } from '../test/reset-state.js';
import { addPopup, addScore, loseLife } from './game-states.js';
import { playEatGhost, playIntermission, stopLoopingMusic } from './audio.js';

describe('collision rules', function() {
	beforeEach(function() {
		resetState();
		vi.clearAllMocks();
		state.playerSpriteSheet = 'pacman';
		state.pacman = {
			x: 100,
			y: 100,
			dir: dir.none,
			sprite: null,
		};
		state.ghosts = [];
		state.GRID_ROWS = 2;
		state.GRID_COLS = 2;
		state.dots = [
			[1, 1],
			[1, 1],
		];
	});

	it('eats scared ghosts, awards combo score and freezes the game briefly', function() {
		state.scaredTimer = 100;
		state.ghosts = [{
			exited: true,
			returning: false,
			immune: false,
			x: 105,
			y: 100,
			col: 1,
			row: 0,
			pendingReturn: false,
		}];
		state.dots = [
			[1, 1],
			[1, 0],
		];

		checkCollisions();

		expect(state.pacman.dir).toBe(dir.right);
		expect(state.pacman.sprite).toEqual(['right']);
		expect(state.ghostCombo).toBe(1);
		expect(state.ghostEatenFreezeTimer).toBe(GHOST_EATEN_FREEZE_FRAMES);
		expect(state.ghosts[0].pendingReturn).toBe(true);
		expect(state.ghosts[0].immune).toBe(true);
		expect(addScore).toHaveBeenCalledWith(200);
		expect(addPopup).toHaveBeenCalledWith('200', 1, 0);
		expect(playEatGhost).toHaveBeenCalledTimes(1);
		expect(loseLife).not.toHaveBeenCalled();
	});

	it('kills pacman on normal ghost collision', function() {
		state.ghosts = [{
			exited: true,
			returning: false,
			immune: false,
			x: 105,
			y: 100,
			col: 1,
			row: 0,
		}];
		state.dots = [
			[1, 1],
			[1, 0],
		];

		checkCollisions();

		expect(loseLife).toHaveBeenCalledTimes(1);
		expect(addScore).not.toHaveBeenCalled();
	});

	it('enters win state when no dots remain', function() {
		state.ghosts = [];
		state.dots = [
			[0, 0],
			[0, 0],
		];

		checkCollisions();

		expect(state.gameState).toBe('win');
		expect(state.stateTimer).toBe(RESULT_STATE_FRAMES);
		expect(stopLoopingMusic).toHaveBeenCalledTimes(1);
		expect(playIntermission).toHaveBeenCalledTimes(1);
	});
});
