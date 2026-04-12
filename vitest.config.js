import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	css: {
		preprocessorOptions: {
			scss: { api: 'modern-compiler' },
		},
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.js'],
		include: ['src/**/*.test.{js,jsx}'],
		clearMocks: true,
		restoreMocks: true,
	},
});
