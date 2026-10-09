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

Bio is at the Oxford-inspired Radiant base, featuring the Radcliffe Camera, Tom Tower, and a college arcade. Experience is at the Cambridge-inspired Dire base, featuring King's College Chapel and a Trinity-inspired gatehouse. Research is Mistral’s orange-to-red pixel M on the southeast Dire side. Publications is the original freestanding four-color Google G monument on the northwest Radiant side, on a tiered stone pedestal surrounded by journals. Landmark labels, camera destinations, and minimap links follow this mapping. Oxford and Cambridge fly their own university crests on animated cloth flags. Keys 1–4 follow that order.

Opening the homepage animates the camera from the island overview into Bio, then displays the biography. Explicit `#world`, `#bio`, `#experience`, `#research`, and `#publications` links remain available; old `#about` and `#journey` links still work. Navigation can interrupt the entrance, and reduced-motion settings skip the camera animation. The architectural meshes are generated in `architecture.js` and batched by material.

On the first opening of each panel per page load, `panel-typewriter.js` starts with blank text and a gold block cursor, then reveals headings, paragraphs, and link labels in reading order. CSS Highlight ranges hide untyped characters without changing the real text, accessible headings, or final wrapping. Images fade in alongside their text. The initial viewport gets a readable pace; the rest finishes within a few seconds. Reopening a visited panel is instant. Scrolling, clicking, keyboard focus, or navigation completes/cancels the reveal immediately so reading, selection, search, and filters remain responsive. Reduced-motion preferences and browsers without CSS Highlights show everything immediately. Publication data mounts before its first reveal, with navigation guards against late responses.

## Meepo battle

Three original procedural Meepo models per faction follow the paved middle lane, meet on the bridge, strike with shovels, lose health, fall, and return in fresh waves. Select **Watch the battle**, press **B**, or open `#battle` for the close camera. The default homepage still flies into Bio.

`lane.js` supplies one arc-length centerline and bridge elevation for both scenery and movement. `battle-simulation.js` advances combat at a fixed 60 Hz independently of frame rate; `meepo.js` builds and animates Radiant green and Dire red hoods, ears, leather packs and shovels. Reduced-motion mode presents a static battle tableau. The simulation stops advancing while the page is hidden.

Run `npm test` for path containment, elevation continuity, combat lifecycle and refresh-rate checks; run `npm run check` for syntax verification. `landmarks.js` builds the two logo-inspired monuments. University crest images in `assets` are copied from the original academic site's assets; the original checkout is untouched.

## Branding and mobile reading

The header and favicon reuse the bird icon from the original Hugo site (`assets/media/icon.png`, copied into `world/assets/site-logo.png`). The Research and Publications navigation buttons use their original academic icons (✧ and ▤), independently of the two company-inspired 3D monuments.

On phones, Bio, Experience, Research, and Publications open in a large reading panel occupying the screen beneath the top navigation. The bottom destination dock is hidden while reading, and the close button stays available as content scrolls. Closing the panel restores the world controls.

## Background, river, and teams

The original atmospheric teal background and distance fog are restored, with the original dusk/night color transition. The main scene renders before bloom and color output; the river also captures a small, cached reflection of the scene.

`water.js` measures flow distance along the river and samples the terrain for water depth. Five overlapping waves supply both displacement and analytic normals, with tiny ripples filtered out at distant views. Depth-dependent light absorption produces olive shallows and a deeper teal channel; subtle caustics, sunlight, broken shoreline foam, downstream support wakes, and an analytical bridge shadow finish the surface.

A camera mirrored across the water captures real reflections of trees, architecture, and lights into a small HDR texture. An oblique clipping plane removes underwater geometry; the shader softens and distorts the reflected image with the waves and increases its contribution at shallow viewing angles. Reflection resolution is capped at a 768-pixel longest edge on desktop and 384 on phones. Stationary views reuse captures between 30 Hz / 24 Hz updates; camera movement refreshes immediately, and the reflection reuses existing shadow maps. Reduced-motion mode freezes waves and refreshes the reflection only for camera or lighting changes. This is planar reflection and procedural shading, not a fluid simulation or ray-traced refraction.

Meepos wear green hoods for Radiant and red hoods for Dire, with matching lighter trim. They carry their shovels and use their free arms while marching and fighting. The Oxford and Cambridge bases retain their university flags. The fixed Oxford/Radiant and Cambridge/Dire screen labels have been removed; landmark labels still track the scene.

The Experience timeline includes all seven original organization logos: Mistral AI, Google DeepMind, Google Cloud AI Research, Google Research, Cambridge, UCL, and Oxford. The logos come from the original academic site and sit directly on the panel without white tiles or borders; Google Research uses the transparent original Google SVG.
