import { state } from './state.js';
import { dir, GHOST_EATEN_FREEZE_FRAMES, RESULT_STATE_FRAMES } from './constants.js';
import { getPacmanSpriteSet } from './sprite.js';
import { addScore, addPopup, loseLife } from './game-states.js';
import { playEatGhost, stopLoopingMusic, playIntermission } from './audio.js';

export function checkCollisions() {
	// Ghost–Pac-Man collision
	for (let i = 0; i < state.ghosts.length; i++) {
		let g = state.ghosts[i];
		if (!g.exited) continue;
		if (g.returning) continue;

		let dx   = g.x - state.pacman.x;
		let dy   = g.y - state.pacman.y;
		let dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < 10) {
			if (state.scaredTimer > 0 && !g.immune) {
				// Face the ghost being eaten
				if (Math.abs(dx) > Math.abs(dy)) {
					state.pacman.dir = dx > 0 ? dir.right : dir.left;
				} else {
					state.pacman.dir = dy > 0 ? dir.down : dir.up;
				}
				let spriteSet = getPacmanSpriteSet(state.playerSpriteSheet);
				switch (state.pacman.dir) {
					case dir.left:  state.pacman.sprite = spriteSet.left;  break;
					case dir.up:    state.pacman.sprite = spriteSet.up;    break;
					case dir.right: state.pacman.sprite = spriteSet.right; break;
					case dir.down:  state.pacman.sprite = spriteSet.down;  break;
				}

				state.ghostCombo++;
				let pts = 200 * Math.pow(2, state.ghostCombo - 1);
				addScore(pts);
				addPopup(pts.toString(), g.col, g.row);
				g.pendingReturn             = true;
				g.immune                    = true;
				state.ghostEatenFreezeTimer = GHOST_EATEN_FREEZE_FRAMES;
				playEatGhost();
				break;
			} else {
				loseLife();
				break;
			}
		}
	}

	// Win check
	let remaining = 0;
	for (let r = 0; r < state.GRID_ROWS; r++)
		for (let c = 0; c < state.GRID_COLS; c++)
			if (state.dots[r][c] === 1) remaining++;
	if (remaining === 0) {
		state.gameState  = 'win';
		state.stateTimer = RESULT_STATE_FRAMES;
		stopLoopingMusic();
		playIntermission();
	}
}
