import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  build: {
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    // HMR websocket options are owned by @crxjs/vite-plugin under Vite 8
  },
});
