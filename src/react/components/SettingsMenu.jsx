import React from 'react';
import { MAPS } from '../../game/constants.js';
import {
	adjustSetting,
	closeMenuSubPage,
	closeSettingsOverlay,
	cycleMap,
	focusSettingsRow,
	getVolumeShortcutLabel,
} from '../../game/menu.js';
import { MenuShell, ModalShell } from './MenuAnimation.jsx';
import { MenuButton } from './MenuButton.jsx';
import { SettingsRow } from './SettingsRow.jsx';
import '../styles/SettingsOverlay.scss';

export function SettingsMenu({ snapshot, menuMode = false }) {
	if (menuMode) {
		let activeRowCount = 4;
		return (
			<MenuShell testId="settings-menu">
				<div className="retro-title">SETTINGS</div>
				<div className="settings-list">
					<SettingsRow
						label="SPEED"
						value={`${trimNumber(snapshot.gameSpeed)}×`}
						shortcut="(, / .)"
						active={snapshot.settingsRow === 0}
						onHover={function() { focusSettingsRow(0); }}
						onPrev={function() { focusSettingsRow(0); adjustSetting(0, -1); }}
						onNext={function() { focusSettingsRow(0); adjustSetting(0, 1); }}
					/>
					<SettingsRow
						label="VOLUME"
						value={snapshot.muted ? 'MUTED' : `${Math.round(snapshot.volume * 100)}%`}
						shortcut={`(${getVolumeShortcutLabel()})`}
						active={snapshot.settingsRow === 1}
						onHover={function() { focusSettingsRow(1); }}
						onPrev={function() { focusSettingsRow(1); adjustSetting(1, -1); }}
						onNext={function() { focusSettingsRow(1); adjustSetting(1, 1); }}
					/>
					<SettingsRow
						label="STARTMAP"
						value={MAPS[snapshot.mapIdx].name}
						shortcut=""
						active={snapshot.settingsRow === 2}
						onHover={function() { focusSettingsRow(2); }}
						onPrev={function() { focusSettingsRow(2); cycleMap(-1); }}
						onNext={function() { focusSettingsRow(2); cycleMap(1); }}
					/>
				</div>
				<div className="menu-button-list">
					<MenuButton
						label="BACK"
						active={snapshot.settingsRow === activeRowCount - 1}
						onMouseEnter={function() { focusSettingsRow(activeRowCount - 1); }}
						onClick={closeMenuSubPage}
					/>
				</div>
			</MenuShell>
		);
	}

	return (
		<ModalShell testId="settings-modal">
			<div className="retro-panel retro-panel--modal">
				<div className="retro-title">SETTINGS</div>
				<div className="settings-list">
					<SettingsRow
						label="SPEED"
						value={`${trimNumber(snapshot.gameSpeed)}×`}
						shortcut="(, / .)"
						active={snapshot.settingsRow === 0}
						onHover={function() { focusSettingsRow(0); }}
						onPrev={function() { focusSettingsRow(0); adjustSetting(0, -1); }}
						onNext={function() { focusSettingsRow(0); adjustSetting(0, 1); }}
					/>
					<SettingsRow
						label="VOLUME"
						value={snapshot.muted ? 'MUTED' : `${Math.round(snapshot.volume * 100)}%`}
						shortcut={`(${getVolumeShortcutLabel()})`}
						active={snapshot.settingsRow === 1}
						onHover={function() { focusSettingsRow(1); }}
						onPrev={function() { focusSettingsRow(1); adjustSetting(1, -1); }}
						onNext={function() { focusSettingsRow(1); adjustSetting(1, 1); }}
					/>
				</div>
				<button type="button" className="panel-close" onClick={closeSettingsOverlay}>CLOSE</button>
			</div>
		</ModalShell>
	);
}

function trimNumber(value) {
	return value.toFixed(2).replace(/\.?0+$/, '');
}
