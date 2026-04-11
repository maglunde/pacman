import { state } from './state.js';
import {
	TILE, SPEED_MIN, SPEED_MAX,
	COLORS, MAPS, AI_PERSONALITY_KEYS, AI_PERSONALITIES,
	PACMAN_DRAW_SIZE, GHOST_DRAW_SIZE,
} from './constants.js';
import {
	getPacmanSpriteSet, setMapSprite,
	s_title, s_blinky, s_pinky, s_inky, s_clyde, s_scaredGhost,
} from './sprite.js';
import { saveVolume, saveSpeed } from './hud.js';
import { playBeginning, updateLoopVolume } from './audio.js';
import { drawText } from './draw.js';

// ── Menu rendering ────────────────────────────────────────────────────────────

export function renderMenu() {
	let ctx  = state.ctx;
	ctx.save();
	ctx.scale(2, 2);

	ctx.fillStyle = COLORS.black;
	ctx.fillRect(0, 0, state.width / 2, state.height / 2);

	let cx     = state.mapOffX + state.GRID_COLS * TILE / 2;
	let top    = state.mapOffY;
	let mapBot = top + state.GRID_ROWS * TILE;

	let desiredW = s_title.w * 0.8;
	let desiredH = s_title.h * 0.8;
	s_title.draw(ctx, cx - desiredW / 2, top + 4, desiredW, desiredH);
	ctx.translate(0, 50);

	if (state.menuSubState === 'settings') {
		renderSettingsPage(ctx, cx, top);
	} else if (state.menuSubState === 'personality') {
		renderPersonalityPage(ctx, cx, top);
	} else {
		renderMainPage(ctx, cx, top);
	}

	renderAnimationStrip(ctx, cx, top, mapBot);

	ctx.save();
	ctx.setTransform(2, 0, 0, 2, 0, 0);
	drawText(ctx, 'v' + __APP_VERSION__, state.mapOffX + state.GRID_COLS * TILE, state.height / 2 - 4, 6, COLORS.gray, 'right');
	ctx.restore();

	ctx.restore();
}

// ── Page renderers ────────────────────────────────────────────────────────────

function renderMainPage(ctx, cx, top) {
	if (state.highScore > 0) {
		drawText(ctx, 'HIGH-SCORE: ' + state.highScore, cx, top + 55, 10, COLORS.darkGray);
	}

	let optY0  = top + 84;
	let optY1  = top + 106;
	let optY2  = top + 125;
	let optY2b = top + 141;
	let optY3  = top + 166;
	let opts   = ['START GAME', 'WATCH AI PLAY', null, 'SETTINGS'];
	let optYs  = [optY0, optY1, optY2, optY3];
	for (let i = 0; i < opts.length; i++) {
		let active = state.menuSelected === i;
		if (i === 2) {
			let mapLabel = '\u25c4 ' + MAPS[state.mapIdx].name + ' \u25ba';
			if (active) {
				ctx.fillStyle = COLORS.black;
				ctx.fillRect(cx - 90, optY2 - 13, 180, 33);
			}
			drawText(ctx, 'STARTMAP:', cx, optY2, 8, active ? COLORS.pacman : COLORS.gray);
			drawText(ctx, mapLabel,    cx, optY2b, 8, active ? COLORS.pacman : COLORS.gray);
		} else {
			if (active) {
				ctx.fillStyle = COLORS.black;
				ctx.fillRect(cx - 90, optYs[i] - 13, 180, 17);
			}
			drawText(ctx, opts[i], cx, optYs[i], 10, active ? COLORS.pacman : COLORS.gray);
		}
	}

	ctx.strokeStyle = COLORS.darkGray;
	ctx.lineWidth   = 1;
	ctx.beginPath();
	ctx.moveTo(cx - 110, top + 180); ctx.lineTo(cx + 110, top + 180);
	ctx.stroke();

	ctx.translate(0, 20);

	drawText(ctx, 'CHARACTER / NICKNAME', cx, top + 186, 12, COLORS.white);

	let ghostData = [
		{ sprites: s_blinky, color: COLORS.blinky, name: 'SHADOW',  nick: '"BLINKY"' },
		{ sprites: s_pinky,  color: COLORS.pinky,  name: 'SPEEDY',  nick: '"PINKY"'  },
		{ sprites: s_inky,   color: COLORS.inky,   name: 'BASHFUL', nick: '"INKY"'   },
		{ sprites: s_clyde,  color: COLORS.clyde,  name: 'POKEY',   nick: '"CLYDE"'  },
	];
	let rowH    = 30;
	let rowBase = top + 214;
	for (let gi = 0; gi < ghostData.length; gi++) {
		let gd = ghostData[gi];
		let gy = rowBase + gi * rowH;
		gd.sprites[3].draw(ctx, cx - 130, gy - 13, 26, 26);
		drawText(ctx, '- ' + gd.name, cx - 91, gy + 2, 11, gd.color, 'left');
		drawText(ctx, gd.nick,        cx + 20,  gy + 2, 11, gd.color, 'left');
	}
}

function renderSettingsPage(ctx, cx, top) {
	drawText(ctx, 'SETTINGS', cx, top + 80, 10, '#aaaaaa');

	drawSettingsContent(ctx, cx, top + 120, state.settingsRow);

	let backActive = state.settingsRow === 2;
	if (backActive) {
		ctx.fillStyle = COLORS.black;
		ctx.fillRect(cx - 40, top + 168, 80, 16);
	}
	drawText(ctx, 'BACK', cx, top + 180, 10, backActive ? COLORS.pacman : COLORS.gray);
	drawText(ctx, '\u2190 \u2192 adjust  \u2022  \u2191 \u2193 select  \u2022  Enter/Esc back', cx, top + 202, 7, '#555');
}

function renderPersonalityPage(ctx, cx, top) {
	let pKey = AI_PERSONALITY_KEYS[state.aiPersonalityIdx];
	let pCfg = AI_PERSONALITIES[pKey];
	let descs = {
		coward:     'Flees early, takes no risks',
		balanced:   'Balanced and efficient',
		aggressive: 'Actively hunts ghosts',
		greedy:     'Maximizes score, takes risks',
	};

	let onSelector = state.personalityRow === 0;
	let onBack     = state.personalityRow === 1;

	drawText(ctx, 'CHOOSE AI STYLE', cx, top + 80, 10, COLORS.lightGray);

	if (onSelector) {
		ctx.fillStyle = COLORS.black;
		ctx.fillRect(cx - 100, top + 102, 200, 18);
	}
	drawText(ctx, '◄  ' + pCfg.label.toUpperCase() + '  ►', cx, top + 115, 10, onSelector ? COLORS.pacman : COLORS.gray);
	drawText(ctx, descs[pKey],                               cx, top + 136,  8, COLORS.gray);
	drawText(ctx, 'Enter to start',                          cx, top + 158,  8, COLORS.darkGray);
	drawText(ctx, 'Tab through ghosts • Enter to control',   cx, top + 174,  7, COLORS.gray);

	if (onBack) {
		ctx.fillStyle = COLORS.black;
		ctx.fillRect(cx - 40, top + 190, 80, 16);
	}
	drawText(ctx, 'BACK', cx, top + 202, 10, onBack ? COLORS.pacman : COLORS.gray);
}

function renderAnimationStrip(ctx, cx, top, mapBot) {
	let ANIM_DELAY = 60;
	let menuAge    = state.frames - state.menuStartFrame;
	if (menuAge < ANIM_DELAY) return;

	let boardW    = state.GRID_COLS * TILE;
	let boardX    = state.mapOffX;
	let gSpacing  = 42;
	let ghostGap  = 100;
	let trainTail = ghostGap + 3 * gSpacing;
	let phase0Dur = Math.round((boardW + trainTail + 50) / 2 + 180);
	let phase1Dur = Math.round((boardW + trainTail + 50) / 2 + 360);
	let cycleLen  = phase0Dur + phase1Dur;
	let animT     = (menuAge - ANIM_DELAY) % cycleLen;
	let phase     = animT < phase0Dur ? 0 : 1;
	let t         = phase === 0 ? animT : animT - phase0Dur;
	let animX     = phase === 0 ? (boardX + boardW + 10 - t * 2) : (boardX - trainTail - 30 + t * 2);
	let animY     = mapBot - 150;
	let mouthF    = Math.floor(state.frames / 5) % 2;
	let bob       = Math.floor(state.frames / 10) % 2 * 2;

	ctx.save();
	ctx.beginPath();
	ctx.rect(boardX, animY - 4, boardW, 36);
	ctx.clip();

	let playerSprite = getPacmanSpriteSet(state.playerSpriteSheet);
	if (phase === 0) {
		playerSprite.left[mouthF].draw(ctx, animX - PACMAN_DRAW_SIZE / 2, animY, PACMAN_DRAW_SIZE, PACMAN_DRAW_SIZE);
		let ghostSprites = [s_blinky, s_pinky, s_inky, s_clyde];
		for (let pi = 0; pi < 4; pi++) {
			ghostSprites[pi][0].draw(ctx, animX + ghostGap + pi * gSpacing, animY + bob, GHOST_DRAW_SIZE, GHOST_DRAW_SIZE);
		}
	} else {
		playerSprite.right[mouthF].draw(ctx, animX - PACMAN_DRAW_SIZE / 2, animY, PACMAN_DRAW_SIZE, PACMAN_DRAW_SIZE);
		for (let si = 0; si < 4; si++) {
			s_scaredGhost[0].draw(ctx, animX + ghostGap + si * gSpacing, animY + bob, GHOST_DRAW_SIZE, GHOST_DRAW_SIZE);
		}
	}

	ctx.restore();
}

// ── Mouse input ───────────────────────────────────────────────────────────────

// newGame is passed as a callback to avoid a circular import with game.js
export function menuMouseDown(e, newGame) {
	if (state.gameState !== 'menu') return;
	let hit = menuHitTest(menuCanvasPt(e));
	if (!hit) return;
	if (hit === 'back') {
		state.menuSubState = 'main';
		return;
	}
	if (state.menuSubState === 'personality') {
		if (hit === 'prev') state.aiPersonalityIdx = (state.aiPersonalityIdx - 1 + AI_PERSONALITY_KEYS.length) % AI_PERSONALITY_KEYS.length;
		if (hit === 'next') state.aiPersonalityIdx = (state.aiPersonalityIdx + 1) % AI_PERSONALITY_KEYS.length;
	} else {
		if (hit === 'opt0') {
			state.menuSelected = 0;
			state.aiMode = false;
			newGame();
			state.pendingBeginning = true;
			playBeginning();
		} else if (hit === 'opt1') {
			state.menuSelected   = 1;
			state.menuSubState   = 'personality';
			state.personalityRow = 0;
		} else if (hit === 'opt2') {
			state.menuSelected = 2;
			let hitPt  = menuCanvasPt(e);
			let scxHit = hitPt.x / 2;
			let cxHit  = state.mapOffX + state.GRID_COLS * TILE / 2;
			if (scxHit < cxHit) state.mapIdx = (state.mapIdx - 1 + MAPS.length) % MAPS.length;
			else                state.mapIdx = (state.mapIdx + 1) % MAPS.length;
			state.activeMap = MAPS[state.mapIdx];
			state.playerSpriteSheet = state.activeMap.spriteSheet;
			setMapSprite(state.activeMap);
		} else if (hit === 'opt3') {
			state.menuSelected = 3;
			state.menuSubState = 'settings';
			state.settingsRow  = 0;
		}
	}
}

export function menuMouseMove(e) {
	if (state.gameState !== 'menu') { state.canvas.style.cursor = 'default'; return; }
	state.canvas.style.cursor = menuHitTest(menuCanvasPt(e)) ? 'pointer' : 'default';
}

function menuCanvasPt(e) {
	let r = state.canvas.getBoundingClientRect();
	return {
		x: (e.clientX - r.left) * (state.canvas.width  / r.width),
		y: (e.clientY - r.top)  * (state.canvas.height / r.height),
	};
}

function menuHitTest(pt) {
	let scx = pt.x / 2;
	let scy = pt.y / 2;
	let cx  = state.mapOffX + state.GRID_COLS * TILE / 2;
	let top = state.mapOffY;
	// renderMenu applies ctx.translate(0, 50) after ctx.scale(2,2),
	// so all drawn Y positions are shifted down by 50 in scaled space.
	let ty  = top + 50;
	if (state.menuSubState === 'personality') {
		if (Math.abs(scy - (ty + 115)) < 18) {
			if (scx < cx) return 'prev';
			if (scx > cx) return 'next';
		}
		if (scy >= ty + 190 && scy <= ty + 206) return 'back';
	} else if (state.menuSubState === 'settings') {
		if (scy >= ty + 168 && scy <= ty + 184) return 'back';
	} else {
		if (scy >= ty + 71  && scy <= ty + 95)  return 'opt0';
		if (scy >= ty + 93  && scy <= ty + 117) return 'opt1';
		if (scy >= ty + 117 && scy <= ty + 159) return 'opt2';
		if (scy >= ty + 153 && scy <= ty + 179) return 'opt3';
	}
	return null;
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export function adjustSetting(row, d) {
	if (row === 0) {
		state.gameSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round((state.gameSpeed + d * 0.25) * 100) / 100));
		saveSpeed();
		state.settingToast = { text: state.gameSpeed.toFixed(2).replace(/\.?0+$/, '') + '\u00D7', timer: 60 };
	} else if (row === 1) {
		state.muted  = false;
		state.volume = Math.max(0, Math.min(1, Math.round((state.volume + d * 0.1) * 10) / 10));
		saveVolume();
		updateLoopVolume();
		state.settingToast = { text: Math.round(state.volume * 100) + '%', timer: 60 };
	}
}

export function drawSettingsContent(ctx, cx, startY, selectedRow) {
	let isNO = (navigator.language || '').startsWith('nb') || (navigator.language || '').startsWith('nn') || (navigator.language || '').startsWith('no');
	let volKeys = isNO ? '+ / \u00B4' : '- / =';
	let rows = [
		{ label: 'SPEED',  key: ', / .',  val: function() { return state.gameSpeed.toFixed(2).replace(/\.?0+$/, '') + '\u00D7'; } },
		{ label: 'VOLUME', key: volKeys,  val: function() { return state.muted ? 'MUTED' : Math.round(state.volume * 100) + '%'; } },
	];
	let colLabel    = cx - 140;
	let colValueR   = cx - 40;
	let colShortcut = cx + 66;
	let rowH = 24;
	for (let i = 0; i < rows.length; i++) {
		let y      = startY + i * rowH;
		let active = selectedRow === i;
		drawText(ctx, rows[i].label,                           colLabel,    y, 10, active ? '#ffff00'              : '#888888', 'left');
		drawText(ctx, '\u25c4 ' + rows[i].val() + ' \u25ba',  colValueR,   y, 10, active ? '#ffff00'              : '#888888', 'left');
		drawText(ctx, '(' + rows[i].key + ')',                 colShortcut, y, 10, active ? 'rgba(255,255,0,0.5)'  : '#555555', 'left');
	}
}
