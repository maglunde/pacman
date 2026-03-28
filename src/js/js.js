import '../sass/style.scss';
import { initSprites, s_map, s_pacman } from './sprite.js';

var
canvas,
ctx,
width,
height,
img,

frames =0,
frame =0,

dir = {
	none:-1,
	left:0,
	up:1,
	right:2,
	down:3
},

pacman = {
	animation: [0,1],
	init: function(){
		this.x = 287;
		this.y = 416;
		this.dir = dir.none;
		this.speed = 2;


	},
	update : function(){
		switch (this.dir){
			case dir.none:
				this.sprite = s_pacman.round;
				break;
			case dir.left:
				this.sprite = s_pacman.left;
				this.x -= this.speed;
				break;
			case dir.up:
				this.sprite = s_pacman.up;
				this.y -= this.speed;
				break;
			case dir.right:
				this.sprite = s_pacman.right;
				this.x += this.speed;
				break;
			case dir.down:
				this.sprite = s_pacman.down;
				this.y += this.speed;
				break;
		}



		if(frames%10==0) frame++;


	},
	draw : function(){

		this.sprite[frame%2].draw(ctx,this.x,this.y);
	}
}
;

function main(){

	canvas = document.createElement("canvas");
	ctx = canvas.getContext("2d");
	width = 600;
	height= 600;
	canvas.width = width;
	canvas.height = height;
	canvas.style.border="thin solid #000";
	document.body.appendChild(canvas);
	document.addEventListener("keydown",keydown);

	img = new Image();
	img.src  = "res/sheet.png";

	img.onload= function(){
		initSprites(img);
		run();
	}

}

function run(){
	pacman.init();
	var loop = function(){
		update();
		render();
		window.requestAnimationFrame(loop);
	}
	loop();
}

function update(){
	frames ++;

	pacman.update();

}

function render(){
	ctx.clearRect(0,0,width,height);
	ctx.save();
	ctx.fillStyle="rgba(0,0,0,1)";
	ctx.fillRect(0,0,width,height);
	ctx.restore();
	s_map.draw(ctx,width/2-s_map.w/2,height/2-s_map.h/2);

	pacman.draw();

	// s_pacman.round[0].draw(ctx,287,416)
	// s_pacman.round[1].draw(ctx,287,416)
	// s_pacman.left[0].draw(ctx,257,416)
	// s_pacman.left[1].draw(ctx,227,416)
	// s_pacman.right[0].draw(ctx,197,416)
	// s_pacman.right[1].draw(ctx,167,416)
	// s_pacman.up[0].draw(ctx,317,416)
	// s_pacman.up[1].draw(ctx,347,416)
	// s_pacman.down[0].draw(ctx,377,416)
	// s_pacman.down[1].draw(ctx,407,416)
}

function keydown(e){
	switch(e.which){
		case 37:
			if(pacman.dir === dir.left)
				pacman.speed = pacman.speed > 0 ? 0:2;
			else{
				pacman.dir = dir.left;
				pacman.speed = 2;
			}
			break;
		case 38:
			if(pacman.dir === dir.up)
				pacman.speed = pacman.speed > 0 ? 0:2;
			else{
				pacman.dir = dir.up;
				pacman.speed = 2;
			}
			break;
		case 39:
			if(pacman.dir === dir.right)
				pacman.speed = pacman.speed > 0 ? 0:2;
			else{
				pacman.dir = dir.right;
				pacman.speed = 2;
			}

			break;
		case 40:
			if(pacman.dir === dir.down)
				pacman.speed = pacman.speed > 0 ? 0:2;
			else{
				pacman.dir = dir.down;
				pacman.speed = 2;
			}
			break;
	}
}

main();
