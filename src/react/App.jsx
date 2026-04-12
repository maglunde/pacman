import React from 'react';
import { GameCanvas } from './components/GameCanvas.jsx';
import { OverlayUi } from './components/OverlayUi.jsx';

export function App() {
	return (
		<div className="app-shell">
			<div className="game-scene">
				<GameCanvas />
				<OverlayUi />
			</div>
		</div>
	);
}
