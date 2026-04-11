import { state } from './state.js';
import { TILE, MAPS, SCATTER_CHASE_PHASES, DEAD_STATE_FRAMES, RESULT_STATE_FRAMES } from './constants.js';
import { setMapSprite } from './sprite.js';
import { initWallData, buildGrid } from './grid.js';
import { initDots, initBigDots } from './dots.js';
import { initGhosts } from './ghost.js';
import { shuffleBFSDirs } from './ai.js';
import { stopLoopingMusic, resumeAudio, playDeath, playExtraPac } from './audio.js';

// ── Score ─────────────────────────────────────────────────────────────────────

export function addPopup(text, col, row) {
	state.scorePopups.push({
		text: text,
		x: state.mapOffX + col * TILE,
		y: state.mapOffY + row * TILE,
		life: 60
	});
}

export function addScore(pts) {
	state.score += pts;
	while (state.score - state.lastExtraLifeScore >= 10000) {
		state.lives++;
		state.lastExtraLifeScore += 10000;
		playExtraPac();
	}
}

// ── Game state transitions ────────────────────────────────────────────────────

export function startReady() {
	state.pacman.init();
	initGhosts();
	state.scaredTimer           = 0;
	state.ghostEatenFreezeTimer = 0;
	state.ghostCombo            = 0;
	state.cherry                = null;
	state.scorePopups           = [];
	state.scatterPhase          = 0;
	state.scatterTimer          = SCATTER_CHASE_PHASES[0];
	state.gameState             = 'ready';
	state.paused                = false;
	state.selectedGhostIdx      = -1;
	state.controlledGhostIdx    = -1;
}

export function newGame() {
	stopLoopingMusic();
	resumeAudio();
	state.score = 0;
	state.lastExtraLifeScore = 0;
	state.lives = 3;
	state.level = 1;
	state.dotsEaten = 0;
	state.fruitDotsSinceSpawn = 0;
	state.activeMap = MAPS[state.mapIdx];
	state.playerSpriteSheet = state.activeMap.spriteSheet;
	setMapSprite(state.activeMap);
	initWallData();
	buildGrid();
	initDots();
	initBigDots();
	shuffleBFSDirs();
	startReady();
}

export function nextLevel() {
	state.level++;
	state.mapIdx    = (state.mapIdx + 1) % MAPS.length;
	state.fruitDotsSinceSpawn = 0;
	state.activeMap = MAPS[state.mapIdx];
	state.playerSpriteSheet = state.activeMap.spriteSheet;
	setMapSprite(state.activeMap);
	initWallData();
	buildGrid();
	initDots();
	initBigDots();
	startReady();
}

export function loseLife() {
	state.lives--;
	stopLoopingMusic();
	playDeath();
	if (state.lives <= 0) {
		if (state.score > state.highScore) {
			state.highScore = state.score;
			localStorage.setItem('pacman-hi', state.highScore);
		}
		state.gameState  = 'gameover';
		state.stateTimer = RESULT_STATE_FRAMES;
	} else {
		state.gameState  = 'dead';
		state.stateTimer = DEAD_STATE_FRAMES;
	}
}
