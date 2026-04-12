import React from 'react';
import { continuePausedGame, focusPauseOption, quitToMenu } from '../../game/menu.js';
import { ModalShell } from './MenuAnimation.jsx';
import { MenuButton } from './MenuButton.jsx';
import '../styles/PauseOverlay.scss';

export function PauseOverlay({ snapshot }) {
	return (
		<ModalShell panelWidth="18rem">
			<div className="retro-panel retro-panel--modal retro-panel--narrow">
				<div className="retro-title">PAUSE</div>
				<div className="menu-button-list">
					<MenuButton
						label="CONTINUE"
						active={snapshot.escapeMenuSelected === 0}
						onMouseEnter={function() { focusPauseOption(0); }}
						onClick={continuePausedGame}
					/>
					<MenuButton
						label="QUIT"
						active={snapshot.escapeMenuSelected === 1}
						onMouseEnter={function() { focusPauseOption(1); }}
						onClick={quitToMenu}
					/>
				</div>
			</div>
		</ModalShell>
	);
}
