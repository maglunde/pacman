import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	use: {
		baseURL: 'http://127.0.0.1:4173/pacman/',
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'npm run dev:test',
		url: 'http://127.0.0.1:4173/pacman/',
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
