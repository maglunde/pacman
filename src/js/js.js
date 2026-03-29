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

gameState = 'menu',  // 'menu' | 'playing'
aiMode = false,
menuSelected = 0,    // 0 = spiller selv, 1 = AI

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
					playWaka();
				}
				for (var i = 0; i < bigDots.length; i++) {
					var bd = bigDots[i];
					if (!bd.eaten && bd.col === this.col && bd.row === this.row) {
						bd.eaten = true;
						scaredTimer = SCARED_DURATION;
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

function makeGhost(startCol, startRow, sprites, releaseDelay, getTarget) {
	return {
		startCol: startCol, startRow: startRow,
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

		update: function() {
			if (frames < this.releaseFrame) return;

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
					var spd = (scaredTimer > 0 && !this.immune) ? GHOST_SPEED * 0.5 : GHOST_SPEED;
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
		}),
		makeGhost(13, 14, s_pinky, 300, function() {
			var d = delta(pacman.dir !== dir.none ? pacman.dir : dir.up);
			return { col: pacman.col + d[0]*4, row: pacman.row + d[1]*4 };
		}),
		makeGhost(14, 14, s_inky, 600, function() {
			var d = delta(pacman.dir !== dir.none ? pacman.dir : dir.up);
			var pivot = { col: pacman.col + d[0]*2, row: pacman.row + d[1]*2 };
			var blinky = ghosts[0];
			return { col: pivot.col*2 - blinky.col, row: pivot.row*2 - blinky.row };
		}),
		makeGhost(15, 14, s_clyde, 900, function() {
			var dist = Math.abs(pacman.col - ghosts[3].col) + Math.abs(pacman.row - ghosts[3].row);
			return dist > 8
				? { col: pacman.col, row: pacman.row }
				: { col: 0, row: GRID_ROWS - 1 };
		})
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

function resetGame() {
	pacman.init();
	initGhosts();
	scaredTimer = 0;
}

function run() {
	pacman.init();
	initGhosts();
	gameState = 'menu';
	var loop = function() {
		if (gameState === 'playing') update();
		render();
		window.requestAnimationFrame(loop);
	};
	loop();
}

function aiBFS(goalFn, blockFn) {
	var start = { col: pacman.col, row: pacman.row };
	var queue = [{ col: start.col, row: start.row, firstDir: dir.none }];
	var visited = {};
	visited[start.row + ',' + start.col] = true;
	while (queue.length > 0) {
		var cur = queue.shift();
		if (goalFn(cur.col, cur.row) && cur.firstDir !== dir.none) return cur.firstDir;
		var ds = [dir.up, dir.left, dir.down, dir.right];
		for (var i = 0; i < ds.length; i++) {
			var d = ds[i];
			var dl = delta(d);
			var nc = ((cur.col + dl[0]) % GRID_COLS + GRID_COLS) % GRID_COLS;
			var nr = cur.row + dl[1];
			var key = nr + ',' + nc;
			if (!visited[key] && !isPacWall(nc, nr) && !(blockFn && blockFn(nc, nr))) {
				visited[key] = true;
				queue.push({ col: nc, row: nr, firstDir: cur.firstDir === dir.none ? d : cur.firstDir });
			}
		}
	}
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

function update() {
	frames++;
	if (scaredTimer > 0) {
		scaredTimer--;
		if (scaredTimer === 0)
			ghosts.forEach(function(g) { g.immune = false; });
	}
	if (aiMode) aiDecide();
	pacman.update();
	ghosts.forEach(function(g) { g.update(); });
	ghosts.forEach(function(g) {
		if (!g.exited) return;
		if (g.col === pacman.col && g.row === pacman.row) {
			if (scaredTimer > 0 && !g.immune) {
				g.init();
				g.immune = true; // ikke redd igjen før ute av huset
			} else {
				resetGame();
			}
		}
	});
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

	ctx.save();
	ctx.scale(2, 2);
	s_map.draw(ctx, mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
	ctx.beginPath();
	ctx.rect(mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
	ctx.clip();
	drawDots();
	ghosts.forEach(function(g) { g.draw(); });
	pacman.draw();
	ctx.restore();
}

function keydown(e) {
	initAudio();
	if (gameState === 'menu') {
		switch (e.which) {
			case 38: menuSelected = 0; break; // opp
			case 40: menuSelected = 1; break; // ned
			case 13: // Enter
				aiMode = menuSelected === 1;
				gameState = 'playing';
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
