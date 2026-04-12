import { useEffect, useState } from 'react';
import { state } from '../../game/state.js';

export function useGameSnapshot() {
	let [snapshot, setSnapshot] = useState(readSnapshot);

	useEffect(function() {
		let frameId = 0;

		function loop() {
			setSnapshot(readSnapshot());
			frameId = window.requestAnimationFrame(loop);
		}

		loop();
		return function() {
			window.cancelAnimationFrame(frameId);
		};
	}, []);

	return snapshot;
}

export function readSnapshot() {
	return {
		gameState: state.gameState,
		engineReady: state.engineReady,
		frames: state.frames,
		menuStartFrame: state.menuStartFrame,
		menuSubState: state.menuSubState,
		menuSelected: state.menuSelected,
		settingsRow: state.settingsRow,
		personalityRow: state.personalityRow,
		aiPersonalityIdx: state.aiPersonalityIdx,
		aiMode: state.aiMode,
		mapIdx: state.mapIdx,
		highScore: state.highScore,
		score: state.score,
		level: state.level,
		username: state.username,
		stateTimer: state.stateTimer,
		escapeMenuActive: state.escapeMenuActive,
		escapeMenuSelected: state.escapeMenuSelected,
		settingsOverlayActive: state.settingsOverlayActive,
		gameSpeed: state.gameSpeed,
		volume: state.volume,
		muted: state.muted,
		settingToast: { text: state.settingToast.text, timer: state.settingToast.timer },
	};
}
