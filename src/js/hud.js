import { TILE, SPEED_MIN, SPEED_MAX, AI_PERSONALITIES, AI_PERSONALITY_KEYS } from './constants.js';
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

// ── Canvas coordinate helper ──────────────────────────────────────────────────

function canvasPt(e) {
	var r = state.canvas.getBoundingClientRect();
	return {
		x: (e.clientX - r.left) * (state.canvas.width  / r.width),
		y: (e.clientY - r.top)  * (state.canvas.height / r.height)
	};
}

// ── Ghost path toggle panel ───────────────────────────────────────────────────

var PATH_KEYS = ['pacman', 'blinky', 'pinky', 'inky', 'clyde'];

export function initPathPanel() {
	state.pathPanel = document.createElement('div');
	state.pathPanel.id = 'path-panel';
	var entries = [
		{ key: 'pacman', label: 'Pac-Man', color: '#ffff00' },
		{ key: 'blinky', label: 'Blinky',  color: '#ff0000' },
		{ key: 'pinky',  label: 'Pinky',   color: '#ffb8ff' },
		{ key: 'inky',   label: 'Inky',    color: '#00ffff' },
		{ key: 'clyde',  label: 'Clyde',   color: '#ffb851' },
	];
	entries.forEach(function(e) {
		var lbl = document.createElement('label');
		lbl.style.color = e.color;
		var cb = document.createElement('input');
		cb.type    = 'checkbox';
		cb.checked = true;
		cb.addEventListener('change', function() { state.showPaths[e.key] = cb.checked; });
		lbl.appendChild(cb);
		lbl.appendChild(document.createTextNode(e.label));
		state.pathPanel.appendChild(lbl);
	});
	document.body.appendChild(state.pathPanel);
}

export function setPathPanelVisible(v) {
	if (state.pathPanel) state.pathPanel.style.display = v ? 'block' : 'none';
}

export function togglePath(key) {
	state.showPaths[key] = !state.showPaths[key];
	if (state.pathPanel) {
		var cbs = state.pathPanel.querySelectorAll('input');
		var idx = PATH_KEYS.indexOf(key);
		if (idx >= 0 && cbs[idx]) cbs[idx].checked = state.showPaths[key];
	}
}

// ── Volume slider ─────────────────────────────────────────────────────────────

function setVolumeFromX(cx) {
	var t = state.volTrackBounds;
	state.volume = Math.max(0, Math.min(1, (cx - t.x) / t.w));
	saveVolume();
}

export function onVolMouseDown(e) {
	if (state.gameState === 'menu') return;
	var p = canvasPt(e);
	var ib = state.volIconBounds;
	if (ib && p.x >= ib.x && p.x <= ib.x + ib.w && p.y >= ib.y && p.y <= ib.y + ib.h) {
		state.muted = !state.muted; saveVolume(); return;
	}
	var tb = state.volTrackBounds;
	if (tb && p.x >= tb.x - 10 && p.x <= tb.x + tb.w + 10 && Math.abs(p.y - tb.y) < 16) {
		state.draggingVolume = true;
		setVolumeFromX(p.x);
	}
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
	if (state.gameState === 'menu') return;
	var p = canvasPt(e);
	var ib = state.speedIconBounds;
	if (ib && p.x >= ib.x && p.x <= ib.x + ib.w && p.y >= ib.y && p.y <= ib.y + ib.h) {
		state.gameSpeed = 1.0; saveSpeed(); return;
	}
	var tb = state.speedTrackBounds;
	if (tb && p.x >= tb.x - 10 && p.x <= tb.x + tb.w + 10 && Math.abs(p.y - tb.y) < 16) {
		state.draggingSpeed = true;
		setSpeedFromX(p.x);
	}
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
	ctx.font      = '13px monospace';
	ctx.fillStyle = state.gameSpeed === 1.0 ? '#888888' : '#ffff00';
	ctx.textAlign = 'right';
	ctx.fillText(label, iconX, iconY);

	ctx.fillStyle = '#444444';
	ctx.fillRect(trackX, trackY - 2, trackW, 4);

	var oneRatio  = (1.0 - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
	var thisRatio = (state.gameSpeed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
	var fillW     = thisRatio * trackW;
	ctx.fillStyle = state.gameSpeed < 1.0 ? '#00ccff' : state.gameSpeed > 1.0 ? '#ff8800' : '#ffff00';
	ctx.fillRect(trackX, trackY - 2, fillW, 4);

	ctx.fillStyle = '#888888';
	ctx.fillRect(trackX + oneRatio * trackW - 1, trackY - 5, 2, 10);

	var thumbX = trackX + fillW;
	ctx.beginPath();
	ctx.arc(thumbX, trackY, 6, 0, Math.PI * 2);
	ctx.fillStyle = state.gameSpeed < 1.0 ? '#00ccff' : state.gameSpeed > 1.0 ? '#ff8800' : '#ffff00';
	ctx.fill();
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
	ctx.font      = '16px sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText(icon, iconX, iconY);

	ctx.fillStyle = '#444444';
	ctx.fillRect(trackX, trackY - 2, trackW, 4);

	var fillW = state.muted ? 0 : state.volume * trackW;
	ctx.fillStyle = '#ffff00';
	ctx.fillRect(trackX, trackY - 2, fillW, 4);

	var thumbX = trackX + (state.muted ? 0 : fillW);
	ctx.beginPath();
	ctx.arc(thumbX, trackY, 6, 0, Math.PI * 2);
	ctx.fillStyle = '#ffff00';
	ctx.fill();
}

// ── HUD ───────────────────────────────────────────────────────────────────────

export function drawHUD() {
	var ctx  = state.ctx;
	var sx   = 2;
	var mapX = state.mapOffX * sx;
	var mapY = state.mapOffY * sx;
	var mapW = state.GRID_COLS * TILE * sx;

	ctx.textAlign = 'left';
	ctx.font = 'bold 22px monospace';

	ctx.fillStyle = '#ffffff';
	ctx.fillText('SCORE', mapX, mapY - 28);
	ctx.fillStyle = '#ffff00';
	ctx.fillText(state.score, mapX, mapY - 8);

	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('HI-SCORE', mapX + mapW / 2, mapY - 28);
	ctx.fillStyle = '#ffff00';
	ctx.fillText(Math.max(state.score, state.highScore), mapX + mapW / 2, mapY - 8);

	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'right';
	ctx.fillText('LEVEL', mapX + mapW, mapY - 28);
	ctx.fillStyle = '#ffff00';
	ctx.fillText(state.level, mapX + mapW, mapY - 8);

	if (state.aiMode) {
		var pLabel = AI_PERSONALITIES[AI_PERSONALITY_KEYS[state.aiPersonalityIdx]].label;
		ctx.fillStyle = '#00ccff';
		ctx.textAlign = 'center';
		ctx.font = '11px monospace';
		ctx.fillText('🤖 AI: ' + pLabel, mapX + mapW / 2, mapY - 48);
	}

	var lifeY = mapY + state.GRID_ROWS * TILE * sx + 24;
	ctx.fillStyle = '#ffff00';
	ctx.textAlign = 'left';
	ctx.font = 'bold 18px monospace';
	ctx.fillText('LIVES:', mapX, lifeY);
	for (var i = 0; i < state.lives; i++) {
		ctx.beginPath();
		ctx.arc(mapX + 100 + i * 28, lifeY - 6, 9, 0.25 * Math.PI, 1.75 * Math.PI);
		ctx.lineTo(mapX + 100 + i * 28, lifeY - 6);
		ctx.fillStyle = '#ffff00';
		ctx.fill();
	}

	drawSpeedSlider(mapX, mapW, lifeY);
	drawVolumeSlider(mapX, mapW, lifeY);
	if (state.showInfoPanel) drawInfoPanel(mapX, mapY);
}

// ── Info panel ────────────────────────────────────────────────────────────────

function drawInfoPanel(mapX, mapY) {
	var ctx = state.ctx;
	var x   = mapX - 18;
	var lh  = 30;
	var y   = mapY;

	ctx.textAlign = 'right';

	ctx.font      = 'bold 22px monospace';
	ctx.fillStyle = '#aaaaaa';
	ctx.fillText('GHOSTS', x, y); y += lh + 4;

	var ghostInfo = [
		{ color: '#ff0000', name: 'Blinky', lines: ['Jager Pac-Man', 'direkte til målet.'] },
		{ color: '#ffb8ff', name: 'Pinky',  lines: ['Sikter 4 ruter', 'foran Pac-Man.'] },
		{ color: '#00ffff', name: 'Inky',   lines: ['Bruker Blinky og', '2 ruter foran', 'for å flankere.'] },
		{ color: '#ffb851', name: 'Clyde',  lines: ['Jager når langt unna,', 'flykter til hjørnet', 'når nær (<8 ruter).'] },
	];
	ghostInfo.forEach(function(g) {
		ctx.font      = 'bold 22px monospace';
		ctx.fillStyle = g.color;
		ctx.fillText(g.name, x, y); y += lh - 4;
		ctx.font      = '20px monospace';
		ctx.fillStyle = '#888888';
		g.lines.forEach(function(line) { ctx.fillText(line, x, y); y += lh - 4; });
		y += 8;
	});

	y += 8;

	ctx.font      = 'bold 22px monospace';
	ctx.fillStyle = '#aaaaaa';
	ctx.fillText('TASTER', x, y); y += lh + 4;

	var shortcuts = [
		{ key: '← → ↑ ↓', desc: 'Beveg'       },
		{ key: 'P',        desc: 'Pause'        },
		{ key: 'M',        desc: 'Lyd av/på'    },
		{ key: ', / .',    desc: 'Fart −/+'     },
		{ key: 'Z X C V',  desc: 'Ghost-sti'    },
		{ key: 'B',        desc: 'Pac-sti (AI)' },
		{ key: 'Q',        desc: 'Skjul/vis info' },
		{ key: 'Esc',      desc: 'Meny'         },
	];
	shortcuts.forEach(function(s) {
		ctx.font      = 'bold 20px monospace';
		ctx.fillStyle = '#ffff00';
		ctx.fillText(s.key, x, y); y += lh - 4;
		ctx.font      = '20px monospace';
		ctx.fillStyle = '#888888';
		ctx.fillText(s.desc, x, y); y += lh;
	});
}
