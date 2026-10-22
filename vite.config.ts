import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative asset paths, so the built app also works from a sub-folder (e.g. GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
});
