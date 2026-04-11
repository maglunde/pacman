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
		ctx.fillStyle = active ? '#ffff00' : '#888888';
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.textAlign = 'left';
		ctx.fillText(rows[i].label, colLabel, y);
		ctx.textAlign = 'left';
		ctx.fillText('\u25c4 ' + rows[i].val() + ' \u25ba', colValueR, y);
		ctx.fillStyle = active ? 'rgba(255,255,0,0.5)' : '#555555';
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.textAlign = 'left';
		ctx.fillText('(' + rows[i].key + ')', colShortcut, y);
	}
}

// ── Menu rendering ────────────────────────────────────────────────────────────

export function renderMenu() {
	let ctx  = state.ctx;
	ctx.save();
	ctx.scale(2, 2);

	ctx.fillStyle = COLORS.black;
	ctx.fillRect(0, 0, state.width / 2, state.height / 2);

	let cx     = state.mapOffX + state.GRID_COLS * TILE / 2;
	let top    = state.mapOffY;
	let mapH   = state.GRID_ROWS * TILE;
	let mapBot = top + mapH;

	// ── Title ─────────────────────────────────────────────────────────────────
	let desiredW = s_title.w * 0.8;
	let desiredH = s_title.h * 0.8;
	s_title.draw(ctx, cx - desiredW / 2, top + 4, desiredW, desiredH);
	ctx.translate(0, 50);

	if (state.menuSubState === 'settings') {
		// ── Settings sub-screen ───────────────────────────────────────────────
		ctx.fillStyle = '#aaaaaa';
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('SETTINGS', cx, top + 80);

		drawSettingsContent(ctx, cx, top + 120, state.settingsRow);

		let backActive = state.settingsRow === 2;
		ctx.fillStyle = backActive ? COLORS.pacman : COLORS.gray;
		if (backActive) {
			ctx.fillStyle = COLORS.black;
			ctx.fillRect(cx - 40, top + 168, 80, 16);
			ctx.fillStyle = COLORS.pacman;
		}
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('BACK', cx, top + 180);

		ctx.fillStyle = '#555';
		ctx.font      = "7px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('\u2190 \u2192 adjust  \u2022  \u2191 \u2193 select  \u2022  Enter/Esc back', cx, top + 202);

	} else if (state.menuSubState === 'personality') {
		// ── Personality sub-screen ────────────────────────────────────────────
		let pKey = AI_PERSONALITY_KEYS[state.aiPersonalityIdx];
		let pCfg = AI_PERSONALITIES[pKey];
		let descs = {
			coward:     'Flees early, takes no risks',
			balanced:   'Balanced and efficient',
			aggressive: 'Actively hunts ghosts',
			greedy:     'Maximizes score, takes risks',
		};
		ctx.fillStyle = COLORS.lightGray;
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('CHOOSE AI STYLE', cx, top + 80);

		ctx.fillStyle = COLORS.pacman;
		ctx.font      = "14px 'Press Start 2P', monospace";
		ctx.fillText('◄  ' + pCfg.label.toUpperCase() + '  ►', cx, top + 115);

		ctx.fillStyle = COLORS.gray;
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.fillText(descs[pKey], cx, top + 136);

		ctx.fillStyle = COLORS.darkGray;
		ctx.font      = "8px 'Press Start 2P', monospace";
		ctx.fillText('Enter to start • Esc back', cx, top + 162);
		ctx.fillStyle = COLORS.gray;
		ctx.font      = "7px 'Press Start 2P', monospace";
		ctx.fillText('Tab through ghosts • Enter to control', cx, top + 178);

	} else {
		// ── Main menu ─────────────────────────────────────────────────────────
		if (state.highScore > 0) {
			ctx.fillStyle = COLORS.darkGray;
			ctx.font      = "10px 'Press Start 2P', monospace";
			ctx.textAlign = 'center';
			ctx.fillText('HIGH-SCORE: ' + state.highScore, cx, top + 55);
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
					ctx.fillStyle = COLORS.pacman;
				} else {
					ctx.fillStyle = COLORS.gray;
				}
				ctx.font      = "8px 'Press Start 2P', monospace";
				ctx.textAlign = 'center';
				ctx.fillText('STARTMAP:', cx, optY2);
				ctx.fillText(mapLabel, cx, optY2b);
			} else {
				if (active) {
					ctx.fillStyle = COLORS.black;
					ctx.fillRect(cx - 90, optYs[i] - 13, 180, 17);
					ctx.fillStyle = COLORS.pacman;
				} else {
					ctx.fillStyle = COLORS.gray;
				}
				ctx.font      = "10px 'Press Start 2P', monospace";
				ctx.textAlign = 'center';
				ctx.fillText(opts[i], cx, optYs[i]);
			}
		}

		ctx.strokeStyle = COLORS.darkGray;
		ctx.lineWidth   = 1;
		ctx.beginPath();
		ctx.moveTo(cx - 110, top + 180); ctx.lineTo(cx + 110, top + 180);
		ctx.stroke();

		// ── Character / Nickname table ────────────────────────────────────────
		ctx.translate(0, 20);

		ctx.fillStyle = COLORS.white;
		ctx.font      = "12px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('CHARACTER / NICKNAME', cx, top + 186);

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
			ctx.fillStyle = gd.color;
			ctx.font      = "11px 'Press Start 2P', monospace";
			ctx.textAlign = 'left';
			ctx.fillText('- ' + gd.name, cx - 91, gy + 2);
			ctx.fillText(gd.nick, cx + 20, gy + 2);
		}
	}

	// ── Bottom animation strip ────────────────────────────────────────────────
	let ANIM_DELAY = 60;
	let menuAge    = state.frames - state.menuStartFrame;
	if (menuAge >= ANIM_DELAY) {
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

	// ── Version ───────────────────────────────────────────────────────────────
	ctx.save();
	ctx.setTransform(2, 0, 0, 2, 0, 0);
	ctx.fillStyle = COLORS.gray;
	ctx.font      = "6px 'Press Start 2P', monospace";
	ctx.textAlign = 'right';
	ctx.fillText('v' + __APP_VERSION__, state.mapOffX + state.GRID_COLS * TILE, state.height / 2 - 4);
	ctx.restore();

	ctx.restore();
}

// ── Menu mouse input ──────────────────────────────────────────────────────────

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
	if (state.menuSubState === 'personality') {
		if (Math.abs(scy - (top + 115)) < 18) {
			if (scx < cx) return 'prev';
			if (scx > cx) return 'next';
		}
	} else {
		if (scy >= top + 71  && scy <= top + 95)  return 'opt0';
		if (scy >= top + 93  && scy <= top + 117) return 'opt1';
		if (scy >= top + 117 && scy <= top + 159) return 'opt2';
		if (scy >= top + 153 && scy <= top + 179) return 'opt3';
	}
	return null;
}

// newGame is passed as a callback to avoid a circular import with game.js
export function menuMouseDown(e, newGame) {
	if (state.gameState !== 'menu') return;
	let hit = menuHitTest(menuCanvasPt(e));
	if (!hit) return;
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
			state.menuSelected = 1;
			state.menuSubState = 'personality';
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
