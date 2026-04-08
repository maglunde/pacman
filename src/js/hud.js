import { TILE, SPEED_MIN, SPEED_MAX, LIFE_ICON_SPACING, AI_PERSONALITIES, AI_PERSONALITY_KEYS } from './constants.js';
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


// ── HUD ───────────────────────────────────────────────────────────────────────

export function drawHUD() {
	var ctx  = state.ctx;
	var sx   = 2;
	var mapX = state.mapOffX * sx;
	var mapY = state.mapOffY * sx;
	var mapW = state.GRID_COLS * TILE * sx;

	ctx.textAlign = 'left';
	ctx.font = "18px 'Press Start 2P', monospace";

	ctx.fillStyle = '#ffffff';
	ctx.fillText('SCORE', mapX, mapY - 28);
	ctx.fillStyle = '#ffff00';
	ctx.fillText(state.score, mapX, mapY - 8);

	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.fillText('HIGH-SCORE', mapX + mapW / 2, mapY - 28);
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
		ctx.font = "12px 'Press Start 2P', monospace";
		ctx.fillText('🤖 AI: ' + pLabel, mapX + mapW / 2, mapY - 48);
	}

	var lifeY = mapY + state.GRID_ROWS * TILE * sx + 24;
	ctx.fillStyle = '#ffff00';
	ctx.textAlign = 'left';
	ctx.font = "12px 'Press Start 2P', monospace";
	ctx.fillText('LIVES:', mapX, lifeY);
	for (var i = 0; i < state.lives; i++) {
		ctx.beginPath();
		ctx.arc(mapX + 100 + i * LIFE_ICON_SPACING, lifeY - 6, 9, 0.25 * Math.PI, 1.75 * Math.PI);
		ctx.lineTo(mapX + 100 + i * 28, lifeY - 6);
		ctx.fillStyle = '#ffff00';
		ctx.fill();
	}

	if (state.showInfoPanel) drawInfoPanel(mapX, mapY);
}

// ── Info panel ────────────────────────────────────────────────────────────────

function drawInfoPanel(mapX, mapY) {
	var ctx = state.ctx;
	var x   = mapX - 18;
	var lh  = 30;
	var y   = mapY;

	ctx.textAlign = 'right';

	ctx.font      = "13px 'Press Start 2P', monospace";
	ctx.fillStyle = '#aaaaaa';
	ctx.fillText('GHOSTS', x, y); y += lh + 4;

	var ghostInfo = [
		{ color: '#ff0000', name: 'Blinky', lines: ['Jager Pac-Man', 'direkte til målet.'] },
		{ color: '#ffb8ff', name: 'Pinky',  lines: ['Sikter 4 ruter', 'foran Pac-Man.'] },
		{ color: '#00ffff', name: 'Inky',   lines: ['Bruker Blinky og', '2 ruter foran', 'for å flankere.'] },
		{ color: '#ffb851', name: 'Clyde',  lines: ['Jager når langt unna,', 'flykter til hjørnet', 'når nær (<8 ruter).'] },
	];
	ghostInfo.forEach(function(g) {
		ctx.font      = "13px 'Press Start 2P', monospace";
		ctx.fillStyle = g.color;
		ctx.fillText(g.name, x, y); y += lh - 4;
		ctx.font      = "13px 'Press Start 2P', monospace";
		ctx.fillStyle = '#888888';
		g.lines.forEach(function(line) { ctx.fillText(line, x, y); y += lh - 4; });
		y += 8;
	});

	y += 8;

	ctx.font      = "13px 'Press Start 2P', monospace";
	ctx.fillStyle = '#aaaaaa';
	ctx.fillText('TASTER', x, y); y += lh + 4;

	var shortcuts = [
		{ key: '← → ↑ ↓', desc: 'Move'         },
		{ key: 'P',        desc: 'Pause'        },
		{ key: 'M',        desc: 'Mute'         },
		{ key: '- / =',    desc: 'Volume -/+'   },
		{ key: ', / .',    desc: 'Speed -/+'    },
		{ key: 'O',        desc: 'Settings'     },
		{ key: 'Z X C V',  desc: 'Ghost path'   },
		{ key: 'B',        desc: 'Pac path (AI)'},
		{ key: 'I',        desc: 'Indicator'    },
		{ key: 'Q',        desc: 'Info panel'   },
		{ key: 'Esc',      desc: 'Menu'         },
	];
	shortcuts.forEach(function(s) {
		ctx.font      = "12px 'Press Start 2P', monospace";
		ctx.fillStyle = '#ffff00';
		ctx.fillText(s.key, x, y); y += lh - 4;
		ctx.font      = "13px 'Press Start 2P', monospace";
		ctx.fillStyle = '#888888';
		ctx.fillText(s.desc, x, y); y += lh;
	});
}
