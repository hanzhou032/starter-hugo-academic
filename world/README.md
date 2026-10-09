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

Bio is at the Oxford-inspired Radiant base, featuring the Radcliffe Camera, Tom Tower, and a college arcade. Experience is at the Cambridge-inspired Dire base, featuring King's College Chapel and a Trinity-inspired gatehouse. Research is Mistral’s orange-to-red pixel M on the southeast Dire side. Publications is Google’s four-color G on the northwest Radiant side, extruded from the original site’s SVG artwork. Landmark labels, camera destinations, and minimap links follow this mapping. Oxford and Cambridge fly their own university crests on animated cloth flags. Keys 1–4 follow that order.

Opening the homepage animates the camera from the island overview into Bio, then displays the biography. Explicit `#world`, `#bio`, `#experience`, `#research`, and `#publications` links remain available; old `#about` and `#journey` links still work. Navigation can interrupt the entrance, and reduced-motion settings skip the camera animation. The architectural meshes are generated in `architecture.js` and batched by material.

## Meepo battle

Three original procedural Meepo models per faction follow the paved middle lane, meet on the bridge, strike with shovels, lose health, fall, and return in fresh waves. Select **Watch the battle**, press **B**, or open `#battle` for the close camera. The default homepage still flies into Bio.

`lane.js` supplies one arc-length centerline and bridge elevation for both scenery and movement. `battle-simulation.js` advances combat at a fixed 60 Hz independently of frame rate; `meepo.js` builds and animates the blue hoods, ears, leather packs and shovels. Reduced-motion mode presents a static battle tableau. The simulation stops advancing while the page is hidden.

Run `npm test` for path containment, elevation continuity, combat lifecycle and refresh-rate checks; run `npm run check` for syntax verification. `landmarks.js` builds the two logo-inspired monuments. University crest images in `assets` are copied from the original academic site's assets; the original checkout is untouched.

## Branding and mobile reading

The header and favicon reuse the bird icon from the original Hugo site (`assets/media/icon.png`, copied into `world/assets/site-logo.png`). Google’s source artwork is preserved in `assets/google.svg`; the four paths in `landmarks.js` reproduce it as a solid 3D monument.

On phones, Bio, Experience, Research, and Publications open in a large reading panel occupying the screen beneath the top navigation. The bottom destination dock is hidden while reading, and the close button stays available as content scrolls. Closing the panel restores the world controls.
