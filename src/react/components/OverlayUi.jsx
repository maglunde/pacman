import React from 'react';
import { useGameSnapshot } from '../hooks/useGameSnapshot.js';
import { CenterNotice } from './CenterNotice.jsx';
import { GameOverOverlay } from './GameOverOverlay.jsx';
import { MainMenuOverlay } from './MainMenuOverlay.jsx';
import { PauseOverlay } from './PauseOverlay.jsx';
import { PersonalityMenu } from './PersonalityMenu.jsx';
import { SettingToast } from './SettingToast.jsx';
import { SettingsMenu } from './SettingsMenu.jsx';
import '../styles/OverlayUi.scss';

export function OverlayUi() {
	let snapshot = useGameSnapshot();

	return (
		<div className="overlay-ui">
			{snapshot.gameState === 'menu' ? renderMenuRoute(snapshot) : null}
			{snapshot.escapeMenuActive ? <PauseOverlay snapshot={snapshot} /> : null}
			{snapshot.settingsOverlayActive ? <SettingsMenu snapshot={snapshot} /> : null}
			{/*{snapshot.gameState === 'gameover' ? <GameOverOverlay snapshot={snapshot} /> : null}*/}
			{snapshot.gameState === 'win' ? <CenterNotice text={`LEVEL ${snapshot.level} COMPLETE!`} accent="success" /> : null}
			{snapshot.gameState !== 'menu' && snapshot.settingToast.timer > 0 ? <SettingToast text={snapshot.settingToast.text} /> : null}
		</div>
	);
}

function renderMenuRoute(snapshot) {
	if (snapshot.menuSubState === 'settings') return <SettingsMenu snapshot={snapshot} menuMode />;
	if (snapshot.menuSubState === 'personality') return <PersonalityMenu snapshot={snapshot} />;
	return <MainMenuOverlay snapshot={snapshot} />;
}
