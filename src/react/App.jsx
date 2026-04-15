import React, { useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas.jsx';
import { OverlayUi } from './components/OverlayUi.jsx';
import { VersionBadge } from './components/VersionBadge.jsx';
import { SpeedControls } from './components/SpeedControls.jsx';
import { pauseAudio } from '../game/audio.js';
import { state } from '../game/state.js';
import { readSnapshot } from './hooks/useGameSnapshot.js';
import { isPacmanTestMode } from '../lib/test-mode.js';

export function App() {
	useEffect(function() {
		history.pushState({ pacmanGame: true }, '');

		function onPopState() {
			history.pushState({ pacmanGame: true }, '');
			if (state.gameState !== 'menu') {
				state.paused              = true;
				state.backConfirmActive   = true;
				state.backConfirmSelected = 0;
				pauseAudio();
			}
		}

		window.addEventListener('popstate', onPopState);
		return function() { window.removeEventListener('popstate', onPopState); };
	}, []);

	useEffect(function() {
		if (!isPacmanTestMode()) return;

		window.__PACMAN_TEST_API__ = {
			readSnapshot,
			readState: function() {
				return {
					...readSnapshot(),
					engineStarted: state.engineStarted,
					canvasWidth: state.width,
					canvasHeight: state.height,
				};
			},
			patchState: function(nextState) {
				Object.assign(state, nextState);
			},
		};

		return function() {
			delete window.__PACMAN_TEST_API__;
		};
	}, []);

	return (
		<div className="app-shell" data-testid="app-shell">
			<SpeedControls />
			<div className="game-scene" data-testid="game-scene">
				<GameCanvas />
				<OverlayUi />
				<VersionBadge />
			</div>
		</div>
	);
}
