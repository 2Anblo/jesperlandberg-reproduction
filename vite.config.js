import { defineConfig } from 'vite'

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/jesperlandberg-reproduction/");
// locally the site is served from the root.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    // three.js alone is ~500 kB minified; no need to warn about it
    chunkSizeWarningLimit: 800,
  },
})
