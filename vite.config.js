import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /cotr-compendium/ — this must match your repo name exactly
  base: '/cotr-compendium/',
});
