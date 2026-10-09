import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const files = [
  'index.html',
  'style.css',
  'app.js',
  'audio.js',
  'panel-typewriter.js',
  'world.js',
  'architecture.js',
  'landmarks.js',
  'lane.js',
  'battle-simulation.js',
  'base-destruction.js',
  'meepo.js',
  'water.js',
  'waterfall.js',
  'sky-island.js',
  'assets',
  'vendor',
  'SOURCE-LICENSE.md',
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) {
  await cp(path.join(root, file), path.join(output, file), { recursive: true });
}
console.log('Static site ready in dist/ — no application server is needed in production.');
