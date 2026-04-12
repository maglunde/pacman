import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./sprite.js', function() {
	return { setMapSprite: vi.fn() };
});

vi.mock('./grid.js', function() {
	return {
		buildGrid: vi.fn(),
		initWallData: vi.fn(),
	};
});

vi.mock('./dots.js', function() {
	return {
		initDots: vi.fn(),
		initBigDots: vi.fn(),
	};
});

vi.mock('./ghost.js', function() {
	return {
		initGhosts: vi.fn(),
	};
});

vi.mock('./ai.js', function() {
	return {
		shuffleBFSDirs: vi.fn(),
	};
});

vi.mock('./audio.js', function() {
	return {
		stopLoopingMusic: vi.fn(),
		resumeAudio: vi.fn(),
		playDeath: vi.fn(),
		playExtraPac: vi.fn(),
	};
});

import { DEAD_STATE_FRAMES, MAPS, RESULT_STATE_FRAMES, SCATTER_CHASE_PHASES } from './constants.js';
import { addScore, loseLife, newGame, nextLevel, startReady } from './game-states.js';
import { state } from './state.js';
import { resetState } from '../test/reset-state.js';
import { initGhosts } from './ghost.js';
import { buildGrid, initWallData } from './grid.js';
import { initBigDots, initDots } from './dots.js';
import { shuffleBFSDirs } from './ai.js';
import { playDeath, playExtraPac, resumeAudio, stopLoopingMusic } from './audio.js';
import { setMapSprite } from './sprite.js';

describe('game state transitions', function() {
	beforeEach(function() {
		resetState();
		vi.clearAllMocks();
		state.pacman = { init: vi.fn(), update() {}, draw() {}, nextDir: -1, col: 13, row: 23 };
	});

	it('awards an extra life every 10000 points', function() {
		state.score = 9900;
		state.lastExtraLifeScore = 0;
		state.lives = 3;

		addScore(200);

		expect(state.score).toBe(10100);
		expect(state.lives).toBe(4);
		expect(state.lastExtraLifeScore).toBe(10000);
		expect(playExtraPac).toHaveBeenCalledTimes(1);
	});

	it('prepares a ready state and resets transient gameplay values', function() {
		state.scaredTimer = 33;
		state.ghostEatenFreezeTimer = 12;
		state.ghostCombo = 4;
		state.cherry = { col: 1, row: 1 };
		state.scorePopups = [{ text: '100' }];

		startReady();

		expect(state.pacman.init).toHaveBeenCalledTimes(1);
		expect(initGhosts).toHaveBeenCalledTimes(1);
		expect(state.scaredTimer).toBe(0);
		expect(state.ghostEatenFreezeTimer).toBe(0);
		expect(state.ghostCombo).toBe(0);
		expect(state.cherry).toBe(null);
		expect(state.scorePopups).toEqual([]);
		expect(state.scatterPhase).toBe(0);
		expect(state.scatterTimer).toBe(SCATTER_CHASE_PHASES[0]);
		expect(state.gameState).toBe('ready');
	});

	it('starts a fresh game from the selected map when the engine is ready', function() {
		state.engineReady = true;
		state.mapIdx = 1;
		state.score = 999;
		state.level = 3;
		state.lives = 1;

		newGame();

		expect(stopLoopingMusic).toHaveBeenCalledTimes(1);
		expect(resumeAudio).toHaveBeenCalledTimes(1);
		expect(state.score).toBe(0);
		expect(state.level).toBe(1);
		expect(state.lives).toBe(3);
		expect(state.activeMap).toBe(MAPS[1]);
		expect(state.playerSpriteSheet).toBe(MAPS[1].spriteSheet);
		expect(setMapSprite).toHaveBeenCalledWith(MAPS[1]);
		expect(initWallData).toHaveBeenCalledTimes(1);
		expect(buildGrid).toHaveBeenCalledTimes(1);
		expect(initDots).toHaveBeenCalledTimes(1);
		expect(initBigDots).toHaveBeenCalledTimes(1);
		expect(shuffleBFSDirs).toHaveBeenCalledTimes(1);
		expect(state.gameState).toBe('ready');
	});

	it('advances to the next level and rotates the map', function() {
		state.mapIdx = MAPS.length - 1;
		nextLevel();

		expect(state.level).toBe(2);
		expect(state.mapIdx).toBe(0);
		expect(state.activeMap).toBe(MAPS[0]);
		expect(setMapSprite).toHaveBeenCalledWith(MAPS[0]);
	});

	it('goes to dead state when lives remain', function() {
		state.lives = 2;
		loseLife();

		expect(playDeath).toHaveBeenCalledTimes(1);
		expect(state.lives).toBe(1);
		expect(state.gameState).toBe('dead');
		expect(state.stateTimer).toBe(DEAD_STATE_FRAMES);
	});

	it('goes to game over, persists high score and stops at result timer when lives run out', function() {
		state.lives = 1;
		state.score = 3210;
		state.highScore = 1000;

		loseLife();

		expect(playDeath).toHaveBeenCalledTimes(1);
		expect(state.gameState).toBe('gameover');
		expect(state.stateTimer).toBe(RESULT_STATE_FRAMES);
		expect(state.highScore).toBe(3210);
		expect(localStorage.getItem('pacman-hi')).toBe('3210');
	});
});
