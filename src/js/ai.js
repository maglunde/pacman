import { dir, TILE, SPEED, PACMAN_DOT_SPEED_FACTOR, AI_PERSONALITIES, AI_PERSONALITY_KEYS } from './constants.js';
import { state } from './state.js';
import { delta, isPacWall, wrapCol } from './grid.js';
import { ghostLookahead } from './ghost.js';

// ── Internal AI state ─────────────────────────────────────────────────────────

let bfsDirOrder = [dir.up, dir.left, dir.down, dir.right];

export function shuffleBFSDirs() {
	let a = [dir.up, dir.left, dir.down, dir.right];
	for (let i = a.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		let tmp = a[i]; a[i] = a[j]; a[j] = tmp;
	}
	bfsDirOrder = a;
}

// ── Helper queries ────────────────────────────────────────────────────────────

function aiFPT() { return Math.ceil(TILE / (SPEED * PACMAN_DOT_SPEED_FACTOR)); } // frames per tile

function nearestActiveDist() {
	let m = Infinity;
	for (let i = 0; i < state.ghosts.length; i++) {
		let g = state.ghosts[i];
		if (!g.exited || (state.scaredTimer > 0 && !g.immune)) continue;
		let d = Math.abs(g.col - state.pacman.col) + Math.abs(g.row - state.pacman.row);
		if (d < m) m = d;
	}
	return m;
}

function countScared() {
	let n = 0;
	for (let i = 0; i < state.ghosts.length; i++) {
		let g = state.ghosts[i];
		if (g.exited && !g.returning && !g.immune && state.scaredTimer > 0) n++;
	}
	return n;
}

function pelletCount() {
	let n = 0;
	for (let i = 0; i < state.bigDots.length; i++)
		if (!state.bigDots[i].eaten) n++;
	return n;
}

function ghostDistAt(col, row) {
	let minGD = Infinity;
	for (let i = 0; i < state.ghosts.length; i++) {
		let g = state.ghosts[i];
		if (!g.exited || g.returning || (state.scaredTimer > 0 && !g.immune)) continue;
		let gd = Math.abs(g.col - col) + Math.abs(g.row - row);
		if (gd < minGD) minGD = gd;
	}
	return minGD;
}

// ── Threat map ────────────────────────────────────────────────────────────────

function buildTimeAwareThreatMap() {
	let map  = {};
	let LOOK = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].look;
	state.ghosts.forEach(function(g) {
		if (!g.exited || g.returning || (state.scaredTimer > 0 && !g.immune)) return;
		let key = g.row + ',' + g.col;
		if (!(key in map) || map[key] > 0) map[key] = 0;
		let path = ghostLookahead(g, LOOK);
		for (let i = 0; i < path.length; i++) {
			let pk  = path[i].row + ',' + path[i].col;
			let arr = i + 1;
			if (!(pk in map) || map[pk] > arr) map[pk] = arr;
		}
	});
	return map;
}

function isTimeAwareSafe(col, row, pacSteps, threatMap) {
	let key = row + ',' + col;
	if (!(key in threatMap)) return true;
	let margin = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].safetyMargin;
	return pacSteps < threatMap[key] - margin;
}

// ── BFS ───────────────────────────────────────────────────────────────────────
// opts: { blockFn?(col,row)→bool, threatMap? }
// Returns the first direction toward the nearest tile where goalFn returns true,
// or dir.none if unreachable. Also writes the path to state.aiPath.

function pacmanBFS(goalFn, opts) {
	opts = opts || {};
	let start   = { col: state.pacman.col, row: state.pacman.row };
	let queue   = [{ col: start.col, row: start.row, firstDir: dir.none, path: [], steps: 0 }];
	let visited = {};
	visited[start.row + ',' + start.col] = true;
	while (queue.length > 0) {
		let cur = queue.shift();
		if (goalFn(cur.col, cur.row) && cur.firstDir !== dir.none) {
			state.aiPath = cur.path;
			return cur.firstDir;
		}
		for (let i = 0; i < bfsDirOrder.length; i++) {
			let d  = bfsDirOrder[i];
			let dl = delta(d);
			let nc = wrapCol(cur.col + dl[0]);
			let nr = cur.row + dl[1];
			let key = nr + ',' + nc;
			if (visited[key] || isPacWall(nc, nr)) continue;
			if (opts.blockFn   && opts.blockFn(nc, nr)) continue;
			if (opts.threatMap && !isTimeAwareSafe(nc, nr, cur.steps + 1, opts.threatMap)) continue;
			visited[key] = true;
			queue.push({
				col: nc, row: nr,
				firstDir: cur.firstDir === dir.none ? d : cur.firstDir,
				path: cur.path.concat([{ col: nc, row: nr }]),
				steps: cur.steps + 1
			});
		}
	}
	state.aiPath = [];
	return dir.none;
}

function aiBFSFlee(threatMap) {
	let start    = { col: state.pacman.col, row: state.pacman.row };
	let startGD  = ghostDistAt(start.col, start.row);
	let queue    = [{ col: start.col, row: start.row, firstDir: dir.none, steps: 0, path: [], minPathGD: startGD }];
	let visited  = {};
	visited[start.row + ',' + start.col] = true;
	let bestDir = dir.none, bestScore = -Infinity, bestPath = [];
	let trapDepth = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].trapDepth;
	while (queue.length > 0) {
		let cur = queue.shift();
		if (cur.steps > trapDepth) continue;
		if (cur.firstDir !== dir.none) {
			let curGD = ghostDistAt(cur.col, cur.row);
			let exits = 0;
			let ds = [dir.up, dir.left, dir.down, dir.right];
			for (let di = 0; di < ds.length; di++) {
				let ddl = delta(ds[di]);
				if (!isPacWall(cur.col + ddl[0], cur.row + ddl[1])) exits++;
			}
			// Weight minPathGD heavily: never pick a path that passes near a ghost.
			let sc = cur.minPathGD * 4 + (curGD === Infinity ? 50 : curGD) + exits * 0.5;
			if (sc > bestScore) { bestScore = sc; bestDir = cur.firstDir; bestPath = cur.path; }
		}
		for (let i = 0; i < bfsDirOrder.length; i++) {
			let d  = bfsDirOrder[i];
			let dl = delta(d);
			let nc = wrapCol(cur.col + dl[0]);
			let nr = cur.row + dl[1];
			let key = nr + ',' + nc;
			if (!visited[key] && !isPacWall(nc, nr)) {
				visited[key] = true;
				let nextGD      = ghostDistAt(nc, nr);
				let newMinPathGD = Math.min(cur.minPathGD, nextGD === Infinity ? 50 : nextGD);
				queue.push({
					col: nc, row: nr,
					firstDir: cur.firstDir === dir.none ? d : cur.firstDir,
					steps: cur.steps + 1,
					path:  cur.path.concat([{ col: nc, row: nr }]),
					minPathGD: newMinPathGD
				});
			}
		}
	}
	state.aiPath = bestPath;
	return bestDir;
}

// ── Trap detection ────────────────────────────────────────────────────────────

function isMoveTrapped(moveDir, threatMap) {
	let d  = delta(moveDir);
	let nc = wrapCol(state.pacman.col + d[0]);
	let nr = state.pacman.row + d[1];
	if (!isTimeAwareSafe(nc, nr, 1, threatMap)) return true;

	// BFS check: can we reach a safe junction within the next ~10 steps?
	let queue   = [{ col: nc, row: nr, steps: 1 }];
	let visited = {};
	visited[nr + ',' + nc] = true;

	while (queue.length > 0) {
		let cur = queue.shift();
		if (cur.steps > 12) return false;
		let exits = 0;
		let ds = [dir.up, dir.left, dir.down, dir.right];
		for (let i = 0; i < ds.length; i++) {
			let dl  = delta(ds[i]);
			let nnc = wrapCol(cur.col + dl[0]);
			let nnr = cur.row + dl[1];
			if (!isPacWall(nnc, nnr)) {
				exits++;
				let key = nnr + ',' + nnc;
				if (!visited[key] && isTimeAwareSafe(nnc, nnr, cur.steps + 1, threatMap)) {
					visited[key] = true;
					queue.push({ col: nnc, row: nnr, steps: cur.steps + 1 });
				}
			}
		}
		// A junction with 3+ exits that is still reachable is a safe escape.
		if (exits >= 3) return false;
	}
	return true;
}

function findSafestNonTrappedDir(threatMap) {
	let sdirs  = [dir.up, dir.left, dir.down, dir.right];
	let best   = dir.none;
	let maxDist = -1;
	for (let i = 0; i < sdirs.length; i++) {
		let d  = sdirs[i];
		let dl = delta(d);
		let nc = wrapCol(state.pacman.col + dl[0]);
		let nr = state.pacman.row + dl[1];
		if (isPacWall(nc, nr)) continue;
		if (!isMoveTrapped(d, threatMap)) {
			let minDist = Infinity;
			for (let j = 0; j < state.ghosts.length; j++) {
				let g = state.ghosts[j];
				if (!g.exited || (state.scaredTimer > 0 && !g.immune)) continue;
				let dist = Math.abs(g.col - nc) + Math.abs(g.row - nr);
				if (dist < minDist) minDist = dist;
			}
			if (minDist > maxDist) { maxDist = minDist; best = d; }
		}
	}
	return best;
}

// ── Power pellet targeting ────────────────────────────────────────────────────

function ghostClusterScore() {
	let best = null, bestSc = -Infinity;
	for (let i = 0; i < state.bigDots.length; i++) {
		let bd = state.bigDots[i];
		if (bd.eaten) continue;
		let sc = 0;
		for (let j = 0; j < state.ghosts.length; j++) {
			let g = state.ghosts[j];
			if (!g.exited) continue;
			let d = Math.abs(g.col - bd.col) + Math.abs(g.row - bd.row);
			if (d <= 6)  sc += 4;
			else if (d <= 10) sc += 2;
			else if (d <= 15) sc += 1;
		}
		let pd = Math.abs(state.pacman.col - bd.col) + Math.abs(state.pacman.row - bd.row);
		sc -= pd * 0.15;
		if (sc > bestSc) { bestSc = sc; best = { col: bd.col, row: bd.row, score: sc }; }
	}
	return best;
}

// ── Main AI decision ──────────────────────────────────────────────────────────

export function aiDecide() {
	if (state.pacman.moving) return;

	let cfg       = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]];
	let threatMap = buildTimeAwareThreatMap();
	let fpt       = aiFPT();
	let ngd       = nearestActiveDist();

	function isPellet(c, r) {
		for (let i = 0; i < state.bigDots.length; i++) {
			let bd = state.bigDots[i];
			if (!bd.eaten && bd.col === c && bd.row === r) return true;
		}
		return false;
	}
	function isDot(c, r) { return !!(state.dots[r] && state.dots[r][c] === 1); }
	function isScaredGhostAt(c, r) {
		return state.ghosts.some(function(g) {
			return g.exited && !g.returning && state.scaredTimer > 0 && !g.immune && g.col === c && g.row === r;
		});
	}
	function isActiveGhostAt(c, r) {
		return state.ghosts.some(function(g) {
			return g.exited && !g.returning && (state.scaredTimer === 0 || g.immune) && g.col === c && g.row === r;
		});
	}

	// 1. Flee if a ghost is dangerously close
	if (ngd <= cfg.fleeAt) {
		let fleeDir = aiBFSFlee(threatMap);
		if (fleeDir !== dir.none) { state.pacman.nextDir = fleeDir; return; }
	}

	// 2. Strategic power pellet
	if (state.scaredTimer === 0 && pelletCount() > 0) {
		let nearestPellet = pacmanBFS(isPellet, { threatMap: threatMap });
		if (nearestPellet !== dir.none) {
			let distToPellet = state.aiPath.length;
			let cluster      = ghostClusterScore();
			if ((cluster && cluster.score >= cfg.pelletCluster && distToPellet <= 3)
				|| isMoveTrapped(state.pacman.dir, threatMap)) {
				state.pacman.nextDir = nearestPellet; return;
			}
		}
	}

	// 3. Hunt scared ghosts
	if (cfg.huntScared && state.scaredTimer > 0 && countScared() > 0) {
		let huntDir = pacmanBFS(
			function(c, r) { return isScaredGhostAt(c, r); },
			{ blockFn: function(c, r) { return isActiveGhostAt(c, r); } }
		);
		if (huntDir !== dir.none && state.aiPath.length * fpt < state.scaredTimer - 60) {
			state.pacman.nextDir = huntDir; return;
		}
	}

	// 4. Cherry
	if (state.cherry) {
		let cherryDir = pacmanBFS(function(c, r) {
			return c === state.cherry.col && r === state.cherry.row;
		}, { threatMap: threatMap });
		if (cherryDir !== dir.none && state.aiPath.length * fpt < state.cherry.timer - 60) {
			state.pacman.nextDir = cherryDir; return;
		}
	}

	// 5. Eat dots
	let bestDotDir = pacmanBFS(function(c, r) {
		if (!isDot(c, r)) return false;
		return !isMoveTrapped(state.pacman.dir, threatMap);
	}, { threatMap: threatMap });
	if (bestDotDir !== dir.none) { state.pacman.nextDir = bestDotDir; return; }

	// 6. Fallback: flee
	let fallback = aiBFSFlee(threatMap);
	if (fallback !== dir.none) { state.pacman.nextDir = fallback; return; }

	// Emergency: imminent collision check
	let finalDir = state.pacman.nextDir !== dir.none ? state.pacman.nextDir : state.pacman.dir;
	if (finalDir !== dir.none) {
		let d  = delta(finalDir);
		let nc = wrapCol(state.pacman.col + d[0]);
		let nr = state.pacman.row + d[1];
		if (isActiveGhostAt(nc, nr) || !isTimeAwareSafe(nc, nr, 1, threatMap)) {
			let sdirs = [dir.up, dir.left, dir.down, dir.right];
			let safest = dir.none, bestDist = -1;
			for (let i = 0; i < sdirs.length; i++) {
				let sd  = sdirs[i];
				let sdl = delta(sd);
				let snc = wrapCol(state.pacman.col + sdl[0]);
				let snr = state.pacman.row + sdl[1];
				if (isPacWall(snc, snr) || isActiveGhostAt(snc, snr) || !isTimeAwareSafe(snc, snr, 1, threatMap)) continue;
				let minDist = Infinity;
				for (let j = 0; j < state.ghosts.length; j++) {
					let g = state.ghosts[j];
					if (!g.exited || (state.scaredTimer > 0 && !g.immune)) continue;
					let dist = Math.abs(g.col - snc) + Math.abs(g.row - snr);
					if (dist < minDist) minDist = dist;
				}
				if (minDist > bestDist) { bestDist = minDist; safest = sd; }
			}
			state.pacman.nextDir = safest !== dir.none ? safest : oppositeDir(state.pacman.dir);
		}
	}
}

function oppositeDir(d) {
	if (d === dir.left)  return dir.right;
	if (d === dir.right) return dir.left;
	if (d === dir.up)    return dir.down;
	if (d === dir.down)  return dir.up;
	return dir.none;
}
