# Folio GL

A WebGL portfolio template inspired by the layout and interactions of
[jesperlandberg.com](https://jesperlandberg.com/): a carousel of project cards
bent onto the inside of a cylinder above an infinite grid floor, with a
velocity-driven bend, expanding project panels, a full index and a chrome-ring
profile view.

All content (names, copy and card artwork) is original placeholder material —
card images are drawn procedurally at runtime, so the repo ships no image assets.

## Run

```bash
npm install
npm run dev
```

## Customize

- **Content**: edit `src/data.js` (site name, bio, links, projects).
- **Card artwork**: each project has a `style` that picks a generator in
  `src/textures.js`. To use real screenshots instead, load images and pass them
  to `stage.setCards()` in place of the generated canvases.

## Structure

| File | What it does |
| --- | --- |
| `src/gl/stage.js` | Three.js scene: card carousel, grid floor, profile ring, scroll/drag, hit-testing |
| `src/gl/shaders.js` | Cylinder bend + rounded-corner card shaders, grid floor shader |
| `src/textures.js` | Procedural card and gallery artwork |
| `src/main.js` | Routing (`/`, `/full`, `/newsletter`, `/projects/:slug`), panels, loader |
| `src/style.css` | UI chrome, project panel, index, profile, newsletter |

## Deploy

`npm run build` outputs a static site to `dist/`. Routes use the History API, so
configure your host to serve `index.html` for unknown paths (SPA fallback).
