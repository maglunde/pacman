import React from 'react';
import { GameCanvas } from './components/GameCanvas.jsx';
import { OverlayUi } from './components/OverlayUi.jsx';
import { VersionBadge } from './components/VersionBadge.jsx';

export function App() {
	return (
		<div className="app-shell">
			<div className="game-scene">
				<GameCanvas />
				<OverlayUi />
				<VersionBadge />
			</div>
		</div>
	);
}
