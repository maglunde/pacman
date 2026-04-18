import { initSprites, s_map, s_ready, s_gameover } from './sprite.js';
import {
	TICKS_PER_SECOND,
	TILE,
	FRUIT_DOT_THRESHOLD, FRUIT_DURATION, FRUIT_FLASH_THRESHOLD, FRUIT_SPAWN_COL, FRUIT_SPAWN_ROW,
	SCATTER_CHASE_PHASES, FRUIT_DRAW_SIZE,
	COLORS, MAPS,
} from './constants.js';
import { initInput } from './input.js';
import { state } from './state.js';
import { initWallData, buildGrid } from './grid.js';
import { initDots, initBigDots, drawDots } from './dots.js';
import { bfsReturnPath } from './ghost.js';
import { addScore, addPopup, startReady, newGame, nextLevel } from './game-states.js';
import { checkCollisions } from './collision.js';
import { renderPaths } from './pathvis.js';
import './pacman-entity.js';
import { aiDecide } from './ai.js';
import { getAvailableFruits } from './fruit.js';
import {
	playEatFruit,
	startFright, startEyes, stopLoopingMusic,
} from './audio.js';
import { drawHUD } from './hud.js';

function levelSpeedFactor() { return 1 + (state.level - 1) * 0.06; }

export function tickGame() {
	if (state.gameState === 'ready') { if (state.aiMode) state.gameState = 'playing'; return; }
	if (state.paused) return;

	state.frames++;

	if (state.gameState === 'dead') {
		if ((state.stateTimer -= state.effectiveSpeed) <= 0) startReady();
		return;
	}
	if (state.gameState === 'gameover') {
		if (state.stateTimer > 0) state.stateTimer -= state.effectiveSpeed;
		return;
	}
	if (state.gameState === 'win') {
		if ((state.stateTimer -= state.effectiveSpeed) <= 0) nextLevel();
		return;
	}
	if (state.gameState !== 'playing') return;

	if (state.ghostEatenFreezeTimer > 0) {
		state.ghostEatenFreezeTimer -= state.effectiveSpeed;
		if (state.ghostEatenFreezeTimer <= 0) {
			state.ghosts.forEach(function(g) {
				if (g.pendingReturn) {
					g.pendingReturn = false;
					g.returning = true;
					g.returnPath = bfsReturnPath(g.col, g.row, g.homeCol, g.homeRow);
					g.returnPathIdx = 0;
				}
			});
		}
		return;
	}

	if (state.scaredTimer > 0) {
		state.scaredTimer -= state.effectiveSpeed;
		if (state.scaredTimer <= 0) {
			state.scaredTimer = 0;
			state.ghostCombo = 0;
			state.ghosts.forEach(function(g) { g.immune = false; });
		}
	}

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

	if (state.scaredTimer === 0 && state.scatterPhase < SCATTER_CHASE_PHASES.length - 1) {
		state.scatterTimer -= state.effectiveSpeed;
		if (state.scatterTimer <= 0) {
			state.scatterPhase++;
			const base = SCATTER_CHASE_PHASES[state.scatterPhase];
			state.scatterTimer = base === Infinity ? base : base + (Math.random() - 0.5) * 60;
		}
	}

	state.scorePopups.forEach(function(p) { p.y -= 0.4; p.life--; });
	state.scorePopups = state.scorePopups.filter(function(p) { return p.life > 0; });

	if (state.settingToast.timer > 0) state.settingToast.timer--;

	if (state.cherry) {
		state.cherry.timer -= state.effectiveSpeed;
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
		let fruitSpawn = fruits[Math.floor(Math.random() * fruits.length)];
		state.fruitDotsSinceSpawn = 0;
		state.cherry = {
			col: FRUIT_SPAWN_COL,
			row: FRUIT_SPAWN_ROW,
			timer: FRUIT_DURATION,
			sprite: fruitSpawn.sprite,
			points: fruitSpawn.points,
		};
	}

	if (state.aiMode) aiDecide();
	state.pacman.update();
	state.ghosts.forEach(function(g) { g.update(levelSpeedFactor() * state.effectiveSpeed); });

	checkCollisions();
}

function render() {
	let ctx = state.ctx;
	ctx.clearRect(0, 0, state.width, state.height);
	ctx.fillStyle = COLORS.black;
	ctx.fillRect(0, 0, state.width, state.height);

	if (state.gameState === 'menu') return;

	ctx.save();
	ctx.scale(2, 2);
	s_map.draw(ctx, state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
	ctx.beginPath();
	ctx.rect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
	ctx.clip();
	drawDots();

	renderPaths(ctx);

	if (state.gameState !== 'dead' && state.gameState !== 'gameover') state.ghosts.forEach(function(g) { g.draw(); });
	state.pacman.draw();

	if (state.gameState === 'ready') {
		let cx = state.mapOffX + (state.GRID_COLS * TILE) / 2;
		s_ready.draw(ctx, cx - 48, state.mapOffY + 16 * TILE, 96, 17);
	}

	if (state.gameState === 'gameover') {
		let cx = state.mapOffX + (state.GRID_COLS * TILE) / 2;
		s_gameover.draw(ctx, cx - 82, state.mapOffY + 16 * TILE, 164, 25);
	}

	if (state.cherry) {
		let cherryVisible = state.cherry.timer > FRUIT_FLASH_THRESHOLD || Math.floor(state.frames / 8) % 2 === 0;
		if (cherryVisible) {
			let fx = state.mapOffX + state.cherry.col * TILE - TILE / 2;
			let fy = state.mapOffY + state.cherry.row * TILE - TILE / 2;
			state.cherry.sprite().draw(ctx, fx, fy, FRUIT_DRAW_SIZE, FRUIT_DRAW_SIZE);
		}
	}

	state.scorePopups.forEach(function(p) {
		ctx.fillStyle = 'rgba(0,255,200,' + (p.life / 60) + ')';
		ctx.font = "12px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText(p.text, p.x + TILE, p.y);
	});

	ctx.restore();
	drawHUD();
}

const TICK_MS = 1000 / TICKS_PER_SECOND;

function run() {
	newGame();
	state.gameState = 'menu';
	state.menuStartFrame = 0;

	let lastTimestamp = null;
	let accumulator = 0;

	let loop = function(timestamp) {
		if (lastTimestamp === null) {
			lastTimestamp = timestamp;
			window.requestAnimationFrame(loop);
			return;
		}

		let elapsed = Math.min(timestamp - lastTimestamp, TICK_MS * 5);
		lastTimestamp = timestamp;
		accumulator += elapsed;

		while (accumulator >= TICK_MS) {
			if (state.gameState === 'playing' || state.gameState === 'ready' ||
				state.gameState === 'dead' || state.gameState === 'gameover' ||
				state.gameState === 'win' || state.gameState === 'menu') {
				tickGame();
			}
			accumulator -= TICK_MS;
		}

		render();
		window.requestAnimationFrame(loop);
	};

	document.addEventListener('visibilitychange', function() {
		if (!document.hidden) lastTimestamp = null;
	});

	window.requestAnimationFrame(loop);
}

export function mountGame(containerEl) {
	if (state.engineStarted) return;

	state.sceneEl = containerEl;
	state.canvas = document.createElement('canvas');
	state.ctx = state.canvas.getContext('2d');
	state.width = 1800;
	state.height = 1200;
	state.canvas.width = state.width;
	state.canvas.height = state.height;
	containerEl.appendChild(state.canvas);
	initInput(newGame);

	state.engineStarted = true;

	Promise.all([loadImage('res/sheet-2.png'), loadImage('res/mspacmansheet.png')]).then(function(imgs) {
		state.img = imgs[0];
		state.mspacImg = imgs[1];
		state.activeMap = MAPS[state.mapIdx];
		initSprites(state.img, state.mspacImg);
		initWallData();
		buildGrid();
		initDots();
		initBigDots();
		state.engineReady = true;
		run();
	});
}

function loadImage(src) {
	return new Promise(function(resolve) {
		let img = new Image();
		img.onload = function() { resolve(img); };
		img.src = src;
	});
}
