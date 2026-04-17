import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT || '45173';
const PLAYWRIGHT_BASE_URL = `http://127.0.0.1:${PLAYWRIGHT_PORT}/pacman/`;

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	use: {
		baseURL: PLAYWRIGHT_BASE_URL,
		trace: 'on-first-retry',
	},
	webServer: {
		command: `npm run dev:test -- --port ${PLAYWRIGHT_PORT}`,
		url: PLAYWRIGHT_BASE_URL,
		reuseExistingServer: true,
		timeout: 120000,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'mobile-chrome',
			use: { ...devices['Pixel 5'] },
		},
	],
});
