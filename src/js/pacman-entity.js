import { TILE, SPEED, PACMAN_DOT_SPEED_FACTOR, SCARED_DURATION, dir } from './constants.js';
import { state } from './state.js';
import { delta, tilePixel, isPacWall, applyMove, moveTowardTarget } from './grid.js';
import { playWaka } from './audio.js';
import { s_pacman, s_mspacman } from './sprite.js';
import { addScore } from './game.js';

state.pacman = {
	col: 13, row: 23,
	dir: dir.none, nextDir: dir.none,
	moving: false,
	sprite: null,
	x: 0, y: 0, targetX: 0, targetY: 0,

	init: function() {
		this.col     = state.activeMap.pacmanStart.col;
		this.row     = state.activeMap.pacmanStart.row;
		this.dir     = dir.none;
		this.nextDir = dir.none;
		this.moving  = false;
		let spriteSet = state.activeMap.spriteSheet === 'mspacman' ? s_mspacman : s_pacman;
		this.sprite  = spriteSet.round;
		let p = tilePixel(this.col, this.row);
		this.x       = p.x + 9;
		this.y       = p.y;
		this.targetX = p.x;
		this.targetY = p.y;
	},

	update: function() {
		if (!this.moving) {
			let turned = false;
			if (this.nextDir !== dir.none) {
				let d = delta(this.nextDir);
				if (!isPacWall(this.col + d[0], this.row + d[1])) {
					this.dir     = this.nextDir;
					this.nextDir = dir.none;
					applyMove(this, d[0], d[1]);
					turned = true;
				}
			}
			if (!turned && this.dir !== dir.none) {
				let d = delta(this.dir);
				if (!isPacWall(this.col + d[0], this.row + d[1])) {
					applyMove(this, d[0], d[1]);
				}
			}
		}

		if (this.moving) {
			let pacSpd = (state.dots[this.row][this.col] === 1 ? SPEED * PACMAN_DOT_SPEED_FACTOR : SPEED) * state.gameSpeed;
			if (moveTowardTarget(this, pacSpd)) {
				if (state.dots[this.row][this.col] === 1) {
					state.dots[this.row][this.col] = 0;
					state.dotsEaten++;
					if (!state.cherry) state.fruitDotsSinceSpawn++;
					addScore(10);
					playWaka();
				}

				for (let i = 0; i < state.bigDots.length; i++) {
					let bd = state.bigDots[i];
					if (!bd.eaten && bd.col === this.col && bd.row === this.row) {
						bd.eaten = true;
						addScore(50);
						state.scaredTimer = SCARED_DURATION;
						state.ghostCombo  = 0;
						state.ghosts.forEach(function(g) { g.immune = false; });
					}
				}
			}
		}

		let spriteSet = state.activeMap.spriteSheet === 'mspacman' ? s_mspacman : s_pacman;
		switch (this.dir) {
			case dir.left:  this.sprite = spriteSet.left;  break;
			case dir.up:    this.sprite = spriteSet.up;    break;
			case dir.right: this.sprite = spriteSet.right; break;
			case dir.down:  this.sprite = spriteSet.down;  break;
			default:        this.sprite = spriteSet.round; break;
		}

		if (state.frames % 10 === 0) state.frame++;
	},

	draw: function() {
		let ctx   = state.ctx;
		let mapW  = state.GRID_COLS * TILE;
		let relX  = this.x - state.mapOffX;
		let spr   = this.sprite[state.frame % 2];
		let scale = state.activeMap.scale;
		let drawW = spr.w * scale;
		let drawH = spr.h * scale;
		spr.draw(ctx, this.x, this.y, drawW, drawH);
		if (relX < 28)        spr.draw(ctx, this.x + mapW, this.y, drawW, drawH);
		if (relX > mapW - 28) spr.draw(ctx, this.x - mapW, this.y, drawW, drawH);
	}
};
