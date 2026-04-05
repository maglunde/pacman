import { dir, TILE, SPEED, PACMAN_DOT_SPEED_FACTOR, AI_PERSONALITIES, AI_PERSONALITY_KEYS } from './constants.js';
import { state } from './state.js';
import { delta, isPacWall, wrapCol } from './grid.js';
import { ghostLookahead } from './ghost.js';

// ── Internal AI state ─────────────────────────────────────────────────────────

var bfsDirOrder = [dir.up, dir.left, dir.down, dir.right];

export function shuffleBFSDirs() {
	var a = [dir.up, dir.left, dir.down, dir.right];
	for (var i = a.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
	}
	bfsDirOrder = a;
}

// ── Helper queries ────────────────────────────────────────────────────────────

function aiFPT() { return Math.ceil(TILE / (SPEED * PACMAN_DOT_SPEED_FACTOR)); } // frames per tile

function nearestActiveDist() {
	var m = Infinity;
	for (var i = 0; i < state.ghosts.length; i++) {
		var g = state.ghosts[i];
		if (!g.exited || (state.scaredTimer > 0 && !g.immune)) continue;
		var d = Math.abs(g.col - state.pacman.col) + Math.abs(g.row - state.pacman.row);
		if (d < m) m = d;
	}
	return m;
}

function countScared() {
	var n = 0;
	for (var i = 0; i < state.ghosts.length; i++) {
		var g = state.ghosts[i];
		if (g.exited && !g.returning && !g.immune && state.scaredTimer > 0) n++;
	}
	return n;
}

function pelletCount() {
	var n = 0;
	for (var i = 0; i < state.bigDots.length; i++)
		if (!state.bigDots[i].eaten) n++;
	return n;
}

function ghostDistAt(col, row) {
	var minGD = Infinity;
	for (var i = 0; i < state.ghosts.length; i++) {
		var g = state.ghosts[i];
		if (!g.exited || g.returning || (state.scaredTimer > 0 && !g.immune)) continue;
		var gd = Math.abs(g.col - col) + Math.abs(g.row - row);
		if (gd < minGD) minGD = gd;
	}
	return minGD;
}

// ── Threat map ────────────────────────────────────────────────────────────────

function buildTimeAwareThreatMap() {
	var map  = {};
	var LOOK = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].look;
	state.ghosts.forEach(function(g) {
		if (!g.exited || g.returning || (state.scaredTimer > 0 && !g.immune)) return;
		var key = g.row + ',' + g.col;
		if (!(key in map) || map[key] > 0) map[key] = 0;
		var path = ghostLookahead(g, LOOK);
		for (var i = 0; i < path.length; i++) {
			var pk  = path[i].row + ',' + path[i].col;
			var arr = i + 1;
			if (!(pk in map) || map[pk] > arr) map[pk] = arr;
		}
	});
	return map;
}

function isTimeAwareSafe(col, row, pacSteps, threatMap) {
	var key = row + ',' + col;
	if (!(key in threatMap)) return true;
	var margin = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].safetyMargin;
	return pacSteps < threatMap[key] - margin;
}

// ── BFS ───────────────────────────────────────────────────────────────────────
// opts: { blockFn?(col,row)→bool, threatMap? }
// Returns the first direction toward the nearest tile where goalFn returns true,
// or dir.none if unreachable. Also writes the path to state.aiPath.

function pacmanBFS(goalFn, opts) {
	opts = opts || {};
	var start   = { col: state.pacman.col, row: state.pacman.row };
	var queue   = [{ col: start.col, row: start.row, firstDir: dir.none, path: [], steps: 0 }];
	var visited = {};
	visited[start.row + ',' + start.col] = true;
	while (queue.length > 0) {
		var cur = queue.shift();
		if (goalFn(cur.col, cur.row) && cur.firstDir !== dir.none) {
			state.aiPath = cur.path;
			return cur.firstDir;
		}
		for (var i = 0; i < bfsDirOrder.length; i++) {
			var d  = bfsDirOrder[i];
			var dl = delta(d);
			var nc = wrapCol(cur.col + dl[0]);
			var nr = cur.row + dl[1];
			var key = nr + ',' + nc;
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
	var start    = { col: state.pacman.col, row: state.pacman.row };
	var startGD  = ghostDistAt(start.col, start.row);
	var queue    = [{ col: start.col, row: start.row, firstDir: dir.none, steps: 0, path: [], minPathGD: startGD }];
	var visited  = {};
	visited[start.row + ',' + start.col] = true;
	var bestDir = dir.none, bestScore = -Infinity, bestPath = [];
	var trapDepth = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].trapDepth;
	while (queue.length > 0) {
		var cur = queue.shift();
		if (cur.steps > trapDepth) continue;
		if (cur.firstDir !== dir.none) {
			var curGD = ghostDistAt(cur.col, cur.row);
			var exits = 0;
			var ds = [dir.up, dir.left, dir.down, dir.right];
			for (var di = 0; di < ds.length; di++) {
				var ddl = delta(ds[di]);
				if (!isPacWall(cur.col + ddl[0], cur.row + ddl[1])) exits++;
			}
			// Weight minPathGD heavily: never pick a path that passes near a ghost.
			var sc = cur.minPathGD * 4 + (curGD === Infinity ? 50 : curGD) + exits * 0.5;
			if (sc > bestScore) { bestScore = sc; bestDir = cur.firstDir; bestPath = cur.path; }
		}
		for (var i = 0; i < bfsDirOrder.length; i++) {
			var d  = bfsDirOrder[i];
			var dl = delta(d);
			var nc = wrapCol(cur.col + dl[0]);
			var nr = cur.row + dl[1];
			var key = nr + ',' + nc;
			if (!visited[key] && !isPacWall(nc, nr)) {
				visited[key] = true;
				var nextGD      = ghostDistAt(nc, nr);
				var newMinPathGD = Math.min(cur.minPathGD, nextGD === Infinity ? 50 : nextGD);
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
	var d  = delta(moveDir);
	var nc = wrapCol(state.pacman.col + d[0]);
	var nr = state.pacman.row + d[1];
	if (!isTimeAwareSafe(nc, nr, 1, threatMap)) return true;

	// BFS check: can we reach a safe junction within the next ~10 steps?
	var queue   = [{ col: nc, row: nr, steps: 1 }];
	var visited = {};
	visited[nr + ',' + nc] = true;

	while (queue.length > 0) {
		var cur = queue.shift();
		if (cur.steps > 12) return false;
		var exits = 0;
		var ds = [dir.up, dir.left, dir.down, dir.right];
		for (var i = 0; i < ds.length; i++) {
			var dl  = delta(ds[i]);
			var nnc = wrapCol(cur.col + dl[0]);
			var nnr = cur.row + dl[1];
			if (!isPacWall(nnc, nnr)) {
				exits++;
				var key = nnr + ',' + nnc;
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
	var sdirs  = [dir.up, dir.left, dir.down, dir.right];
	var best   = dir.none;
	var maxDist = -1;
	for (var i = 0; i < sdirs.length; i++) {
		var d  = sdirs[i];
		var dl = delta(d);
		var nc = wrapCol(state.pacman.col + dl[0]);
		var nr = state.pacman.row + dl[1];
		if (isPacWall(nc, nr)) continue;
		if (!isMoveTrapped(d, threatMap)) {
			var minDist = Infinity;
			for (var j = 0; j < state.ghosts.length; j++) {
				var g = state.ghosts[j];
				if (!g.exited || (state.scaredTimer > 0 && !g.immune)) continue;
				var dist = Math.abs(g.col - nc) + Math.abs(g.row - nr);
				if (dist < minDist) minDist = dist;
			}
			if (minDist > maxDist) { maxDist = minDist; best = d; }
		}
	}
	return best;
}

// ── Power pellet targeting ────────────────────────────────────────────────────

function ghostClusterScore() {
	var best = null, bestSc = -Infinity;
	for (var i = 0; i < state.bigDots.length; i++) {
		var bd = state.bigDots[i];
		if (bd.eaten) continue;
		var sc = 0;
		for (var j = 0; j < state.ghosts.length; j++) {
			var g = state.ghosts[j];
			if (!g.exited) continue;
			var d = Math.abs(g.col - bd.col) + Math.abs(g.row - bd.row);
			if (d <= 6)  sc += 4;
			else if (d <= 10) sc += 2;
			else if (d <= 15) sc += 1;
		}
		var pd = Math.abs(state.pacman.col - bd.col) + Math.abs(state.pacman.row - bd.row);
		sc -= pd * 0.15;
		if (sc > bestSc) { bestSc = sc; best = { col: bd.col, row: bd.row, score: sc }; }
	}
	return best;
}

// ── Main AI decision ──────────────────────────────────────────────────────────

export function aiDecide() {
	if (state.pacman.moving) return;

	var cfg       = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]];
	var threatMap = buildTimeAwareThreatMap();
	var fpt       = aiFPT();
	var ngd       = nearestActiveDist();

	function isPellet(c, r) {
		for (var i = 0; i < state.bigDots.length; i++) {
			var bd = state.bigDots[i];
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
		var fleeDir = aiBFSFlee(threatMap);
		if (fleeDir !== dir.none) { state.pacman.nextDir = fleeDir; return; }
	}

	// 2. Strategic power pellet
	if (state.scaredTimer === 0 && pelletCount() > 0) {
		var nearestPellet = pacmanBFS(isPellet, { threatMap: threatMap });
		if (nearestPellet !== dir.none) {
			var distToPellet = state.aiPath.length;
			var cluster      = ghostClusterScore();
			if ((cluster && cluster.score >= cfg.pelletCluster && distToPellet <= 3)
				|| isMoveTrapped(state.pacman.dir, threatMap)) {
				state.pacman.nextDir = nearestPellet; return;
			}
		}
	}

	// 3. Hunt scared ghosts
	if (cfg.huntScared && state.scaredTimer > 0 && countScared() > 0) {
		var huntDir = pacmanBFS(
			function(c, r) { return isScaredGhostAt(c, r); },
			{ blockFn: function(c, r) { return isActiveGhostAt(c, r); } }
		);
		if (huntDir !== dir.none && state.aiPath.length * fpt < state.scaredTimer - 60) {
			state.pacman.nextDir = huntDir; return;
		}
	}

	// 4. Cherry
	if (state.cherry) {
		var cherryDir = pacmanBFS(function(c, r) {
			return c === state.cherry.col && r === state.cherry.row;
		}, { threatMap: threatMap });
		if (cherryDir !== dir.none && state.aiPath.length * fpt < state.cherry.timer - 60) {
			state.pacman.nextDir = cherryDir; return;
		}
	}

	// 5. Eat dots
	var bestDotDir = pacmanBFS(function(c, r) {
		if (!isDot(c, r)) return false;
		return !isMoveTrapped(state.pacman.dir, threatMap);
	}, { threatMap: threatMap });
	if (bestDotDir !== dir.none) { state.pacman.nextDir = bestDotDir; return; }

	// 6. Fallback: flee
	var fallback = aiBFSFlee(threatMap);
	if (fallback !== dir.none) { state.pacman.nextDir = fallback; return; }

	// Emergency: imminent collision check
	var finalDir = state.pacman.nextDir !== dir.none ? state.pacman.nextDir : state.pacman.dir;
	if (finalDir !== dir.none) {
		var d  = delta(finalDir);
		var nc = wrapCol(state.pacman.col + d[0]);
		var nr = state.pacman.row + d[1];
		if (isActiveGhostAt(nc, nr) || !isTimeAwareSafe(nc, nr, 1, threatMap)) {
			var sdirs = [dir.up, dir.left, dir.down, dir.right];
			var safest = dir.none, bestDist = -1;
			for (var i = 0; i < sdirs.length; i++) {
				var sd  = sdirs[i];
				var sdl = delta(sd);
				var snc = wrapCol(state.pacman.col + sdl[0]);
				var snr = state.pacman.row + sdl[1];
				if (isPacWall(snc, snr) || isActiveGhostAt(snc, snr) || !isTimeAwareSafe(snc, snr, 1, threatMap)) continue;
				var minDist = Infinity;
				for (var j = 0; j < state.ghosts.length; j++) {
					var g = state.ghosts[j];
					if (!g.exited || (state.scaredTimer > 0 && !g.immune)) continue;
					var dist = Math.abs(g.col - snc) + Math.abs(g.row - snr);
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
