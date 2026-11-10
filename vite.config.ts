/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { leaderboardApiPlugin } from './server/leaderboardApiPlugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), leaderboardApiPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
