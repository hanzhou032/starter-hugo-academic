import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

const cube = new THREE.BoxGeometry(1, 1, 1);
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .48, ...extra });
const ivory = material(0xc1c2b0), basalt = material(0x303d46), brass = material(0xbda879, { metalness: .7 });
function mesh(g, geometry, m, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, m); object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true; g.add(object); return object;
}
function box(g, x, y, z, w, h, d, m) { const o = mesh(g, cube, m, x, y, z); o.scale.set(w, h, d); return o; }
function cylinder(g, y, r, h, m, r2 = r) { return mesh(g, new THREE.CylinderGeometry(r, r2, h, 48), m, 0, y); }
export function bakeStatic(g) {
  g.updateMatrixWorld(true); const inverse = g.matrixWorld.clone().invert(), batches = new Map(), originals = [];
  g.traverse(o => { if (!o.isMesh) return; const key = o.material; if (!batches.has(key)) batches.set(key, []);
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    batches.get(key).push(geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld))); originals.push(o); });
  for (const o of originals) o.removeFromParent();
  for (const [m, geometries] of batches) { mesh(g, mergeGeometries(geometries), m); geometries.forEach(geo => geo.dispose()); }
}

// Exact four-color paths from the original academic site's Google asset.
// Keep the reference SVG in assets/google.svg; these outlines are extruded into solid meshes.
const googlePaths = [
  { color: 0x4285F4, path: 'M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z' },
  { color: 0x34A853, path: 'M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z' },
  { color: 0xFBBC05, path: 'M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z' },
  { color: 0xEA4335, path: 'M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z' }
];
function googleShape(path) {
  const tokens = path.match(/[MLCZ]|-?\d+(?:\.\d+)?/g), shape = new THREE.Shape();
  let i = 0;
  const x = () => (Number(tokens[i++]) + 14.754) / 5.3;
  const y = () => (51.239 - Number(tokens[i++])) / 5.3;
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === 'M') shape.moveTo(x(), y());
    else if (command === 'L') shape.lineTo(x(), y());
    else if (command === 'C') shape.bezierCurveTo(x(), y(), x(), y(), x(), y());
    else if (command === 'Z') shape.closePath();
  }
  return shape;
}
export function buildGoogle(g, { animations, point }) {
  g.name = 'google-publications';
  g.userData.logoSource = 'assets/google.svg';
  const pedestal = new THREE.Group(); g.add(pedestal);
  cylinder(pedestal, .16, 3.05, .32, basalt, 3.2);
  cylinder(pedestal, .38, 2.8, .14, brass);
  cylinder(pedestal, .55, 2.62, .24, ivory);
  cylinder(pedestal, .7, 2.18, .08, basalt);
  const colors = googlePaths.map(({ color }) => material(color, { roughness: .56, metalness: .12, emissive: color, emissiveIntensity: .1 }));
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    const bar = box(pedestal, Math.cos(a) * 2.46, .69, Math.sin(a) * 2.46, .07, .035, .22, colors[Math.floor(i / 6)]); bar.rotation.y = -a;
  }
  const monument = new THREE.Group(); monument.name = 'google-g-monument';
  monument.position.y = 3.48; monument.rotation.set(-.08, .58, 0); pedestal.add(monument);
  googlePaths.forEach(({ path }, i) => {
    // The source SVG deliberately overlaps its color panels. Preserve its paint
    // order with a tiny depth offset so their faces never flicker against each other.
    mesh(monument, new THREE.ExtrudeGeometry(googleShape(path), {
      depth: .72, bevelEnabled: false, curveSegments: 32,
    }), colors[i], 0, 0, -.36 + i * .004);
  });
  for (const x of [-1.45, 1.45]) {
    const support = box(pedestal, x * .84, 1.32, -.18, .23, 1.25, .6, ivory); support.rotation.z = x > 0 ? -.25 : .25;
    box(pedestal, x * .76, .84, -.18, .7, .2, .92, brass);
  }
  // Small stacks of journals surround the publication monument.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const book = box(pedestal, side * 1.78, .81 + i * .14, 1.03, .84, .11, .57, i === 1 ? colors[side < 0 ? 0 : 1] : ivory);
    book.rotation.y = side * .13 * (i - 1);
  }
  bakeStatic(pedestal);
  const orbit = new THREE.Group(); g.add(orbit);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    mesh(orbit, new THREE.IcosahedronGeometry(.065, 0), colors[i], Math.cos(a) * 2.88, .58, Math.sin(a) * 2.88);
  }
  animations.push(t => { orbit.rotation.y = t * .1; });
  point(g, 0, 2.8, 1.4, 0xd1e3ff, 4, 8);
}

export function buildMistral(g, { animations, point }) {
  g.name = 'mistral-research';
  const structure = new THREE.Group(); structure.rotation.y = .58; g.add(structure);
  const reds = [0xffb900, 0xff970b, 0xff7411, 0xf84916, 0xd72925].map(color => material(color, { roughness: .7, metalness: .08, emissive: color, emissiveIntensity: .16 }));
  const shadow = material(0x4b2628);
  box(structure, 0, .2, 0, 5.8, .4, 3.7, basalt);
  box(structure, 0, .45, 0, 5.35, .12, 3.25, brass);
  box(structure, 0, .63, 0, 4.9, .25, 2.9, ivory);
  box(structure, 0, .8, 0, 4.55, .1, 2.55, basalt);
  for (let i = 0; i < 4; i++) box(structure, 0, .1 + i * .12, 2.8 - i * .29, 2.45, .2, .6, ivory);
  const rows = ['0100010', '0110110', '0111110', '0101010', '1101011'];
  const pixelShape = new THREE.Shape(); pixelShape.moveTo(-.325, -.325); pixelShape.lineTo(.325, -.325); pixelShape.lineTo(.325, .325); pixelShape.lineTo(-.325, .325); pixelShape.closePath();
  const pixel = new THREE.ExtrudeGeometry(pixelShape, { depth: 1.02, bevelEnabled: true, bevelThickness: .018, bevelSize: .012, bevelSegments: 1 });
  rows.forEach((row, y) => [...row].forEach((filled, x) => {
    if (filled === '0') return;
    const xx = (x - 3) * .69, yy = 1.34 + (4 - y) * .69;
    box(structure, xx - .11, yy - .12, -.22, .69, .69, 1.21, shadow);
    mesh(structure, pixel, reds[y], xx, yy, -.51);
  }));
  // A low library podium and layered volumes keep the pixel monument rooted in the world.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const book = box(structure, side * 2.12, .94 + i * .13, .84, .77, .11, .55, i % 2 ? brass : shadow); book.rotation.y = side * .09 * (i - 2);
  }
  for (const x of [-1.8, -.9, 0, .9, 1.8]) box(structure, x, .89, 1.21, .4, .025, .07, reds[1]);
  bakeStatic(structure);
  const motes = [];
  for (let i = 0; i < 8; i++) {
    const p = mesh(g, new THREE.BoxGeometry(.11, .11, .11), reds[i % 5]);
    const a = i * Math.PI / 4; motes.push({ p, a });
  }
  animations.push(t => motes.forEach(({ p, a }, i) => { p.position.set(Math.cos(a + t * .12) * 2.6, 1.4 + ((t * .25 + i * .5) % 3.1), Math.sin(a + t * .12) * 1.6); p.rotation.set(t * .2, t * .3, 0); }));
  point(g, 0, 3.2, 1.4, 0xff681a, 10, 9);
}
