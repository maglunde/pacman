import '../sass/style.scss';
import { initSprites, setMapSprite, s_map, s_pacman, s_mspacman, s_blinky, s_pinky, s_inky, s_clyde, s_scaredGhost, s_title, s_ready, s_gameover } from './sprite.js';
import {
	TILE, SPEED_MIN, SPEED_MAX, dir, AI_PERSONALITIES, AI_PERSONALITY_KEYS,
	DEAD_STATE_FRAMES, RESULT_STATE_FRAMES, GHOST_EATEN_FREEZE_FRAMES,
	FRUIT_DOT_THRESHOLD, FRUIT_DURATION, FRUIT_FLASH_THRESHOLD, FRUIT_SPAWN_COL, FRUIT_SPAWN_ROW,
	SCATTER_CHASE_PHASES,
	COLORS, MAPS
} from './constants.js';
import { state } from './state.js';
import { initWallData, buildGrid } from './grid.js';
import { initDots, initBigDots, drawDots } from './dots.js';
import { initGhosts, bfsReturnPath, ghostLookahead } from './ghost.js';
import './pacman-entity.js';
import { aiDecide, shuffleBFSDirs } from './ai.js';
import { getAvailableFruits } from './fruit.js';
import {
	initAudio, playBeginning, playDeath, playEatFruit, playEatGhost, playExtraPac, playIntermission,
	startFright, startEyes, stopLoopingMusic, updateLoopVolume, pauseAudio, resumeAudio
} from './audio.js';
import {
	drawHUD, togglePath, hexToRgb,
	saveVolume, saveSpeed,
} from './hud.js';

// ── Settings helpers ──────────────────────────────────────────────────────────

let INDICATOR_LABELS = ['ARROW', 'SQUARE', 'CORNERS', 'GLOW'];

function adjustSetting(row, dir) {
	if (row === 0) {
		state.gameSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round((state.gameSpeed + dir * 0.25) * 100) / 100));
		saveSpeed();
		state.settingToast = { text: state.gameSpeed.toFixed(2).replace(/\.?0+$/, '') + '\u00D7', timer: 60 };
	} else if (row === 1) {
		state.muted  = false;
		state.volume = Math.max(0, Math.min(1, Math.round((state.volume + dir * 0.1) * 10) / 10));
		saveVolume();
		updateLoopVolume();
		state.settingToast = { text: Math.round(state.volume * 100) + '%', timer: 60 };
	}
}

function drawSettingsContent(ctx, cx, startY, selectedRow) {
	let isNO = (navigator.language || '').startsWith('nb') || (navigator.language || '').startsWith('nn') || (navigator.language || '').startsWith('no');
	let volKeys = isNO ? '+ / \u00B4' : '- / =';
	let rows = [
		{ label: 'SPEED',     key: ', / .',  val: function() { return state.gameSpeed.toFixed(2).replace(/\.?0+$/, '') + '\u00D7'; } },
		{ label: 'VOLUME',    key: volKeys,  val: function() { return state.muted ? 'MUTED' : Math.round(state.volume * 100) + '%'; } },
	];
	let colLabel    = cx - 140;  // label: left-aligned
	let colValueR   = cx - 40;  // value+arrows: right-aligned
	let colShortcut = cx + 66;  // shortcut: left-aligned
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

// ── Game speed ────────────────────────────────────────────────────────────────

function levelSpeedFactor() { return 1 + (state.level - 1) * 0.06; }

// ── Score popups ──────────────────────────────────────────────────────────────

export function addScore(pts) {
	state.score += pts;
	while (state.score - state.lastExtraLifeScore >= 10000) {
		state.lives++;
		state.lastExtraLifeScore += 10000;
		playExtraPac();
	}
}

function addPopup(text, col, row) {
	state.scorePopups.push({
		text: text,
		x: state.mapOffX + col * TILE,
		y: state.mapOffY + row * TILE,
		life: 60
	});
}

// ── Game state transitions ────────────────────────────────────────────────────

function startReady() {
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
	setMapSprite(state.activeMap);
	initWallData();
	buildGrid();
	initDots();
	initBigDots();
	shuffleBFSDirs();
	startReady();
}

function nextLevel() {
	state.level++;
	state.mapIdx    = (state.mapIdx + 1) % MAPS.length;
	state.fruitDotsSinceSpawn = 0;
	state.activeMap = MAPS[state.mapIdx];
	setMapSprite(state.activeMap);
	initWallData();
	buildGrid();
	initDots();
	initBigDots();
	startReady();
}

function loseLife() {
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
					g.returnPath       = bfsReturnPath(g.col, g.row, g.startCol, g.startRow);
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

	// Ghost collision
	for (let i = 0; i < state.ghosts.length; i++) {
		let g = state.ghosts[i];
		if (!g.exited) continue;
		if (g.returning) continue;

		let dx = g.x - state.pacman.x;
		let dy = g.y - state.pacman.y;
		let dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < 10) {
			if (state.scaredTimer > 0 && !g.immune) {
				// Face the ghost being eaten
				if (Math.abs(dx) > Math.abs(dy)) {
					state.pacman.dir = dx > 0 ? dir.right : dir.left;
				} else {
					state.pacman.dir = dy > 0 ? dir.down : dir.up;
				}
				let spriteSet = state.activeMap.spriteSheet === 'mspacman' ? s_mspacman : s_pacman;
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

// ── Render ────────────────────────────────────────────────────────────────────

function renderMenu() {
	let ctx  = state.ctx;
	ctx.save();
	ctx.scale(2, 2);

	// Full black background
	ctx.fillStyle = COLORS.black;
	ctx.fillRect(0, 0, state.width / 2, state.height / 2);


	let cx       = state.mapOffX + state.GRID_COLS * TILE / 2;
	let top      = state.mapOffY;
	let mapH     = state.GRID_ROWS * TILE;
	let mapBot   = top + mapH;

	// ── Title ──────────────────────────────────────────────────────────────────
	let desiredW = s_title.w *0.8;  // 212
	let desiredH = s_title.h *0.8;  //  49
	s_title.draw(ctx, cx - desiredW / 2, top + 4, desiredW, desiredH);
	let offX = 0;
	let offY = 50;
	ctx.translate(offX, offY);

	if (state.menuSubState === 'settings') {
		// ── Settings sub-screen ─────────────────────────────────────────────────
		ctx.fillStyle = '#aaaaaa';
		ctx.font      = "10px 'Press Start 2P', monospace";
		ctx.textAlign = 'center';
		ctx.fillText('SETTINGS', cx, top + 80);

		drawSettingsContent(ctx, cx, top + 120, state.settingsRow);

		// BACK button
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
		// ── Personality sub-screen ──────────────────────────────────────────────
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
		ctx.fillStyle = '#444444';
		ctx.font      = "7px 'Press Start 2P', monospace";
		ctx.fillText('Tab through ghosts • Enter to control', cx, top + 178);

	} else {
		// ── High score ────────────────────────────────────────────────────────
		if (state.highScore > 0) {
			ctx.fillStyle = COLORS.darkGray;
			ctx.font      = "10px 'Press Start 2P', monospace";
			ctx.textAlign = 'center';
			ctx.fillText('HIGH-SCORE: ' + state.highScore, cx, top + 55);
		}

		// ── Menu options ──────────────────────────────────────────────────────
		let optY0  = top + 84;
		let optY1  = top + 106;
		let optY2  = top + 125; // "STARTMAP:" label
		let optY2b = top + 141; // map name (second line)
		let optY3  = top + 166; // SETTINGS (shifted down for two-line map row)
		let opts   = ['START GAME', 'WATCH AI PLAY', null, 'SETTINGS'];
		let optYs  = [optY0, optY1, optY2, optY3];
		for (let i = 0; i < opts.length; i++) {
			let active = state.menuSelected === i;
			if (i === 2) {
				// MAP selector row — two lines: label + map name
				let mapLabel = '\u25c4 ' + MAPS[state.mapIdx].name + ' \u25ba';
				if (active) {
					ctx.fillStyle = COLORS.black;
					ctx.fillRect(cx - 90, optY2 - 13, 180, 33); // taller box for two lines
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
					ctx.fillStyle = COLORS.pacman; // active text
				} else {
					ctx.fillStyle = COLORS.gray; // inactive text
				}
				ctx.font      = "10px 'Press Start 2P', monospace";
				ctx.textAlign = 'center';
				ctx.fillText(opts[i], cx, optYs[i]);
			}
		}

		// ctx.fillStyle = COLORS.white;
		// ctx.font      = "7px 'Press Start 2P', monospace";
		// ctx.textAlign = 'center';
		// ctx.fillText('\u2191 \u2193 navigate  \u2022  \u2190 \u2192 change map  \u2022  Enter select', cx, top + 181);

		// Horizontal rule
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

		// Horizontal rule
		// ctx.strokeStyle = COLORS.darkGray;
		// ctx.lineWidth   = 1;
		// ctx.beginPath();
		// ctx.moveTo(cx - 110, top + 192); ctx.lineTo(cx + 110, top + 192);
		// ctx.stroke();

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
			// Ghost sprite facing right
			gd.sprites[3].draw(ctx, cx - 130, gy - 13, 26, 26);
			// Full name
			ctx.fillStyle = gd.color;
			ctx.font      = "11px 'Press Start 2P', monospace";
			ctx.textAlign = 'left';
			ctx.fillText('- ' + gd.name, cx - 91, gy + 2);
			// Nickname
			ctx.fillText(gd.nick, cx + 20, gy + 2);
		}
	}

	// ── Bottom animation strip ─────────────────────────────────────────────────
	let ANIM_DELAY  = 60;  // 1 second at 60fps before animation starts
	let menuAge     = state.frames - state.menuStartFrame;
	if (menuAge >= ANIM_DELAY) {
		let boardW    = state.GRID_COLS * TILE;
		let boardX    = state.mapOffX;
		let gSpacing  = 42;
		let ghostGap  = 100;  // gap between Pac-Man and first ghost
		let trainTail = ghostGap + 3 * gSpacing;   // distance from Pac-Man to last ghost
		let phase0Dur = Math.round((boardW + trainTail + 50) / 2 + 180);  // frames to clear full train
		let phase1Dur = Math.round((boardW + trainTail + 50) / 2 + 360);  // frames to clear full train
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

		let playerSprite = state.activeMap.spriteSheet === 'mspacman' ? s_mspacman : s_pacman;
		if (phase === 0) {
			// Pac-Man fleeing left, 4 ghosts chasing behind (to the right)
			let ghostSprites = [s_blinky, s_pinky, s_inky, s_clyde];
			playerSprite.left[mouthF].draw(ctx, animX - 14, animY, 28, 28);
			for (let pi = 0; pi < 4; pi++) {
				ghostSprites[pi][0].draw(ctx, animX + ghostGap + pi * gSpacing, animY + bob, 28, 28);
			}
		} else {
			// Pac-Man chasing right, 4 scared ghosts fleeing ahead
			playerSprite.right[mouthF].draw(ctx, animX - 14, animY, 28, 28);
			for (let si = 0; si < 4; si++) {
				s_scaredGhost[0].draw(ctx, animX + ghostGap + si * gSpacing, animY + bob, 28, 28);
			}
		}

		ctx.restore();
	}

	ctx.restore();
}

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

	// --- Render paths (Pac-Man and Ghosts) with overlap offsets ---
	ctx.save();
	ctx.lineWidth = 3;
	ctx.setLineDash([3, 5]);

	const allPaths = [];
	const ghostKeys = ['blinky', 'pinky', 'inky', 'clyde'];

	// 1. Collect Pac-Man path
	if (state.aiMode && state.showPaths.pacman && state.aiPath.length > 0) {
		const pPath = [{ col: state.pacman.col, row: state.pacman.row }].concat(state.aiPath);
		allPaths.push({ id: 'pacman', color: COLORS.path.pacman, points: pPath, index: 0 });
	}

	// 2. Collect Ghost paths
	state.ghosts.forEach(function(g, idx) {
		if (!state.showPaths[ghostKeys[idx]] || !g.exited || state.scaredTimer > 0) return;
		const gLook = ghostLookahead(g, 20);
		if (gLook.length === 0) return;
		const gPath = [{ col: g.col, row: g.row }].concat(gLook);
		allPaths.push({ id: ghostKeys[idx], color: 'rgba(' + hexToRgb(g.pathColor) + ',0.45)', points: gPath, index: idx + 1 });
	});

	// 3. Draw each segment of each path with potential offsets
	allPaths.forEach(function(pathObj) {
		ctx.strokeStyle = pathObj.color;
		ctx.beginPath();
		
		for (let i = 0; i < pathObj.points.length - 1; i++) {
			const p1 = pathObj.points[i];
			const p2 = pathObj.points[i+1];

			// Create a canonical segment key to identify shared segments
			const key = [p1.row + ',' + p1.col, p2.row + ',' + p2.col].sort().join('-');
			
			// Count how many active paths share this segment
			const sharingPaths = allPaths.filter(function(other) {
				for (let j = 0; j < other.points.length - 1; j++) {
					const op1 = other.points[j];
					const op2 = other.points[j+1];
					const okey = [op1.row + ',' + op1.col, op2.row + ',' + op2.col].sort().join('-');
					if (okey === key) return true;
				}
				return false;
			});

			// Only offset if more than one path shares the segment
			let offsetX = 0, offsetY = 0;
			if (sharingPaths.length > 1) {
				// Sort by their inherent index to keep ordering consistent
				sharingPaths.sort((a, b) => a.index - b.index);
				const myRank = sharingPaths.indexOf(pathObj);
				const offsetMag = (myRank - (sharingPaths.length - 1) / 2) * 4;

				// Perpendicular offset
				if (p1.row === p2.row) { // Horizontal
					offsetY = offsetMag;
				} else { // Vertical or wrap-around (approx)
					offsetX = offsetMag;
				}
			}

			const x1 = state.mapOffX + p1.col * TILE + TILE / 2 + offsetX;
			const y1 = state.mapOffY + p1.row * TILE + TILE / 2 + offsetY;
			const x2 = state.mapOffX + p2.col * TILE + TILE / 2 + offsetX;
			const y2 = state.mapOffY + p2.row * TILE + TILE / 2 + offsetY;

			if (i === 0) ctx.moveTo(x1, y1);
			
			// Simple wrap-around check: don't draw long lines across the screen
			const dx = Math.abs(p1.col - p2.col);
			if (dx > 1) {
				ctx.moveTo(x2, y2);
			} else {
				ctx.lineTo(x2, y2);
			}
		}
		ctx.stroke();
	});
	ctx.restore();

	state.ghosts.forEach(function(g) { g.draw(); });
	state.pacman.draw();

	// Fruit
	if (state.cherry) {
		let cherryVisible = state.cherry.timer > FRUIT_FLASH_THRESHOLD || Math.floor(state.frames / 8) % 2 === 0;
		if (cherryVisible) {
			let fx = state.mapOffX + state.cherry.col * TILE - TILE / 2;
			let fy = state.mapOffY + state.cherry.row * TILE - TILE / 2;
			state.cherry.sprite().draw(ctx, fx, fy, TILE * 2, TILE * 2);
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

// ── Input ─────────────────────────────────────────────────────────────────────

function keydown(e) {
	initAudio();

	// Global shortcuts
	if (e.code === 'KeyM') { state.muted = !state.muted; saveVolume(); updateLoopVolume(); return; }
	if (e.code === 'KeyQ') { state.showInfoPanel = !state.showInfoPanel; return; }
	if (e.code === 'KeyO' && state.gameState !== 'menu') {
		state.settingsOverlayActive = !state.settingsOverlayActive;
		state.paused = state.settingsOverlayActive;
		state.settingsRow = 0;
		if (state.paused) pauseAudio(); else resumeAudio();
		return;
	}
	if (e.code === 'Minus')  { adjustSetting(1, -1); return; }
	if (e.code === 'Equal')  { adjustSetting(1, +1); return; }
	if (e.code === 'Comma')  { adjustSetting(0, -1); return; }
	if (e.code === 'Period') { adjustSetting(0, +1); return; }
	if (e.code === 'KeyZ') { togglePath('blinky'); return; }
	if (e.code === 'KeyX') { togglePath('pinky');  return; }
	if (e.code === 'KeyC') { togglePath('inky');   return; }
	if (e.code === 'KeyV') { togglePath('clyde');  return; }
	if (e.code === 'KeyB') { togglePath('pacman'); return; }
	if (e.code === 'KeyP' && (state.gameState === 'playing' || state.paused)) {
		state.paused = !state.paused;
		if (state.paused) pauseAudio(); else resumeAudio();
		return;
	}
	if (e.code === 'KeyI') {
		state.ghostIndicatorStyle = (state.ghostIndicatorStyle + 1) % 4; return;
	}

	if (e.key === 'Escape') {
		if (state.settingsOverlayActive) {
			state.settingsOverlayActive = false;
			state.paused = false;
			resumeAudio();
			return;
		}
		if (state.escapeMenuActive) {
			state.escapeMenuActive = false;
			state.paused           = false;
			resumeAudio();
			return;
		}
		if (state.gameState === 'menu' && (state.menuSubState === 'personality' || state.menuSubState === 'settings')) {
			state.menuSubState = 'main';
			return;
		}
		if (state.gameState === 'playing' || state.gameState === 'ready' || state.paused) {
			state.escapeMenuActive   = true;
			state.escapeMenuSelected = 0;
			state.paused             = true;
			pauseAudio();
			return;
		}
		// Fallback: go straight to menu (win screen)
		newGame();
		state.gameState      = 'menu';
		state.menuSubState   = 'main';
		state.menuStartFrame = state.frames;
		return;
	}
	if (state.escapeMenuActive) {
		switch (e.key) {
			case 'ArrowUp':   state.escapeMenuSelected = 0; return;
			case 'ArrowDown': state.escapeMenuSelected = 1; return;
			case 'Enter':
				if (state.escapeMenuSelected === 0) {
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
				return;
		}
		return; // block all other keys while escape menu is open
	}
	if (state.settingsOverlayActive) {
		switch (e.key) {
			case 'ArrowUp':    state.settingsRow = (state.settingsRow + 1) % 2; return;
			case 'ArrowDown':  state.settingsRow = (state.settingsRow + 1) % 2; return;
			case 'ArrowLeft':  adjustSetting(state.settingsRow, -1); return;
			case 'ArrowRight': adjustSetting(state.settingsRow, +1); return;
		}
		if (e.code === 'KeyO') { state.settingsOverlayActive = false; state.paused = false; resumeAudio(); return; }
		return; // block all other keys while settings overlay is open
	}
	if (state.gameState === 'gameover' && state.stateTimer <= 0) {
		if (e.key === 'Enter' || e.key === ' ') {
			newGame();
			state.gameState      = 'menu';
			state.menuSubState   = 'main';
			state.menuStartFrame = state.frames;
			return;
		}
		// fall through to allow shortcuts (M, Q, speed, etc.)
	}
	if (state.gameState === 'menu') {
		if (state.menuSubState === 'settings') {
			switch (e.key) {
				case 'ArrowUp':    state.settingsRow = (state.settingsRow + 2) % 3; break;
				case 'ArrowDown':  state.settingsRow = (state.settingsRow + 1) % 3; break;
				case 'ArrowLeft':  if (state.settingsRow < 2) adjustSetting(state.settingsRow, -1); break;
				case 'ArrowRight': if (state.settingsRow < 2) adjustSetting(state.settingsRow, +1); break;
				case 'Enter':      if (state.settingsRow === 2) { state.menuSubState = 'main'; state.settingsRow = 0; } break;
			}
		} else if (state.menuSubState === 'personality') {
			switch (e.key) {
				case 'ArrowLeft':  state.aiPersonalityIdx = (state.aiPersonalityIdx - 1 + AI_PERSONALITY_KEYS.length) % AI_PERSONALITY_KEYS.length; break;
				case 'ArrowRight': state.aiPersonalityIdx = (state.aiPersonalityIdx + 1) % AI_PERSONALITY_KEYS.length; break;
				case 'Enter':
					state.aiMode       = true;
					state.menuSubState = 'main';
					newGame();
					state.pendingBeginning = true;
					playBeginning();
					break;
			}
		} else {
			switch (e.key) {
				case 'ArrowUp':    state.menuSelected = (state.menuSelected + 3) % 4; break;
				case 'ArrowDown':  state.menuSelected = (state.menuSelected + 1) % 4; break;
				case 'ArrowLeft':
					if (state.menuSelected === 2) {
						state.mapIdx = (state.mapIdx - 1 + MAPS.length) % MAPS.length;
						state.activeMap = MAPS[state.mapIdx];
						setMapSprite(state.activeMap);
					}
					break;
				case 'ArrowRight':
					if (state.menuSelected === 2) {
						state.mapIdx = (state.mapIdx + 1) % MAPS.length;
						state.activeMap = MAPS[state.mapIdx];
						setMapSprite(state.activeMap);
					}
					break;
				case 'Enter':
					if (state.menuSelected === 3) {
						state.menuSubState = 'settings';
						state.settingsRow  = 0;
					} else if (state.menuSelected === 1) {
						state.menuSubState = 'personality';
					} else if (state.menuSelected === 0) {
						state.aiMode = false;
						newGame();
						state.pendingBeginning = true;
						playBeginning();
					}
					break;
			}
		}
		return;
	}
	// Ghost selection: Tab cycles through ghosts in both modes
	if (e.code === 'Tab' && (state.gameState === 'playing' || state.gameState === 'ready')) {
		e.preventDefault();
		if (state.controlledGhostIdx >= 0) state.controlledGhostIdx = -1; // release AI-mode control before cycling
		// Cycle: -1 → 0 → 1 → 2 → 3 → -1
		state.selectedGhostIdx = (state.selectedGhostIdx + 2) % 5 - 1;
		return;
	}
	// AI mode: Enter takes/releases explicit control of selected ghost
	if (state.aiMode && e.key === 'Enter' && state.gameState === 'playing' && state.selectedGhostIdx >= 0) {
		state.controlledGhostIdx = state.controlledGhostIdx === state.selectedGhostIdx ? -1 : state.selectedGhostIdx;
		return;
	}
	// Arrow keys: steer pacman (manual mode), or AI-mode controlled ghost
	let arrowKey = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowDown';
	if (arrowKey && state.gameState === 'ready') state.gameState = 'playing';
	if (state.aiMode && state.controlledGhostIdx >= 0) {
		switch (e.key) {
			case 'ArrowLeft':  state.ghosts[state.controlledGhostIdx].nextDir = dir.left;  break;
			case 'ArrowUp':    state.ghosts[state.controlledGhostIdx].nextDir = dir.up;    break;
			case 'ArrowRight': state.ghosts[state.controlledGhostIdx].nextDir = dir.right; break;
			case 'ArrowDown':  state.ghosts[state.controlledGhostIdx].nextDir = dir.down;  break;
		}
	} else if (!state.aiMode) {
		switch (e.key) {
			case 'ArrowLeft':  state.pacman.nextDir = dir.left;  break;
			case 'ArrowUp':    state.pacman.nextDir = dir.up;    break;
			case 'ArrowRight': state.pacman.nextDir = dir.right; break;
			case 'ArrowDown':  state.pacman.nextDir = dir.down;  break;
		}
	}
	// Manual mode: WASD steers selected ghost as player 2 (no Enter needed — select with Tab and steer immediately)
	if (!state.aiMode && state.selectedGhostIdx >= 0) {
		let wasd = e.code === 'KeyA' || e.code === 'KeyW' || e.code === 'KeyD' || e.code === 'KeyS';
		if (wasd && state.gameState === 'ready') state.gameState = 'playing';
		switch (e.code) {
			case 'KeyA': state.ghosts[state.selectedGhostIdx].nextDir = dir.left;  break;
			case 'KeyW': state.ghosts[state.selectedGhostIdx].nextDir = dir.up;    break;
			case 'KeyD': state.ghosts[state.selectedGhostIdx].nextDir = dir.right; break;
			case 'KeyS': state.ghosts[state.selectedGhostIdx].nextDir = dir.down;  break;
		}
	}
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

// ── Menu mouse support ────────────────────────────────────────────────────────

function menuCanvasPt(e) {
	let r = state.canvas.getBoundingClientRect();
	return {
		x: (e.clientX - r.left) * (state.canvas.width  / r.width),
		y: (e.clientY - r.top)  * (state.canvas.height / r.height)
	};
}

function menuHitTest(pt) {
	// renderMenu uses ctx.scale(2,2), so divide canvas coords by 2 for drawing coords
	let scx  = pt.x / 2;
	let scy  = pt.y / 2;
	let cx   = state.mapOffX + state.GRID_COLS * TILE / 2;
	let top  = state.mapOffY;
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

function onMenuMouseDown(e) {
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
			// click left/right half of the row to cycle map
			let hitPt = menuCanvasPt(e);
			let scxHit = hitPt.x / 2;
			let cxHit  = state.mapOffX + state.GRID_COLS * TILE / 2;
			if (scxHit < cxHit) state.mapIdx = (state.mapIdx - 1 + MAPS.length) % MAPS.length;
			else                state.mapIdx = (state.mapIdx + 1) % MAPS.length;
			state.activeMap = MAPS[state.mapIdx];
			setMapSprite(state.activeMap);
		} else if (hit === 'opt3') {
			state.menuSelected = 3;
			state.menuSubState = 'settings';
			state.settingsRow  = 0;
		}
	}
}

function onMenuMouseMove(e) {
	if (state.gameState !== 'menu') { state.canvas.style.cursor = 'default'; return; }
	state.canvas.style.cursor = menuHitTest(menuCanvasPt(e)) ? 'pointer' : 'default';
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
	document.addEventListener('keydown', keydown);

	state.canvas.addEventListener('mousedown', function(e) {
		onMenuMouseDown(e);
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
	state.canvas.addEventListener('mousemove', function(e) { onMenuMouseMove(e); });
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
