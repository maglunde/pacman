import {
	dir, GHOST_SPEED, SCARED_FLASH_THRESHOLD,
	GHOST_REGEN_DELAY, PINKY_RELEASE_DELAY, INKY_RELEASE_DELAY, CLYDE_RELEASE_DELAY,
	GHOST_HOUSE_ROW_MIN, GHOST_HOUSE_ROW_MAX
} from './constants.js';
import { state } from './state.js';
import {
	delta, oppositeDir, applyMove, moveTowardTarget,
	ghostTilePixel, isGhostWall, isReturningGhostWall, wrapCol
} from './grid.js';
import { s_blinky, s_pinky, s_inky, s_clyde, s_scaredGhost, s_eyes } from './sprite.js';

// ── Sprite helpers ────────────────────────────────────────────────────────────

function ghostSpriteIdx(d) {
	if (d === dir.left)  return 0;
	if (d === dir.up)    return 1;
	if (d === dir.right) return 3;
	return 2;
}

// ── BFS path back to the ghost house ─────────────────────────────────────────

export function bfsReturnPath(startCol, startRow, targetCol, targetRow) {
	if (startCol === targetCol && startRow === targetRow) return [];
	var dirs4 = [dir.up, dir.left, dir.down, dir.right];
	var queue   = [{ col: startCol, row: startRow, path: [] }];
	var visited = {};
	visited[startRow + ',' + startCol] = true;
	while (queue.length > 0) {
		var cur = queue.shift();
		for (var i = 0; i < dirs4.length; i++) {
			var d  = dirs4[i];
			var dl = delta(d);
			var nc = wrapCol(cur.col + dl[0]);
			var nr = cur.row + dl[1];
			if (nr < 0 || nr >= state.GRID_ROWS) continue;
			var key = nr + ',' + nc;
			if (visited[key] || isReturningGhostWall(nc, nr)) continue;
			visited[key] = true;
			var newPath = cur.path.concat([{ col: nc, row: nr }]);
			if (nc === targetCol && nr === targetRow) return newPath;
			queue.push({ col: nc, row: nr, path: newPath });
		}
	}
	return [];
}

// ── Ghost future path projection (used for threat map and path rendering) ─────

export function ghostLookahead(g, steps) {
	if (!g.exited || g.returning) return [];
	var path = [];
	var col = g.col, row = g.row, curDir = g.dir;
	var inScatter = state.scatterPhase % 2 === 0;
	for (var s = 0; s < steps; s++) {
		var opp = oppositeDir(curDir);
		var target = inScatter ? g.scatterTarget : g.getTarget();
		var best = dir.none, bestDist = Infinity;
		var ds = [dir.up, dir.left, dir.down, dir.right];
		for (var i = 0; i < ds.length; i++) {
			var d = ds[i];
			if (d === opp) continue;
			var dl = delta(d);
			var nc = wrapCol(col + dl[0]);
			var nr = row + dl[1];
			if (!isGhostWall(nc, nr, d)) {
				var dist = Math.abs(target.col - nc) + Math.abs(target.row - nr);
				if (dist < bestDist) { bestDist = dist; best = d; }
			}
		}
		if (best === dir.none) best = opp;
		if (best === dir.none) break;
		var dlt = delta(best);
		col = wrapCol(col + dlt[0]);
		row = row + dlt[1];
		curDir = best;
		path.push({ col: col, row: row });
	}
	return path;
}

// ── Ghost factory ─────────────────────────────────────────────────────────────

export function makeGhost(startCol, startRow, sprites, releaseDelay, getTarget, pathColor, scatterTarget) {
	return {
		startCol: startCol, startRow: startRow,
		pathColor: pathColor || '#ffffff',
		col: startCol, row: startRow,
		dir: dir.up, moving: false, returning: false,
		x: 0, y: 0, targetX: 0, targetY: 0,
		sprites: sprites,
		releaseDelay: releaseDelay,
		releaseFrame: releaseDelay,
		getTarget: getTarget,
		scatterTarget: scatterTarget || { col: 0, row: 0 },

		init: function() {
			this.col          = this.startCol;
			this.row          = this.startRow;
			this.dir          = dir.up;
			this.moving       = false;
			this.exited       = false;
			this.immune       = false;
			this.returning    = false;
			this.pendingReturn = false;
			this.bounceDir    = dir.up;
			this.releaseFrame = state.frames + this.releaseDelay / state.gameSpeed;
			var p = ghostTilePixel(this.col, this.row);
			this.x = p.x; this.y = p.y;
			this.targetX = p.x; this.targetY = p.y;
		},

		update: function(speedFactor) {
			speedFactor = speedFactor || 1;

			// ── Returning to house after being eaten ──────────────────────────
			if (this.returning) {
				var rspd = GHOST_SPEED * 3 * state.gameSpeed;
				if (!this.moving) {
					if (this.returnPath && this.returnPathIdx < this.returnPath.length) {
						var next = this.returnPath[this.returnPathIdx];
						var rdc  = next.col - this.col;
						var rdr  = next.row - this.row;
						// Handle wrap-around
						if (rdc > 1) rdc = -1; else if (rdc < -1) rdc = 1;
						this.dir = rdc > 0 ? dir.right : rdc < 0 ? dir.left : rdr > 0 ? dir.down : dir.up;
						applyMove(this, rdc, rdr);
						this.returnPathIdx++;
					} else {
						// Arrived at home — wait briefly before re-releasing
						this.returning     = false;
						this.exited        = false;
						this.immune        = state.scaredTimer > 0;
						this.releaseFrame  = state.frames + GHOST_REGEN_DELAY / state.gameSpeed;
						this.returnPath    = null;
						this.returnPathIdx = 0;
						this.bounceDir     = dir.up;
					}
				}
				if (this.moving) {
					moveTowardTarget(this, rspd);
				}
				return;
			}

			// ── Waiting in house — bounce up and down ─────────────────────────
			if (state.frames < this.releaseFrame) {
				if (!this.moving) {
					if (this.bounceDir === dir.up   && this.row <= GHOST_HOUSE_ROW_MIN + 1) this.bounceDir = dir.down;
					if (this.bounceDir === dir.down  && this.row >= GHOST_HOUSE_ROW_MAX)    this.bounceDir = dir.up;
					this.dir = this.bounceDir;
					applyMove(this, 0, this.bounceDir === dir.up ? -1 : 1);
				}
				if (this.moving) {
					moveTowardTarget(this, GHOST_SPEED * state.gameSpeed);
				}
				return;
			}

			// ── Normal movement (exit routine + chase/scatter) ────────────────
			if (!this.moving) {
				if (!this.exited) {
					// Exit: move to col 13 then head straight up
					if (this.col !== 13) {
						var dc = this.col < 13 ? 1 : -1;
						this.dir = dc > 0 ? dir.right : dir.left;
						applyMove(this, dc, 0);
					} else {
						this.dir = dir.up;
						applyMove(this, 0, -1);
					}
				} else {
					var opp  = oppositeDir(this.dir);
					var dirs = [dir.up, dir.left, dir.down, dir.right];
					var best = dir.none;

					if (state.scaredTimer > 0 && !this.immune) {
						// Scared: pick a random valid direction (prefer not to reverse)
						var choices = dirs.filter(function(d) {
							var dl = delta(d);
							return !isGhostWall(this.col + dl[0], this.row + dl[1], d);
						}.bind(this));
						var noReverse = choices.filter(function(d) { return d !== opp; });
						var pool = noReverse.length > 0 ? noReverse : choices;
						best = pool[Math.floor(Math.random() * pool.length)];
					} else {
						// Chase or scatter: move toward target, no reversing
						var inScatter = state.scatterPhase % 2 === 0;
						var target = inScatter ? this.scatterTarget : this.getTarget();
						var bestDist = Infinity;
						for (var i = 0; i < dirs.length; i++) {
							var d = dirs[i];
							if (d === opp) continue;
							var dl = delta(d);
							var nc = this.col + dl[0], nr = this.row + dl[1];
							if (!isGhostWall(nc, nr, d)) {
								var dist = Math.abs(target.col - nc) + Math.abs(target.row - nr);
								if (dist < bestDist) { bestDist = dist; best = d; }
							}
						}
						if (best === dir.none) best = opp;
					}

					if (best !== dir.none) {
						this.dir = best;
						var dl = delta(best);
						applyMove(this, dl[0], dl[1]);
					}
				}
			}

			if (this.moving) {
				var spd = ((state.scaredTimer > 0 && !this.immune) ? GHOST_SPEED * 0.5 : GHOST_SPEED) * speedFactor;
				if (moveTowardTarget(this, spd) && !this.exited && this.row < GHOST_HOUSE_ROW_MIN) {
					this.exited = true;
					this.immune = state.scaredTimer > 0;
				}
			}
		},

		draw: function() {
			var ctx = state.ctx;
			if (this.returning) {
				s_eyes[ghostSpriteIdx(this.dir)].draw(ctx, this.x, this.y, 30, 30);
			} else if (this.pendingReturn || (state.scaredTimer > 0 && this.exited && !this.immune)) {
				var white = state.scaredTimer <= SCARED_FLASH_THRESHOLD && Math.floor(state.frames / 8) % 2 === 1;
				s_scaredGhost[white ? 1 : 0].draw(ctx, this.x, this.y);
			} else {
				this.sprites[ghostSpriteIdx(this.dir)].draw(ctx, this.x, this.y);
			}
		}
	};
}

// ── Ghost initialisation ──────────────────────────────────────────────────────

export function initGhosts() {
	var br = state.GRID_ROWS - 1; // bottom row
	var corners = [
		{ col: 25, row: 0 },  // top-right
		{ col: 2,  row: 0 },  // top-left
		{ col: 25, row: br }, // bottom-right
		{ col: 2,  row: br }  // bottom-left
	];
	// Shift corners based on level to vary scatter paths
	var shift = (state.level - 1) % corners.length;

	state.ghosts = [
		makeGhost(12, 14, s_blinky, 0, function() {
			return { col: state.pacman.col, row: state.pacman.row };
		}, '#ff0000', corners[(0 + shift) % 4]),           // Blinky

		makeGhost(13, 14, s_pinky, PINKY_RELEASE_DELAY, function() {
			var d = delta(state.pacman.dir !== dir.none ? state.pacman.dir : dir.up);
			return { col: state.pacman.col + d[0]*4, row: state.pacman.row + d[1]*4 };
		}, '#ffb8ff', corners[(1 + shift) % 4]),            // Pinky

		makeGhost(14, 14, s_inky, INKY_RELEASE_DELAY, function() {
			var d      = delta(state.pacman.dir !== dir.none ? state.pacman.dir : dir.up);
			var pivot  = { col: state.pacman.col + d[0]*2, row: state.pacman.row + d[1]*2 };
			var blinky = state.ghosts[0];
			return { col: pivot.col*2 - blinky.col, row: pivot.row*2 - blinky.row };
		}, '#00ffff', corners[(2 + shift) % 4]),           // Inky

		makeGhost(15, 14, s_clyde, CLYDE_RELEASE_DELAY, function() {
			var dist = Math.abs(state.pacman.col - state.ghosts[3].col)
			         + Math.abs(state.pacman.row - state.ghosts[3].row);
			return dist > 8
				? { col: state.pacman.col, row: state.pacman.row }
				: { col: 0,               row: state.GRID_ROWS - 1 };
		}, '#ffb851', corners[(3 + shift) % 4])             // Clyde
	];
	state.ghosts.forEach(function(g) { g.init(); });
}
