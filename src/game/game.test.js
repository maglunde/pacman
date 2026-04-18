import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./sprite.js', function() {
	return {
		initSprites: vi.fn(),
		s_map: { draw: vi.fn() },
		s_ready: { draw: vi.fn() },
		s_gameover: { draw: vi.fn() },
	};
});

vi.mock('./input.js', function() {
	return {
		initInput: vi.fn(),
	};
});

vi.mock('./grid.js', function() {
	return {
		initWallData: vi.fn(),
		buildGrid: vi.fn(),
	};
});

vi.mock('./dots.js', function() {
	return {
		initDots: vi.fn(),
		initBigDots: vi.fn(),
		drawDots: vi.fn(),
	};
});

vi.mock('./ghost.js', function() {
	return {
		bfsReturnPath: vi.fn(function() {
			return [{ col: 10, row: 10 }];
		}),
	};
});

vi.mock('./game-states.js', function() {
	return {
		addScore: vi.fn(),
		addPopup: vi.fn(),
		startReady: vi.fn(),
		newGame: vi.fn(),
		nextLevel: vi.fn(),
	};
});

vi.mock('./collision.js', function() {
	return {
		checkCollisions: vi.fn(),
	};
});

vi.mock('./pathvis.js', function() {
	return {
		renderPaths: vi.fn(),
	};
});

vi.mock('./pacman-entity.js', function() {
	return {};
});

vi.mock('./ai.js', function() {
	return {
		aiDecide: vi.fn(),
	};
});

vi.mock('./fruit.js', function() {
	return {
		getAvailableFruits: vi.fn(function() {
			return [{ points: 100, sprite: function() { return { draw() {} }; } }];
		}),
	};
});

vi.mock('./audio.js', function() {
	return {
		playEatFruit: vi.fn(),
		startFright: vi.fn(),
		startEyes: vi.fn(),
		stopLoopingMusic: vi.fn(),
	};
});

vi.mock('./hud.js', function() {
	return {
		drawHUD: vi.fn(),
	};
});

import { FRUIT_DOT_THRESHOLD, FRUIT_DURATION, SCATTER_CHASE_PHASES } from './constants.js';
import { tickGame } from './game.js';
import { state } from './state.js';
import { resetState } from '../test/reset-state.js';
import { bfsReturnPath } from './ghost.js';
import { addPopup, addScore, nextLevel, startReady } from './game-states.js';
import { aiDecide } from './ai.js';
import { getAvailableFruits } from './fruit.js';
import { playEatFruit, startEyes, startFright, stopLoopingMusic } from './audio.js';
import { checkCollisions } from './collision.js';

describe('game loop tick', function() {
	beforeEach(function() {
		resetState();
		vi.clearAllMocks();
		state.gameState = 'playing';
		state.level = 1;
		state.grid = [[0]];
		state.GRID_ROWS = 1;
		state.GRID_COLS = 1;
		state.dots = [[1]];
		state.bigDots = [];
		state.scorePopups = [];
		state.settingToast = { text: '', timer: 0 };
		state.pacman = {
			col: 13,
			row: 23,
			update: vi.fn(),
			draw: vi.fn(),
		};
		state.ghosts = [{
			col: 5,
			row: 5,
			homeCol: 10,
			homeRow: 10,
			returning: false,
			pendingReturn: false,
			immune: false,
			update: vi.fn(),
			draw: vi.fn(),
		}];
	});

	it('moves AI games from ready to playing in one tick', function() {
		state.gameState = 'ready';
		state.aiMode = true;

		tickGame();

		expect(state.gameState).toBe('playing');
		expect(state.frames).toBe(0);
	});

	it('returns from dead state to ready when the timer expires', function() {
		state.gameState = 'dead';
		state.stateTimer = 1;

		tickGame();

		expect(startReady).toHaveBeenCalledTimes(1);
	});

	it('advances to the next level after the win timer expires', function() {
		state.gameState = 'win';
		state.stateTimer = 1;

		tickGame();

		expect(nextLevel).toHaveBeenCalledTimes(1);
	});

	it('resolves ghost-eaten freeze into a returning path', function() {
		state.ghostEatenFreezeTimer = 1;
		state.ghosts[0].pendingReturn = true;

		tickGame();

		expect(state.ghostEatenFreezeTimer).toBe(0);
		expect(state.ghosts[0].pendingReturn).toBe(false);
		expect(state.ghosts[0].returning).toBe(true);
		expect(state.ghosts[0].returnPath).toEqual([{ col: 10, row: 10 }]);
		expect(state.ghosts[0].returnPathIdx).toBe(0);
		expect(bfsReturnPath).toHaveBeenCalledWith(5, 5, 10, 10);
	});

	it('counts down scared mode, clears immunity and advances scatter timing', function() {
		state.scaredTimer = 1;
		state.ghostCombo = 3;
		state.ghosts[0].immune = true;
		state.scatterTimer = 1;
		state.scorePopups = [{ y: 5, life: 1 }, { y: 10, life: 3 }];
		state.settingToast = { text: '80%', timer: 2 };

		tickGame();

		expect(state.scaredTimer).toBe(0);
		expect(state.ghostCombo).toBe(0);
		expect(state.ghosts[0].immune).toBe(false);
		expect(state.scatterPhase).toBe(1);
		expect(state.scatterTimer).toBe(SCATTER_CHASE_PHASES[1]);
		expect(state.scorePopups).toEqual([{ y: 9.6, life: 2 }]);
		expect(state.settingToast.timer).toBe(1);
		expect(stopLoopingMusic).toHaveBeenCalledTimes(1);
	});

	it('starts returning-ghost audio when any ghost is returning', function() {
		state.ghosts[0].returning = true;

		tickGame();

		expect(startEyes).toHaveBeenCalledTimes(1);
		expect(startFright).not.toHaveBeenCalled();
	});

	it('starts frightened audio when ghosts are scared', function() {
		state.scaredTimer = 10;

		tickGame();

		expect(stopLoopingMusic).toHaveBeenCalledTimes(1);
		expect(startFright).toHaveBeenCalledTimes(1);
	});

	it('spawns fruit after enough dots have been eaten', function() {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		state.fruitDotsSinceSpawn = FRUIT_DOT_THRESHOLD;

		tickGame();

		expect(getAvailableFruits).toHaveBeenCalledWith(1);
		expect(state.fruitDotsSinceSpawn).toBe(0);
		expect(state.cherry).toMatchObject({
			col: 13,
			row: 17,
			timer: FRUIT_DURATION,
			points: 100,
		});
	});

	it('awards fruit points when pacman collects an active fruit', function() {
		state.cherry = {
			col: 13,
			row: 23,
			timer: 20,
			points: 300,
			sprite: function() { return { draw() {} }; },
		};

		tickGame();

		expect(addScore).toHaveBeenCalledWith(300);
		expect(addPopup).toHaveBeenCalledWith('300', 13, 23);
		expect(playEatFruit).toHaveBeenCalledTimes(1);
		expect(state.cherry).toBe(null);
	});

	it('runs AI, entity updates and collision checks during active gameplay', function() {
		state.aiMode = true;

		tickGame();

		expect(aiDecide).toHaveBeenCalledTimes(1);
		expect(state.pacman.update).toHaveBeenCalledTimes(1);
		expect(state.ghosts[0].update).toHaveBeenCalledTimes(1);
		expect(checkCollisions).toHaveBeenCalledTimes(1);
	});
});
