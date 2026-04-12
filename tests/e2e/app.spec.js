import { expect, test } from '@playwright/test';

async function gotoApp(page) {
	await page.goto('?e2e=1');
	await expect(page.getByTestId('main-menu')).toBeVisible();
	await page.waitForFunction(function() {
		return Boolean(window.__PACMAN_TEST_API__);
	});
}

async function patchState(page, nextState) {
	await page.evaluate(function(statePatch) {
		window.__PACMAN_TEST_API__.patchState(statePatch);
	}, nextState);
}

test.describe('Pac-Man app', function() {
	test('covers every menu page from the main menu', async function({ page }) {
		await gotoApp(page);

		await page.evaluate(function() {
			window.__PACMAN_TEST_MOCKS__ = {
				fetchTopScores: function() {
					return Promise.resolve([
						{ display_name: 'PAC', score: 12000, level: 7 },
						{ display_name: 'MSP', score: 9500, level: 5 },
					]);
				},
			};
		});

		await page.getByTestId('menu-settings').click();
		await expect(page.getByTestId('settings-menu')).toBeVisible();
		await expect(page.getByText('STARTMAP')).toBeVisible();
		await page.getByRole('button', { name: 'BACK' }).click();

		await expect(page.getByTestId('main-menu')).toBeVisible();
		await page.getByTestId('menu-leaderboard').click();
		await expect(page.getByTestId('leaderboard-menu')).toBeVisible();
		await expect(page.getByRole('cell', { name: 'PAC' })).toBeVisible();
		await page.getByRole('button', { name: 'BACK' }).click();

		await expect(page.getByTestId('main-menu')).toBeVisible();
		await page.getByTestId('menu-watch-ai').click();
		await expect(page.getByTestId('personality-menu')).toBeVisible();
		await expect(page.getByText('CHOOSE AI STYLE')).toBeVisible();
		await page.getByRole('button', { name: 'BACK' }).click();

		await expect(page.getByTestId('main-menu')).toBeVisible();
	});

	test('covers gameplay flow, in-game overlays, win state and gameover submit', async function({ page }) {
		await gotoApp(page);

		await page.evaluate(function() {
			window.__PACMAN_TEST_MOCKS__ = {
				submitScore: function() {
					return Promise.resolve();
				},
			};
		});

		await page.getByTestId('menu-start-game').click();
		await page.waitForFunction(function() {
			return window.__PACMAN_TEST_API__.readState().gameState === 'ready';
		});

		await page.keyboard.press('ArrowRight');
		await page.waitForFunction(function() {
			return window.__PACMAN_TEST_API__.readState().gameState === 'playing';
		});

		await page.keyboard.press('KeyP');
		await expect(page.getByTestId('pause-modal')).toBeVisible();

		await page.keyboard.press('KeyO');
		await expect(page.getByTestId('settings-modal')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByTestId('settings-modal')).toBeHidden();

		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('Enter');
		await expect(page.getByTestId('main-menu')).toBeVisible();

		await page.getByTestId('menu-start-game').click();
		await page.waitForFunction(function() {
			return window.__PACMAN_TEST_API__.readState().gameState === 'ready';
		});

		await patchState(page, { gameState: 'win', level: 4, stateTimer: 999 });
		await expect(page.getByText('LEVEL 4 COMPLETE!')).toBeVisible();

		await patchState(page, {
			gameState: 'gameover',
			stateTimer: 0,
			score: 4321,
			level: 3,
			aiMode: false,
			username: '',
		});
		await expect(page.getByTestId('gameover-modal')).toBeVisible();
		await page.getByRole('textbox').fill('MAL');
		await page.getByRole('button', { name: 'SUBMIT' }).click();
		await expect(page.getByTestId('main-menu')).toBeVisible();
	});

	test('keeps the menu scaled inside a mobile viewport', async function({ page }) {
		await gotoApp(page);

		let panel = page.getByTestId('main-menu-panel');
		await expect(panel).toBeVisible();

		let viewport = page.viewportSize();
		let panelBox = await panel.boundingBox();
		expect(panelBox).not.toBeNull();
		expect(panelBox.width).toBeLessThanOrEqual(viewport.width);
		expect(panelBox.height).toBeLessThanOrEqual(viewport.height);

		let transform = await panel.evaluate(function(node) {
			return window.getComputedStyle(node).transform;
		});
		expect(transform).not.toBe('none');
	});
});
