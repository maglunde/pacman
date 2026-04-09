import { TILE, SPEED_MIN, SPEED_MAX, LIFE_ICON_SPACING, AI_PERSONALITIES, AI_PERSONALITY_KEYS, COLORS } from './constants.js';
import { state } from './state.js';

// ── Utility ───────────────────────────────────────────────────────────────────

export function hexToRgb(hex) {
	var r = parseInt(hex.slice(1, 3), 16);
	var g = parseInt(hex.slice(3, 5), 16);
	var b = parseInt(hex.slice(5, 7), 16);
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

// ── Canvas path legend ────────────────────────────────────────────────────────

var PATH_LEGEND = [
	{ key: 'pacman', label: 'Pac',    color: COLORS.pacman },
	{ key: 'blinky', label: 'Blinky', color: COLORS.blinky },
	{ key: 'pinky',  label: 'Pinky',  color: COLORS.pinky },
	{ key: 'inky',   label: 'Inky',   color: COLORS.inky },
	{ key: 'clyde',  label: 'Clyde',  color: COLORS.clyde },
];

function drawPathLegend(mapX, mapY) {
	var ctx = state.ctx;
	var x   = 40;
	var y   = mapY;
	var sq  = 12;
	var lh  = 22;
	ctx.font      = "10px 'Press Start 2P', monospace";
	ctx.textAlign = 'left';
	PATH_LEGEND.forEach(function(e, i) {
		var active    = state.showPaths[e.key];
		ctx.fillStyle = active ? e.color : COLORS.darkGray;
		ctx.fillRect(x, y + i * lh - sq, sq, sq);
		ctx.fillStyle = active ? e.color : COLORS.gray;
		ctx.fillText(e.label, x + sq + 6, y + i * lh);
	});
}

// ── Slider shared helpers ─────────────────────────────────────────────────────

function sliderMouseDown(e, iconBoundsKey, trackBoundsKey, draggingKey, onIconClick, setFromX) {
	if (state.gameState === 'menu') return;
	var p  = canvasPt(e);
	var ib = state[iconBoundsKey];
	if (ib && p.x >= ib.x && p.x <= ib.x + ib.w && p.y >= ib.y && p.y <= ib.y + ib.h) {
		onIconClick(); return;
	}
	var tb = state[trackBoundsKey];
	if (tb && p.x >= tb.x - 10 && p.x <= tb.x + tb.w + 10 && Math.abs(p.y - tb.y) < 16) {
		state[draggingKey] = true;
		setFromX(p.x);
	}
}

function drawSliderTrack(ctx, trackX, trackY, trackW, fillW, color, markerRatio) {
	ctx.fillStyle = COLORS.darkGray;
	ctx.fillRect(trackX, trackY - 2, trackW, 4);
	ctx.fillStyle = color;
	ctx.fillRect(trackX, trackY - 2, fillW, 4);
	if (markerRatio !== undefined) {
		ctx.fillStyle = COLORS.gray;
		ctx.fillRect(trackX + markerRatio * trackW - 1, trackY - 5, 2, 10);
	}
	ctx.beginPath();
	ctx.arc(trackX + fillW, trackY, 6, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
}

// ── Volume slider ─────────────────────────────────────────────────────────────

function setVolumeFromX(cx) {
	var t = state.volTrackBounds;
	state.volume = Math.max(0, Math.min(1, (cx - t.x) / t.w));
	saveVolume();
}

export function onVolMouseDown(e) {
	sliderMouseDown(e, 'volIconBounds', 'volTrackBounds', 'draggingVolume',
		function() { state.muted = !state.muted; saveVolume(); },
		setVolumeFromX);
}
export function onVolMouseMove(e) {
	if (!state.draggingVolume) return;
	setVolumeFromX(canvasPt(e).x);
}
export function onVolMouseUp() { state.draggingVolume = false; }

// ── Speed slider ──────────────────────────────────────────────────────────────

function setSpeedFromX(cx) {
	var t     = state.speedTrackBounds;
	var ratio = Math.max(0, Math.min(1, (cx - t.x) / t.w));
	var raw   = SPEED_MIN + ratio * (SPEED_MAX - SPEED_MIN);
	// Snap to 1.0 when close
	state.gameSpeed = Math.abs(raw - 1.0) < 0.1 ? 1.0 : Math.round(raw * 100) / 100;
	saveSpeed();
}

export function onSpeedMouseDown(e) {
	sliderMouseDown(e, 'speedIconBounds', 'speedTrackBounds', 'draggingSpeed',
		function() { state.gameSpeed = 1.0; saveSpeed(); },
		setSpeedFromX);
}
export function onSpeedMouseMove(e) {
	if (!state.draggingSpeed) return;
	setSpeedFromX(canvasPt(e).x);
}
export function onSpeedMouseUp() { state.draggingSpeed = false; }

// ── Speed slider drawing ──────────────────────────────────────────────────────

function drawSpeedSlider(mapX, mapW, lifeY) {
	var ctx    = state.ctx;
	var trackW = 160;
	var trackX = mapX + mapW / 2 - trackW / 2;
	var trackY = lifeY - 6;
	var iconX  = trackX - 10;
	var iconY  = trackY + 5;

	state.speedTrackBounds = { x: trackX, y: trackY, w: trackW };
	state.speedIconBounds  = { x: iconX - 38, y: trackY - 14, w: 36, h: 20 };

	var label = state.gameSpeed.toFixed(2).replace(/\.?0+$/, '') + '\u00D7';
	ctx.font      = "12px 'Press Start 2P', monospace";
	ctx.fillStyle = state.gameSpeed === 1.0 ? COLORS.gray : COLORS.pacman;
	ctx.textAlign = 'right';
	ctx.fillText(label, iconX, iconY);

	var oneRatio  = (1.0 - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
	var thisRatio = (state.gameSpeed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
	var fillW     = thisRatio * trackW;
	var speedColor = state.gameSpeed < 1.0 ? COLORS.cyan : state.gameSpeed > 1.0 ? COLORS.orange : COLORS.pacman;
	drawSliderTrack(ctx, trackX, trackY, trackW, fillW, speedColor, oneRatio);
}

// ── Volume slider drawing ─────────────────────────────────────────────────────

function drawVolumeSlider(mapX, mapW, lifeY) {
	var ctx    = state.ctx;
	var trackW = 120;
	var trackX = mapX + mapW - trackW;
	var trackY = lifeY - 6;
	var iconX  = trackX - 26;
	var iconY  = trackY + 5;

	state.volTrackBounds = { x: trackX, y: trackY, w: trackW };
	state.volIconBounds  = { x: iconX - 2, y: trackY - 14, w: 24, h: 20 };

	var icon = state.muted ? '\uD83D\uDD07'
		: state.volume < 0.33 ? '\uD83D\uDD08'
		: state.volume < 0.66 ? '\uD83D\uDD09'
		: '\uD83D\uDD0A';
	ctx.font      = "19px 'Press Start 2P', monospace";
	ctx.textAlign = 'left';
	ctx.fillText(icon, iconX, iconY);

	var fillW = state.muted ? 0 : state.volume * trackW;
	drawSliderTrack(ctx, trackX, trackY, trackW, fillW, COLORS.pacman);
}

// ── HUD ───────────────────────────────────────────────────────────────────────

export function drawHUD() {
	var ctx  = state.ctx;
	var sx   = 2;
	var mapX = state.mapOffX * sx;
	var mapY = state.mapOffY * sx;
	var mapW = state.GRID_COLS * TILE * sx;

	ctx.textAlign = 'left';
	ctx.font = "18px 'Press Start 2P', monospace";

	ctx.fillStyle = COLORS.white;
	ctx.fillText('SCORE', mapX, mapY - 28);
	ctx.fillStyle = COLORS.pacman;
	ctx.fillText(state.score, mapX, mapY - 8);

	ctx.fillStyle = COLORS.white;
	ctx.textAlign = 'center';
	ctx.fillText('HIGH-SCORE', mapX + mapW / 2, mapY - 28);
	ctx.fillStyle = COLORS.pacman;
	ctx.fillText(Math.max(state.score, state.highScore), mapX + mapW / 2, mapY - 8);

	ctx.fillStyle = COLORS.white;
	ctx.textAlign = 'right';
	ctx.fillText('LEVEL', mapX + mapW, mapY - 28);
	ctx.fillStyle = COLORS.pacman;
	ctx.fillText(state.level, mapX + mapW, mapY - 8);

	var lifeY = mapY + state.GRID_ROWS * TILE * sx + 24;
	ctx.fillStyle = COLORS.pacman;
	ctx.textAlign = 'left';
	ctx.font = "12px 'Press Start 2P', monospace";
	ctx.fillText('LIVES:', mapX, lifeY);
	for (var i = 0; i < state.lives; i++) {
		ctx.beginPath();
		ctx.arc(mapX + 100 + i * LIFE_ICON_SPACING, lifeY - 6, 9, 0.25 * Math.PI, 1.75 * Math.PI);
		ctx.lineTo(mapX + 100 + i * 28, lifeY - 6);
		ctx.fillStyle = COLORS.pacman;
		ctx.fill();
	}

	if (state.aiMode) {
		var pLabel = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].label;
		ctx.fillStyle = COLORS.cyan;
		ctx.textAlign = 'center';
		ctx.font = "12px 'Press Start 2P', monospace";
		ctx.fillText('\uD83E\uDD16 AI: ' + pLabel, mapX + mapW / 2, lifeY);
	}

	// if (state.gameState !== 'menu') drawPathLegend(mapX, mapY);
	if (state.showInfoPanel) drawInfoPanel(mapX, mapY);
}

// ── Ghost indicator style picker ──────────────────────────────────────────────

var INDICATOR_LABELS = ['ARROW', 'SQUARE', 'CORNERS', 'GLOW'];

function drawIndicatorPicker(mapX, mapW, lifeY) {
	var ctx   = state.ctx;
	var y     = lifeY + 28;
	var itemW = 64;
	var gap   = 6;
	var totalW = INDICATOR_LABELS.length * itemW + (INDICATOR_LABELS.length - 1) * gap;
	var startX = mapX + mapW / 2 - totalW / 2;

	ctx.font      = "12px 'Press Start 2P', monospace";
	ctx.textAlign = 'center';

	state.indicatorStyleBounds = [];
	for (var i = 0; i < INDICATOR_LABELS.length; i++) {
		var bx = startX + i * (itemW + gap);
		var active = state.ghostIndicatorStyle === i;
		ctx.fillStyle = active ? COLORS.black : 'rgba(0,0,0,0)';
		if (active) ctx.fillRect(bx, y - 13, itemW, 17);
		ctx.strokeStyle = active ? COLORS.pacman : COLORS.darkGray;
		ctx.lineWidth   = 1;
		ctx.strokeRect(bx, y - 13, itemW, 17);
		ctx.fillStyle = active ? COLORS.pacman : COLORS.gray;
		ctx.fillText(INDICATOR_LABELS[i], bx + itemW / 2, y);
		state.indicatorStyleBounds.push({ x: bx, y: y - 13, w: itemW, h: 17, idx: i });
	}
}

export function onIndicatorMouseDown(e) {
	if (state.gameState === 'menu') return;
	var r  = state.canvas.getBoundingClientRect();
	var px = (e.clientX - r.left) * (state.canvas.width  / r.width);
	var py = (e.clientY - r.top)  * (state.canvas.height / r.height);
	if (!state.indicatorStyleBounds) return;
	for (var i = 0; i < state.indicatorStyleBounds.length; i++) {
		var b = state.indicatorStyleBounds[i];
		if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
			state.ghostIndicatorStyle = b.idx;
			return;
		}
	}
}

// ── Info panel ────────────────────────────────────────────────────────────────

function drawInfoPanel(mapX, mapY) {
	var ctx = state.ctx;
	var x   = mapX - 18;
	var lh  = 18;
	var y   = mapY;

	ctx.textAlign = 'right';
	ctx.font      = "10px 'Press Start 2P', monospace";

	ctx.fillStyle = COLORS.lightGray;
	ctx.fillText('GHOSTS', x, y); y += lh + 4;

	var ghostInfo = [
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

	var shortcuts = [
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
