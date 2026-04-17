import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MainMenuOverlay } from './MainMenuOverlay.jsx';

vi.mock('../../game/menu.js', function() {
	return {
		focusMainMenuItem: vi.fn(),
		openSettingsMenu: vi.fn(),
		openPersonalityMenu: vi.fn(),
		openLeaderboard: vi.fn(),
		startManualGame: vi.fn(),
	};
});

vi.mock('../hooks/useFitScale.js', function() {
	return {
		useFitScale: function() {
			return {
				frameRef: { current: null },
				contentRef: { current: null },
				scale: 1,
			};
		},
	};
});

vi.mock('./MenuAnimation.jsx', function() {
	return {
		MenuAnimation: function() {
			return <div data-testid="menu-animation" />;
		},
		MenuGhostRoster: function() {
			return <div data-testid="menu-ghost-roster" />;
		},
		MenuHeader: function() {
			return <div data-testid="menu-header" />;
		},
	};
});

vi.mock('./MenuButton.jsx', function() {
	return {
		MenuButton: function({ label, testId }) {
			return <button data-testid={testId}>{label}</button>;
		},
	};
});

function createSnapshot(overrides = {}) {
	return {
		engineReady: true,
		frames: 0,
		menuStartFrame: 0,
		highScore: 0,
		menuSelected: 0,
		mapIdx: 0,
		...overrides,
	};
}

describe('MainMenuOverlay', function() {
	it('renders the menu after the engine becomes ready', function() {
		let { rerender } = render(<MainMenuOverlay snapshot={createSnapshot({ engineReady: false })} />);

		expect(screen.queryByTestId('main-menu')).not.toBeInTheDocument();

		rerender(<MainMenuOverlay snapshot={createSnapshot({ engineReady: true })} />);

		expect(screen.getByTestId('main-menu')).toBeInTheDocument();
		expect(screen.getByTestId('menu-start-game')).toBeInTheDocument();
	});
});
