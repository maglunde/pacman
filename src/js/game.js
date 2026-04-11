import '../sass/style.scss';
import { initSprites, s_map, s_ready, s_gameover } from './sprite.js';
import {
	TILE,
	FRUIT_DOT_THRESHOLD, FRUIT_DURATION, FRUIT_FLASH_THRESHOLD, FRUIT_SPAWN_COL, FRUIT_SPAWN_ROW,
	SCATTER_CHASE_PHASES, FRUIT_DRAW_SIZE,
	COLORS, MAPS
} from './constants.js';
import { drawSettingsContent, renderMenu, menuMouseDown, menuMouseMove } from './menu.js';
import { initInput } from './input.js';
import { state } from './state.js';
import { initWallData, buildGrid } from './grid.js';
import { initDots, initBigDots, drawDots } from './dots.js';
import { bfsReturnPath } from './ghost.js';
import { addScore, addPopup, startReady, newGame, nextLevel, loseLife } from './game-states.js';
import { checkCollisions } from './collision.js';
import { renderPaths } from './pathvis.js';
import './pacman-entity.js';
import { aiDecide } from './ai.js';
import { getAvailableFruits } from './fruit.js';
import {
	playEatFruit,
	startFright, startEyes, stopLoopingMusic, pauseAudio, resumeAudio
} from './audio.js';
import { drawHUD } from './hud.js';

// ── Game speed ────────────────────────────────────────────────────────────────

function levelSpeedFactor() { return 1 + (state.level - 1) * 0.06; }

// ── Update ────────────────────────────────────────────────────────────────────

function update() {
	state.frames++;

	if (state.gameState === 'ready') { if (state.aiMode) state.gameState = 'playing'; return; }
	if (state.paused) return;

	if (state.gameState === 'dead') {
		if ((state.stateTimer -= state.gameSpeed) <= 0) startReady();
		return;
	}
	if (state.gameState === 'gameover') {
		if (state.stateTimer > 0) state.stateTimer -= state.gameSpeed;
		return;
	}
	if (state.gameState === 'win') {
		if ((state.stateTimer -= state.gameSpeed) <= 0) nextLevel();
		return;
	}
	if (state.gameState !== 'playing') return;

	// Freeze briefly after eating a ghost
	if (state.ghostEatenFreezeTimer > 0) {
		state.ghostEatenFreezeTimer -= state.gameSpeed;
		if (state.ghostEatenFreezeTimer <= 0) {
			state.ghosts.forEach(function(g) {
				if (g.pendingReturn) {
					g.pendingReturn    = false;
					g.returning        = true;
					g.returnPath       = bfsReturnPath(g.col, g.row, g.homeCol, g.homeRow);
					g.returnPathIdx    = 0;
				}
			});
		}
		return;
	}

	// Scared timer
	if (state.scaredTimer > 0) {
		state.scaredTimer -= state.gameSpeed;
		if (state.scaredTimer <= 0) {
			state.scaredTimer = 0;
			state.ghostCombo  = 0;
			state.ghosts.forEach(function(g) { g.immune = false; });
		}
	}

	// Background music manager
	if (state.ghostEatenFreezeTimer <= 0) {
		let anyReturning = state.ghosts.some(function(g) { return g.returning; });
		if (anyReturning) {
			startEyes();
		} else if (state.scaredTimer > 0) {
			if (state.activeLoopTrack !== 'fright') { stopLoopingMusic(); startFright(); }
		} else {
			stopLoopingMusic();
		}
	}

	// Scatter/chase cycle (pauses while ghosts are scared)
	if (state.scaredTimer === 0 && state.scatterPhase < SCATTER_CHASE_PHASES.length - 1) {
		state.scatterTimer -= state.gameSpeed;
		if (state.scatterTimer <= 0) {
			state.scatterPhase++;
			state.scatterTimer = SCATTER_CHASE_PHASES[state.scatterPhase];
		}
	}

	// Score popups
	state.scorePopups.forEach(function(p) { p.y -= 0.4; p.life--; });
	state.scorePopups = state.scorePopups.filter(function(p) { return p.life > 0; });

	// Setting toast
	if (state.settingToast.timer > 0) state.settingToast.timer--;

	// Cherry
	if (state.cherry) {
		state.cherry.timer -= state.gameSpeed;
		if (state.cherry.timer <= 0) {
			state.cherry = null;
		} else if (state.cherry.col === state.pacman.col && state.cherry.row === state.pacman.row) {
			addScore(state.cherry.points);
			addPopup(String(state.cherry.points), state.cherry.col, state.cherry.row);
			state.cherry = null;
			playEatFruit();
		}
	} else if (state.fruitDotsSinceSpawn >= FRUIT_DOT_THRESHOLD) {
		let fruits = getAvailableFruits(state.level);
		let fruitspawn = fruits[Math.floor(Math.random() * fruits.length)];
		state.fruitDotsSinceSpawn = 0;
		state.cherry = {
			col: FRUIT_SPAWN_COL,
			row: FRUIT_SPAWN_ROW,
			timer: FRUIT_DURATION,
			sprite: fruitspawn.sprite,
			points: fruitspawn.points
		};
	}

	if (state.aiMode) aiDecide();
	state.pacman.update();
	state.ghosts.forEach(function(g) { g.update(levelSpeedFactor() * state.gameSpeed); });

	checkCollisions();
}

// ── Render ────────────────────────────────────────────────────────────────────

// renderMenu() lives in menu.js


function render() {
	let ctx = state.ctx;
	ctx.clearRect(0, 0, state.width, state.height);
	ctx.fillStyle = COLORS.black;
	ctx.fillRect(0, 0, state.width, state.height);

	if (state.gameState === 'menu') { renderMenu(); return; }

	ctx.save();
	ctx.scale(2, 2);
	s_map.draw(ctx, state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
	ctx.beginPath();
	ctx.rect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
	ctx.clip();
	drawDots();

	renderPaths(ctx);

	state.ghosts.forEach(function(g) { g.draw(); });
	state.pacman.draw();

	// Fruit
	if (state.cherry) {
		let cherryVisible = state.cherry.timer > FRUIT_FLASH_THRESHOLD || Math.floor(state.frames / 8) % 2 === 0;
		if (cherryVisible) {
			let fx = state.mapOffX + state.cherry.col * TILE - TILE / 2;
			let fy = state.mapOffY + state.cherry.row * TILE - TILE / 2;
			state.cherry.sprite().draw(ctx, fx, fy, FRUIT_DRAW_SIZE, FRUIT_DRAW_SIZE);
		}
	}

	// Score popups
	state.scorePopups.forEach(function(p) {
		ctx.fillStyle = 'rgba(0,255,200,' + (p.life / 60) + ')';
		ctx.font      = "12px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText(p.text, p.x + TILE, p.y);
	});

	// State overlays
	let mx = state.mapOffX + state.GRID_COLS * TILE / 2;
	let my = state.mapOffY + state.GRID_ROWS * TILE / 2;
	if (state.gameState === 'ready') {
		s_ready.draw(ctx, mx - s_ready.w / 2, my + 33 - s_ready.h / 2);
		ctx.fillStyle = 'rgba(255,255,255,0.9)';
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('press any arrow to start', mx, my + 64);
	}
	if (state.paused && !state.escapeMenuActive) {
		ctx.fillStyle = COLORS.dim;
		ctx.fillRect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
		ctx.fillStyle = COLORS.white;
		ctx.font      = "12px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('PAUSED', mx, my);
	}
	if (state.settingsOverlayActive) {
		ctx.fillStyle = 'rgba(0,0,0,0.85)';
		let bw = 250, bh = 140;
		let bx = mx - bw / 2, by = my - bh / 2;
		ctx.fillRect(bx, by, bw, bh);
		ctx.strokeStyle = '#555555';
		ctx.lineWidth   = 1;
		ctx.strokeRect(bx, by, bw, bh);
		ctx.fillStyle = '#aaaaaa';
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('SETTINGS', mx, by + 18);
		drawSettingsContent(ctx, mx, by + 44, state.settingsRow);
		ctx.fillStyle = '#444444';
		ctx.font      = "6px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('\u2191\u2193 select  \u2022  \u2190\u2192 adjust  \u2022  O / Esc close', mx, by + bh - 8);
	}
	if (state.escapeMenuActive) {
		// Dim the map
		ctx.fillStyle = 'rgba(0,0,0,0.72)';
		ctx.fillRect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);

		// Box
		let bw = 120, bh = 80;
		let bx = mx - bw / 2, by = my - bh / 2;
		ctx.fillStyle   = COLORS.black;
		ctx.fillRect(bx, by, bw, bh);
		ctx.strokeStyle = COLORS.darkGray;
		ctx.lineWidth   = 1;
		ctx.strokeRect(bx, by, bw, bh);

		ctx.textAlign = 'center';
		ctx.fillStyle = COLORS.lightGray;
		ctx.font      = "12px 'Press Start 2P', monospace";
		ctx.fillText('PAUSE', mx, by + 16);

		// Buttons
		let opts = ['Continue', 'Quit'];
		state.escapeMenuBounds = [];
		for (let ei = 0; ei < opts.length; ei++) {
			let ey = by + 34 + ei * 26;
			let active = state.escapeMenuSelected === ei;
			ctx.fillStyle = active ? COLORS.pacman : COLORS.darkGray;
			ctx.fillRect(bx + 12, ey - 13, bw - 24, 18);
			ctx.fillStyle = active ? COLORS.black : COLORS.gray;
			ctx.font      = active ? "10px 'Press Start 2P', monospace" : "10px 'Press Start 2P', monospace";
			ctx.fillText(opts[ei], mx, ey);
			state.escapeMenuBounds.push({ x: bx + 12, y: ey - 13, w: bw - 24, h: 18, idx: ei });
		}
	}
	if (state.gameState === 'gameover') {
		ctx.fillStyle = COLORS.overlay;
		ctx.fillRect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
		s_gameover.draw(ctx, mx - s_gameover.w / 2, my - s_gameover.h / 2 - 10);
		ctx.fillStyle = COLORS.pacman;
		ctx.font      = "12px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('Score: ' + state.score, mx, my + 16);
		if (state.stateTimer <= 0) {
			ctx.fillStyle = 'rgba(255,255,255,0.85)';
			ctx.font      = "9px 'Press Start 2P', monospace";
			ctx.fillText('press Enter / Space to return to menu', mx, my + 34);
		}
	}
	if (state.gameState === 'win') {
		ctx.fillStyle = COLORS.dim;
		ctx.fillRect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
		ctx.fillStyle = COLORS.target;

		ctx.font      = "13px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('LEVEL ' + state.level + ' COMPLETE!', mx, my);
	}

	// Setting toast — centered flash when speed/volume changes
	if (state.settingToast.timer > 0) {
		let alpha = Math.min(1, state.settingToast.timer / 15);
		ctx.fillStyle = 'rgba(0,0,0,' + (alpha * 0.55) + ')';
		let tw = 110, th = 36;
		ctx.fillRect(mx - tw / 2, my - th / 2, tw, th);
		ctx.fillStyle = 'rgba(255,255,0,' + alpha + ')';
		ctx.font      = "18px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText(state.settingToast.text, mx, my + 7);
	}

	ctx.restore();
	drawHUD();
}

// ── Game loop ─────────────────────────────────────────────────────────────────

function run() {
	newGame();
	state.gameState    = 'menu';
	state.menuStartFrame = 0;
	let loop = function() {
		if (state.gameState === 'playing' || state.gameState === 'ready' ||
		    state.gameState === 'dead'    || state.gameState === 'gameover' ||
		    state.gameState === 'win'     || state.gameState === 'menu') {
			update();
		}
		render();
		window.requestAnimationFrame(loop);
	};
	loop();
}


// ── Entry point ───────────────────────────────────────────────────────────────

export function main() {
	state.canvas        = document.createElement('canvas');
	state.ctx           = state.canvas.getContext('2d');
	state.width         = 1800;
	state.height        = 1200;
	state.canvas.width  = state.width;
	state.canvas.height = state.height;
	document.body.appendChild(state.canvas);
	initInput(newGame);

	state.canvas.addEventListener('mousedown', function(e) {
		menuMouseDown(e, newGame);
		// Escape menu click (bounds are in scale(2,2) space → divide canvas coords by 2)
		if (state.escapeMenuActive && state.escapeMenuBounds) {
			let r  = state.canvas.getBoundingClientRect();
			let px = (e.clientX - r.left) * (state.canvas.width  / r.width)  / 2;
			let py = (e.clientY - r.top)  * (state.canvas.height / r.height) / 2;
			for (let bi = 0; bi < state.escapeMenuBounds.length; bi++) {
				let b = state.escapeMenuBounds[bi];
				if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
					if (b.idx === 0) {
						state.escapeMenuActive = false;
						state.paused           = false;
						resumeAudio();
					} else {
						state.escapeMenuActive = false;
						newGame();
						state.gameState      = 'menu';
						state.menuSubState   = 'main';
						state.menuStartFrame = state.frames;
					}
					break;
				}
			}
		}
	});
	state.canvas.addEventListener('mousemove', function(e) { menuMouseMove(e); });
	state.canvas.addEventListener('mouseup',   function()  {});

	function loadImage(src) {
		return new Promise(function(resolve) {
			let img = new Image();
			img.onload = function() { resolve(img); };
			img.src = src;
		});
	}

	Promise.all([loadImage('res/sheet-2.png'), loadImage('res/mspacmansheet.png')]).then(function(imgs) {
		state.img     = imgs[0];
		state.mspacImg = imgs[1];
		state.activeMap = MAPS[state.mapIdx];
		initSprites(state.img, state.mspacImg);
		initWallData();
		buildGrid();
		initDots();
		initBigDots();
		run();
	});
}
