import React from 'react';
import { AI_PERSONALITIES, AI_PERSONALITY_KEYS } from '../../game/constants.js';
import {
	changeAiPersonality,
	closeMenuSubPage,
	focusPersonalityRow,
	startAiGame,
} from '../../game/menu.js';
import { MenuButton } from './MenuButton.jsx';
import '../styles/MainMenuOverlay.scss';

export function PersonalityMenu({ snapshot }) {
	let personalityKey = AI_PERSONALITY_KEYS[snapshot.aiPersonalityIdx];
	let personality = AI_PERSONALITIES[personalityKey];

	return (
		<div className="overlay-screen">
			<div className="retro-panel retro-panel--menu">
				<div className="retro-title">CHOOSE AI STYLE</div>
				<div
					className={snapshot.personalityRow === 0 ? 'selector-row selector-row--active' : 'selector-row'}
					onMouseEnter={function() { focusPersonalityRow(0); }}
				>
					<button type="button" className="selector-arrow" onClick={function() { changeAiPersonality(-1); }}>◄</button>
					<button type="button" className="selector-value" onClick={startAiGame}>{personality.label.toUpperCase()}</button>
					<button type="button" className="selector-arrow" onClick={function() { changeAiPersonality(1); }}>►</button>
				</div>
				<div className="retro-description">{getPersonalityDescription(personalityKey)}</div>
				<MenuButton
					label="BACK"
					active={snapshot.personalityRow === 1}
					onMouseEnter={function() { focusPersonalityRow(1); }}
					onClick={closeMenuSubPage}
				/>
			</div>
		</div>
	);
}

function getPersonalityDescription(personalityKey) {
	switch (personalityKey) {
		case 'coward': return 'Flees early, takes no risks';
		case 'balanced': return 'Balanced and efficient';
		case 'aggressive': return 'Actively hunts ghosts';
		default: return 'Maximizes score, takes risks';
	}
}
