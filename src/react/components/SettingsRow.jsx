import React from 'react';
import '../styles/SettingsRow.scss';

export function SettingsRow({ label, value, shortcut, active, onHover, onPrev, onNext }) {
	return (
		<div className={active ? 'settings-row settings-row--active' : 'settings-row'} onMouseEnter={onHover}>
			<div className="settings-label">{label}</div>
			<div className="settings-control">
				<button type="button" className="selector-arrow" onClick={onPrev}>◄</button>
				<div className="settings-value">{value}</div>
				<button type="button" className="selector-arrow" onClick={onNext}>►</button>
			</div>
			<div className="settings-shortcut">{shortcut}</div>
		</div>
	);
}
