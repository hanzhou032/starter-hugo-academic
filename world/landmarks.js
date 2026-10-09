import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

const cube = new THREE.BoxGeometry(1, 1, 1);
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .48, ...extra });
const ivory = material(0xc1c2b0), basalt = material(0x303d46), brass = material(0xbda879, { metalness: .7 });
const azure = material(0x397cef, { metalness: .35, emissive: 0x195be8, emissiveIntensity: .42 });
const cyan = material(0x90d7ff, { emissive: 0x409dff, emissiveIntensity: 1.8 });
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

export function buildDeepMind(g, { animations, point }) {
  g.name = 'deepmind-research';
  const pedestal = new THREE.Group(); g.add(pedestal);
  cylinder(pedestal, .16, 3.05, .32, basalt, 3.2);
  cylinder(pedestal, .38, 2.8, .14, brass);
  cylinder(pedestal, .55, 2.62, .24, ivory);
  cylinder(pedestal, .7, 2.18, .08, basalt);
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    const bar = box(pedestal, Math.cos(a) * 2.46, .69, Math.sin(a) * 2.46, .07, .035, .22, cyan); bar.rotation.y = -a;
  }
  const monument = new THREE.Group(); monument.position.y = 3.66; monument.rotation.set(-.13, .58, 0); pedestal.add(monument);
  // Two broad, curled blue vanes form an open-center DeepMind-inspired vortex.
  for (let blade = 0; blade < 2; blade++) {
    const outer = [], inner = [];
    for (let i = 0; i <= 90; i++) {
      const u = i / 90, a = -.9 + u * Math.PI * 1.57 + blade * Math.PI;
      const r = 2.32 - 1.04 * u;
      const w = Math.pow(Math.sin(Math.PI * u), .7) * 1.17;
      outer.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
      inner.push(new THREE.Vector2(Math.cos(a) * (r - w), Math.sin(a) * (r - w)));
    }
    const shape = new THREE.Shape([...outer, ...inner.reverse()]); shape.closePath();
    const vane = mesh(monument, new THREE.ExtrudeGeometry(shape, { depth: .56, bevelEnabled: true, bevelThickness: .035, bevelSize: .035, bevelSegments: 2, steps: 1 }), azure);
    vane.position.z = -.28;
  }
  const halo = mesh(monument, new THREE.TorusGeometry(2.61, .028, 6, 96), brass);
  for (const x of [-1.66, 1.66]) {
    const p = box(pedestal, x * .83, 1.54, 0, .23, 1.86, .52, ivory); p.rotation.z = x > 0 ? -.32 : .32;
    box(pedestal, x * .69, .9, 0, .68, .2, .82, brass);
  }
  bakeStatic(pedestal);
  const core = mesh(g, new THREE.IcosahedronGeometry(.3, 1), cyan, 0, 3.66, 0);
  const satellites = new THREE.Group(); satellites.position.y = 3.66; satellites.rotation.set(-.13, .58, 0); g.add(satellites);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    mesh(satellites, new THREE.IcosahedronGeometry(.09, 0), cyan, Math.cos(a) * 2.61, Math.sin(a) * 2.61, 0);
  }
  point(g, 0, 3.7, 1, 0x347afa, 26, 9);
  animations.push(t => { core.rotation.set(t * .3, t * .4, 0); core.scale.setScalar(1 + Math.sin(t * 1.7) * .08); satellites.rotation.z = t * .14; });
}

export function buildMistral(g, { animations, point }) {
  g.name = 'mistral-publications';
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
