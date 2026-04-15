import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./grid.js', async function() {
	let actual = await vi.importActual('./grid.js');
	return {
		...actual,
		isPacWall: vi.fn(function() { return false; }),
		moveTowardTarget: vi.fn(function(entity) {
			entity.x = entity.targetX;
			entity.y = entity.targetY;
			entity.moving = false;
			return true;
		}),
	};
});

vi.mock('./audio.js', function() {
	return {
		playWaka: vi.fn(),
	};
});

vi.mock('./sprite.js', function() {
	return {
		getPacmanSpriteSet: vi.fn(function() {
			return {
				left: ['left-a', 'left-b'],
				up: ['up-a', 'up-b'],
				right: ['right-a', 'right-b'],
				down: ['down-a', 'down-b'],
				round: ['round-a', 'round-b'],
			};
		}),
		s_pacman_dies: Array.from({ length: 11 }, function() { return { draw: vi.fn() }; }),
	};
});

vi.mock('./game-states.js', function() {
	return {
		addScore: vi.fn(),
	};
});

import './pacman-entity.js';
import { SCARED_DURATION, DEAD_STATE_FRAMES, RESULT_STATE_FRAMES, dir } from './constants.js';
import { state } from './state.js';
import { resetState } from '../test/reset-state.js';
import { addScore } from './game-states.js';
import { playWaka } from './audio.js';
import { s_pacman_dies } from './sprite.js';

let pacmanEntity = state.pacman;

describe('pacman draw - death animation', function() {
	let mockCtx;

	beforeEach(function() {
		resetState();
		vi.clearAllMocks();
		state.pacman = pacmanEntity;
		state.activeMap = { pacmanStart: { col: 1, row: 1 } };
		state.playerSpriteSheet = 'pacman';
		state.GRID_ROWS = 4;
		state.GRID_COLS = 4;
		state.pacman.init();
		mockCtx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn() };
		state.ctx = mockCtx;
	});

	it('draws first death sprite at start of dead state', function() {
		state.gameState = 'dead';
		state.stateTimer = DEAD_STATE_FRAMES;
		state.pacman.draw();
		expect(s_pacman_dies[0].draw).toHaveBeenCalledTimes(1);
	});

	it('draws last death sprite at end of dead state', function() {
		state.gameState = 'dead';
		state.stateTimer = 0;
		state.pacman.draw();
		expect(s_pacman_dies[10].draw).toHaveBeenCalledTimes(1);
	});

	it('selects correct mid-animation sprite in dead state', function() {
		state.gameState = 'dead';
		state.stateTimer = DEAD_STATE_FRAMES / 2; // progress=0.5, frameIdx=floor(0.5*11)=5
		state.pacman.draw();
		expect(s_pacman_dies[5].draw).toHaveBeenCalledTimes(1);
	});

	it('rotates ctx left for dir.left', function() {
		state.gameState = 'dead';
		state.stateTimer = DEAD_STATE_FRAMES;
		state.pacman.dir = dir.left;
		state.pacman.draw();
		expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI);
	});

	it('rotates ctx for dir.up', function() {
		state.gameState = 'dead';
		state.stateTimer = DEAD_STATE_FRAMES;
		state.pacman.dir = dir.up;
		state.pacman.draw();
		expect(mockCtx.rotate).toHaveBeenCalledWith(-Math.PI / 2);
	});

	it('rotates ctx for dir.down', function() {
		state.gameState = 'dead';
		state.stateTimer = DEAD_STATE_FRAMES;
		state.pacman.dir = dir.down;
		state.pacman.draw();
		expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 2);
	});

	it('no rotation for dir.right', function() {
		state.gameState = 'dead';
		state.stateTimer = DEAD_STATE_FRAMES;
		state.pacman.dir = dir.right;
		state.pacman.draw();
		expect(mockCtx.rotate).toHaveBeenCalledWith(0);
	});

	it('draws first death sprite at start of gameover state', function() {
		state.gameState = 'gameover';
		state.stateTimer = RESULT_STATE_FRAMES; // elapsed=0
		state.pacman.draw();
		expect(s_pacman_dies[0].draw).toHaveBeenCalledTimes(1);
	});

	it('draws last death sprite when gameover elapsed reaches DEAD_STATE_FRAMES', function() {
		state.gameState = 'gameover';
		state.stateTimer = RESULT_STATE_FRAMES - DEAD_STATE_FRAMES; // elapsed=DEAD_STATE_FRAMES, progress=1
		state.pacman.draw();
		expect(s_pacman_dies[10].draw).toHaveBeenCalledTimes(1);
	});

});

describe('pacman entity update', function() {
	beforeEach(function() {
		resetState();
		vi.clearAllMocks();
		state.pacman = pacmanEntity;
		state.activeMap = { pacmanStart: { col: 1, row: 1 } };
		state.playerSpriteSheet = 'pacman';
		state.frames = 1;
		state.GRID_ROWS = 4;
		state.GRID_COLS = 4;
		state.dots = Array.from({ length: 4 }, function() {
			return [0, 0, 0, 0];
		});
		state.bigDots = [];
		state.ghosts = [];
		state.cherry = null;
		state.fruitDotsSinceSpawn = 0;
		state.dotsEaten = 0;
		state.pacman.init();
	});

	it('eats a normal dot and increments score counters', function() {
		state.pacman.dir = dir.right;
		state.pacman.nextDir = dir.right;
		state.dots[1][2] = 1;

		state.pacman.update();

		expect(state.pacman.col).toBe(2);
		expect(state.pacman.row).toBe(1);
		expect(state.dots[1][2]).toBe(0);
		expect(state.dotsEaten).toBe(1);
		expect(state.fruitDotsSinceSpawn).toBe(1);
		expect(addScore).toHaveBeenCalledWith(10);
		expect(playWaka).toHaveBeenCalledTimes(1);
		expect(state.pacman.sprite).toEqual(['right-a', 'right-b']);
	});

	it('eats a big dot and scares ghosts', function() {
		state.pacman.dir = dir.down;
		state.pacman.nextDir = dir.down;
		state.bigDots = [{ col: 1, row: 2, eaten: false }];
		state.ghosts = [{ immune: true }, { immune: true }];

		state.pacman.update();

		expect(state.bigDots[0].eaten).toBe(true);
		expect(state.scaredTimer).toBe(SCARED_DURATION);
		expect(state.ghostCombo).toBe(0);
		expect(state.ghosts.every(function(ghost) { return ghost.immune === false; })).toBe(true);
		expect(addScore).toHaveBeenCalledWith(50);
		expect(state.pacman.sprite).toEqual(['down-a', 'down-b']);
	});
});
