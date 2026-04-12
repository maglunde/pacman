import { beforeEach, describe, expect, it } from 'vitest';

import { TILE } from './constants.js';
import { applyMove, moveTowardTarget, tilePixel, wrapCol } from './grid.js';
import { state } from './state.js';
import { resetState } from '../test/reset-state.js';

describe('grid movement helpers', function() {
	beforeEach(function() {
		resetState();
		state.GRID_COLS = 28;
		state.mapOffX = 100;
		state.mapOffY = 50;
	});

	it('wraps columns on both sides of the board', function() {
		expect(wrapCol(-1)).toBe(27);
		expect(wrapCol(28)).toBe(0);
		expect(wrapCol(3)).toBe(3);
	});

	it('calculates tile pixels from map offsets', function() {
		expect(tilePixel(2, 3)).toEqual({
			x: 100 + 2 * TILE + TILE / 2 - 14,
			y: 50 + 3 * TILE + TILE / 2 - 14,
		});
	});

	it('applies movement and wraps entities through tunnels', function() {
		let entity = {
			col: 0,
			row: 5,
			x: 0,
			y: 0,
			targetX: 0,
			targetY: 0,
			moving: false,
		};

		applyMove(entity, -1, 0);

		expect(entity.col).toBe(27);
		expect(entity.row).toBe(5);
		expect(entity.targetX).toBe(tilePixel(27, 5).x);
		expect(entity.targetY).toBe(tilePixel(27, 5).y);
		expect(entity.moving).toBe(true);
	});

	it('stops movement once an entity reaches its target', function() {
		let entity = {
			x: 10,
			y: 10,
			targetX: 12,
			targetY: 10,
			moving: true,
		};

		let arrived = moveTowardTarget(entity, 3);

		expect(arrived).toBe(true);
		expect(entity.x).toBe(12);
		expect(entity.y).toBe(10);
		expect(entity.moving).toBe(false);
	});
});
