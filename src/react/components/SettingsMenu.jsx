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
import { SettingsRow } from './SettingsRow.jsx';
import '../styles/SettingsOverlay.scss';

export function SettingsMenu({ snapshot, menuMode = false }) {
	let activeRowCount = menuMode ? 4 : 2;
	let panelClassName = menuMode ? 'retro-panel retro-panel--menu' : 'retro-panel retro-panel--modal';
	let screenClassName = menuMode ? 'overlay-screen' : 'overlay-screen overlay-screen--dim';

	return (
		<div className={screenClassName}>
			<div className={panelClassName}>
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
					{menuMode ? (
						<SettingsRow
							label="MAP"
							value={MAPS[snapshot.mapIdx].name}
							shortcut=""
							active={snapshot.settingsRow === 2}
							onHover={function() { focusSettingsRow(2); }}
							onPrev={function() { focusSettingsRow(2); cycleMap(-1); }}
							onNext={function() { focusSettingsRow(2); cycleMap(1); }}
						/>
					) : null}
				</div>
				<div className="retro-hint">{menuMode ? '← → adjust • ↑ ↓ select • Enter/Esc back' : '↑ ↓ select • ← → adjust • O / Esc close'}</div>
				{menuMode ? (
					<button
						type="button"
						className="panel-close"
						data-active={snapshot.settingsRow === activeRowCount - 1}
						onMouseEnter={function() { focusSettingsRow(activeRowCount - 1); }}
						onClick={closeMenuSubPage}
					>
						BACK
					</button>
				) : (
					<button type="button" className="panel-close" onClick={closeSettingsOverlay}>CLOSE</button>
				)}
			</div>
		</div>
	);
}

function trimNumber(value) {
	return value.toFixed(2).replace(/\.?0+$/, '');
}
