import React from 'react';
import {
	focusMainMenuItem,
	openSettingsMenu,
	openPersonalityMenu,
	openLeaderboard,
	startManualGame,
} from '../../game/menu.js';
import { useFitScale } from '../hooks/useFitScale.js';
import { MenuAnimation, MenuGhostRoster, MenuHeader } from './MenuAnimation.jsx';
import { MenuButton } from './MenuButton.jsx';
import '../styles/MainMenuOverlay.scss';

export function MainMenuOverlay({ snapshot }) {
	if (!snapshot.engineReady) {
		return (
			<div className="overlay-screen">
				<div className="retro-panel retro-panel--menu retro-panel--main"></div>
			</div>
		);
	}

	let fit = useFitScale({ portraitMaxScale: 3 });

	return (
		<div className="overlay-screen overlay-screen--menu-main" data-testid="main-menu">
			<div className="menu-fit-frame" data-testid="main-menu-frame" ref={fit.frameRef}>
				<div
					className="retro-panel retro-panel--menu-shell"
					data-testid="main-menu-panel"
					ref={fit.contentRef}
					style={{ transform: `scale(${fit.scale})` }}
				>
					<MenuHeader />
					{snapshot.highScore > 0 ? <div className="retro-subtitle menu-high-score">HIGH-SCORE: {snapshot.highScore}</div> : null}
					<div className="menu-button-list">
						<MenuButton
							label="START GAME"
							testId="menu-start-game"
							active={snapshot.menuSelected === 0}
							onMouseEnter={function() { focusMainMenuItem(0); }}
							onClick={startManualGame}
						/>
						<MenuButton
							label="WATCH AI PLAY"
							testId="menu-watch-ai"
							active={snapshot.menuSelected === 1}
							onMouseEnter={function() { focusMainMenuItem(1); }}
							onClick={openPersonalityMenu}
						/>
						<MenuButton
							label="LEADERBOARD"
							testId="menu-leaderboard"
							active={snapshot.menuSelected === 2}
							onMouseEnter={function() { focusMainMenuItem(2); }}
							onClick={openLeaderboard}
						/>
						<MenuButton
							label="SETTINGS"
							testId="menu-settings"
							active={snapshot.menuSelected === 3}
							onMouseEnter={function() { focusMainMenuItem(3); }}
							onClick={openSettingsMenu}
						/>
					</div>
					{/*<div className="menu-divider"></div>*/}
					<MenuGhostRoster />
					<MenuAnimation frames={snapshot.frames} menuStartFrame={snapshot.menuStartFrame} isMsPacman={snapshot.mapIdx > 0} />
				</div>
			</div>
		</div>
	);
}
