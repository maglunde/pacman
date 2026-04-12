import React from 'react';
import '../styles/MenuButton.scss';

export function MenuButton({ label, active, onMouseEnter, onClick }) {
	return (
		<button
			type="button"
			className={active ? 'menu-button menu-button--active' : 'menu-button'}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
		>
			{label}
		</button>
	);
}
