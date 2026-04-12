import React from 'react';
import '../styles/MenuButton.scss';

export function MenuButton({ label, active, onMouseEnter, onClick, testId }) {
	return (
		<button
			type="button"
			data-testid={testId}
			className={active ? 'menu-button menu-button--active' : 'menu-button'}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
		>
			{label}
		</button>
	);
}
