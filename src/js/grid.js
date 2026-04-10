import {
	TILE, WALL_BRIGHTNESS_THRESHOLD,
	dir,
} from './constants.js';
import { state } from './state.js';
import { s_map } from './sprite.js';

// ── Direction helpers ─────────────────────────────────────────────────────────

export function delta(d) {
	if (d === dir.left)  return [-1,  0];
	if (d === dir.right) return [ 1,  0];
	if (d === dir.up)    return [ 0, -1];
	if (d === dir.down)  return [ 0,  1];
	return [0, 0];
}

export function oppositeDir(d) {
	if (d === dir.left)  return dir.right;
	if (d === dir.right) return dir.left;
	if (d === dir.up)    return dir.down;
	if (d === dir.down)  return dir.up;
	return dir.none;
}

// ── Coordinate helpers ────────────────────────────────────────────────────────

export function wrapCol(col) {
	return ((col % state.GRID_COLS) + state.GRID_COLS) % state.GRID_COLS;
}

export function tilePixel(col, row) {
	return {
		x: state.mapOffX + col * TILE + TILE / 2 - 14,
		y: state.mapOffY + row * TILE + TILE / 2 - 14
	};
}

export function ghostTilePixel(col, row) {
	return {
		x: state.mapOffX + col * TILE + TILE / 2 - 15,
		y: state.mapOffY + row * TILE + TILE / 2 - 15
	};
}

// ── Ghost house / door detection ──────────────────────────────────────────────

export function isDoor(col, row) {
	col = wrapCol(col);
	let d = state.activeMap.door;
	return row === d.row && col >= d.colMin && col <= d.colMax;
}

export function inGhostHouse(col, row) {
	col = wrapCol(col);
	let h = state.activeMap.ghostHouse;
	return row >= h.rowMin && row <= h.rowMax
		&& col >= h.colMin && col <= h.colMax;
}

// ── Wall queries ──────────────────────────────────────────────────────────────

function isWall(mx, my) {
	if (mx < 0 || my < 0 || mx >= state.mapScaledW || my >= state.mapScaledH) return true;
	let idx = (Math.floor(my) * state.mapScaledW + Math.floor(mx)) * 4;
	return (state.mapPixels[idx] + state.mapPixels[idx+1] + state.mapPixels[idx+2]) > WALL_BRIGHTNESS_THRESHOLD;
}

export function isGridWall(col, row) {
	if (row < 0 || row >= state.GRID_ROWS) return true;
	col = wrapCol(col);
	return state.grid[row][col] === 1;
}

export function isPacWall(col, row) {
	return isGridWall(col, row);
}

// Ghosts can move upward through the house/door to exit; cannot re-enter going down.
export function isGhostWall(col, row, moveDir) {
	if (moveDir === dir.up && (isDoor(col, row) || inGhostHouse(col, row))) return false;
	return isGridWall(col, row);
}

// Returning ghost eyes can pass through the door and house in any direction.
export function isReturningGhostWall(col, row) {
	col = wrapCol(col);
	if (isDoor(col, row) || inGhostHouse(col, row)) return false;
	return isGridWall(col, row);
}

// ── Movement ──────────────────────────────────────────────────────────────────

// Move entity one frame toward its targetX/targetY at the given speed.
// Sets entity.moving = false and returns true when it arrives.
export function moveTowardTarget(entity, spd) {
	let dx = entity.targetX - entity.x;
	let dy = entity.targetY - entity.y;
	if (Math.abs(dx) <= spd && Math.abs(dy) <= spd) {
		entity.x      = entity.targetX;
		entity.y      = entity.targetY;
		entity.moving = false;
		return true;
	}
	entity.x += Math.sign(dx) * spd;
	entity.y += Math.sign(dy) * spd;
	return false;
}

export function applyMove(entity, dc, dr) {
	entity.col += dc;
	entity.row += dr;
	if (entity.col < 0 || entity.col >= state.GRID_COLS) {
		entity.x   = dc < 0 ? tilePixel(state.GRID_COLS, entity.row).x
		                     : tilePixel(-1, entity.row).x;
		entity.col = wrapCol(entity.col);
	}
	let p = tilePixel(entity.col, entity.row);
	entity.targetX = p.x;
	entity.targetY = p.y;
	entity.moving  = true;
}

// ── Initialization ────────────────────────────────────────────────────────────

export function initWallData() {
	let scaledW = s_map.w * s_map.scale;
	let scaledH = s_map.h * s_map.scale;
	state.mapScaledW = scaledW;
	state.mapScaledH = scaledH;
	state.GRID_COLS  = Math.floor(scaledW / TILE);
	state.GRID_ROWS  = Math.floor(scaledH / TILE);
	let mapDrawW = state.GRID_COLS * TILE;
	let mapDrawH = state.GRID_ROWS * TILE;
	state.mapOffX = state.width  / 4 - mapDrawW / 2;
	state.mapOffY = state.height / 4 - mapDrawH / 2;
	let offscreen = document.createElement('canvas');
	offscreen.width  = scaledW;
	offscreen.height = scaledH;
	let offCtx = offscreen.getContext('2d');
	offCtx.drawImage(s_map.img, s_map.x, s_map.y, s_map.w, s_map.h, 0, 0, scaledW, scaledH);
	state.mapPixels = offCtx.getImageData(0, 0, scaledW, scaledH).data;
}

export function buildGrid() {
	// A tile is a wall if more than 5% of its pixels are wall-colored (handles anti-aliased edges).
	let threshold = Math.floor(TILE * TILE * 0.05);
	state.grid = [];
	for (let row = 0; row < state.GRID_ROWS; row++) {
		state.grid[row] = [];
		for (let col = 0; col < state.GRID_COLS; col++) {
			let x0 = col * TILE, y0 = row * TILE;
			let count = 0;
			for (let dx = 0; dx < TILE; dx++)
				for (let dy = 0; dy < TILE; dy++)
					if (isWall(x0 + dx, y0 + dy)) count++;
			state.grid[row][col] = count > threshold ? 1 : 0;
		}
	}
}
