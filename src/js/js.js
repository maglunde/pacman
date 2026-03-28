import '../sass/style.scss';
import { initSprites, s_map, s_pacman } from './sprite.js';

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
GRID_COLS,
GRID_ROWS,
grid,
dots,
dotsEaten = 0,

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
				if (!isGridWall(this.col + d[0], this.row + d[1])) {
					this.dir     = this.nextDir;
					this.nextDir = dir.none;
					applyMove(this, d[0], d[1]);
					turned = true;
				}
			}

			if (!turned && this.dir !== dir.none) {
				var d = delta(this.dir);
				if (!isGridWall(this.col + d[0], this.row + d[1])) {
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
			} else {
				this.x += Math.sign(dx) * SPEED;
				this.y += Math.sign(dy) * SPEED;
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

function isGridWall(col, row) {
	if (row < 0 || row >= GRID_ROWS) return true;
	col = ((col % GRID_COLS) + GRID_COLS) % GRID_COLS;
	return grid[row][col] === 1;
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
		run();
	};
}

function run() {
	pacman.init();
	var loop = function() {
		update();
		render();
		window.requestAnimationFrame(loop);
	};
	loop();
}

function update() {
	frames++;
	pacman.update();
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
	ctx.fillStyle = '#ffb8ae';
	for (var row = 0; row < GRID_ROWS; row++) {
		for (var col = 0; col < GRID_COLS; col++) {
			if (dots[row][col] === 1) {
				var cx = mapOffX + col * TILE + TILE / 2;
				var cy = mapOffY + row * TILE + TILE / 2;
				ctx.beginPath();
				ctx.arc(cx, cy, 2, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}
}

function render() {
	ctx.clearRect(0, 0, width, height);
	ctx.save();
	ctx.fillStyle = "rgba(0,0,0,1)";
	ctx.fillRect(0, 0, width, height);
	ctx.scale(2, 2);
	s_map.draw(ctx, mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
	ctx.beginPath();
	ctx.rect(mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
	ctx.clip();
	drawDots();
	pacman.draw();
	ctx.restore();
}

function keydown(e) {
	initAudio();
	switch (e.which) {
		case 37: pacman.nextDir = dir.left;  break;
		case 38: pacman.nextDir = dir.up;    break;
		case 39: pacman.nextDir = dir.right; break;
		case 40: pacman.nextDir = dir.down;  break;
	}
}

main();
