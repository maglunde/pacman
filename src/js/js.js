import '../sass/style.scss';
import { initSprites, s_map, s_pacman, s_blinky, s_pinky, s_inky, s_clyde, s_scaredGhost, s_dot, s_bigDot } from './sprite.js';

var
canvas,
ctx,
width,
height,
img,
mapPixels,
mapOffX,
mapOffY,

TILE = 16,
SPEED = .8,
GHOST_SPEED = .68,
GRID_COLS,
GRID_ROWS,
grid,
dots,
bigDots,
dotsEaten = 0,
ghosts,

SCARED_DURATION = 1000,
scaredTimer = 0,

score     = 0,
highScore = parseInt(localStorage.getItem('pacman-hi') || '0'),
lives     = 3,
level     = 1,
ghostCombo = 0,
stateTimer = 0,
cherry = null,
scorePopups = [],

gameState = 'menu',  // 'menu'|'ready'|'playing'|'dead'|'gameover'|'win'
aiMode = false,
menuSelected = 0,

audioCtx   = null,
wakaBuffer = null,

frames = 0,
frame  = 0,

dir = {
	none:  -1,
	left:   0,
	up:     1,
	right:  2,
	down:   3
},

pacman = {
	init: function() {
		this.col     = 13;
		this.row     = 23;
		this.dir     = dir.none;
		this.nextDir = dir.none;
		this.moving  = false;
		this.sprite  = s_pacman.round;

		var p = tilePixel(this.col, this.row);
		this.x = p.x;
		this.y = p.y;
		this.targetX = p.x;
		this.targetY = p.y;
	},

	update: function() {
		if (!this.moving) {
			// Forsøk ønsket retning først; hvis blokkert, prøv nåværende retning
			var turned = false;
			if (this.nextDir !== dir.none) {
				var d = delta(this.nextDir);
				if (!isPacWall(this.col + d[0], this.row + d[1])) {
					this.dir     = this.nextDir;
					this.nextDir = dir.none;
					applyMove(this, d[0], d[1]);
					turned = true;
				}
			}

			if (!turned && this.dir !== dir.none) {
				var d = delta(this.dir);
				if (!isPacWall(this.col + d[0], this.row + d[1])) {
					applyMove(this, d[0], d[1]);
				}
			}
		}

		if (this.moving) {
			var dx = this.targetX - this.x;
			var dy = this.targetY - this.y;
			if (Math.abs(dx) <= SPEED && Math.abs(dy) <= SPEED) {
				this.x      = this.targetX;
				this.y      = this.targetY;
				this.moving = false;
				if (dots[this.row][this.col] === 1) {
					dots[this.row][this.col] = 0;
					dotsEaten++;
					score += 10;
					playWaka();
				}
				for (var i = 0; i < bigDots.length; i++) {
					var bd = bigDots[i];
					if (!bd.eaten && bd.col === this.col && bd.row === this.row) {
						bd.eaten = true;
						score += 50;
						scaredTimer = SCARED_DURATION;
						ghostCombo = 0;
						ghosts.forEach(function(g) { g.immune = false; });
					}
				}
			} else {
				var pacSpd = dots[this.row][this.col] === 1 ? SPEED * 0.9 : SPEED;
				this.x += Math.sign(dx) * pacSpd;
				this.y += Math.sign(dy) * pacSpd;
			}
		}

		switch (this.dir) {
			case dir.left:  this.sprite = s_pacman.left;  break;
			case dir.up:    this.sprite = s_pacman.up;    break;
			case dir.right: this.sprite = s_pacman.right; break;
			case dir.down:  this.sprite = s_pacman.down;  break;
			default:        this.sprite = s_pacman.round; break;
		}

		if (frames % 10 === 0) frame++;
	},

	draw: function() {
		var mapW = GRID_COLS * TILE;
		var relX = this.x - mapOffX;
		this.sprite[frame % 2].draw(ctx, this.x, this.y);
		if (relX < 28)
			this.sprite[frame % 2].draw(ctx, this.x + mapW, this.y);
		if (relX > mapW - 28)
			this.sprite[frame % 2].draw(ctx, this.x - mapW, this.y);
	}
}
;

function delta(d) {
	if (d === dir.left)  return [-1,  0];
	if (d === dir.right) return [ 1,  0];
	if (d === dir.up)    return [ 0, -1];
	if (d === dir.down)  return [ 0,  1];
	return [0, 0];
}

function tilePixel(col, row) {
	return {
		x: mapOffX + col * TILE + TILE / 2 - 14,
		y: mapOffY + row * TILE + TILE / 2 - 14
	};
}

// Ghost house region — ghosts can move up through any wall here to exit
var GHOST_HOUSE_ROW_MIN = 12, GHOST_HOUSE_ROW_MAX = 15;
var GHOST_HOUSE_COL_MIN = 11, GHOST_HOUSE_COL_MAX = 16;
// The door tile(s) that Pac-Man cannot enter
var DOOR_ROW = 11;
var DOOR_COL_MIN = 12, DOOR_COL_MAX = 15;

function isDoor(col, row) {
	col = ((col % GRID_COLS) + GRID_COLS) % GRID_COLS;
	return row === DOOR_ROW && col >= DOOR_COL_MIN && col <= DOOR_COL_MAX;
}

function inGhostHouse(col, row) {
	col = ((col % GRID_COLS) + GRID_COLS) % GRID_COLS;
	return row >= GHOST_HOUSE_ROW_MIN && row <= GHOST_HOUSE_ROW_MAX
		&& col >= GHOST_HOUSE_COL_MIN && col <= GHOST_HOUSE_COL_MAX;
}

function isGridWall(col, row) {
	if (row < 0 || row >= GRID_ROWS) return true;
	col = ((col % GRID_COLS) + GRID_COLS) % GRID_COLS;
	return grid[row][col] === 1;
}

// Pac-Man uses pixel-based wall detection only (door is already a wall in the sprite)
function isPacWall(col, row) {
	return isGridWall(col, row);
}

// Ghosts can move up through ghost house walls/door to exit; cannot re-enter going down
function isGhostWall(col, row, moveDir) {
	if (moveDir === dir.up && (isDoor(col, row) || inGhostHouse(col, row))) return false;
	return isGridWall(col, row);
}

function oppositeDir(d) {
	if (d === dir.left)  return dir.right;
	if (d === dir.right) return dir.left;
	if (d === dir.up)    return dir.down;
	if (d === dir.down)  return dir.up;
	return dir.none;
}

function ghostSpriteIdx(d) {
	if (d === dir.left)  return 0;
	if (d === dir.up)    return 1;
	if (d === dir.right) return 3;
	return 2;
}

function ghostTilePixel(col, row) {
	return {
		x: mapOffX + col * TILE + TILE / 2 - 15,
		y: mapOffY + row * TILE + TILE / 2 - 15
	};
}

function makeGhost(startCol, startRow, sprites, releaseDelay, getTarget, pathColor) {
	return {
		startCol: startCol, startRow: startRow,
		pathColor: pathColor || '#ffffff',
		col: startCol,      row: startRow,
		dir: dir.up, moving: false,
		x: 0, y: 0, targetX: 0, targetY: 0,
		sprites: sprites,
		releaseDelay: releaseDelay,
		releaseFrame: releaseDelay,
		getTarget: getTarget,

		init: function() {
			this.col = this.startCol;
			this.row = this.startRow;
			this.dir = dir.up;
			this.moving = false;
			this.exited = false;
			this.immune = false;
			this.releaseFrame = frames + this.releaseDelay;
			var p = ghostTilePixel(this.col, this.row);
			this.x = p.x; this.y = p.y;
			this.targetX = p.x; this.targetY = p.y;
		},

		update: function(speedFactor) {
			if (frames < this.releaseFrame) return;
			speedFactor = speedFactor || 1;

			if (!this.moving) {
				// Exit routine: navigate to col 13, then move up until outside house
				if (!this.exited) {
					if (this.col !== 13) {
						var dc = this.col < 13 ? 1 : -1;
						this.dir = dc > 0 ? dir.right : dir.left;
						applyMove(this, dc, 0);
					} else {
						this.dir = dir.up;
						applyMove(this, 0, -1);
					}
					// exited/immune sjekkes når bevegelsen er ferdig (se nedenfor)
				} else {

				var opp = oppositeDir(this.dir);
				var dirs = [dir.up, dir.left, dir.down, dir.right];
				var best = dir.none;

				if (scaredTimer > 0 && !this.immune) {
					// Tilfeldig retning når skremt (som i originalen)
					var choices = [];
					for (var i = 0; i < dirs.length; i++) {
						var d = dirs[i];
						var dl = delta(d);
						if (!isGhostWall(this.col + dl[0], this.row + dl[1], d))
							choices.push(d);
					}
					// Foretrekk å ikke reversere, men gjør det hvis det er eneste utvei
					var noReverse = choices.filter(function(d) { return d !== opp; });
					var pool = noReverse.length > 0 ? noReverse : choices;
					best = pool[Math.floor(Math.random() * pool.length)];
				} else {
					var target = this.getTarget();
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
				} // end else (exited)
			}

			if (this.moving) {
				var dx = this.targetX - this.x, dy = this.targetY - this.y;
				if (Math.abs(dx) <= GHOST_SPEED && Math.abs(dy) <= GHOST_SPEED) {
					this.x = this.targetX; this.y = this.targetY;
					this.moving = false;
					if (!this.exited && this.row < GHOST_HOUSE_ROW_MIN) {
						this.exited = true;
					}
				} else {
					var spd = ((scaredTimer > 0 && !this.immune) ? GHOST_SPEED * 0.5 : GHOST_SPEED) * speedFactor;
					this.x += Math.sign(dx) * spd;
					this.y += Math.sign(dy) * spd;
				}
			}
		},

		draw: function() {
			if (scaredTimer > 0 && this.exited && !this.immune) {
				// Blink mellom blå og hvit de siste 200 frames
				var white = scaredTimer <= 200 && Math.floor(frames / 8) % 2 === 1;
				s_scaredGhost[white ? 1 : 0].draw(ctx, this.x, this.y);
			} else {
				this.sprites[ghostSpriteIdx(this.dir)].draw(ctx, this.x, this.y);
			}
		}
	};
}

function initGhosts() {
	ghosts = [
		makeGhost(12, 14, s_blinky, 0, function() {
			return { col: pacman.col, row: pacman.row };
		}, '#ff0000'),
		makeGhost(13, 14, s_pinky, 300, function() {
			var d = delta(pacman.dir !== dir.none ? pacman.dir : dir.up);
			return { col: pacman.col + d[0]*4, row: pacman.row + d[1]*4 };
		}, '#ffb8ff'),
		makeGhost(14, 14, s_inky, 600, function() {
			var d = delta(pacman.dir !== dir.none ? pacman.dir : dir.up);
			var pivot = { col: pacman.col + d[0]*2, row: pacman.row + d[1]*2 };
			var blinky = ghosts[0];
			return { col: pivot.col*2 - blinky.col, row: pivot.row*2 - blinky.row };
		}, '#00ffff'),
		makeGhost(15, 14, s_clyde, 900, function() {
			var dist = Math.abs(pacman.col - ghosts[3].col) + Math.abs(pacman.row - ghosts[3].row);
			return dist > 8
				? { col: pacman.col, row: pacman.row }
				: { col: 0, row: GRID_ROWS - 1 };
		}, '#ffb851')
	];
	ghosts.forEach(function(g) { g.init(); });
}

function applyMove(pac, dc, dr) {
	pac.col += dc;
	pac.row += dr;
	if (pac.col < 0 || pac.col >= GRID_COLS) {
		pac.x   = dc < 0 ? tilePixel(GRID_COLS, pac.row).x : tilePixel(-1, pac.row).x;
		pac.col = ((pac.col % GRID_COLS) + GRID_COLS) % GRID_COLS;
	}
	var p = tilePixel(pac.col, pac.row);
	pac.targetX = p.x;
	pac.targetY = p.y;
	pac.moving  = true;
}

function initWallData() {
	GRID_COLS = Math.floor(s_map.w / TILE);
	GRID_ROWS = Math.floor(s_map.h / TILE);
	var mapDrawW = GRID_COLS * TILE;
	var mapDrawH = GRID_ROWS * TILE;
	mapOffX = width / 4 - mapDrawW / 2;
	mapOffY = height / 4 - mapDrawH / 2;
	var offscreen = document.createElement('canvas');
	offscreen.width  = s_map.w;
	offscreen.height = s_map.h;
	var offCtx = offscreen.getContext('2d');
	offCtx.drawImage(img, s_map.x, s_map.y, s_map.w, s_map.h, 0, 0, s_map.w, s_map.h);
	mapPixels = offCtx.getImageData(0, 0, s_map.w, s_map.h).data;
}

function isWall(mx, my) {
	if (mx < 0 || my < 0 || mx >= s_map.w || my >= s_map.h) return true;
	var idx = (Math.floor(my) * s_map.w + Math.floor(mx)) * 4;
	return (mapPixels[idx] + mapPixels[idx+1] + mapPixels[idx+2]) > 80;
}

function buildGrid() {
	// Tile er vegg hvis mer enn 5% av pikslene er vegger (fanger anti-aliasede hjørner)
	var threshold = Math.floor(TILE * TILE * 0.05);
	grid = [];
	for (var row = 0; row < GRID_ROWS; row++) {
		grid[row] = [];
		for (var col = 0; col < GRID_COLS; col++) {
			var x0 = col * TILE, y0 = row * TILE;
			var count = 0;
			for (var dx = 0; dx < TILE; dx++) {
				for (var dy = 0; dy < TILE; dy++) {
					if (isWall(x0 + dx, y0 + dy)) count++;
				}
			}
			grid[row][col] = count > threshold ? 1 : 0;
		}
	}

}

// Classic power pellet positions
var BIG_DOT_POSITIONS = [
	{col: 1, row: 3}, {col: 26, row: 3},
	{col: 1, row: 26}, {col: 26, row: 26}
];

function initBigDots() {
	bigDots = BIG_DOT_POSITIONS.map(function(p) {
		return { col: p.col, row: p.row, eaten: false };
	});
}

function initDots() {
	dots = [];
	for (var row = 0; row < GRID_ROWS; row++) {
		dots[row] = [];
		for (var col = 0; col < GRID_COLS; col++)
			dots[row][col] = 0;
	}

	// Flood fill fra startposisjon
	var queue = [{ col: 13, row: 23 }];
	var visited = [];
	for (var r = 0; r < GRID_ROWS; r++) {
		visited[r] = [];
		for (var c = 0; c < GRID_COLS; c++)
			visited[r][c] = false;
	}
	visited[23][13] = true;

	while (queue.length > 0) {
		var cur = queue.shift();
		dots[cur.row][cur.col] = 1;
		var neighbors = [
			{ col: cur.col - 1, row: cur.row },
			{ col: cur.col + 1, row: cur.row },
			{ col: cur.col, row: cur.row - 1 },
			{ col: cur.col, row: cur.row + 1 }
		];
		for (var i = 0; i < neighbors.length; i++) {
			var n = neighbors[i];
			if (n.col >= 0 && n.col < GRID_COLS && n.row >= 0 && n.row < GRID_ROWS
				&& !visited[n.row][n.col] && grid[n.row][n.col] === 0) {
				visited[n.row][n.col] = true;
				queue.push(n);
			}
		}
	}
}

function main() {
	canvas = document.createElement("canvas");
	ctx    = canvas.getContext("2d");
	width  = 1200;
	height = 1200;
	canvas.width  = width;
	canvas.height = height;
	document.body.appendChild(canvas);
	document.addEventListener("keydown", keydown);
	initPathPanel();

	img     = new Image();
	img.src = "res/sheet.png";

	img.onload = function() {
		initSprites(img);
		initWallData();
		buildGrid();
		initDots();
		initBigDots();
		run();
	};
}

function levelSpeedFactor() { return 1 + (level - 1) * 0.06; }

function startReady() {
	pacman.init();
	initGhosts();
	scaredTimer  = 0;
	ghostCombo   = 0;
	cherry       = null;
	scorePopups  = [];
	gameState    = 'ready';
	stateTimer   = 150; // ~2.5s
}

function newGame() {
	score  = 0;
	lives  = 3;
	level  = 1;
	initDots();
	initBigDots();
	startReady();
}

function nextLevel() {
	level++;
	initDots();
	initBigDots();
	startReady();
}

function loseLife() {
	lives--;
	if (lives <= 0) {
		if (score > highScore) {
			highScore = score;
			localStorage.setItem('pacman-hi', highScore);
		}
		gameState  = 'gameover';
		stateTimer = 180;
	} else {
		gameState  = 'dead';
		stateTimer = 120;
	}
}

function run() {
	newGame();
	gameState = 'menu';
	var loop = function() {
		if (gameState === 'playing' || gameState === 'ready' ||
		    gameState === 'dead'    || gameState === 'gameover' || gameState === 'win') {
			update();
		}
		render();
		window.requestAnimationFrame(loop);
	};
	loop();
}

var aiPath = [];
var showPaths = { pacman: true, blinky: true, pinky: true, inky: true, clyde: true };
var pathPanel = null;

function initPathPanel() {
	pathPanel = document.createElement('div');
	pathPanel.id = 'path-panel';
	var entries = [
		{ key: 'pacman', label: 'Pac-Man',  color: '#ffff00' },
		{ key: 'blinky', label: 'Blinky',   color: '#ff0000' },
		{ key: 'pinky',  label: 'Pinky',    color: '#ffb8ff' },
		{ key: 'inky',   label: 'Inky',     color: '#00ffff' },
		{ key: 'clyde',  label: 'Clyde',    color: '#ffb851' },
	];
	entries.forEach(function(e) {
		var lbl = document.createElement('label');
		lbl.style.color = e.color;
		var cb = document.createElement('input');
		cb.type = 'checkbox';
		cb.checked = true;
		cb.addEventListener('change', function() { showPaths[e.key] = cb.checked; });
		lbl.appendChild(cb);
		lbl.appendChild(document.createTextNode(e.label));
		pathPanel.appendChild(lbl);
	});
	document.body.appendChild(pathPanel);
}

function setPathPanelVisible(v) {
	if (pathPanel) pathPanel.style.display = v ? 'block' : 'none';
}

function hexToRgb(hex) {
	var r = parseInt(hex.slice(1,3),16);
	var g = parseInt(hex.slice(3,5),16);
	var b = parseInt(hex.slice(5,7),16);
	return r+','+g+','+b;
}

function ghostLookahead(g, steps) {
	if (!g.exited) return [];
	var path = [];
	var col = g.col, row = g.row, curDir = g.dir;
	for (var s = 0; s < steps; s++) {
		var opp = oppositeDir(curDir);
		var target = g.getTarget();
		var best = dir.none, bestDist = Infinity;
		var ds = [dir.up, dir.left, dir.down, dir.right];
		for (var i = 0; i < ds.length; i++) {
			var d = ds[i];
			if (d === opp) continue;
			var dl = delta(d);
			var nc = ((col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
			var nr = row + dl[1];
			if (!isGhostWall(nc, nr, d)) {
				var dist = Math.abs(target.col - nc) + Math.abs(target.row - nr);
				if (dist < bestDist) { bestDist = dist; best = d; }
			}
		}
		if (best === dir.none) best = opp;
		if (best === dir.none) break;
		var dlt = delta(best);
		col = ((col + dlt[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
		row = row + dlt[1];
		curDir = best;
		path.push({ col: col, row: row });
	}
	return path;
}

function aiBFS(goalFn, blockFn) {
	var start = { col: pacman.col, row: pacman.row };
	var queue = [{ col: start.col, row: start.row, firstDir: dir.none, path: [] }];
	var visited = {};
	visited[start.row + ',' + start.col] = true;
	while (queue.length > 0) {
		var cur = queue.shift();
		if (goalFn(cur.col, cur.row) && cur.firstDir !== dir.none) {
			aiPath = cur.path;
			return cur.firstDir;
		}
		var ds = [dir.up, dir.left, dir.down, dir.right];
		for (var i = 0; i < ds.length; i++) {
			var d = ds[i];
			var dl = delta(d);
			var nc = ((cur.col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
			var nr = cur.row + dl[1];
			var key = nr + ',' + nc;
			if (!visited[key] && !isPacWall(nc, nr) && !(blockFn && blockFn(nc, nr))) {
				visited[key] = true;
				queue.push({
					col: nc, row: nr,
					firstDir: cur.firstDir === dir.none ? d : cur.firstDir,
					path: cur.path.concat([{col: nc, row: nr}])
				});
			}
		}
	}
	aiPath = [];
	return dir.none;
}

function isGhostThreat(col, row, radius) {
	for (var i = 0; i < ghosts.length; i++) {
		var g = ghosts[i];
		if (!g.exited || (scaredTimer > 0 && !g.immune)) continue;
		if (Math.abs(g.col - col) + Math.abs(g.row - row) <= radius) return true;
	}
	return false;
}

function aiDecide() {
	if (pacman.moving) return;

	var threatened = isGhostThreat(pacman.col, pacman.row, 4);

	// Jakt på skremt spøkelse
	if (scaredTimer > 60) {
		var chased = aiBFS(function(col, row) {
			for (var i = 0; i < ghosts.length; i++) {
				var g = ghosts[i];
				if (g.exited && !g.immune && g.col === col && g.row === row) return true;
			}
			return false;
		});
		if (chased !== dir.none) { pacman.nextDir = chased; return; }
	}

	// Truet — prøv å nå en power pellet
	if (threatened) {
		var pellet = aiBFS(function(col, row) {
			for (var i = 0; i < bigDots.length; i++) {
				var bd = bigDots[i];
				if (!bd.eaten && bd.col === col && bd.row === row) return true;
			}
			return false;
		}, function(col, row) { return isGhostThreat(col, row, 2); });
		if (pellet !== dir.none) { pacman.nextDir = pellet; return; }
	}

	// Gå mot nærmeste dot — unngå tiles nær spøkelser
	var safe = aiBFS(
		function(col, row) { return dots[row] && dots[row][col] === 1; },
		function(col, row) { return isGhostThreat(col, row, 4); }
	);
	if (safe !== dir.none) { pacman.nextDir = safe; return; }

	// Ingen trygg sti — flykt fra nærmeste spøkelse
	var flee = aiBFS(function(col, row) {
		return !isGhostThreat(col, row, 8);
	});
	if (flee !== dir.none) pacman.nextDir = flee;
}

function addPopup(text, col, row) {
	scorePopups.push({ text: text, x: mapOffX + col * TILE, y: mapOffY + row * TILE, life: 60 });
}

function update() {
	frames++;

	// State timers
	if (gameState === 'ready') {
		if (--stateTimer <= 0) gameState = 'playing';
		return;
	}
	if (gameState === 'dead') {
		if (--stateTimer <= 0) startReady();
		return;
	}
	if (gameState === 'gameover') {
		if (--stateTimer <= 0) gameState = 'menu';
		return;
	}
	if (gameState === 'win') {
		if (--stateTimer <= 0) nextLevel();
		return;
	}
	if (gameState !== 'playing') return;

	// Scared timer
	if (scaredTimer > 0) {
		scaredTimer--;
		if (scaredTimer === 0) {
			ghostCombo = 0;
			ghosts.forEach(function(g) { g.immune = false; });
		}
	}

	// Score popups
	scorePopups.forEach(function(p) { p.y -= 0.4; p.life--; });
	scorePopups = scorePopups.filter(function(p) { return p.life > 0; });

	// Cherry
	if (cherry) {
		cherry.timer--;
		if (cherry.timer <= 0) cherry = null;
		else if (cherry.col === pacman.col && cherry.row === pacman.row) {
			score += 100;
			addPopup('100', cherry.col, cherry.row);
			cherry = null;
		}
	} else if (dotsEaten === 70 && level <= 5) {
		cherry = { col: 13, row: 17, timer: 600 };
	}

	if (aiMode) aiDecide();
	pacman.update();
	ghosts.forEach(function(g) { g.update(levelSpeedFactor()); });

	// Ghost collision
	ghosts.forEach(function(g) {
		if (!g.exited) return;
		if (g.col === pacman.col && g.row === pacman.row) {
			if (scaredTimer > 0 && !g.immune) {
				ghostCombo++;
				var pts = 200 * Math.pow(2, ghostCombo - 1);
				score += pts;
				addPopup(pts.toString(), g.col, g.row);
				g.init();
				g.immune = true;
			} else {
				loseLife();
			}
		}
	});

	// Vinn-sjekk
	var remaining = 0;
	for (var r = 0; r < GRID_ROWS; r++)
		for (var c = 0; c < GRID_COLS; c++)
			if (dots[r][c] === 1) remaining++;
	if (remaining === 0) {
		gameState  = 'win';
		stateTimer = 180;
	}
}

var WAKA_DURATION = 0.155;

function initAudio() {
	if (audioCtx) return;
	audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	fetch('res/waka.mp3')
		.then(r => r.arrayBuffer())
		.then(ab => audioCtx.decodeAudioData(ab))
		.then(buf => { wakaBuffer = buf; });
}

function playWaka() {
	if (!audioCtx || !wakaBuffer) return;
	var offset = (dotsEaten % 2) * WAKA_DURATION;
	var gain = audioCtx.createGain();
	gain.gain.value = 0.5;
	gain.connect(audioCtx.destination);
	var src = audioCtx.createBufferSource();
	src.buffer = wakaBuffer;
	src.connect(gain);
	src.start(0, offset, WAKA_DURATION);
}

function drawDots() {
	for (var row = 0; row < GRID_ROWS; row++) {
		for (var col = 0; col < GRID_COLS; col++) {
			if (dots[row][col] === 1) {
				var x = mapOffX + col * TILE + TILE / 2 - 3;
				var y = mapOffY + row * TILE + TILE / 2 - 3;
				s_dot.draw(ctx, x, y);
			}
		}
	}
	// Big dots — blink siste 120 frames av scared mode
	var showBig = scaredTimer === 0 || scaredTimer > 120 || Math.floor(frames / 8) % 2 === 0;
	if (showBig) {
		for (var i = 0; i < bigDots.length; i++) {
			var bd = bigDots[i];
			if (!bd.eaten) {
				var x = mapOffX + bd.col * TILE + TILE / 2 - 9;
				var y = mapOffY + bd.row * TILE + TILE / 2 - 9;
				s_bigDot.draw(ctx, x, y);
			}
		}
	}
}

function renderMenu() {
	ctx.save();
	ctx.scale(2, 2);
	s_map.draw(ctx, mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
	// Mørkt overlay
	ctx.fillStyle = 'rgba(0,0,0,0.72)';
	ctx.fillRect(mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);

	var cx = mapOffX + GRID_COLS * TILE / 2;
	var cy = mapOffY + GRID_ROWS * TILE / 2;

	ctx.fillStyle = '#ffff00';
	ctx.font = 'bold 20px monospace';
	ctx.textAlign = 'center';
	ctx.fillText('PAC-MAN', cx, cy - 60);

	var opts = ['🕹  Spill selv', '🤖  La AI spille'];
	for (var i = 0; i < opts.length; i++) {
		ctx.fillStyle = menuSelected === i ? '#ffff00' : '#aaaaaa';
		ctx.font = menuSelected === i ? 'bold 13px monospace' : '13px monospace';
		ctx.fillText(opts[i], cx, cy - 10 + i * 28);
	}
	if (highScore > 0) {
		ctx.fillStyle = '#aaa';
		ctx.font = '10px monospace';
		ctx.fillText('HI-SCORE: ' + highScore, cx, cy + 48);
	}
	ctx.fillStyle = '#555';
	ctx.font = '9px monospace';
	ctx.fillText('↑ ↓ for å velge  •  Enter for å starte', cx, cy + 70);
	ctx.restore();
}

function render() {
	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, width, height);

	if (gameState === 'menu') {
		renderMenu();
		return;
	}
	if (gameState === 'gameover' && stateTimer > 120) {
		// kort flash før overlay
	}

	ctx.save();
	ctx.scale(2, 2);
	s_map.draw(ctx, mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
	ctx.beginPath();
	ctx.rect(mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
	ctx.clip();
	drawDots();
	if (aiMode) {
		ctx.save();
		ctx.lineWidth = 3;
		ctx.setLineDash([3, 5]);

		// Pac-Man sin sti
		if (showPaths.pacman && aiPath.length > 0) {
			ctx.strokeStyle = 'rgba(255,255,0,0.5)';
			ctx.beginPath();
			ctx.moveTo(pacman.x + 14, pacman.y + 14);
			for (var i = 0; i < aiPath.length; i++) {
				var p = aiPath[i];
				ctx.lineTo(mapOffX + p.col * TILE + TILE / 2, mapOffY + p.row * TILE + TILE / 2);
			}
			ctx.stroke();
		}

		// Ghost-stier
		var ghostKeys = ['blinky', 'pinky', 'inky', 'clyde'];
		ghosts.forEach(function(g, idx) {
			if (!showPaths[ghostKeys[idx]] || !g.exited || scaredTimer > 0) return;
			var gPath = ghostLookahead(g, 20);
			if (gPath.length === 0) return;
			ctx.strokeStyle = 'rgba(' + hexToRgb(g.pathColor) + ',0.45)';
			ctx.beginPath();
			ctx.moveTo(g.x + 15, g.y + 15);
			for (var i = 0; i < gPath.length; i++) {
				ctx.lineTo(mapOffX + gPath[i].col * TILE + TILE / 2, mapOffY + gPath[i].row * TILE + TILE / 2);
			}
			ctx.stroke();
		});

		ctx.restore();
	}
	ghosts.forEach(function(g) { g.draw(); });
	pacman.draw();

	// Cherry
	if (cherry) {
		var cx = mapOffX + cherry.col * TILE + TILE / 2;
		var cy = mapOffY + cherry.row * TILE + TILE / 2;
		ctx.fillStyle = '#cc0000';
		ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 5, 0, Math.PI * 2); ctx.fill();
		ctx.beginPath(); ctx.arc(cx + 4, cy + 2, 5, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = '#228822'; ctx.lineWidth = 1.5;
		ctx.beginPath(); ctx.moveTo(cx - 4, cy - 3); ctx.quadraticCurveTo(cx, cy - 10, cx + 4, cy - 3); ctx.stroke();
	}

	// Score popups
	scorePopups.forEach(function(p) {
		ctx.fillStyle = 'rgba(0,255,200,' + (p.life / 60) + ')';
		ctx.font = 'bold 8px monospace';
		ctx.textAlign = 'center';
		ctx.fillText(p.text, p.x + TILE, p.y);
	});

	// State overlays
	var mx = mapOffX + GRID_COLS * TILE / 2;
	var my = mapOffY + GRID_ROWS * TILE / 2;
	if (gameState === 'ready') {
		ctx.fillStyle = '#ffff00';
		ctx.font = 'bold 14px monospace';
		ctx.textAlign = 'center';
		ctx.fillText('READY!', mx, my + 20);
	}
	if (gameState === 'gameover') {
		ctx.fillStyle = 'rgba(0,0,0,0.6)';
		ctx.fillRect(mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
		ctx.fillStyle = '#ff0000';
		ctx.font = 'bold 18px monospace';
		ctx.textAlign = 'center';
		ctx.fillText('GAME OVER', mx, my);
		ctx.fillStyle = '#ffff00';
		ctx.font = '10px monospace';
		ctx.fillText('Score: ' + score, mx, my + 20);
	}
	if (gameState === 'win') {
		ctx.fillStyle = 'rgba(0,0,0,0.5)';
		ctx.fillRect(mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
		ctx.fillStyle = '#00ff88';
		ctx.font = 'bold 16px monospace';
		ctx.textAlign = 'center';
		ctx.fillText('LEVEL ' + level + ' COMPLETE!', mx, my);
	}

	ctx.restore();

	// HUD (utenfor 2x scale — tegnes i 1200x1200 space)
	drawHUD();
}

function drawHUD() {
	var sx = 2; // scale factor for HUD coords
	var mapX = mapOffX * sx, mapY = mapOffY * sx;
	var mapW = GRID_COLS * TILE * sx;

	ctx.textAlign = 'left';
	ctx.font = 'bold 22px monospace';

	// Score
	ctx.fillStyle = '#ffffff';
	ctx.fillText('SCORE', mapX, mapY - 28);
	ctx.fillStyle = '#ffff00';
	ctx.fillText(score, mapX, mapY - 8);

	// High score
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('HI-SCORE', mapX + mapW / 2, mapY - 28);
	ctx.fillStyle = '#ffff00';
	ctx.fillText(Math.max(score, highScore), mapX + mapW / 2, mapY - 8);

	// Level
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'right';
	ctx.fillText('LEVEL', mapX + mapW, mapY - 28);
	ctx.fillStyle = '#ffff00';
	ctx.fillText(level, mapX + mapW, mapY - 8);

	// Lives
	var lifeY = mapY + GRID_ROWS * TILE * sx + 24;
	ctx.fillStyle = '#ffff00';
	ctx.textAlign = 'left';
	ctx.font = 'bold 18px monospace';
	ctx.fillText('LIVES:', mapX, lifeY);
	for (var i = 0; i < lives; i++) {
		ctx.beginPath();
		ctx.arc(mapX + 100 + i * 28, lifeY - 6, 9, 0.25 * Math.PI, 1.75 * Math.PI);
		ctx.lineTo(mapX + 100 + i * 28, lifeY - 6);
		ctx.fillStyle = '#ffff00';
		ctx.fill();
	}
}

function keydown(e) {
	initAudio();
	if (e.which === 27) { // Escape → tilbake til meny
		setPathPanelVisible(false);
		newGame();
		gameState = 'menu';
		return;
	}
	if (gameState === 'menu') {
		switch (e.which) {
			case 38: menuSelected = 0; break;
			case 40: menuSelected = 1; break;
			case 13:
				aiMode = menuSelected === 1;
				newGame();
				setPathPanelVisible(aiMode);
				break;
		}
		return;
	}
	if (!aiMode) {
		switch (e.which) {
			case 37: pacman.nextDir = dir.left;  break;
			case 38: pacman.nextDir = dir.up;    break;
			case 39: pacman.nextDir = dir.right; break;
			case 40: pacman.nextDir = dir.down;  break;
		}
	}
}

main();
