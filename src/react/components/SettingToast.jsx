import React from 'react';
import '../styles/SettingToast.scss';

export function SettingToast({ text }) {
	return (
		<div className="overlay-screen overlay-screen--pointerless">
			<div className="setting-toast">{text}</div>
		</div>
	);
}
