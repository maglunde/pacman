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
SPEED = 1.4,
GRID_COLS,
GRID_ROWS,
grid,

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
					this.col    += d[0];
					this.row    += d[1];
					var p = tilePixel(this.col, this.row);
					this.targetX = p.x;
					this.targetY = p.y;
					this.moving  = true;
					turned = true;
				}
			}

			if (!turned && this.dir !== dir.none) {
				var d = delta(this.dir);
				if (!isGridWall(this.col + d[0], this.row + d[1])) {
					this.col += d[0];
					this.row += d[1];
					var p = tilePixel(this.col, this.row);
					this.targetX = p.x;
					this.targetY = p.y;
					this.moving  = true;
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
		this.sprite[frame % 2].draw(ctx, this.x, this.y);
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
	if (col < 0 || row < 0 || col >= GRID_COLS || row >= GRID_ROWS) return true;
	return grid[row][col] === 1;
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

	// Debug: logg råtall rundt startposisjonen (row 20-26, col 10-18)
	console.log('Pikseltelling per celle (row 20-26, col 10-18):');
	for (var r = 20; r <= 26; r++) {
		var line = 'row ' + r + ': ';
		for (var c = 10; c <= 18; c++) {
			var x0 = c * TILE, y0 = r * TILE;
			var cnt = 0;
			for (var dx = 0; dx < TILE; dx++)
				for (var dy = 0; dy < TILE; dy++)
					if (isWall(x0 + dx, y0 + dy)) cnt++;
			line += c + ':' + cnt + ' ';
		}
		console.log(line);
	}
	console.log('Startcelle [row=23][col=13]:', grid[23] && grid[23][13]);
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

function render() {
	ctx.clearRect(0, 0, width, height);
	ctx.save();
	ctx.fillStyle = "rgba(0,0,0,1)";
	ctx.fillRect(0, 0, width, height);
	ctx.scale(2, 2);
	s_map.draw(ctx, mapOffX, mapOffY, GRID_COLS * TILE, GRID_ROWS * TILE);
	pacman.draw();
	ctx.restore();
}

function keydown(e) {
	switch (e.which) {
		case 37: pacman.nextDir = dir.left;  break;
		case 38: pacman.nextDir = dir.up;    break;
		case 39: pacman.nextDir = dir.right; break;
		case 40: pacman.nextDir = dir.down;  break;
	}
}

main();
