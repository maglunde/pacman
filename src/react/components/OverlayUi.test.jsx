import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockSnapshot = vi.fn();

vi.mock('../hooks/useGameSnapshot.js', function() {
	return {
		useGameSnapshot: function() {
			return mockSnapshot();
		},
	};
});

vi.mock('./CenterNotice.jsx', function() {
	return {
		CenterNotice: function({ text }) {
			return <div data-testid="center-notice">{text}</div>;
		},
	};
});

vi.mock('./GameOverOverlay.jsx', function() {
	return {
		GameOverOverlay: function() {
			return <div data-testid="gameover-overlay">GAMEOVER</div>;
		},
	};
});

vi.mock('./LeaderboardOverlay.jsx', function() {
	return {
		LeaderboardOverlay: function() {
			return <div data-testid="leaderboard-overlay">LEADERBOARD</div>;
		},
	};
});

vi.mock('./MainMenuOverlay.jsx', function() {
	return {
		MainMenuOverlay: function() {
			return <div data-testid="main-menu-overlay">MAIN MENU</div>;
		},
	};
});

vi.mock('./PauseOverlay.jsx', function() {
	return {
		PauseOverlay: function() {
			return <div data-testid="pause-overlay">PAUSE</div>;
		},
	};
});

vi.mock('./PersonalityMenu.jsx', function() {
	return {
		PersonalityMenu: function() {
			return <div data-testid="personality-overlay">PERSONALITY</div>;
		},
	};
});

vi.mock('./SettingToast.jsx', function() {
	return {
		SettingToast: function({ text }) {
			return <div data-testid="setting-toast">{text}</div>;
		},
	};
});

vi.mock('./SettingsMenu.jsx', function() {
	return {
		SettingsMenu: function({ menuMode = false }) {
			return <div data-testid={menuMode ? 'settings-menu-overlay' : 'settings-modal-overlay'}>SETTINGS</div>;
		},
	};
});

import { OverlayUi } from './OverlayUi.jsx';

function createSnapshot(overrides = {}) {
	return {
		gameState: 'menu',
		menuSubState: 'main',
		escapeMenuActive: false,
		settingsOverlayActive: false,
		level: 1,
		settingToast: { text: '', timer: 0 },
		...overrides,
	};
}

describe('OverlayUi', function() {
	beforeEach(function() {
		mockSnapshot.mockReset();
	});

	it('routes menu subpages to the correct overlay', function() {
		mockSnapshot.mockReturnValue(createSnapshot());
		render(<OverlayUi />);
		expect(screen.getByTestId('main-menu-overlay')).toBeInTheDocument();

		mockSnapshot.mockReturnValue(createSnapshot({ menuSubState: 'settings' }));
		render(<OverlayUi />);
		expect(screen.getAllByTestId('settings-menu-overlay')[0]).toBeInTheDocument();

		mockSnapshot.mockReturnValue(createSnapshot({ menuSubState: 'personality' }));
		render(<OverlayUi />);
		expect(screen.getAllByTestId('personality-overlay')[0]).toBeInTheDocument();

		mockSnapshot.mockReturnValue(createSnapshot({ menuSubState: 'leaderboard' }));
		render(<OverlayUi />);
		expect(screen.getAllByTestId('leaderboard-overlay')[0]).toBeInTheDocument();
	});

	it('renders in-game overlays and notices outside the menu', function() {
		mockSnapshot.mockReturnValue(createSnapshot({
			gameState: 'gameover',
			escapeMenuActive: true,
			settingsOverlayActive: true,
			settingToast: { text: '80%', timer: 30 },
		}));

		render(<OverlayUi />);

		expect(screen.getByTestId('pause-overlay')).toBeInTheDocument();
		expect(screen.getByTestId('settings-modal-overlay')).toBeInTheDocument();
		expect(screen.getByTestId('gameover-overlay')).toBeInTheDocument();
		expect(screen.getByTestId('setting-toast')).toHaveTextContent('80%');
	});

	it('renders the win notice with the current level', function() {
		mockSnapshot.mockReturnValue(createSnapshot({ gameState: 'win', level: 4 }));
		render(<OverlayUi />);
		expect(screen.getByTestId('center-notice')).toHaveTextContent('LEVEL 4 COMPLETE!');
	});
});
