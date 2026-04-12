import { state } from './state.js';
import { dir, AI_PERSONALITY_KEYS, MAPS } from './constants.js';
import { adjustSetting, quitToMenu } from './menu.js';
import { setMapSprite } from './sprite.js';
import {
	initAudio, playBeginning, updateLoopVolume, pauseAudio, resumeAudio,
} from './audio.js';
import { saveVolume, togglePath } from './hud.js';

function keydown(e, newGame) {
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
	if (e.code === 'KeyP' && (state.gameState === 'playing' || state.gameState === 'ready' || state.paused)) {
		if (state.escapeMenuActive) {
			state.escapeMenuActive = false;
			state.paused           = false;
			resumeAudio();
		} else {
			state.escapeMenuActive   = true;
			state.escapeMenuSelected = 0;
			state.paused             = true;
			pauseAudio();
		}
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
		quitToMenu();
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
					quitToMenu();
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
			quitToMenu();
			return;
		}
		// fall through to allow shortcuts (M, Q, speed, etc.)
	}
	if (state.gameState === 'menu') {
		if (state.menuSubState === 'settings') {
			switch (e.key) {
				case 'ArrowUp':    state.settingsRow = (state.settingsRow + 3) % 4; break;
				case 'ArrowDown':  state.settingsRow = (state.settingsRow + 1) % 4; break;
				case 'ArrowLeft':
					if (state.settingsRow < 2) adjustSetting(state.settingsRow, -1);
					if (state.settingsRow === 2) { state.mapIdx = (state.mapIdx - 1 + MAPS.length) % MAPS.length; state.activeMap = MAPS[state.mapIdx]; state.playerSpriteSheet = state.activeMap.spriteSheet; setMapSprite(state.activeMap); }
					break;
				case 'ArrowRight':
					if (state.settingsRow < 2) adjustSetting(state.settingsRow, +1);
					if (state.settingsRow === 2) { state.mapIdx = (state.mapIdx + 1) % MAPS.length; state.activeMap = MAPS[state.mapIdx]; state.playerSpriteSheet = state.activeMap.spriteSheet; setMapSprite(state.activeMap); }
					break;
				case 'Enter':
					state.menuSubState = 'main';
					state.settingsRow = 0;
					break;
			}
		} else if (state.menuSubState === 'personality') {
			switch (e.key) {
				case 'ArrowUp':   state.personalityRow = 0; break;
				case 'ArrowDown': state.personalityRow = 1; break;
				case 'ArrowLeft':
					if (state.personalityRow === 0) state.aiPersonalityIdx = (state.aiPersonalityIdx - 1 + AI_PERSONALITY_KEYS.length) % AI_PERSONALITY_KEYS.length;
					break;
				case 'ArrowRight':
					if (state.personalityRow === 0) state.aiPersonalityIdx = (state.aiPersonalityIdx + 1) % AI_PERSONALITY_KEYS.length;
					break;
				case 'Enter':
					if (state.personalityRow === 1) {
						state.menuSubState  = 'main';
						state.personalityRow = 0;
					} else {
						state.aiMode       = true;
						state.menuSubState = 'main';
						newGame();
						state.pendingBeginning = true;
						playBeginning();
					}
					break;
			}
		} else {
			switch (e.key) {
				case 'ArrowUp':    state.menuSelected = (state.menuSelected + 2) % 3; break;
				case 'ArrowDown':  state.menuSelected = (state.menuSelected + 1) % 3; break;
				case 'Enter':
					if (state.menuSelected === 2) {
						state.menuSubState = 'settings';
						state.settingsRow  = 0;
					} else if (state.menuSelected === 1) {
						state.menuSubState   = 'personality';
						state.personalityRow = 0;
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
		if (state.controlledGhostIdx >= 0) state.controlledGhostIdx = -1;
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
	// Manual mode: WASD steers selected ghost as player 2
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

// newGame is passed as a callback to avoid a circular import with game.js
export function initInput(newGame) {
	document.addEventListener('keydown', function(e) { keydown(e, newGame); });
}
