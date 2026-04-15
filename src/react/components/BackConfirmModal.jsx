import React from 'react';
import { resumeAudio } from '../../game/audio.js';
import { quitToMenu } from '../../game/menu.js';
import { state } from '../../game/state.js';
import { ModalShell } from './MenuAnimation.jsx';
import { MenuButton } from './MenuButton.jsx';

export function BackConfirmModal({ snapshot }) {
	function handleContinue() {
		state.backConfirmActive = false;
		state.paused = false;
		resumeAudio();
	}

	function handleQuit() {
		state.backConfirmActive = false;
		quitToMenu();
	}

	return (
		<ModalShell panelWidth="18rem" testId="back-confirm-modal">
			<div className="retro-panel retro-panel--modal retro-panel--narrow">
				<div className="retro-title">QUIT?</div>
				<div className="menu-button-list">
					<MenuButton
						label="CONTINUE"
						active={snapshot.backConfirmSelected === 0}
						onMouseEnter={function() { state.backConfirmSelected = 0; }}
						onClick={handleContinue}
					/>
					<MenuButton
						label="QUIT TO MENU"
						active={snapshot.backConfirmSelected === 1}
						onMouseEnter={function() { state.backConfirmSelected = 1; }}
						onClick={handleQuit}
					/>
				</div>
			</div>
		</ModalShell>
	);
}
