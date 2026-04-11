import { BOARD_TILE_ROWS, TILE } from './constants.js';

export let
s_map,
s_pacman,
s_mspacman,
s_blinky,
s_pinky,
s_inky,
s_clyde,
s_scaredGhost,
s_eyes,
s_orange,
s_strawberry,
s_cherry,
s_pretzel,
s_apple,
s_pear,
s_banana,
s_dot,
s_bigDot,
s_title,
s_ready,
s_gameover
;

export function Sprite(img, x, y, w, h, scale) {
	this.img   = img;
	this.x     = x;
	this.y     = y;
	this.w     = w;
	this.h     = h;
	this.scale = scale || 1;
}
Sprite.prototype.draw = function(ctx, x, y, w, h) {
  ctx.drawImage(this.img, this.x, this.y, this.w, this.h,
    x, y, w !== undefined ? w : this.w, h !== undefined ? h : this.h);
};




let _pacmanImg = null;
let _mspacImg  = null;

export function setMapSprite(mapCfg) {
	let img = mapCfg.spriteSheet === 'mspacman' ? _mspacImg : _pacmanImg;
	let scale = Math.round((TILE * BOARD_TILE_ROWS) / mapCfg.sprite.h);
	s_map = new Sprite(img, mapCfg.sprite.x, mapCfg.sprite.y, mapCfg.sprite.w, mapCfg.sprite.h, scale);
}

export function getPacmanSpriteSet(spriteSheet) {
	return spriteSheet === 'mspacman' ? s_mspacman : s_pacman;
}

export function initSprites(img, mspacImg) {
	_pacmanImg = img;
	_mspacImg  = mspacImg;
	s_map = new Sprite(img, 0, 4, 450, 496);
	s_pacman = {
		left:	[
					new Sprite(_mspacImg,456, 160, 14, 14),
					new Sprite(_mspacImg,472, 160, 14, 14)
				],
		round: 	[
					new Sprite(_mspacImg,488, 144, 14, 14),
					new Sprite(_mspacImg,488, 144, 14, 14)
				],
		right:	[
					new Sprite(_mspacImg,472, 144, 14, 14),
					new Sprite(_mspacImg,456, 144, 14, 14),
				],
		up:		[
					new Sprite(_mspacImg,456, 176, 14, 14),
					new Sprite(_mspacImg,472, 176, 14, 14)
				],
		down:	[
					new Sprite(_mspacImg,472, 192, 14, 14),
					new Sprite(_mspacImg,456, 192, 14, 14)
				]
	};
	s_mspacman = {
		right: [
			new Sprite(_mspacImg, 457, 1,  14, 14),
			new Sprite(_mspacImg, 473, 1,  14, 14),
		],
		left: [
			new Sprite(_mspacImg, 457, 17, 14, 14),
			new Sprite(_mspacImg, 473, 17, 14, 14),
		],
		round: [
			new Sprite(_mspacImg, 489, 1,  14, 14),
			new Sprite(_mspacImg, 489, 1,  14, 14),
		],
		up: [
			new Sprite(_mspacImg, 457, 33, 14, 14),
			new Sprite(_mspacImg, 473, 33, 14, 14),
		],
		down: [
			new Sprite(_mspacImg, 457, 49, 14, 14),
			new Sprite(_mspacImg, 473, 49, 14, 14),
		],
	};
	s_blinky = [
		new Sprite(_mspacImg, 488, 64, 16, 16),
		new Sprite(_mspacImg, 520, 64, 16, 16),
		new Sprite(_mspacImg, 552, 64, 16, 16),
		new Sprite(_mspacImg, 456, 64, 16, 16)
	];
	s_inky = [
		new Sprite(_mspacImg, 488, 96, 16, 16),
		new Sprite(_mspacImg, 520, 96, 16, 16),
		new Sprite(_mspacImg, 552, 96, 16, 16),
		new Sprite(_mspacImg, 456, 96, 16, 16)
	];
	s_pinky = [
		new Sprite(_mspacImg, 488, 80, 16, 16),
		new Sprite(_mspacImg, 520, 80, 16, 16),
		new Sprite(_mspacImg, 552, 80, 16, 16),
		new Sprite(_mspacImg, 456, 80, 16, 16)
	];
	s_clyde = [
		new Sprite(_mspacImg, 488, 112, 16, 16),
		new Sprite(_mspacImg, 520, 112, 16, 16),
		new Sprite(_mspacImg, 552, 112, 16, 16),
		new Sprite(_mspacImg, 456, 112, 16, 16)
	];
	s_eyes = [
		new Sprite(img, 649, 151, 30, 30),
		new Sprite(img, 616, 185, 30, 30),
		new Sprite(img, 649, 183, 30, 30),
		new Sprite(img, 618, 150, 30, 30)
	];
	s_dot    = new Sprite(img, 575, 151,  6,  6);
	s_bigDot = new Sprite(img, 587, 147, 18, 18);
	s_cherry = new Sprite(_mspacImg, 504, 0, 16, 16);
	s_strawberry = new Sprite(_mspacImg, 520, 0, 16, 16);
	s_orange = new Sprite(_mspacImg, 536, 0, 16, 16);
	s_pretzel = new Sprite(_mspacImg, 552, 0, 16, 16);
	s_apple = new Sprite(_mspacImg, 568, 0, 16, 16);
	s_pear = new Sprite(_mspacImg, 584, 0, 16, 16);
	s_banana = new Sprite(_mspacImg, 600, 0, 16, 16);
	s_scaredGhost = [
		new Sprite(img, 533, 139, 30, 30),
		new Sprite(img, 499, 139, 30, 30)
	];
	s_title = new Sprite(img, 0, 508, 425, 99);
	s_ready = new Sprite(img, 626, 480, 96, 17);
	s_gameover = new Sprite(img, 451, 476, 164, 25);
}
