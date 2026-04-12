import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./audio.js', function() {
	return {
		playBeginning: vi.fn(),
		stopAllAudio: vi.fn(),
		updateLoopVolume: vi.fn(),
		resumeAudio: vi.fn(),
	};
});

vi.mock('./game-states.js', function() {
	return {
		newGame: vi.fn(),
	};
});

vi.mock('./hud.js', function() {
	return {
		saveVolume: vi.fn(),
		saveSpeed: vi.fn(),
	};
});

vi.mock('./sprite.js', function() {
	return {
		setMapSprite: vi.fn(),
	};
});

import { MAPS, SPEED_MAX, SPEED_MIN } from './constants.js';
import {
	adjustSetting,
	changeAiPersonality,
	cycleMap,
	getVolumeShortcutLabel,
	quitToMenu,
	startAiGame,
	startManualGame,
} from './menu.js';
import { state } from './state.js';
import { resetState } from '../test/reset-state.js';
import { newGame } from './game-states.js';
import { playBeginning, resumeAudio, stopAllAudio, updateLoopVolume } from './audio.js';
import { saveSpeed, saveVolume } from './hud.js';
import { setMapSprite } from './sprite.js';

describe('menu actions', function() {
	beforeEach(function() {
		resetState();
		vi.clearAllMocks();
	});

	it('adjusts speed within bounds and shows a toast in menu mode', function() {
		state.gameSpeed = 1;
		adjustSetting(0, 1);
		expect(state.gameSpeed).toBe(1.25);
		expect(state.settingToast).toEqual({ text: '1.25×', timer: 60 });
		expect(saveSpeed).toHaveBeenCalledTimes(1);

		state.gameSpeed = SPEED_MIN;
		adjustSetting(0, -1);
		expect(state.gameSpeed).toBe(SPEED_MIN);

		state.gameSpeed = SPEED_MAX;
		adjustSetting(0, 1);
		expect(state.gameSpeed).toBe(SPEED_MAX);
	});

	it('adjusts volume, unmutes, persists and updates loop volume', function() {
		state.muted = true;
		state.volume = 0.5;
		adjustSetting(1, -1);

		expect(state.muted).toBe(false);
		expect(state.volume).toBe(0.4);
		expect(state.settingToast).toEqual({ text: '40%', timer: 60 });
		expect(saveVolume).toHaveBeenCalledTimes(1);
		expect(updateLoopVolume).toHaveBeenCalledTimes(1);
	});

	it('cycles maps and updates the active sprite sheet', function() {
		state.mapIdx = 0;
		cycleMap(1);

		expect(state.mapIdx).toBe(1);
		expect(state.activeMap).toBe(MAPS[1]);
		expect(state.playerSpriteSheet).toBe(MAPS[1].spriteSheet);
		expect(setMapSprite).toHaveBeenCalledWith(MAPS[1]);
	});

	it('wraps AI personality selection in both directions', function() {
		state.aiPersonalityIdx = 0;
		changeAiPersonality(-1);
		expect(state.aiPersonalityIdx).toBe(3);

		changeAiPersonality(1);
		expect(state.aiPersonalityIdx).toBe(0);
	});

	it('starts manual and AI games only when the engine is ready', function() {
		state.engineReady = false;
		startManualGame();
		startAiGame();

		expect(newGame).not.toHaveBeenCalled();
		expect(playBeginning).not.toHaveBeenCalled();

		state.engineReady = true;
		startManualGame();
		expect(state.aiMode).toBe(false);
		expect(newGame).toHaveBeenCalledTimes(1);
		expect(playBeginning).toHaveBeenCalledTimes(1);

		startAiGame();
		expect(state.aiMode).toBe(true);
		expect(newGame).toHaveBeenCalledTimes(2);
		expect(playBeginning).toHaveBeenCalledTimes(2);
	});

	it('quits to menu and resets modal state', function() {
		state.escapeMenuActive = true;
		state.settingsOverlayActive = true;
		state.paused = true;
		state.menuSubState = 'leaderboard';
		state.settingsRow = 2;
		state.personalityRow = 1;
		state.frames = 42;

		quitToMenu();

		expect(stopAllAudio).toHaveBeenCalledTimes(1);
		expect(newGame).toHaveBeenCalledTimes(1);
		expect(state.gameState).toBe('menu');
		expect(state.menuSubState).toBe('main');
		expect(state.settingsRow).toBe(0);
		expect(state.personalityRow).toBe(0);
		expect(state.menuStartFrame).toBe(42);
	});

	it('uses norwegian volume shortcuts for norwegian locales', function() {
		vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('nb-NO');
		expect(getVolumeShortcutLabel()).toBe('+ / ´');
	});

	it('resumes audio when the settings overlay closes indirectly through quit flow', function() {
		quitToMenu();
		expect(resumeAudio).not.toHaveBeenCalled();
	});
});
