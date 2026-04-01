import '../sass/style.scss';
import { initSprites, s_map, s_pacman, s_blinky, s_pinky, s_inky, s_clyde, s_scaredGhost, s_eyes, s_dot, s_bigDot } from './sprite.js';

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
ghostEatenFreezeTimer = 0,

score     = 0,
highScore = parseInt(localStorage.getItem('pacman-hi') || '0'),
lives     = 3,
level     = 1,
ghostCombo = 0,
stateTimer = 0,
cherry = null,
scorePopups = [],

gameState = 'menu',  // 'menu'|'ready'|'playing'|'dead'|'gameover'|'win'
paused = false,
aiMode = false,
menuSelected = 0,
menuSubState = 'main',  // 'main' | 'personality'
AI_PERSONALITIES = {
	coward:     { fleeAt: 5, look: 20, trapDepth: 16, pelletCluster: 8, safetyMargin: 2, huntScared: false, label: 'Coward'     },
	balanced:   { fleeAt: 3, look: 15, trapDepth: 12, pelletCluster: 6, safetyMargin: 1, huntScared: true,  label: 'Balanced'   },
	aggressive: { fleeAt: 2, look: 10, trapDepth:  8, pelletCluster: 4, safetyMargin: 0, huntScared: true,  label: 'Aggressive' },
	greedy:     { fleeAt: 3, look: 12, trapDepth: 10, pelletCluster: 5, safetyMargin: 1, huntScared: true,  label: 'Greedy'     },
},
aiPersonalityKeys = ['coward', 'balanced', 'aggressive', 'greedy'],
aiPersonalityIdx = 1,

audioCtx   = null,
wakaBuffer = null,
volume     = parseFloat(localStorage.getItem('pacman-vol') || '0.5'),
muted      = localStorage.getItem('pacman-muted') === '1',

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
		this.x = p.x+9;
		this.y = p.y;
		this.targetX = p.x;
		this.targetY = p.y;
	},

	update: function() {
		if (!this.moving) {
			// Try desired direction first; if blocked, try current direction
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

// Returning eyes can pass through ghost door and house in any direction
function isReturningGhostWall(col, row) {
	col = ((col % GRID_COLS) + GRID_COLS) % GRID_COLS;
	if (isDoor(col, row) || inGhostHouse(col, row)) return false;
	return isGridWall(col, row);
}

// BFS shortest path for returning ghost eyes
function bfsReturnPath(startCol, startRow) {
	var HOME_COL = 13, HOME_ROW = 14;
	if (startCol === HOME_COL && startRow === HOME_ROW) return [];
	var dirs4 = [dir.up, dir.left, dir.down, dir.right];
	var queue = [{ col: startCol, row: startRow, path: [] }];
	var visited = {};
	visited[startRow + ',' + startCol] = true;
	while (queue.length > 0) {
		var cur = queue.shift();
		for (var i = 0; i < dirs4.length; i++) {
			var d = dirs4[i];
			var dl = delta(d);
			var nc = ((cur.col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
			var nr = cur.row + dl[1];
			if (nr < 0 || nr >= GRID_ROWS) continue;
			var key = nr + ',' + nc;
			if (visited[key] || isReturningGhostWall(nc, nr)) continue;
			visited[key] = true;
			var newPath = cur.path.concat([{ col: nc, row: nr }]);
			if (nc === HOME_COL && nr === HOME_ROW) return newPath;
			queue.push({ col: nc, row: nr, path: newPath });
		}
	}
	return [];
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
		dir: dir.up, moving: false, returning: false,
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
			this.returning = false;
			this.pendingReturn = false;
			this.bounceDir = dir.up;
			this.releaseFrame = frames + this.releaseDelay;
			var p = ghostTilePixel(this.col, this.row);
			this.x = p.x; this.y = p.y;
			this.targetX = p.x; this.targetY = p.y;
		},

		update: function(speedFactor) {
			speedFactor = speedFactor || 1;

			// Returning to house after being eaten — follows BFS shortest path
			if (this.returning) {
				var rspd = GHOST_SPEED * 3;
				if (!this.moving) {
					if (this.returnPath && this.returnPathIdx < this.returnPath.length) {
						var next = this.returnPath[this.returnPathIdx];
						var rdc = next.col - this.col;
						var rdr = next.row - this.row;
						// handle wrap-around
						if (rdc > 1) rdc = -1;
						else if (rdc < -1) rdc = 1;
						this.dir = rdc > 0 ? dir.right : rdc < 0 ? dir.left : rdr > 0 ? dir.down : dir.up;
						applyMove(this, rdc, rdr);
						this.returnPathIdx++;
					} else {
						// Fremme ved hjemsted — reset med kort fast ventetid
						this.returning = false;
						this.exited = false;
						this.immune = scaredTimer > 0; // immun mot gjeldende power-pellet
						this.releaseFrame = frames + 300; // ~5s ventetid
						this.returnPath = null;
						this.returnPathIdx = 0;
						this.bounceDir = dir.up;
					}
				}
				if (this.moving) {
					var rdx = this.targetX - this.x, rdy = this.targetY - this.y;
					if (Math.abs(rdx) <= rspd && Math.abs(rdy) <= rspd) {
						this.x = this.targetX; this.y = this.targetY;
						this.moving = false;
					} else {
						this.x += Math.sign(rdx) * rspd;
						this.y += Math.sign(rdy) * rspd;
					}
				}
				return;
			}

			if (frames < this.releaseFrame) {
				// Bounce up and down in the house while waiting
				if (!this.moving) {
					if (this.bounceDir === dir.up && this.row <= GHOST_HOUSE_ROW_MIN + 1) {
						this.bounceDir = dir.down;
					} else if (this.bounceDir === dir.down && this.row >= GHOST_HOUSE_ROW_MAX) {
						this.bounceDir = dir.up;
					}
					this.dir = this.bounceDir;
					applyMove(this, 0, this.bounceDir === dir.up ? -1 : 1);
				}
				if (this.moving) {
					var bdx = this.targetX - this.x, bdy = this.targetY - this.y;
					if (Math.abs(bdx) <= GHOST_SPEED && Math.abs(bdy) <= GHOST_SPEED) {
						this.x = this.targetX; this.y = this.targetY;
						this.moving = false;
					} else {
						this.x += Math.sign(bdx) * GHOST_SPEED;
						this.y += Math.sign(bdy) * GHOST_SPEED;
					}
				}
				return;
			}

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
					// exited/immune checked when movement completes (see below)
				} else {

				var opp = oppositeDir(this.dir);
				var dirs = [dir.up, dir.left, dir.down, dir.right];
				var best = dir.none;

				if (scaredTimer > 0 && !this.immune) {
					// Random direction when scared (as in the original)
					var choices = [];
					for (var i = 0; i < dirs.length; i++) {
						var d = dirs[i];
						var dl = delta(d);
						if (!isGhostWall(this.col + dl[0], this.row + dl[1], d))
							choices.push(d);
					}
					// Prefer not to reverse, but do so if it's the only exit
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
						this.immune = scaredTimer > 0;
					}
				} else {
					var spd = ((scaredTimer > 0 && !this.immune) ? GHOST_SPEED * 0.5 : GHOST_SPEED) * speedFactor;
					this.x += Math.sign(dx) * spd;
					this.y += Math.sign(dy) * spd;
				}
			}
		},

		draw: function() {
			if (this.returning) {
				s_eyes[ghostSpriteIdx(this.dir)].draw(ctx, this.x, this.y, 30, 30);
			} else if (this.pendingReturn || (scaredTimer > 0 && this.exited && !this.immune)) {
				// Blue scared ghost during freeze and normal scared mode
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
	// Tile is a wall if more than 5% of pixels are walls (catches anti-aliased corners)
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
	canvas.addEventListener('mousedown', onVolMouseDown);
	canvas.addEventListener('mousemove', onVolMouseMove);
	canvas.addEventListener('mouseup',   onVolMouseUp);

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
	scaredTimer           = 0;
	ghostEatenFreezeTimer = 0;
	ghostCombo            = 0;
	cherry       = null;
	scorePopups  = [];
	gameState    = 'ready';
	paused       = false;
}

function shuffleBFSDirs() {
	var a = [dir.up, dir.left, dir.down, dir.right];
	for (var i = a.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
	}
	bfsDirOrder = a;
}

function newGame() {
	score  = 0;
	lives  = 3;
	level  = 1;
	initDots();
	initBigDots();
	shuffleBFSDirs();
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
var bfsDirOrder = [dir.up, dir.left, dir.down, dir.right];
var aiLastShuffle = 0;
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
	if (!g.exited || g.returning) return [];
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
		for (var i = 0; i < bfsDirOrder.length; i++) {
			var d = bfsDirOrder[i];
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

// --- AI helpers ---

function aiFPT() { return Math.ceil(TILE / (SPEED * 0.9)); } // ~23 frames/tile on dots

function nearestActiveDist() {
	var m = Infinity;
	for (var i = 0; i < ghosts.length; i++) {
		var g = ghosts[i];
		if (!g.exited || (scaredTimer > 0 && !g.immune)) continue;
		var d = Math.abs(g.col - pacman.col) + Math.abs(g.row - pacman.row);
		if (d < m) m = d;
	}
	return m;
}

function countScared() {
	var n = 0;
	for (var i = 0; i < ghosts.length; i++)
		if (ghosts[i].exited && !ghosts[i].returning && !ghosts[i].immune && scaredTimer > 0) n++;
	return n;
}

function pelletCount() {
	var n = 0;
	for (var i = 0; i < bigDots.length; i++)
		if (!bigDots[i].eaten) n++;
	return n;
}

function buildTimeAwareThreatMap() {
	var map = {};
	var LOOK = AI_PERSONALITIES[aiPersonalityKeys[aiPersonalityIdx]].look;
	ghosts.forEach(function(g) {
		if (!g.exited || g.returning || (scaredTimer > 0 && !g.immune)) return;
		var key = g.row + ',' + g.col;
		if (!(key in map) || map[key] > 0) map[key] = 0;
		var path = ghostLookahead(g, LOOK);
		for (var i = 0; i < path.length; i++) {
			var pk = path[i].row + ',' + path[i].col;
			var arr = i + 1;
			if (!(pk in map) || map[pk] > arr) map[pk] = arr;
		}
	});
	return map;
}

function isTimeAwareSafe(col, row, pacSteps, threatMap) {
	var key = row + ',' + col;
	if (!(key in threatMap)) return true;
	var margin = AI_PERSONALITIES[aiPersonalityKeys[aiPersonalityIdx]].safetyMargin;
	return pacSteps < threatMap[key] - margin;
}

function aiBFSTimeAware(goalFn, threatMap) {
	var start = { col: pacman.col, row: pacman.row };
	var queue = [{ col: start.col, row: start.row, firstDir: dir.none, path: [], steps: 0 }];
	var visited = {};
	visited[start.row + ',' + start.col] = true;
	while (queue.length > 0) {
		var cur = queue.shift();
		if (goalFn(cur.col, cur.row) && cur.firstDir !== dir.none) {
			aiPath = cur.path;
			return cur.firstDir;
		}
		for (var i = 0; i < bfsDirOrder.length; i++) {
			var d = bfsDirOrder[i];
			var dl = delta(d);
			var nc = ((cur.col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
			var nr = cur.row + dl[1];
			var key = nr + ',' + nc;
			if (!visited[key] && !isPacWall(nc, nr) &&
				isTimeAwareSafe(nc, nr, cur.steps + 1, threatMap)) {
				visited[key] = true;
				queue.push({
					col: nc, row: nr,
					firstDir: cur.firstDir === dir.none ? d : cur.firstDir,
					path: cur.path.concat([{col: nc, row: nr}]),
					steps: cur.steps + 1
				});
			}
		}
	}
	aiPath = [];
	return dir.none;
}

function aiBFSCandidatesTA(goalFn, threatMap, n) {
	var start = { col: pacman.col, row: pacman.row };
	var queue = [{ col: start.col, row: start.row, firstDir: dir.none, pathLen: 0, steps: 0 }];
	var visited = {};
	visited[start.row + ',' + start.col] = true;
	var results = [];
	var seen = {};
	while (queue.length > 0 && results.length < n) {
		var cur = queue.shift();
		if (goalFn(cur.col, cur.row) && cur.firstDir !== dir.none) {
			if (!seen[cur.firstDir]) { seen[cur.firstDir] = true; results.push({ firstDir: cur.firstDir, pathLen: cur.pathLen }); }
		}
		for (var i = 0; i < bfsDirOrder.length; i++) {
			var d = bfsDirOrder[i];
			var dl = delta(d);
			var nc = ((cur.col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
			var nr = cur.row + dl[1];
			var key = nr + ',' + nc;
			if (!visited[key] && !isPacWall(nc, nr) &&
				isTimeAwareSafe(nc, nr, cur.steps + 1, threatMap)) {
				visited[key] = true;
				queue.push({ col: nc, row: nr, firstDir: cur.firstDir === dir.none ? d : cur.firstDir, pathLen: cur.pathLen + 1, steps: cur.steps + 1 });
			}
		}
	}
	return results;
}

function ghostDistAt(col, row) {
	var minGD = Infinity;
	for (var gi = 0; gi < ghosts.length; gi++) {
		var gg = ghosts[gi];
		if (!gg.exited || gg.returning || (scaredTimer > 0 && !gg.immune)) continue;
		var gd = Math.abs(gg.col - col) + Math.abs(gg.row - row);
		if (gd < minGD) minGD = gd;
	}
	return minGD;
}

function aiBFSFlee(threatMap) {
	var start = { col: pacman.col, row: pacman.row };
	var startGD = ghostDistAt(start.col, start.row);
	var queue = [{ col: start.col, row: start.row, firstDir: dir.none, steps: 0, path: [], minPathGD: startGD }];
	var visited = {};
	visited[start.row + ',' + start.col] = true;
	var bestDir = dir.none, bestScore = -Infinity, bestPath = [];
	var trapDepth = AI_PERSONALITIES[aiPersonalityKeys[aiPersonalityIdx]].trapDepth;
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
			// minPathGD weighted heavily — never pick a path that passes near a ghost
			var sc = cur.minPathGD * 4 + (curGD === Infinity ? 50 : curGD) + exits * 0.5;
			if (sc > bestScore) { bestScore = sc; bestDir = cur.firstDir; bestPath = cur.path; }
		}
		for (var i = 0; i < bfsDirOrder.length; i++) {
			var d = bfsDirOrder[i];
			var dl = delta(d);
			var nc = ((cur.col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
			var nr = cur.row + dl[1];
			var key = nr + ',' + nc;
			if (!visited[key] && !isPacWall(nc, nr)) {
				visited[key] = true;
				var nextGD = ghostDistAt(nc, nr);
				var newMinPathGD = Math.min(cur.minPathGD, nextGD === Infinity ? 50 : nextGD);
				queue.push({
					col: nc, row: nr,
					firstDir: cur.firstDir === dir.none ? d : cur.firstDir,
					steps: cur.steps + 1,
					path: cur.path.concat([{col: nc, row: nr}]),
					minPathGD: newMinPathGD
				});
			}
		}
	}
	aiPath = bestPath;
	return bestDir;
}

function ghostClusterScore() {
	var best = null, bestSc = -Infinity;
	for (var i = 0; i < bigDots.length; i++) {
		var bd = bigDots[i];
		if (bd.eaten) continue;
		var sc = 0;
		for (var j = 0; j < ghosts.length; j++) {
			var g = ghosts[j];
			if (!g.exited) continue;
			var d = Math.abs(g.col - bd.col) + Math.abs(g.row - bd.row);
			if (d <= 6) sc += 4;
			else if (d <= 10) sc += 2;
			else if (d <= 15) sc += 1;
		}
		var pd = Math.abs(pacman.col - bd.col) + Math.abs(pacman.row - bd.row);
		sc -= pd * 0.15;
		if (sc > bestSc) { bestSc = sc; best = { col: bd.col, row: bd.row, score: sc }; }
	}
	return best;
}

function isGhostThreat(col, row, radius) {
	for (var i = 0; i < ghosts.length; i++) {
		var g = ghosts[i];
		if (!g.exited || g.returning || (scaredTimer > 0 && !g.immune)) continue;
		if (Math.abs(g.col - col) + Math.abs(g.row - row) <= radius) return true;
	}
	return false;
}

function isMoveTrapped(moveDir, threatMap) {
	var d = delta(moveDir);
	var nc = ((pacman.col + d[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
	var nr = pacman.row + d[1];
	
	// If the move itself is unsafe according to threatMap, it's effectively a trap
	if (!isTimeAwareSafe(nc, nr, 1, threatMap)) return true;

	// BFS check: Can we reach a "safe junction" (at least 3 exits or far from ghosts)
	// within the next 10 steps without being caught?
	var queue = [{ col: nc, row: nr, steps: 1 }];
	var visited = {};
	visited[nr + ',' + nc] = true;
	var foundSafeExit = false;

	while (queue.length > 0) {
		var cur = queue.shift();
		if (cur.steps > 12) { foundSafeExit = true; break; }

		var exits = 0;
		var ds = [dir.up, dir.left, dir.down, dir.right];
		for (var i = 0; i < ds.length; i++) {
			var dl = delta(ds[i]);
			var nnc = ((cur.col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
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
		// Hvis vi er i et kryss og det fortsatt er trygt, regner vi det som en utvei
		if (exits >= 3) { foundSafeExit = true; break; }
	}
	return !foundSafeExit;
}

function findSafestNonTrappedDir(threatMap) {
	var sdirs = [dir.up, dir.left, dir.down, dir.right];
	var best = dir.none;
	var maxDist = -1;

	for (var i = 0; i < sdirs.length; i++) {
		var d = sdirs[i];
		var dl = delta(d);
		var nc = ((pacman.col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
		var nr = pacman.row + dl[1];
		if (isPacWall(nc, nr)) continue;

		if (!isMoveTrapped(d, threatMap)) {
			// Pick the "safe" direction with the greatest distance from the nearest ghost
			var minDist = Infinity;
			for (var j = 0; j < ghosts.length; j++) {
				var g = ghosts[j];
				if (!g.exited || (scaredTimer > 0 && !g.immune)) continue;
				var dist = Math.abs(g.col - nc) + Math.abs(g.row - nr);
				if (dist < minDist) minDist = dist;
			}
			if (minDist > maxDist) {
				maxDist = minDist;
				best = d;
			}
		}
	}
	return best;
}

// --- AI decision ---

// --- AI decision (PAC-MAN MASTER AI v3.0) ---

function aiDecide() {
	if (pacman.moving) return;

	var cfg = AI_PERSONALITIES[aiPersonalityKeys[aiPersonalityIdx]];
	var threatMap = buildTimeAwareThreatMap();
	var fpt = aiFPT();
	var ngd = nearestActiveDist();

	// Hjelpefunksjoner for Master AI
	function isPellet(c, r) {
		for (var i = 0; i < bigDots.length; i++) {
			var bd = bigDots[i];
			if (!bd.eaten && bd.col === c && bd.row === r) return true;
		}
		return false;
	}
	function isDot(c, r) { return !!(dots[r] && dots[r][c] === 1); }
	function isScaredGhostAt(c, r) {
		for (var i = 0; i < ghosts.length; i++) {
			var g = ghosts[i];
			if (g.exited && !g.returning && scaredTimer > 0 && !g.immune && g.col === c && g.row === r) return true;
		}
		return false;
	}
	function isActiveGhostAt(c, r) {
		for (var i = 0; i < ghosts.length; i++) {
			var g = ghosts[i];
			if (g.exited && !g.returning && (scaredTimer === 0 || g.immune) && g.col === c && g.row === r) return true;
		}
		return false;
	}

	// 1. SURVIVAL & RISK ASSESSMENT (Priority 1 & 2)
	if (ngd <= cfg.fleeAt) {
		var fleeDir = aiBFSFlee(threatMap);
		if (fleeDir !== dir.none) { 
			console.log("PAC-MAN AI: [FLEE] Ghost too close (" + ngd + ")");
			pacman.nextDir = fleeDir; return; 
		}
	}

	// 2. POWER PELLET STRATEGY (Priority 3)
	if (scaredTimer === 0 && pelletCount() > 0) {
		var nearestPellet = aiBFSTimeAware(isPellet, threatMap);
		if (nearestPellet !== dir.none) {
			var distToPellet = aiPath.length;
			var cluster = ghostClusterScore();
			if ((cluster && cluster.score >= cfg.pelletCluster && distToPellet <= 3) || isMoveTrapped(pacman.dir, threatMap)) {
				console.log("PAC-MAN AI: [POWER PELLET] Strategic activation");
				pacman.nextDir = nearestPellet; return;
			}
		}
	}

	// 3. HUNT (Frightened Mode)
	if (cfg.huntScared && scaredTimer > 0 && countScared() > 0) {
		var huntDir = aiBFS(function(c, r) {
			return isScaredGhostAt(c, r);
		}, function(c, r) {
			return isActiveGhostAt(c, r);
		});
		if (huntDir !== dir.none && aiPath.length * fpt < scaredTimer - 60) {
			console.log("PAC-MAN AI: [HUNT] Chasing scared ghosts");
			pacman.nextDir = huntDir; return;
		}
	}

	// 4. CHERRY (Priority: High if safe)
	if (cherry) {
		var cherryDir = aiBFSTimeAware(function(c, r) {
			return c === cherry.col && r === cherry.row;
		}, threatMap);
		if (cherryDir !== dir.none && aiPath.length * fpt < cherry.timer - 60) {
			console.log("PAC-MAN AI: [CHERRY] Collecting fruit");
			pacman.nextDir = cherryDir; return;
		}
	}

	// 5. DOTS & TUNNEL (Priority 4 & 5)
	var bestDotDir = aiBFSTimeAware(function(c, r) {
		if (!isDot(c, r)) return false;
		return !isMoveTrapped(pacman.dir, threatMap); 
	}, threatMap);

	if (bestDotDir !== dir.none) {
		// Only log dot-eating occasionally to avoid spam
		if (frames % 120 === 0) console.log("PAC-MAN AI: [DOTS] Clearing map");
		pacman.nextDir = bestDotDir; return;
	}

	// 6. IDLE / Last resort
	var fallback = aiBFSFlee(threatMap);
	if (fallback !== dir.none) {
		console.log("PAC-MAN AI: [IDLE] No safe dots, wandering");
		pacman.nextDir = fallback; return;
	}

	// --- ULTRA-AGRESSIV SIKKERHETSSJEKK (Alltid aktiv) ---
	var finalDir = pacman.nextDir !== dir.none ? pacman.nextDir : pacman.dir;
	if (finalDir !== dir.none) {
		var d = delta(finalDir);
		var nc = ((pacman.col + d[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
		var nr = pacman.row + d[1];

		if (isActiveGhostAt(nc, nr) || !isTimeAwareSafe(nc, nr, 1, threatMap)) {
			console.log("PAC-MAN AI: [EMERGENCY] Collision imminent! Recalculating...");
			var sdirs = [dir.up, dir.left, dir.down, dir.right];
			var safest = dir.none, bestDist = -1;
			for (var i = 0; i < sdirs.length; i++) {
				var sd = sdirs[i];
				var sdl = delta(sd);
				var snc = ((pacman.col + sdl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
				var snr = pacman.row + sdl[1];
				if (isPacWall(snc, snr) || isActiveGhostAt(snc, snr) || !isTimeAwareSafe(snc, snr, 1, threatMap)) continue;
				var minDist = Infinity;
				for (var j = 0; j < ghosts.length; j++) {
					var g = ghosts[j];
					if (!g.exited || (scaredTimer > 0 && !g.immune)) continue;
					var dist = Math.abs(g.col - snc) + Math.abs(g.row - snr);
					if (dist < minDist) minDist = dist;
				}
				if (minDist > bestDist) { bestDist = minDist; safest = sd; }
			}
			if (safest !== dir.none) pacman.nextDir = safest;
			else pacman.nextDir = oppositeDir(pacman.dir);
		}
	}
}

function addPopup(text, col, row) {
	scorePopups.push({ text: text, x: mapOffX + col * TILE, y: mapOffY + row * TILE, life: 60 });
}

function update() {
	frames++;

	// State timers
	if (gameState === 'ready') { if (aiMode) gameState = 'playing'; return; }
	if (paused) return;
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

	// Freeze etter at ghost er spist — 2 sekunder pause
	if (ghostEatenFreezeTimer > 0) {
		ghostEatenFreezeTimer--;
		if (ghostEatenFreezeTimer === 0) {
			ghosts.forEach(function(g) {
				if (g.pendingReturn) {
					g.pendingReturn = false;
					g.returning = true;
					g.returnPath = bfsReturnPath(g.col, g.row);
					g.returnPathIdx = 0;
				}
			});
		}
		return;
	}

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
			if (g.returning) return; // returning to house — harmless
			if (scaredTimer > 0 && !g.immune) {
				ghostCombo++;
				var pts = 200 * Math.pow(2, ghostCombo - 1);
				score += pts;
				addPopup(pts.toString(), g.col, g.row);
				g.pendingReturn = true;
				g.immune = true;
				ghostEatenFreezeTimer = 120; // 2 sekunder freeze
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
	gain.gain.value = muted ? 0 : volume * 0.3;
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
	// Dark overlay
	ctx.fillStyle = 'rgba(0,0,0,0.72)';
	ctx.fillRect(mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);

	var cx = mapOffX + GRID_COLS * TILE / 2;
	var cy = mapOffY + GRID_ROWS * TILE / 2;

	ctx.fillStyle = '#ffff00';
	ctx.font = 'bold 20px monospace';
	ctx.textAlign = 'center';
	ctx.fillText('PAC-MAN', cx, cy - 60);

	if (menuSubState === 'personality') {
		ctx.fillStyle = '#aaaaaa';
		ctx.font = '12px monospace';
		ctx.fillText('Choose AI style:', cx, cy - 20);

		var pKey = aiPersonalityKeys[aiPersonalityIdx];
		var pCfg = AI_PERSONALITIES[pKey];
		ctx.fillStyle = '#ffff00';
		ctx.font = 'bold 16px monospace';
		ctx.fillText('◄  ' + pCfg.label + '  ►', cx, cy + 10);

		var descs = {
			coward:     'Flees early, avoids all risk',
			balanced:   'Balanced and efficient',
			aggressive: 'Actively hunts ghosts',
			greedy:     'Maximizes score, takes risks',
		};
		ctx.fillStyle = '#888888';
		ctx.font = '10px monospace';
		ctx.fillText(descs[pKey], cx, cy + 32);

		ctx.fillStyle = '#555';
		ctx.font = '9px monospace';
		ctx.fillText('← → to choose  •  Enter to start  •  Esc back', cx, cy + 60);
	} else {
		var opts = ['🕹  Play yourself', '🤖  Let AI play'];
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
		ctx.fillText('↑ ↓ to select  •  Enter to start', cx, cy + 70);
	}
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
		// brief flash before overlay
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
		ctx.fillStyle = 'rgba(255,255,255,0.5)';
		ctx.font = '11px monospace';
		ctx.fillText('press any arrow to start', mx, my + 38);
	}
	if (paused) {
		ctx.fillStyle = 'rgba(0,0,0,0.5)';
		ctx.fillRect(mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 18px monospace';
		ctx.textAlign = 'center';
		ctx.fillText('PAUSED', mx, my);
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

function saveVolume() {
	localStorage.setItem('pacman-vol',   volume);
	localStorage.setItem('pacman-muted', muted ? '1' : '0');
}

var volTrackBounds  = null; // { x, y, w } in canvas px
var volIconBounds   = null; // { x, y, w, h }
var draggingVolume  = false;

function canvasPt(e) {
	var r = canvas.getBoundingClientRect();
	return {
		x: (e.clientX - r.left) * (canvas.width  / r.width),
		y: (e.clientY - r.top)  * (canvas.height / r.height)
	};
}

function setVolumeFromX(cx) {
	var t = volTrackBounds;
	volume = Math.max(0, Math.min(1, (cx - t.x) / t.w));
	saveVolume();
}

function onVolMouseDown(e) {
	if (gameState === 'menu') return;
	var p = canvasPt(e);
	if (volIconBounds && p.x >= volIconBounds.x && p.x <= volIconBounds.x + volIconBounds.w &&
	    p.y >= volIconBounds.y && p.y <= volIconBounds.y + volIconBounds.h) {
		muted = !muted; saveVolume(); return;
	}
	if (volTrackBounds && p.x >= volTrackBounds.x - 10 && p.x <= volTrackBounds.x + volTrackBounds.w + 10 &&
	    Math.abs(p.y - volTrackBounds.y) < 16) {
		draggingVolume = true;
		setVolumeFromX(p.x);
	}
}
function onVolMouseMove(e) {
	if (!draggingVolume) return;
	setVolumeFromX(canvasPt(e).x);
}
function onVolMouseUp() { draggingVolume = false; }

function drawVolumeSlider(mapX, mapW, lifeY) {
	var sx       = 2;
	var trackW   = 120;
	var trackX   = mapX + mapW - trackW;
	var trackY   = lifeY - 6;
	var iconX    = trackX - 26;
	var iconY    = trackY + 5;

	// store bounds for hit-testing (canvas px = HUD px here)
	volTrackBounds = { x: trackX, y: trackY, w: trackW };
	volIconBounds  = { x: iconX - 2, y: trackY - 14, w: 24, h: 20 };

	// icon
	var icon = muted ? '\uD83D\uDD07' : volume < 0.33 ? '\uD83D\uDD08' : volume < 0.66 ? '\uD83D\uDD09' : '\uD83D\uDD0A';
	ctx.font = '16px sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText(icon, iconX, iconY);

	// track background
	ctx.fillStyle = '#444444';
	ctx.fillRect(trackX, trackY - 2, trackW, 4);

	// track fill
	var fillW = muted ? 0 : volume * trackW;
	ctx.fillStyle = '#ffff00';
	ctx.fillRect(trackX, trackY - 2, fillW, 4);

	// thumb
	var thumbX = trackX + (muted ? 0 : fillW);
	ctx.beginPath();
	ctx.arc(thumbX, trackY, 6, 0, Math.PI * 2);
	ctx.fillStyle = '#ffff00';
	ctx.fill();
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

	// AI personality label
	if (aiMode) {
		var pLabel = AI_PERSONALITIES[aiPersonalityKeys[aiPersonalityIdx]].label;
		ctx.fillStyle = '#00ccff';
		ctx.textAlign = 'center';
		ctx.font = '11px monospace';
		ctx.fillText('🤖 AI: ' + pLabel, mapX + mapW / 2, mapY - 48);
	}

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

	drawVolumeSlider(mapX, mapW, lifeY);
}

function keydown(e) {
	initAudio();
	if (e.which === 27) { // Escape → back to menu
		setPathPanelVisible(false);
		newGame();
		gameState = 'menu';
		menuSubState = 'main';
		return;
	}
	if (gameState === 'menu') {
		if (menuSubState === 'personality') {
			switch (e.which) {
				case 37: aiPersonalityIdx = (aiPersonalityIdx - 1 + aiPersonalityKeys.length) % aiPersonalityKeys.length; break;
				case 39: aiPersonalityIdx = (aiPersonalityIdx + 1) % aiPersonalityKeys.length; break;
				case 27: menuSubState = 'main'; break;
				case 13:
					aiMode = true;
					menuSubState = 'main';
					newGame();
					setPathPanelVisible(true);
					break;
			}
		} else {
			switch (e.which) {
				case 38: menuSelected = 0; break;
				case 40: menuSelected = 1; break;
				case 13:
					if (menuSelected === 1) {
						menuSubState = 'personality';
					} else {
						aiMode = false;
						newGame();
						setPathPanelVisible(false);
					}
					break;
			}
		}
		return;
	}
	if (e.which === 77) { muted = !muted; saveVolume(); return; } // M
	if (e.which === 80 && (gameState === 'playing' || gameState === 'paused')) { // P
		paused = !paused;
		return;
	}
	if (!aiMode) {
		var arrowKey = e.which >= 37 && e.which <= 40;
		if (arrowKey && gameState === 'ready') gameState = 'playing';
		switch (e.which) {
			case 37: pacman.nextDir = dir.left;  break;
			case 38: pacman.nextDir = dir.up;    break;
			case 39: pacman.nextDir = dir.right; break;
			case 40: pacman.nextDir = dir.down;  break;
		}
	}
}

main();
