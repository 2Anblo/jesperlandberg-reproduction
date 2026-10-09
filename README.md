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

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages at `https://<user>.github.io/<repo>/`.

One-time setup: in the repo go to **Settings → Pages** and set **Source** to
**GitHub Actions**.

How it handles a project-site sub-path:

- the workflow sets `BASE_PATH=/<repo>/`, which `vite.config.js` uses as `base`;
  routes and links in `src/main.js` add/strip that prefix automatically
- Pages has no SPA fallback, so the workflow copies `index.html` to `404.html`
  and deep links such as `/projects/<slug>` still load the app

For any other static host, `npm run build` outputs to `dist/`; configure the host
to serve `index.html` for unknown paths. Set `BASE_PATH` if it is not served
from the domain root.
