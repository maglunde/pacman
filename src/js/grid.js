import {
	TILE,
	dir,
	GHOST_HOUSE_ROW_MIN, GHOST_HOUSE_ROW_MAX,
	GHOST_HOUSE_COL_MIN, GHOST_HOUSE_COL_MAX,
	DOOR_ROW, DOOR_COL_MIN, DOOR_COL_MAX
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
	return row === DOOR_ROW && col >= DOOR_COL_MIN && col <= DOOR_COL_MAX;
}

export function inGhostHouse(col, row) {
	col = wrapCol(col);
	return row >= GHOST_HOUSE_ROW_MIN && row <= GHOST_HOUSE_ROW_MAX
		&& col >= GHOST_HOUSE_COL_MIN && col <= GHOST_HOUSE_COL_MAX;
}

// ── Wall queries ──────────────────────────────────────────────────────────────

function isWall(mx, my) {
	if (mx < 0 || my < 0 || mx >= s_map.w || my >= s_map.h) return true;
	var idx = (Math.floor(my) * s_map.w + Math.floor(mx)) * 4;
	return (state.mapPixels[idx] + state.mapPixels[idx+1] + state.mapPixels[idx+2]) > 80;
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

export function applyMove(entity, dc, dr) {
	entity.col += dc;
	entity.row += dr;
	if (entity.col < 0 || entity.col >= state.GRID_COLS) {
		entity.x   = dc < 0 ? tilePixel(state.GRID_COLS, entity.row).x
		                     : tilePixel(-1, entity.row).x;
		entity.col = wrapCol(entity.col);
	}
	var p = tilePixel(entity.col, entity.row);
	entity.targetX = p.x;
	entity.targetY = p.y;
	entity.moving  = true;
}

// ── Initialization ────────────────────────────────────────────────────────────

export function initWallData() {
	state.GRID_COLS = Math.floor(s_map.w / TILE);
	state.GRID_ROWS = Math.floor(s_map.h / TILE);
	var mapDrawW = state.GRID_COLS * TILE;
	var mapDrawH = state.GRID_ROWS * TILE;
	state.mapOffX = state.width  / 4 - mapDrawW / 2;
	state.mapOffY = state.height / 4 - mapDrawH / 2;
	var offscreen = document.createElement('canvas');
	offscreen.width  = s_map.w;
	offscreen.height = s_map.h;
	var offCtx = offscreen.getContext('2d');
	offCtx.drawImage(state.img, s_map.x, s_map.y, s_map.w, s_map.h, 0, 0, s_map.w, s_map.h);
	state.mapPixels = offCtx.getImageData(0, 0, s_map.w, s_map.h).data;
}

export function buildGrid() {
	// A tile is a wall if more than 5% of its pixels are wall-colored (handles anti-aliased edges).
	var threshold = Math.floor(TILE * TILE * 0.05);
	state.grid = [];
	for (var row = 0; row < state.GRID_ROWS; row++) {
		state.grid[row] = [];
		for (var col = 0; col < state.GRID_COLS; col++) {
			var x0 = col * TILE, y0 = row * TILE;
			var count = 0;
			for (var dx = 0; dx < TILE; dx++)
				for (var dy = 0; dy < TILE; dy++)
					if (isWall(x0 + dx, y0 + dy)) count++;
			state.grid[row][col] = count > threshold ? 1 : 0;
		}
	}
}
