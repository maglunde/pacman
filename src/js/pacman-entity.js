import { TILE, SPEED, SCARED_DURATION, dir } from './constants.js';
import { state } from './state.js';
import { delta, tilePixel, isPacWall, applyMove, moveTowardTarget } from './grid.js';
import { playWaka } from './audio.js';
import { s_pacman } from './sprite.js';

state.pacman = {
	col: 13, row: 23,
	dir: dir.none, nextDir: dir.none,
	moving: false,
	sprite: null,
	x: 0, y: 0, targetX: 0, targetY: 0,

	init: function() {
		this.col     = 13;
		this.row     = 23;
		this.dir     = dir.none;
		this.nextDir = dir.none;
		this.moving  = false;
		this.sprite  = s_pacman.round;
		var p = tilePixel(this.col, this.row);
		this.x       = p.x + 9;
		this.y       = p.y;
		this.targetX = p.x;
		this.targetY = p.y;
	},

	update: function() {
		if (!this.moving) {
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
			var pacSpd = (state.dots[this.row][this.col] === 1 ? SPEED * 0.9 : SPEED) * state.gameSpeed;
			if (moveTowardTarget(this, pacSpd)) {
				if (state.dots[this.row][this.col] === 1) {
					state.dots[this.row][this.col] = 0;
					state.dotsEaten++;
					state.score += 10;
					playWaka();
				}

				for (var i = 0; i < state.bigDots.length; i++) {
					var bd = state.bigDots[i];
					if (!bd.eaten && bd.col === this.col && bd.row === this.row) {
						bd.eaten = true;
						state.score += 50;
						state.scaredTimer = SCARED_DURATION;
						state.ghostCombo  = 0;
						state.ghosts.forEach(function(g) { g.immune = false; });
					}
				}
			}
		}

		switch (this.dir) {
			case dir.left:  this.sprite = s_pacman.left;  break;
			case dir.up:    this.sprite = s_pacman.up;    break;
			case dir.right: this.sprite = s_pacman.right; break;
			case dir.down:  this.sprite = s_pacman.down;  break;
			default:        this.sprite = s_pacman.round; break;
		}

		if (state.frames % 10 === 0) state.frame++;
	},

	draw: function() {
		var ctx  = state.ctx;
		var mapW = state.GRID_COLS * TILE;
		var relX = this.x - state.mapOffX;
		this.sprite[state.frame % 2].draw(ctx, this.x, this.y);
		if (relX < 28)        this.sprite[state.frame % 2].draw(ctx, this.x + mapW, this.y);
		if (relX > mapW - 28) this.sprite[state.frame % 2].draw(ctx, this.x - mapW, this.y);
	}
};
