import { TILE } from './constants.js';
import { state } from './state.js';
import { s_dot, s_bigDot } from './sprite.js';

export function initBigDots() {
	state.bigDots = state.activeMap.bigDots.map(function(p) {
		return { col: p.col, row: p.row, eaten: false };
	});
}

export function initDots() {
	state.dots = [];
	for (let row = 0; row < state.GRID_ROWS; row++) {
		state.dots[row] = [];
		for (let col = 0; col < state.GRID_COLS; col++)
			state.dots[row][col] = 0;
	}

	// Flood fill from Pac-Man's starting position to find all reachable tiles.
	let startCol = state.activeMap.pacmanStart.col;
	let startRow = state.activeMap.pacmanStart.row;
	let queue = [{ col: startCol, row: startRow }];
	let visited = [];
	for (let r = 0; r < state.GRID_ROWS; r++) {
		visited[r] = [];
		for (let c = 0; c < state.GRID_COLS; c++)
			visited[r][c] = false;
	}
	visited[startRow][startCol] = true;

	while (queue.length > 0) {
		let cur = queue.shift();
		state.dots[cur.row][cur.col] = 1;
		let neighbors = [
			{ col: cur.col - 1, row: cur.row },
			{ col: cur.col + 1, row: cur.row },
			{ col: cur.col,     row: cur.row - 1 },
			{ col: cur.col,     row: cur.row + 1 }
		];
		for (let i = 0; i < neighbors.length; i++) {
			let n = neighbors[i];
			if (n.col >= 0 && n.col < state.GRID_COLS
				&& n.row >= 0 && n.row < state.GRID_ROWS
				&& !visited[n.row][n.col]
				&& state.grid[n.row][n.col] === 0) {
				visited[n.row][n.col] = true;
				queue.push(n);
			}
		}
	}
}

export function drawDots() {
	let ctx = state.ctx;
	let mapOffX = state.mapOffX, mapOffY = state.mapOffY;

	for (let row = 0; row < state.GRID_ROWS; row++) {
		for (let col = 0; col < state.GRID_COLS; col++) {
			if (state.dots[row][col] === 1) {
				let x = mapOffX + col * TILE + TILE / 2 - 3;
				let y = mapOffY + row * TILE + TILE / 2 - 3;
				s_dot.draw(ctx, x, y);
			}
		}
	}

	// Big dots blink during the last 120 frames of scared mode.
	let showBig = state.scaredTimer === 0
		|| state.scaredTimer > 120
		|| Math.floor(state.frames / 8) % 2 === 0;

	if (showBig) {
		for (let i = 0; i < state.bigDots.length; i++) {
			let bd = state.bigDots[i];
			if (!bd.eaten) {
				let x = mapOffX + bd.col * TILE + TILE / 2 - 9;
				let y = mapOffY + bd.row * TILE + TILE / 2 - 9;
				s_bigDot.draw(ctx, x, y);
			}
		}
	}
}
