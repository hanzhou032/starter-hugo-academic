# The Ancient of Ideas

The Dota-inspired 3D portfolio published at https://hzhou.top through this repository's existing Netlify connection.

## Development

Run `npm start` from this directory and open http://localhost:4173. No dependency installation is required. Edit `world.js` for the scene, `app.js` for content and interactions, and `assets/papers.json` for publications.

## Deployment

The root `netlify.toml` sets `world` as the base directory, `npm run build` as the command, and `dist` as the publish directory. Push changes to the connected production branch (`master`) to trigger a deploy. All JavaScript libraries, fonts, and assets are local; there are no runtime CDN dependencies or application servers.

`npm run build` copies the static website into `world/dist`. The original Hugo source remains in the repository root. The Git tag `before-3d-world-2026-10-09` preserves the previous production commit for rollback. Local uncommitted changes in other checkouts are not part of this deployment.

The original preview and browser verification scripts remain in `/Users/han.zhou/starter-hugo-academic-dota2`.

## Attribution

Original fan artwork inspired by Dota 2; not affiliated with Valve. Dota 2 belongs to Valve. Academic content belongs to Han Zhou; the source site license is in `SOURCE-LICENSE.md`. Third-party library and font licenses are in `vendor`.

## World destinations and entrance

Bio is at the Oxford-inspired Radiant base, featuring the Radcliffe Camera, Tom Tower, and a college arcade. Experience is at the Cambridge-inspired Dire base, featuring King's College Chapel and a Trinity-inspired gatehouse. Research and Publications occupy the other two landmarks. Keys 1–4 follow that order.

Opening the homepage animates the camera from the island overview into Bio, then displays the biography. Explicit `#world`, `#bio`, `#experience`, `#research`, and `#publications` links remain available; old `#about` and `#journey` links still work. Navigation can interrupt the entrance, and reduced-motion settings skip the camera animation. The architectural meshes are generated in `architecture.js` and batched by material.
