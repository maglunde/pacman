import { TILE, SPEED, PACMAN_DOT_SPEED_FACTOR, SCARED_DURATION, PACMAN_DRAW_SIZE, DEAD_STATE_FRAMES, RESULT_STATE_FRAMES, dir } from './constants.js';
import { state } from './state.js';
import { delta, tilePixel, isPacWall, applyMove, moveTowardTarget } from './grid.js';
import { playWaka } from './audio.js';
import { getPacmanSpriteSet, s_pacman_dies } from './sprite.js';
import { addScore } from './game-states.js';

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
		let spriteSet = getPacmanSpriteSet(state.playerSpriteSheet);
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
			let pacSpd = (state.dots[this.row][this.col] === 1 ? SPEED * PACMAN_DOT_SPEED_FACTOR : SPEED) * state.effectiveSpeed;
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

		let spriteSet = getPacmanSpriteSet(state.playerSpriteSheet);
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
		let ctx = state.ctx;

		if (state.gameState === 'dead' || state.gameState === 'gameover') {
			let elapsed = state.gameState === 'dead'
				? DEAD_STATE_FRAMES - state.stateTimer
				: RESULT_STATE_FRAMES - state.stateTimer;
			let progress = Math.min(elapsed, DEAD_STATE_FRAMES) / DEAD_STATE_FRAMES;
			let frameIdx = Math.min(Math.floor(progress * s_pacman_dies.length), s_pacman_dies.length - 1);
			let rotations = { [dir.right]: 0, [dir.down]: Math.PI / 2, [dir.left]: Math.PI, [dir.up]: -Math.PI / 2 };
			let angle = rotations[this.dir] || 0;
			let cx = this.x + PACMAN_DRAW_SIZE / 2;
			let cy = this.y + PACMAN_DRAW_SIZE / 2;
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(angle);
			s_pacman_dies[frameIdx].draw(ctx, -PACMAN_DRAW_SIZE / 2, -PACMAN_DRAW_SIZE / 2, PACMAN_DRAW_SIZE, PACMAN_DRAW_SIZE);
			ctx.restore();
			return;
		}

		let mapW  = state.GRID_COLS * TILE;
		let relX  = this.x - state.mapOffX;
		let spr   = this.sprite[state.frame % 2];
		let drawW = PACMAN_DRAW_SIZE;
		let drawH = PACMAN_DRAW_SIZE;
		spr.draw(ctx, this.x, this.y, drawW, drawH);
		if (relX < PACMAN_DRAW_SIZE)               spr.draw(ctx, this.x + mapW, this.y, drawW, drawH);
		if (relX > mapW - PACMAN_DRAW_SIZE) spr.draw(ctx, this.x - mapW, this.y, drawW, drawH);
	}
};
