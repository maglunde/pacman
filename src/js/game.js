import '../sass/style.scss';
import { initSprites, s_map } from './sprite.js';
import { TILE, SPEED_MIN, SPEED_MAX, dir, AI_PERSONALITIES, AI_PERSONALITY_KEYS } from './constants.js';
import { state } from './state.js';
import { initWallData, buildGrid } from './grid.js';
import { initDots, initBigDots, drawDots } from './dots.js';
import { initGhosts, bfsReturnPath, ghostLookahead } from './ghost.js';
import './pacman-entity.js';
import { aiDecide, shuffleBFSDirs } from './ai.js';
import { initAudio } from './audio.js';
import {
	drawHUD, initPathPanel, setPathPanelVisible, togglePath, hexToRgb,
	saveVolume, saveSpeed,
	onVolMouseDown, onVolMouseMove, onVolMouseUp,
	onSpeedMouseDown, onSpeedMouseMove, onSpeedMouseUp
} from './hud.js';

// ── Game speed ────────────────────────────────────────────────────────────────

function levelSpeedFactor() { return 1 + (state.level - 1) * 0.06; }

// ── Score popups ──────────────────────────────────────────────────────────────

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
	state.gameState             = 'ready';
	state.paused                = false;
}

export function newGame() {
	state.score = 0;
	state.lives = 3;
	state.level = 1;
	initDots();
	initBigDots();
	shuffleBFSDirs();
	startReady();
}

function nextLevel() {
	state.level++;
	initDots();
	initBigDots();
	startReady();
}

function loseLife() {
	state.lives--;
	if (state.lives <= 0) {
		if (state.score > state.highScore) {
			state.highScore = state.score;
			localStorage.setItem('pacman-hi', state.highScore);
		}
		state.gameState  = 'gameover';
		state.stateTimer = 180;
	} else {
		state.gameState  = 'dead';
		state.stateTimer = 120;
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
		if ((state.stateTimer -= state.gameSpeed) <= 0) state.gameState = 'menu';
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
					g.returnPath       = bfsReturnPath(g.col, g.row);
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

	// Score popups
	state.scorePopups.forEach(function(p) { p.y -= 0.4; p.life--; });
	state.scorePopups = state.scorePopups.filter(function(p) { return p.life > 0; });

	// Cherry
	if (state.cherry) {
		state.cherry.timer -= state.gameSpeed;
		if (state.cherry.timer <= 0) {
			state.cherry = null;
		} else if (state.cherry.col === state.pacman.col && state.cherry.row === state.pacman.row) {
			state.score += 100;
			addPopup('100', state.cherry.col, state.cherry.row);
			state.cherry = null;
		}
	} else if (state.dotsEaten === 70 && state.level <= 5) {
		state.cherry = { col: 13, row: 17, timer: 600 };
	}

	if (state.aiMode) aiDecide();
	state.pacman.update();
	state.ghosts.forEach(function(g) { g.update(levelSpeedFactor() * state.gameSpeed); });

	// Ghost collision
	state.ghosts.forEach(function(g) {
		if (!g.exited) return;
		if (g.col !== state.pacman.col || g.row !== state.pacman.row) return;
		if (g.returning) return;
		if (state.scaredTimer > 0 && !g.immune) {
			state.ghostCombo++;
			var pts = 200 * Math.pow(2, state.ghostCombo - 1);
			state.score += pts;
			addPopup(pts.toString(), g.col, g.row);
			g.pendingReturn             = true;
			g.immune                    = true;
			state.ghostEatenFreezeTimer = 120;
		} else {
			loseLife();
		}
	});

	// Win check
	var remaining = 0;
	for (var r = 0; r < state.GRID_ROWS; r++)
		for (var c = 0; c < state.GRID_COLS; c++)
			if (state.dots[r][c] === 1) remaining++;
	if (remaining === 0) {
		state.gameState  = 'win';
		state.stateTimer = 180;
	}
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderMenu() {
	var ctx = state.ctx;
	ctx.save();
	ctx.scale(2, 2);
	s_map.draw(ctx, state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
	ctx.fillStyle = 'rgba(0,0,0,0.72)';
	ctx.fillRect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);

	var cx = state.mapOffX + state.GRID_COLS * TILE / 2;
	var cy = state.mapOffY + state.GRID_ROWS * TILE / 2;

	ctx.fillStyle = '#ffff00';
	ctx.font      = 'bold 20px monospace';
	ctx.textAlign = 'center';
	ctx.fillText('PAC-MAN', cx, cy - 60);

	if (state.menuSubState === 'personality') {
		ctx.fillStyle = '#aaaaaa';
		ctx.font      = '12px monospace';
		ctx.fillText('Choose AI style:', cx, cy - 20);

		var pKey = AI_PERSONALITY_KEYS[state.aiPersonalityIdx];
		var pCfg = AI_PERSONALITIES[pKey];
		ctx.fillStyle = '#ffff00';
		ctx.font      = 'bold 16px monospace';
		ctx.fillText('◄  ' + pCfg.label + '  ►', cx, cy + 10);

		var descs = {
			coward:     'Flees early, avoids all risk',
			balanced:   'Balanced and efficient',
			aggressive: 'Actively hunts ghosts',
			greedy:     'Maximizes score, takes risks',
		};
		ctx.fillStyle = '#888888';
		ctx.font      = '10px monospace';
		ctx.fillText(descs[pKey], cx, cy + 32);

		ctx.fillStyle = '#555';
		ctx.font      = '9px monospace';
		ctx.fillText('← → to choose  •  Enter to start  •  Esc back', cx, cy + 60);
	} else {
		var opts = ['🕹  Play yourself', '🤖  Let AI play'];
		for (var i = 0; i < opts.length; i++) {
			ctx.fillStyle = state.menuSelected === i ? '#ffff00' : '#aaaaaa';
			ctx.font      = state.menuSelected === i ? 'bold 13px monospace' : '13px monospace';
			ctx.fillText(opts[i], cx, cy - 10 + i * 28);
		}
		if (state.highScore > 0) {
			ctx.fillStyle = '#aaa';
			ctx.font      = '10px monospace';
			ctx.fillText('HI-SCORE: ' + state.highScore, cx, cy + 48);
		}
		ctx.fillStyle = '#555';
		ctx.font      = '9px monospace';
		ctx.fillText('↑ ↓ to select  •  Enter to start', cx, cy + 70);
	}
	ctx.restore();
}

function render() {
	var ctx = state.ctx;
	ctx.clearRect(0, 0, state.width, state.height);
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, state.width, state.height);

	if (state.gameState === 'menu') { renderMenu(); return; }

	ctx.save();
	ctx.scale(2, 2);
	s_map.draw(ctx, state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
	ctx.beginPath();
	ctx.rect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
	ctx.clip();
	drawDots();

	// AI path
	ctx.save();
	ctx.lineWidth = 3;
	ctx.setLineDash([3, 5]);
	if (state.aiMode && state.showPaths.pacman && state.aiPath.length > 0) {
		ctx.strokeStyle = 'rgba(255,255,0,0.5)';
		ctx.beginPath();
		ctx.moveTo(state.pacman.x + 14, state.pacman.y + 14);
		for (var i = 0; i < state.aiPath.length; i++) {
			var p = state.aiPath[i];
			ctx.lineTo(state.mapOffX + p.col * TILE + TILE / 2, state.mapOffY + p.row * TILE + TILE / 2);
		}
		ctx.stroke();
	}

	// Ghost paths
	var ghostKeys = ['blinky', 'pinky', 'inky', 'clyde'];
	state.ghosts.forEach(function(g, idx) {
		if (!state.showPaths[ghostKeys[idx]] || !g.exited || state.scaredTimer > 0) return;
		var gPath = ghostLookahead(g, 20);
		if (gPath.length === 0) return;
		ctx.strokeStyle = 'rgba(' + hexToRgb(g.pathColor) + ',0.45)';
		ctx.beginPath();
		ctx.moveTo(g.x + 15, g.y + 15);
		for (var i = 0; i < gPath.length; i++)
			ctx.lineTo(state.mapOffX + gPath[i].col * TILE + TILE / 2, state.mapOffY + gPath[i].row * TILE + TILE / 2);
		ctx.stroke();
	});
	ctx.restore();

	state.ghosts.forEach(function(g) { g.draw(); });
	state.pacman.draw();

	// Cherry
	if (state.cherry) {
		var cx = state.mapOffX + state.cherry.col * TILE + TILE / 2;
		var cy = state.mapOffY + state.cherry.row * TILE + TILE / 2;
		ctx.fillStyle = '#cc0000';
		ctx.beginPath(); ctx.arc(cx - 4, cy + 2, 5, 0, Math.PI * 2); ctx.fill();
		ctx.beginPath(); ctx.arc(cx + 4, cy + 2, 5, 0, Math.PI * 2); ctx.fill();
		ctx.strokeStyle = '#228822'; ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(cx - 4, cy - 3);
		ctx.quadraticCurveTo(cx, cy - 10, cx + 4, cy - 3);
		ctx.stroke();
	}

	// Score popups
	state.scorePopups.forEach(function(p) {
		ctx.fillStyle = 'rgba(0,255,200,' + (p.life / 60) + ')';
		ctx.font      = 'bold 8px monospace';
		ctx.textAlign = 'center';
		ctx.fillText(p.text, p.x + TILE, p.y);
	});

	// State overlays
	var mx = state.mapOffX + state.GRID_COLS * TILE / 2;
	var my = state.mapOffY + state.GRID_ROWS * TILE / 2;
	if (state.gameState === 'ready') {
		ctx.fillStyle = '#ffff00';
		ctx.font      = 'bold 14px monospace';
		ctx.textAlign = 'center';
		ctx.fillText('READY!', mx, my + 20);
		ctx.fillStyle = 'rgba(255,255,255,0.5)';
		ctx.font      = '11px monospace';
		ctx.fillText('press any arrow to start', mx, my + 38);
	}
	if (state.paused) {
		ctx.fillStyle = 'rgba(0,0,0,0.5)';
		ctx.fillRect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
		ctx.fillStyle = '#ffffff';
		ctx.font      = 'bold 18px monospace';
		ctx.textAlign = 'center';
		ctx.fillText('PAUSED', mx, my);
	}
	if (state.gameState === 'gameover') {
		ctx.fillStyle = 'rgba(0,0,0,0.6)';
		ctx.fillRect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
		ctx.fillStyle = '#ff0000';
		ctx.font      = 'bold 18px monospace';
		ctx.textAlign = 'center';
		ctx.fillText('GAME OVER', mx, my);
		ctx.fillStyle = '#ffff00';
		ctx.font      = '10px monospace';
		ctx.fillText('Score: ' + state.score, mx, my + 20);
	}
	if (state.gameState === 'win') {
		ctx.fillStyle = 'rgba(0,0,0,0.5)';
		ctx.fillRect(state.mapOffX, state.mapOffY, state.GRID_COLS * TILE, state.GRID_ROWS * TILE);
		ctx.fillStyle = '#00ff88';
		ctx.font      = 'bold 16px monospace';
		ctx.textAlign = 'center';
		ctx.fillText('LEVEL ' + state.level + ' COMPLETE!', mx, my);
	}

	ctx.restore();
	drawHUD();
}

// ── Input ─────────────────────────────────────────────────────────────────────

function keydown(e) {
	initAudio();
	if (e.which === 27) { // Escape
		setPathPanelVisible(false);
		newGame();
		state.gameState    = 'menu';
		state.menuSubState = 'main';
		return;
	}
	if (state.gameState === 'menu') {
		if (state.menuSubState === 'personality') {
			switch (e.which) {
				case 37: state.aiPersonalityIdx = (state.aiPersonalityIdx - 1 + AI_PERSONALITY_KEYS.length) % AI_PERSONALITY_KEYS.length; break;
				case 39: state.aiPersonalityIdx = (state.aiPersonalityIdx + 1) % AI_PERSONALITY_KEYS.length; break;
				case 27: state.menuSubState = 'main'; break;
				case 13:
					state.aiMode       = true;
					state.menuSubState = 'main';
					newGame();
					setPathPanelVisible(true);
					break;
			}
		} else {
			switch (e.which) {
				case 38: state.menuSelected = 0; break;
				case 40: state.menuSelected = 1; break;
				case 13:
					if (state.menuSelected === 1) {
						state.menuSubState = 'personality';
					} else {
						state.aiMode = false;
						newGame();
						setPathPanelVisible(false);
					}
					break;
			}
		}
		return;
	}
	if (e.which === 77) { state.muted = !state.muted; saveVolume(); return; } // M
	if (e.which === 81) { state.showInfoPanel = !state.showInfoPanel; return; } // Q
	if (e.which === 188) { state.gameSpeed = Math.max(SPEED_MIN, Math.round((state.gameSpeed - 0.25) * 100) / 100); saveSpeed(); return; } // ,
	if (e.which === 190) { state.gameSpeed = Math.min(SPEED_MAX, Math.round((state.gameSpeed + 0.25) * 100) / 100); saveSpeed(); return; } // .
	if (e.which === 90) { togglePath('blinky'); return; } // Z
	if (e.which === 88) { togglePath('pinky');  return; } // X
	if (e.which === 67) { togglePath('inky');   return; } // C
	if (e.which === 86) { togglePath('clyde');  return; } // V
	if (e.which === 66) { togglePath('pacman'); return; } // B
	if (e.which === 80 && (state.gameState === 'playing' || state.paused)) { // P
		state.paused = !state.paused; return;
	}
	if (!state.aiMode) {
		var arrowKey = e.which >= 37 && e.which <= 40;
		if (arrowKey && state.gameState === 'ready') state.gameState = 'playing';
		switch (e.which) {
			case 37: state.pacman.nextDir = dir.left;  break;
			case 38: state.pacman.nextDir = dir.up;    break;
			case 39: state.pacman.nextDir = dir.right; break;
			case 40: state.pacman.nextDir = dir.down;  break;
		}
	}
}

// ── Game loop ─────────────────────────────────────────────────────────────────

function run() {
	newGame();
	state.gameState = 'menu';
	var loop = function() {
		if (state.gameState === 'playing' || state.gameState === 'ready' ||
		    state.gameState === 'dead'    || state.gameState === 'gameover' ||
		    state.gameState === 'win') {
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
	document.addEventListener('keydown', keydown);
	initPathPanel();

	state.canvas.addEventListener('mousedown', function(e) { onVolMouseDown(e);   onSpeedMouseDown(e); });
	state.canvas.addEventListener('mousemove', function(e) { onVolMouseMove(e);   onSpeedMouseMove(e); });
	state.canvas.addEventListener('mouseup',   function()  { onVolMouseUp();      onSpeedMouseUp();    });

	state.img     = new Image();
	state.img.src = 'res/sheet.png';
	state.img.onload = function() {
		initSprites(state.img);
		initWallData();
		buildGrid();
		initDots();
		initBigDots();
		run();
	};
}
