import React from 'react';
import '../styles/CenterNotice.scss';

export function CenterNotice({ text, accent = 'warning' }) {
	return (
		<div className="overlay-screen overlay-screen--pointerless">
			<div className={`center-notice center-notice--${accent}`}>{text}</div>
		</div>
	);
}
