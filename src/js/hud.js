import {TILE, LIFE_ICON_SIZE, FRUIT_DRAW_SIZE, AI_PERSONALITIES, AI_PERSONALITY_KEYS, COLORS, FRUIT_DOT_THRESHOLD} from './constants.js';
import { state } from './state.js';
import { getAvailableFruits } from './fruit.js';
import { getPacmanSpriteSet } from './sprite.js';

// ── HUD ───────────────────────────────────────────────────────────────────────

export function drawHUD() {
	const ctx  = state.ctx;
	const sx   = 2;
	const mapX = state.mapOffX * sx;
	const mapY = state.mapOffY * sx;
	const mapW = state.GRID_COLS * TILE * sx;
	const boardBottomY = mapY + state.GRID_ROWS * TILE * sx;
	const lifeY = boardBottomY + 24;

	drawScore(ctx, mapX, mapY);
	drawHighScore(ctx, mapX, mapW, mapY);
	drawLevel(ctx, mapX, mapW, mapY);
	drawLives(mapX, lifeY);
	if (state.aiMode) drawAIPersonality(ctx, mapX, mapW, lifeY);
	drawAvailableFruits(mapX, mapW, boardBottomY);
	if (state.showInfoPanel) drawInfoPanel(mapX, mapY);
}

const FONT_HUD = "18px 'Press Start 2P', monospace";

function drawScore(ctx, mapX, mapY) {
	ctx.textAlign = 'left';
	ctx.font = FONT_HUD;
	ctx.fillStyle = COLORS.white;
	ctx.fillText('SCORE', mapX, mapY - 28);
	ctx.fillStyle = COLORS.pacman;
	ctx.fillText(state.score, mapX, mapY - 8);
}

function drawHighScore(ctx, mapX, mapW, mapY) {
	ctx.fillStyle = COLORS.white;
	ctx.textAlign = 'center';
	ctx.fillText('HIGH-SCORE', mapX + mapW / 2, mapY - 28);
	ctx.fillStyle = COLORS.pacman;
	ctx.fillText(Math.max(state.score, state.highScore), mapX + mapW / 2, mapY - 8);
}

function drawLevel(ctx, mapX, mapW, mapY) {
	ctx.fillStyle = COLORS.white;
	ctx.textAlign = 'right';
	ctx.fillText('LEVEL', mapX + mapW, mapY - 28);
	ctx.fillStyle = COLORS.pacman;
	ctx.fillText(state.level, mapX + mapW, mapY - 8);
}

function drawLives(mapX, lifeY) {
	let ctx = state.ctx;
	ctx.textAlign = 'left';
	ctx.fillStyle = COLORS.white;
	ctx.font = FONT_HUD;
	ctx.fillText('LIVES:', mapX, lifeY);
	let playerSprite = getPacmanSpriteSet(state.playerSpriteSheet);
	for (let i = 0; i < state.lives; i++) {
		playerSprite.right[0].draw(ctx, mapX + 120 + 25 * i, lifeY - LIFE_ICON_SIZE, LIFE_ICON_SIZE, LIFE_ICON_SIZE);
	}
}

function drawAIPersonality(ctx, mapX, mapW, lifeY) {
	let pLabel = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].label;
	ctx.fillStyle = COLORS.cyan;
	ctx.textAlign = 'center';
	ctx.font = "12px 'Press Start 2P', monospace";
	ctx.font = FONT_HUD;
	ctx.fillText('AI: ' + pLabel, mapX + mapW / 2, lifeY);
}

function drawAvailableFruits(mapX, mapW, boardBottomY) {
	const ctx = state.ctx;
	const fruits = getAvailableFruits(state.level);
	const iconSize = FRUIT_DRAW_SIZE;
	const gap = 6;
	const totalWidth = fruits.length * iconSize + Math.max(0, fruits.length - 1) * gap;
	const x = mapX + mapW - totalWidth;
	const y = boardBottomY + 6;

	if (!state.cherry || Math.floor(state.frames / 20) % 2 === 0) { // blinking if fruit present
		ctx.textAlign = 'right';
		ctx.fillStyle = COLORS.white;
		ctx.font = FONT_HUD;
		const fruitDotCount = state.cherry ? 0 : FRUIT_DOT_THRESHOLD - state.fruitDotsSinceSpawn;
		ctx.fillText(String(fruitDotCount), x - 10, y + 28);
		for (let i = 0; i < fruits.length; i++) {
			fruits[i].sprite().draw(ctx, x + i * (iconSize + gap), y, iconSize, iconSize);
		}
	}
}

function drawInfoPanel(mapX, mapY) {
	let ctx = state.ctx;
	let x   = mapX - 18;
	let lh  = 18;
	let y   = mapY;

	ctx.textAlign = 'right';
	ctx.font      = "10px 'Press Start 2P', monospace";

	ctx.fillStyle = COLORS.lightGray;
	ctx.fillText('GHOSTS', x, y); y += lh + 4;

	let ghostInfo = [
		{ color: COLORS.blinky, name: 'Blinky', desc: 'Chases directly' },
		{ color: COLORS.pinky,  name: 'Pinky',  desc: 'Aims 4 ahead'   },
		{ color: COLORS.inky,   name: 'Inky',   desc: 'Flanking attack' },
		{ color: COLORS.clyde,  name: 'Clyde',  desc: 'Chase / retreat' },
	];
	ghostInfo.forEach(function(g) {
		ctx.fillStyle = g.color;
		ctx.fillText(g.name, x, y);
		ctx.fillStyle = COLORS.gray;
		ctx.textAlign = 'left';
		ctx.fillText(g.desc, 40, y);
		ctx.textAlign = 'right';
		y += lh + 2;
	});

	y += 8;

	ctx.fillStyle = COLORS.lightGray;
	ctx.fillText('TASTER', x, y); y += lh + 4;

	let shortcuts = [
		{ key: '← → ↑ ↓', desc: 'Move'       },
		{ key: 'P',        desc: 'Pause'      },
		{ key: 'M',        desc: 'Mute'       },
		{ key: '- / =',    desc: 'Volume'     },
		{ key: ', / .',    desc: 'Speed'      },
		{ key: 'O',        desc: 'Settings'   },
		{ key: 'Z X C V',  desc: 'Ghost path' },
		{ key: 'B',        desc: 'Pac path'   },
		{ key: 'I',        desc: 'Indicator'  },
		{ key: 'Q',        desc: 'Info'       },
		{ key: 'Esc',      desc: 'Menu'       },
	];
	shortcuts.forEach(function(s) {
		ctx.fillStyle = COLORS.pacman;
		ctx.textAlign = 'left';
		ctx.fillText(s.key, 40, y);
		ctx.fillStyle = COLORS.gray;
		ctx.textAlign = 'right';
		ctx.fillText(s.desc, x, y);
		y += lh;
	});
}

// ── Utility ───────────────────────────────────────────────────────────────────

export function hexToRgb(hex) {
	let r = parseInt(hex.slice(1, 3), 16);
	let g = parseInt(hex.slice(3, 5), 16);
	let b = parseInt(hex.slice(5, 7), 16);
	return r + ',' + g + ',' + b;
}

// ── Persistence ───────────────────────────────────────────────────────────────

export function saveVolume() {
	localStorage.setItem('pacman-vol',   state.volume);
	localStorage.setItem('pacman-muted', state.muted ? '1' : '0');
}

export function saveSpeed() {
	localStorage.setItem('pacman-speed', state.gameSpeed);
}

// ── Ghost path toggle ─────────────────────────────────────────────────────────

export function togglePath(key) {
	state.showPaths[key] = !state.showPaths[key];
}
