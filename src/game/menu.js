import { state } from './state.js';
import { SPEED_MIN, SPEED_MAX, MAPS, AI_PERSONALITY_KEYS } from './constants.js';
import { setMapSprite } from './sprite.js';
import { saveVolume, saveSpeed } from './hud.js';
import { playBeginning, stopAllAudio, updateLoopVolume, resumeAudio } from './audio.js';
import { newGame } from './game-states.js';

export function startManualGame() {
	if (!state.engineReady) return;
	state.aiMode = false;
	startMenuGame();
}

export function openPersonalityMenu() {
	state.menuSubState = 'personality';
	state.personalityRow = 0;
}

export function openSettingsMenu() {
	state.menuSubState = 'settings';
	state.settingsRow = 0;
}

export function closeMenuSubPage() {
	state.menuSubState = 'main';
	state.settingsRow = 0;
	state.personalityRow = 0;
}

export function startAiGame() {
	if (!state.engineReady) return;
	state.aiMode = true;
	state.menuSubState = 'main';
	startMenuGame();
}

export function changeAiPersonality(direction) {
	state.personalityRow = 0;
	state.aiPersonalityIdx = (state.aiPersonalityIdx + direction + AI_PERSONALITY_KEYS.length) % AI_PERSONALITY_KEYS.length;
}

export function focusMainMenuItem(index) {
	state.menuSelected = index;
}

export function focusSettingsRow(index) {
	state.settingsRow = index;
}

export function focusPersonalityRow(index) {
	state.personalityRow = index;
}

export function cycleMap(direction) {
	state.settingsRow = 2;
	state.mapIdx = (state.mapIdx + direction + MAPS.length) % MAPS.length;
	state.activeMap = MAPS[state.mapIdx];
	state.playerSpriteSheet = state.activeMap.spriteSheet;
	setMapSprite(state.activeMap);
}

export function closeSettingsOverlay() {
	state.settingsOverlayActive = false;
	state.paused = false;
	state.settingsRow = 0;
	resumeAudio();
}

export function continuePausedGame() {
	state.escapeMenuActive = false;
	state.paused = false;
	resumeAudio();
}

export function focusPauseOption(index) {
	state.escapeMenuSelected = index;
}

export function quitToMenu() {
	stopAllAudio();
	state.escapeMenuActive = false;
	state.settingsOverlayActive = false;
	state.paused = false;
	newGame();
	state.gameState = 'menu';
	state.menuSubState = 'main';
	state.settingsRow = 0;
	state.personalityRow = 0;
	state.menuStartFrame = state.frames;
}

export function adjustSetting(row, d) {
	if (row === 0) {
		state.gameSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round((state.gameSpeed + d * 0.25) * 100) / 100));
		saveSpeed();
		if (!state.settingsOverlayActive) state.settingToast = { text: state.gameSpeed.toFixed(2).replace(/\.?0+$/, '') + '\u00D7', timer: 60 };
	} else if (row === 1) {
		state.muted = false;
		state.volume = Math.max(0, Math.min(1, Math.round((state.volume + d * 0.1) * 10) / 10));
		saveVolume();
		updateLoopVolume();
		if (!state.settingsOverlayActive) state.settingToast = { text: Math.round(state.volume * 100) + '%', timer: 60 };
	}
}

export function getVolumeShortcutLabel() {
	let language = navigator.language || '';
	return language.startsWith('nb') || language.startsWith('nn') || language.startsWith('no') ? '+ / \u00B4' : '- / =';
}

function startMenuGame() {
	newGame();
	state.pendingBeginning = true;
	playBeginning();
}
