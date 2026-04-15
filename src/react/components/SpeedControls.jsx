import React from 'react';
import { adjustSetting } from '../../game/menu.js';
import { useGameSnapshot } from '../hooks/useGameSnapshot.js';
import '../styles/SpeedControls.scss';

export function SpeedControls() {
	let snapshot = useGameSnapshot();
	let visible = snapshot.gameState === 'playing' && !snapshot.escapeMenuActive && !snapshot.settingsOverlayActive;
	let value = trimNumber(snapshot.gameSpeed);
	return (
		<div className="speed-controls" style={{ visibility: visible ? 'visible' : 'hidden' }}>
			<button className="speed-btn" onClick={function() { adjustSetting(0, -1); }}>◄</button>
			<span className="speed-label">SPEED {value}×</span>
			<button className="speed-btn" onClick={function() { adjustSetting(0, 1); }}>►</button>
		</div>
	);
}

function trimNumber(v) {
	return v.toFixed(2).replace(/\.?0+$/, '');
}
