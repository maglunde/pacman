export let
s_map,
s_pacman,
s_mspacman,
s_blinky,	// red
s_pinky,	// pink
s_inky,		// blue
s_clyde,	// yellow
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




var _pacmanImg = null;
var _mspacImg  = null;

export function setMapSprite(mapCfg) {
	var img = mapCfg.spriteSheet === 'mspacman' ? _mspacImg : _pacmanImg;
	s_map = new Sprite(img, mapCfg.sprite.x, mapCfg.sprite.y, mapCfg.sprite.w, mapCfg.sprite.h, mapCfg.scale);
}

export function initSprites(img, mspacImg) {
	_pacmanImg = img;
	_mspacImg  = mspacImg;
	s_map = new Sprite(img, 0, 4, 450, 496);
	s_pacman = {
		left:	[
					new Sprite(img,465,317,28,28),  // facing left, big mouth
					new Sprite(img,495,317,28,28)  // left small
				],

		round: 	[
					new Sprite(img,527,317,28,28),
					new Sprite(img,527,317,28,28)
				],
		right:	[
					new Sprite(img,559,317,28,28),	// right small
					new Sprite(img,593,317,28,28)	// right big
				],
		up:		[
					new Sprite(img,527,255,28,28), 	// up big
					new Sprite(img,527,285,28,28) 	// up small
				],
		down:	[
					new Sprite(img,527,349,28,28), 	// down small
					new Sprite(img,527,380,28,28) 	// down big
				]
	};
	s_mspacman = {
		right: [
			new Sprite(_mspacImg, 457, 1,  14, 14), // big mouth
			new Sprite(_mspacImg, 473, 1,  14, 14), // small mouth
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
	s_blinky = [   // red, y=107
		new Sprite(img, 465, 107, 30, 30), // left
		new Sprite(img, 499, 107, 30, 30), // up
		new Sprite(img, 533, 107, 30, 30), // down
		new Sprite(img, 567, 107, 30, 30)  // right
	];
	s_pinky = [    // pink, y=73
		new Sprite(img, 465, 73, 30, 30),
		new Sprite(img, 499, 73, 30, 30),
		new Sprite(img, 533, 73, 30, 30),
		new Sprite(img, 567, 73, 30, 30)
	];
	s_inky = [     // blue, y=9
		new Sprite(img, 465, 9, 30, 30),
		new Sprite(img, 499, 9, 30, 30),
		new Sprite(img, 533, 9, 30, 30),
		new Sprite(img, 567, 9, 30, 30)
	];
	s_eyes = [

		new Sprite(img, 649, 151, 30, 30), // left
		new Sprite(img, 616, 185, 30, 30), // up
		// new Sprite(img, 629, 185, 30, 30), // down
		new Sprite(img, 649, 183, 30, 30), // down
		new Sprite(img, 618, 150, 30, 30)  // right
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
		new Sprite(img, 533, 139, 30, 30), // blue
		new Sprite(img, 499, 139, 30, 30)  // white (blinking)
	];
	s_clyde = [    // orange, y=41
		new Sprite(img, 465, 41, 30, 30),
		new Sprite(img, 499, 41, 30, 30),
		new Sprite(img, 533, 41, 30, 30),
		new Sprite(img, 567, 41, 30, 30)
	];
	s_title = new Sprite(img, 0, 508, 425, 99);
	s_ready = new Sprite(img, 626, 480, 96, 17);
	s_gameover = new Sprite(img, 451, 476, 164, 25);
}
