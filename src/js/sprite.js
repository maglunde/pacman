export let
s_map,
s_pacman,
s_blinky,	// red
s_pinky,	// pink
s_inky,		// blue
s_clyde,	// yellow
s_scaredGhost,
s_eyes,
s_fruit,
s_dot,
s_bigDot

;

export function Sprite(img,x,y,w,h){
	this.img= img;
	this.x=x;
	this.y=y;
	this.w=w;
	this.h=h;
}
Sprite.prototype.draw = function(ctx, x, y, w, h) {
  ctx.drawImage(this.img, this.x, this.y, this.w, this.h,
    x, y, w !== undefined ? w : this.w, h !== undefined ? h : this.h);
};




export function initSprites(img){
	s_map = new Sprite(img, 0, 0, 450, 503);
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
		new Sprite(img, 649, 151, 13, 13), // left
		new Sprite(img, 616, 185, 13, 13), // up
		new Sprite(img, 629, 185, 13, 13), // down
		new Sprite(img, 670, 150, 13, 13)  // right
	];
	s_dot    = new Sprite(img, 575, 151,  6,  6);
	s_bigDot = new Sprite(img, 587, 147, 18, 18);
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
}
