import {
	dir, GHOST_SPEED,
	GHOST_REGEN_DELAY, PINKY_RELEASE_DELAY, INKY_RELEASE_DELAY, CLYDE_RELEASE_DELAY,
	COLORS,
} from './constants.js';
import { state } from './state.js';
import {
	delta, oppositeDir, applyMove, moveTowardTarget,
	ghostTilePixel, isGhostWall, isReturningGhostWall, wrapCol
} from './grid.js';
import { s_blinky, s_pinky, s_inky, s_clyde } from './sprite.js';
import { drawGhost } from './ghost-render.js';

// ── BFS path back to the ghost house ─────────────────────────────────────────

export function bfsReturnPath(startCol, startRow, targetCol, targetRow) {
	if (startCol === targetCol && startRow === targetRow) return [];
	let dirs4 = [dir.up, dir.left, dir.down, dir.right];
	let queue   = [{ col: startCol, row: startRow, path: [] }];
	let visited = {};
	visited[startRow + ',' + startCol] = true;
	while (queue.length > 0) {
		let cur = queue.shift();
		for (let i = 0; i < dirs4.length; i++) {
			let d  = dirs4[i];
			let dl = delta(d);
			let nc = wrapCol(cur.col + dl[0]);
			let nr = cur.row + dl[1];
			if (nr < 0 || nr >= state.GRID_ROWS) continue;
			let key = nr + ',' + nc;
			if (visited[key] || isReturningGhostWall(nc, nr)) continue;
			visited[key] = true;
			let newPath = cur.path.concat([{ col: nc, row: nr }]);
			if (nc === targetCol && nr === targetRow) return newPath;
			queue.push({ col: nc, row: nr, path: newPath });
		}
	}
	return [];
}

// ── Ghost future path projection (used for threat map and path rendering) ─────

export function ghostLookahead(g, steps) {
	if (!g.exited || g.returning) return [];
	let path = [];
	let col = g.col, row = g.row, curDir = g.dir;
	let inScatter = state.scatterPhase % 2 === 0;
	for (let s = 0; s < steps; s++) {
		let opp = oppositeDir(curDir);
		let target = inScatter ? g.scatterTarget : g.getTarget();
		let best = dir.none, bestDist = Infinity;
		let ds = [dir.up, dir.left, dir.down, dir.right];
		for (let i = 0; i < ds.length; i++) {
			let d = ds[i];
			if (d === opp) continue;
			let dl = delta(d);
			let nc = wrapCol(col + dl[0]);
			let nr = row + dl[1];
			if (!isGhostWall(nc, nr, d)) {
				let dist = Math.abs(target.col - nc) + Math.abs(target.row - nr);
				if (dist < bestDist) { bestDist = dist; best = d; }
			}
		}
		if (best === dir.none) best = opp;
		if (best === dir.none) break;
		let dlt = delta(best);
		col = wrapCol(col + dlt[0]);
		row = row + dlt[1];
		curDir = best;
		path.push({ col: col, row: row });
	}
	return path;
}

// ── Ghost factory ─────────────────────────────────────────────────────────────

export function makeGhost(config) {
	return {
		spawnCol: config.spawnCol,
		spawnRow: config.spawnRow,
		homeCol: config.homeCol,
		homeRow: config.homeRow,
		pathColor: config.pathColor || COLORS.white,
		col: config.spawnCol, row: config.spawnRow,
		dir: dir.up, moving: false, returning: false,
		x: 0, y: 0, targetX: 0, targetY: 0,
		sprites: config.sprites,
		tilePixelFn: ghostTilePixel,
		releaseDelay: config.releaseDelay,
		releaseFrame: config.releaseDelay,
		getTarget: config.getTarget,
		scatterTarget: config.scatterTarget || { col: 0, row: 0 },
		spawnExited: config.spawnExited || false,
		houseBounceDir: config.houseBounceDir || dir.up,

		init: function() {
			this.col          = this.spawnCol;
			this.row          = this.spawnRow;
			this.dir          = dir.up;
			this.moving       = false;
			this.exited       = this.spawnExited;
			this.immune       = false;
			this.returning    = false;
			this.pendingReturn = false;
			this.bounceDir    = this.houseBounceDir;
			const jitter = this.releaseDelay > 0 ? (Math.random() - 0.5) * 60 : 0;
		this.releaseFrame = state.frames + this.releaseDelay / state.effectiveSpeed + jitter;
			this.nextDir      = dir.none;
			let p = ghostTilePixel(this.col, this.row);
			this.x = p.x; this.y = p.y;
			this.targetX = p.x; this.targetY = p.y;
		},

		update: function(speedFactor) {
			speedFactor = speedFactor || 1;

			// ── Returning to house after being eaten ──────────────────────────
			if (this.returning) {
				let rspd = GHOST_SPEED * 3 * state.effectiveSpeed;
				if (!this.moving) {
					if (this.returnPath && this.returnPathIdx < this.returnPath.length) {
						let next = this.returnPath[this.returnPathIdx];
						let rdc  = next.col - this.col;
						let rdr  = next.row - this.row;
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
						this.releaseFrame  = state.frames + GHOST_REGEN_DELAY / state.effectiveSpeed;
						this.returnPath    = null;
						this.returnPathIdx = 0;
						this.bounceDir     = this.houseBounceDir;
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
					let gh = state.activeMap.ghostHouse;
					if (this.bounceDir === dir.up   && this.row <= gh.rowMin + 1) this.bounceDir = dir.down;
					if (this.bounceDir === dir.down  && this.row >= gh.rowMax)    this.bounceDir = dir.up;
					this.dir = this.bounceDir;
					applyMove(this, 0, this.bounceDir === dir.up ? -1 : 1);
				}
				if (this.moving) {
					moveTowardTarget(this, GHOST_SPEED * state.effectiveSpeed);
				}
				return;
			}

			// ── Normal movement (exit routine + chase/scatter) ────────────────
			if (!this.moving) {
				if (!this.exited) {
					// Exit: move to the door column, then head straight up.
					if (this.col !== state.activeMap.ghostExitCol) {
						let dc = this.col < state.activeMap.ghostExitCol ? 1 : -1;
						this.dir = dc > 0 ? dir.right : dir.left;
						applyMove(this, dc, 0);
					} else {
						this.dir = dir.up;
						applyMove(this, 0, -1);
					}
				} else {
					let opp  = oppositeDir(this.dir);
					let dirs = [dir.up, dir.left, dir.down, dir.right];
					let best = dir.none;

					// Player-controlled: AI mode uses controlledGhostIdx (Enter), manual uses selectedGhostIdx (WASD)
					let playerControlled = (state.aiMode && state.controlledGhostIdx >= 0 && state.ghosts[state.controlledGhostIdx] === this)
					                    || (!state.aiMode && state.selectedGhostIdx >= 0 && state.ghosts[state.selectedGhostIdx] === this);

					if (playerControlled) {
						// Try queued direction first (allow reversing — player intent)
						if (this.nextDir !== dir.none) {
							let ndl = delta(this.nextDir);
							if (!isGhostWall(this.col + ndl[0], this.row + ndl[1], this.nextDir)) {
								best = this.nextDir;
							}
						}
						// Fall back: continue in current direction
						if (best === dir.none) {
							let cdl = delta(this.dir);
							if (!isGhostWall(this.col + cdl[0], this.row + cdl[1], this.dir)) {
								best = this.dir;
							}
						}
						// Last resort: any valid direction
						if (best === dir.none) {
							for (let ai = 0; ai < dirs.length; ai++) {
								let adl = delta(dirs[ai]);
								if (!isGhostWall(this.col + adl[0], this.row + adl[1], dirs[ai])) {
									best = dirs[ai]; break;
								}
							}
						}
					} else if (state.scaredTimer > 0 && !this.immune) {
						// Scared: pick a random valid direction (prefer not to reverse)
						let choices = dirs.filter(function(d) {
							let dl = delta(d);
							return !isGhostWall(this.col + dl[0], this.row + dl[1], d);
						}.bind(this));
						let noReverse = choices.filter(function(d) { return d !== opp; });
						let pool = noReverse.length > 0 ? noReverse : choices;
						best = pool[Math.floor(Math.random() * pool.length)];
					} else {
						// Chase or scatter: move toward target, no reversing
						let inScatter = state.scatterPhase % 2 === 0;
						let target = inScatter ? this.scatterTarget : this.getTarget();
						let bestDist = Infinity;
						for (let i = 0; i < dirs.length; i++) {
							let d = dirs[i];
							if (d === opp) continue;
							let dl = delta(d);
							let nc = this.col + dl[0], nr = this.row + dl[1];
							if (!isGhostWall(nc, nr, d)) {
								let dist = Math.abs(target.col - nc) + Math.abs(target.row - nr);
								if (dist < bestDist || (dist === bestDist && Math.random() < 0.5)) { bestDist = dist; best = d; }
							}
						}
						if (best === dir.none) best = opp;
					}

					if (best !== dir.none) {
						this.dir = best;
						let dl = delta(best);
						applyMove(this, dl[0], dl[1]);
					}
				}
			}

			if (this.moving) {
				let spd = ((state.scaredTimer > 0 && !this.immune) ? GHOST_SPEED * 0.5 : GHOST_SPEED) * speedFactor;
				if (moveTowardTarget(this, spd) && !this.exited && this.row < state.activeMap.ghostHouse.rowMin) {
					this.exited = true;
				}
			}
		},

		draw: function() { drawGhost(this); }
	};
}

// ── Ghost initialisation ──────────────────────────────────────────────────────

export function initGhosts() {
	let br = state.GRID_ROWS - 1; // bottom row
	let corners = [
		{ col: 25, row: 0 },  // top-right
		{ col: 2,  row: 0 },  // top-left
		{ col: 25, row: br }, // bottom-right
		{ col: 2,  row: br }  // bottom-left
	];
	// Shift corners based on level to vary scatter paths
	let shift = (state.level - 1) % corners.length;
	let ghostStarts = state.activeMap.ghostStarts;

	state.ghosts = [
		makeGhost({
			spawnCol:      ghostStarts.blinky.spawn.col,
			spawnRow:      ghostStarts.blinky.spawn.row,
			homeCol:       ghostStarts.blinky.home.col,
			homeRow:       ghostStarts.blinky.home.row,
			sprites:       s_blinky,
			releaseDelay:  0,
			getTarget:     function() {
				return { col: state.pacman.col, row: state.pacman.row };
			},
			pathColor:     COLORS.blinky,
			scatterTarget: corners[(0 + shift) % 4],
			houseBounceDir: ghostStarts.blinky.bounceDir,
			spawnExited:   ghostStarts.blinky.spawnExited
		}), // Blinky

		makeGhost({
			spawnCol:      ghostStarts.pinky.spawn.col,
			spawnRow:      ghostStarts.pinky.spawn.row,
			homeCol:       ghostStarts.pinky.home.col,
			homeRow:       ghostStarts.pinky.home.row,
			sprites:       s_pinky,
			releaseDelay:  PINKY_RELEASE_DELAY,
			getTarget:     function() {
				let d = delta(state.pacman.dir !== dir.none ? state.pacman.dir : dir.up);
				return { col: state.pacman.col + d[0] * 4, row: state.pacman.row + d[1] * 4 };
			},
			pathColor:     COLORS.pinky,
			scatterTarget: corners[(1 + shift) % 4],
			houseBounceDir: ghostStarts.pinky.bounceDir,
			spawnExited:   ghostStarts.pinky.spawnExited
		}), // Pinky

		makeGhost({
			spawnCol:      ghostStarts.inky.spawn.col,
			spawnRow:      ghostStarts.inky.spawn.row,
			homeCol:       ghostStarts.inky.home.col,
			homeRow:       ghostStarts.inky.home.row,
			sprites:       s_inky,
			releaseDelay:  INKY_RELEASE_DELAY,
			getTarget:     function() {
				let d      = delta(state.pacman.dir !== dir.none ? state.pacman.dir : dir.up);
				let pivot  = { col: state.pacman.col + d[0] * 2, row: state.pacman.row + d[1] * 2 };
				let blinky = state.ghosts[0];
				return { col: pivot.col * 2 - blinky.col, row: pivot.row * 2 - blinky.row };
			},
			pathColor:     COLORS.inky,
			scatterTarget: corners[(2 + shift) % 4],
			houseBounceDir: ghostStarts.inky.bounceDir,
			spawnExited:   ghostStarts.inky.spawnExited
		}), // Inky

		makeGhost({
			spawnCol:      ghostStarts.clyde.spawn.col,
			spawnRow:      ghostStarts.clyde.spawn.row,
			homeCol:       ghostStarts.clyde.home.col,
			homeRow:       ghostStarts.clyde.home.row,
			sprites:       s_clyde,
			releaseDelay:  CLYDE_RELEASE_DELAY,
			getTarget:     function() {
				let dist = Math.abs(state.pacman.col - state.ghosts[3].col)
				         + Math.abs(state.pacman.row - state.ghosts[3].row);
				return dist > 8
					? { col: state.pacman.col, row: state.pacman.row }
					: { col: 0,               row: state.GRID_ROWS - 1 };
			},
			pathColor:     COLORS.clyde,
			scatterTarget: corners[(3 + shift) % 4],
			houseBounceDir: ghostStarts.clyde.bounceDir,
			spawnExited:   ghostStarts.clyde.spawnExited
		}) // Clyde
	];
	state.ghosts.forEach(function(g) { g.init(); });
}
