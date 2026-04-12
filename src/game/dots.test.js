import { beforeEach, describe, expect, it } from 'vitest';

import { initBigDots, initDots } from './dots.js';
import { state } from './state.js';
import { resetState } from '../test/reset-state.js';

describe('dot placement', function() {
	beforeEach(function() {
		resetState();
		state.activeMap = {
			pacmanStart: { col: 1, row: 1 },
			bigDots: [
				{ col: 0, row: 0 },
				{ col: 2, row: 2 },
			],
		};
		state.GRID_ROWS = 4;
		state.GRID_COLS = 4;
		state.grid = [
			[1, 1, 1, 1],
			[1, 0, 0, 1],
			[1, 0, 1, 1],
			[1, 1, 1, 1],
		];
	});

	it('initializes the configured big dots as uneaten', function() {
		initBigDots();
		expect(state.bigDots).toEqual([
			{ col: 0, row: 0, eaten: false },
			{ col: 2, row: 2, eaten: false },
		]);
	});

	it('fills only reachable floor tiles with dots', function() {
		initDots();

		expect(state.dots[1][1]).toBe(1);
		expect(state.dots[1][2]).toBe(1);
		expect(state.dots[2][1]).toBe(1);
		expect(state.dots[2][2]).toBe(0);
		expect(state.dots[0][0]).toBe(0);
	});
});
