import '../sass/style.scss';
import { initSprites, s_map, s_pacman } from './sprite.js';
import {
	TILE, SPEED_MIN, SPEED_MAX, dir, AI_PERSONALITIES, AI_PERSONALITY_KEYS,
	DEAD_STATE_FRAMES, RESULT_STATE_FRAMES, GHOST_EATEN_FREEZE_FRAMES,
	CHERRY_DOT_THRESHOLD, CHERRY_DURATION, SCATTER_CHASE_PHASES
} from './constants.js';
import { state } from './state.js';
import { initWallData, buildGrid } from './grid.js';
import { initDots, initBigDots, drawDots } from './dots.js';
import { initGhosts, bfsReturnPath, ghostLookahead } from './ghost.js';
import './pacman-entity.js';
import { aiDecide, shuffleBFSDirs } from './ai.js';
import {
	initAudio, playBeginning, playDeath, playEatFruit, playEatGhost, playExtraPac, playIntermission
} from './audio.js';
import {
	drawHUD, initPathPanel, setPathPanelVisible, togglePath, hexToRgb,
	saveVolume, saveSpeed,
	onVolMouseDown, onVolMouseMove, onVolMouseUp,
	onSpeedMouseDown, onSpeedMouseMove, onSpeedMouseUp
} from './hud.js';

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
}

export function newGame() {
	state.score = 0;
	state.lastExtraLifeScore = 0;
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

	// Cherry
	if (state.cherry) {
		state.cherry.timer -= state.gameSpeed;
		if (state.cherry.timer <= 0) {
			state.cherry = null;
		} else if (state.cherry.col === state.pacman.col && state.cherry.row === state.pacman.row) {
			addScore(100);
			addPopup('100', state.cherry.col, state.cherry.row);
			state.cherry = null;
			playEatFruit();
		}
	} else if (state.dotsEaten === CHERRY_DOT_THRESHOLD && state.level <= 5) {
		state.cherry = { col: 13, row: 17, timer: CHERRY_DURATION };
	}

	if (state.aiMode) aiDecide();
	state.pacman.update();
	state.ghosts.forEach(function(g) { g.update(levelSpeedFactor() * state.gameSpeed); });

	// Ghost collision
	for (var i = 0; i < state.ghosts.length; i++) {
		var g = state.ghosts[i];
		if (!g.exited) continue;
		if (g.returning) continue;

		var dx = g.x - state.pacman.x;
		var dy = g.y - state.pacman.y;
		var dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < 10) {
			if (state.scaredTimer > 0 && !g.immune) {
				// Face the ghost being eaten
				if (Math.abs(dx) > Math.abs(dy)) {
					state.pacman.dir = dx > 0 ? dir.right : dir.left;
				} else {
					state.pacman.dir = dy > 0 ? dir.down : dir.up;
				}
				switch (state.pacman.dir) {
					case dir.left:  state.pacman.sprite = s_pacman.left;  break;
					case dir.up:    state.pacman.sprite = s_pacman.up;    break;
					case dir.right: state.pacman.sprite = s_pacman.right; break;
					case dir.down:  state.pacman.sprite = s_pacman.down;  break;
				}

				state.ghostCombo++;
				var pts = 200 * Math.pow(2, state.ghostCombo - 1);
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
	var remaining = 0;
	for (var r = 0; r < state.GRID_ROWS; r++)
		for (var c = 0; c < state.GRID_COLS; c++)
			if (state.dots[r][c] === 1) remaining++;
	if (remaining === 0) {
		state.gameState  = 'win';
		state.stateTimer = RESULT_STATE_FRAMES;
		playIntermission();
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

	// --- Render paths (Pac-Man and Ghosts) with overlap offsets ---
	ctx.save();
	ctx.lineWidth = 3;
	ctx.setLineDash([3, 5]);

	const allPaths = [];
	const ghostKeys = ['blinky', 'pinky', 'inky', 'clyde'];

	// 1. Collect Pac-Man path
	if (state.aiMode && state.showPaths.pacman && state.aiPath.length > 0) {
		const pPath = [{ col: state.pacman.col, row: state.pacman.row }].concat(state.aiPath);
		allPaths.push({ id: 'pacman', color: 'rgba(255,255,0,0.5)', points: pPath, index: 0 });
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
	if (e.key === 'Escape') {
		setPathPanelVisible(false);
		newGame();
		state.gameState    = 'menu';
		state.menuSubState = 'main';
		return;
	}
	if (state.gameState === 'menu') {
		if (state.menuSubState === 'personality') {
			switch (e.key) {
				case 'ArrowLeft':  state.aiPersonalityIdx = (state.aiPersonalityIdx - 1 + AI_PERSONALITY_KEYS.length) % AI_PERSONALITY_KEYS.length; break;
				case 'ArrowRight': state.aiPersonalityIdx = (state.aiPersonalityIdx + 1) % AI_PERSONALITY_KEYS.length; break;
				case 'Enter':
					state.aiMode       = true;
					state.menuSubState = 'main';
					newGame();
					setPathPanelVisible(true);
					state.pendingBeginning = true;
					playBeginning();
					break;
			}
		} else {
			switch (e.key) {
				case 'ArrowUp':   state.menuSelected = 0; break;
				case 'ArrowDown': state.menuSelected = 1; break;
				case 'Enter':
					if (state.menuSelected === 1) {
						state.menuSubState = 'personality';
					} else {
						state.aiMode = false;
						newGame();
						setPathPanelVisible(false);
						state.pendingBeginning = true;
						playBeginning();
					}
					break;
			}
		}
		return;
	}
	if (e.code === 'KeyM') { state.muted = !state.muted; saveVolume(); return; }
	if (e.code === 'KeyQ') { state.showInfoPanel = !state.showInfoPanel; return; }
	if (e.code === 'Comma')  { state.gameSpeed = Math.max(SPEED_MIN, Math.round((state.gameSpeed - 0.25) * 100) / 100); saveSpeed(); return; }
	if (e.code === 'Period') { state.gameSpeed = Math.min(SPEED_MAX, Math.round((state.gameSpeed + 0.25) * 100) / 100); saveSpeed(); return; }
	if (e.code === 'KeyZ') { togglePath('blinky'); return; }
	if (e.code === 'KeyX') { togglePath('pinky');  return; }
	if (e.code === 'KeyC') { togglePath('inky');   return; }
	if (e.code === 'KeyV') { togglePath('clyde');  return; }
	if (e.code === 'KeyB') { togglePath('pacman'); return; }
	if (e.code === 'KeyP' && (state.gameState === 'playing' || state.paused)) {
		state.paused = !state.paused; return;
	}
	if (!state.aiMode) {
		var arrowKey = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowDown';
		if (arrowKey && state.gameState === 'ready') state.gameState = 'playing';
		switch (e.key) {
			case 'ArrowLeft':  state.pacman.nextDir = dir.left;  break;
			case 'ArrowUp':    state.pacman.nextDir = dir.up;    break;
			case 'ArrowRight': state.pacman.nextDir = dir.right; break;
			case 'ArrowDown':  state.pacman.nextDir = dir.down;  break;
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
