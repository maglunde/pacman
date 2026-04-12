import React from 'react';
import { quitToMenu } from '../../game/menu.js';
import { MenuButton } from './MenuButton.jsx';
import '../styles/GameOverOverlay.scss';

export function GameOverOverlay({ snapshot }) {
	return (
		<div className="overlay-screen overlay-screen--dim">
			<div className="retro-panel retro-panel--modal">
				<div className="retro-score">SCORE: {snapshot.score}</div>
				{snapshot.stateTimer <= 0 ? (
					<MenuButton label="RETURN TO MENU" active={false} onClick={quitToMenu} />
				) : null}
			</div>
		</div>
	);
}
