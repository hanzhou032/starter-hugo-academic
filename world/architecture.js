import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

// Hand-built architectural miniatures, with real silhouettes and restrained faction accents.
const cube = new THREE.BoxGeometry(1, 1, 1);
const materials = {
  limestone: new THREE.MeshStandardMaterial({ color: 0xc5b58e, roughness: .88 }),
  dressings: new THREE.MeshStandardMaterial({ color: 0xe4d4ad, roughness: .83 }),
  chapel: new THREE.MeshStandardMaterial({ color: 0xb5a487, roughness: .9 }),
  weathered: new THREE.MeshStandardMaterial({ color: 0x97876b, roughness: 1 }),
  slate: new THREE.MeshStandardMaterial({ color: 0x4c5f60, roughness: .66, metalness: .25 }),
  lead: new THREE.MeshStandardMaterial({ color: 0x85958e, roughness: .61, metalness: .35 }),
  shadow: new THREE.MeshStandardMaterial({ color: 0x172b2a, roughness: .65 }),
  brick: new THREE.MeshStandardMaterial({ color: 0x9b7960, roughness: .96 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc8af69, roughness: .38, metalness: .7 }),
  greenGlass: new THREE.MeshStandardMaterial({ color: 0x50796c, emissive: 0x4a9a7c, emissiveIntensity: .35, roughness: .3, metalness: .2 }),
  amberGlass: new THREE.MeshStandardMaterial({ color: 0xb88756, emissive: 0xdb7335, emissiveIntensity: .58, roughness: .35, metalness: .15 }),
  hedges: new THREE.MeshStandardMaterial({ color: 0x496947, roughness: 1, flatShading: true }),
  paving: new THREE.MeshStandardMaterial({ color: 0x8b927b, roughness: 1 }),
};

function mesh(parent, geometry, material) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(parent, x, y, z, width, height, depth, material) {
  const object = mesh(parent, cube, material);
  object.position.set(x, y, z);
  object.scale.set(width, height, depth);
  return object;
}
function cylinder(parent, x, y, z, top, bottom, height, material, segments = 24) {
  const object = mesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments), material);
  object.position.set(x, y, z);
  return object;
}
function group(parent, x = 0, y = 0, z = 0, angle = 0) {
  const object = new THREE.Group();
  object.position.set(x, y, z);
  object.rotation.y = angle;
  parent.add(object);
  return object;
}
function tube(parent, points, radius, material) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 16, radius, 5, false), material);
}
function archShape(width, height, pointed = false) {
  const shape = new THREE.Shape();
  const r = width / 2;
  shape.moveTo(-r, 0);
  shape.lineTo(r, 0);
  if (pointed) {
    shape.lineTo(r, height * .68);
    shape.quadraticCurveTo(r * .88, height * .88, 0, height);
    shape.quadraticCurveTo(-r * .88, height * .88, -r, height * .68);
  } else {
    shape.lineTo(r, height - r);
    shape.absarc(0, height - r, r, 0, Math.PI, false);
  }
  shape.lineTo(-r, 0);
  return shape;
}
function arch(parent, x, y, z, width, height, material, angle = 0, pointed = false) {
  const object = mesh(parent, new THREE.ExtrudeGeometry(archShape(width, height, pointed), { depth: .035, bevelEnabled: false, curveSegments: 12 }), material);
  object.position.set(x, y, z);
  object.rotation.y = angle;
  return object;
}
function window(parent, x, y, z, width, height, angle, gothic = false, glass = materials.greenGlass) {
  const frame = group(parent, x, y, z, angle);
  arch(frame, 0, 0, 0, width + .16, height + .12, materials.dressings, 0, gothic);
  arch(frame, 0, .065, .045, width, height, glass, 0, gothic);
  box(frame, 0, -.015, .09, width + .26, .11, .17, materials.dressings);
  const mullions = gothic ? 3 : 1;
  for (let i = 0; i < mullions; i++) {
    const xx = mullions === 1 ? 0 : (i - 1) * width * .25;
    box(frame, xx, height * .43, .105, .035, height * .76, .025, materials.dressings);
  }
  box(frame, 0, height * .45, .106, width, .035, .027, materials.dressings);
  if (gothic) {
    box(frame, 0, height * .67, .106, width * .92, .038, .027, materials.dressings);
    for (const xx of [-width * .22, width * .22]) {
      const tracery = mesh(frame, new THREE.TorusGeometry(width * .17, .022, 5, 16), materials.dressings);
      tracery.position.set(xx, height * .79, .12);
      tracery.scale.y = 1.35;
    }
  }
  return frame;
}
function pitchedRoof(parent, x, y, z, width, length, rise, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const roof = mesh(parent, new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false }), material);
  roof.position.set(x, y, z - length / 2);
  return roof;
}
function pinnacle(parent, x, y, z, scale = 1) {
  cylinder(parent, x, y + scale * .16, z, .12 * scale, .16 * scale, .32 * scale, materials.dressings, 8);
  cylinder(parent, x, y + scale * .62, z, 0, .17 * scale, .6 * scale, materials.dressings, 4).rotation.y = Math.PI / 4;
  cylinder(parent, x, y + scale * .96, z, .018, .03, .16 * scale, materials.gold, 5);
}

// Merge the static masonry by material before placing effects and animated banners.
function bake(building) {
  building.updateMatrixWorld(true);
  const inverse = building.matrixWorld.clone().invert();
  const batches = new Map();
  building.traverse(object => {
    if (!object.isMesh) return;
    const key = object.material.uuid;
    if (!batches.has(key)) batches.set(key, { material: object.material, geometries: [] });
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    batches.get(key).geometries.push(geometry);
  });
  building.clear();
  for (const { material, geometries } of batches.values()) {
    mesh(building, mergeGeometries(geometries), material);
    for (const geometry of geometries) geometry.dispose();
  }
}

function tomTower(parent, x, z) {
  const tower = group(parent, x, .4, z);
  box(tower, 0, 1.35, 0, 1.6, 2.7, 1.5, materials.limestone);
  for (const yy of [.25, 1.7, 2.75]) box(tower, 0, yy, 0, 1.75, .13, 1.66, materials.dressings);
  arch(tower, 0, .03, .76, .88, 1.36, materials.shadow, 0, true);
  arch(tower, 0, .13, .80, .68, 1.1, materials.weathered, 0, true);
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const face = group(tower, Math.sin(angle) * .81, 2.17, Math.cos(angle) * .81, angle);
    const dial = mesh(face, new THREE.CircleGeometry(.24, 24), materials.shadow);
    dial.position.z = .03;
    const bezel = mesh(face, new THREE.TorusGeometry(.25, .025, 5, 24), materials.gold);
    bezel.position.z = .045;
    const hour = box(face, -.035, .045, .065, .022, .17, .025, materials.gold);
    hour.rotation.z = .55;
    const minute = box(face, .05, .055, .067, .018, .21, .025, materials.gold);
    minute.rotation.z = -.7;
  }
  cylinder(tower, 0, 3.28, 0, .72, .72, 1.05, materials.limestone, 8);
  cylinder(tower, 0, 3.85, 0, .81, .78, .15, materials.dressings, 8);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    window(tower, Math.sin(a) * .685, 2.91, Math.cos(a) * .685, .28, .67, a);
  }
  const profile = [[.78, 0], [.74, .13], [.57, .33], [.41, .55], [.36, .78], [.15, 1.0], [.07, 1.1]];
  const roof = mesh(tower, new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), 32), materials.slate);
  roof.position.y = 3.93;
  cylinder(tower, 0, 5.13, 0, .015, .045, .3, materials.gold, 8);
  for (const xx of [-.71, .71]) for (const zz of [-.65, .65]) pinnacle(tower, xx, 2.77, zz, .5);
}

export function buildOxfordBase(parent, effects) {
  parent.name = 'Oxford Radiant base — Radcliffe Camera and Tom Tower';
  parent.userData.architecture = ['Radcliffe Camera', 'Tom Tower', 'Bodleian-inspired arcade'];
  const stonework = group(parent);
  cylinder(stonework, 0, .17, 0, 4.65, 4.85, .35, materials.weathered, 48);
  cylinder(stonework, 0, .37, 0, 4.48, 4.63, .14, materials.paving, 48);
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    const paver = box(stonework, Math.sin(a) * 4.35, .46, Math.cos(a) * 4.35, .48, .045, .25, materials.dressings);
    paver.rotation.y = a;
  }

  // Radcliffe Camera: rusticated plinth, paired columns, tall arched windows, lead dome.
  const camera = group(stonework, .25, .46, .45);
  cylinder(camera, 0, .09, 0, 2.53, 2.63, .18, materials.dressings, 48);
  cylinder(camera, 0, .27, 0, 2.4, 2.53, .18, materials.weathered, 48);
  cylinder(camera, 0, .47, 0, 2.27, 2.4, .22, materials.dressings, 48);
  cylinder(camera, 0, 1.22, 0, 2.17, 2.22, 1.3, materials.limestone, 48);
  for (const yy of [.8, 1.06, 1.32, 1.58, 1.87]) cylinder(camera, 0, yy, 0, 2.205, 2.205, .047, materials.weathered, 48);
  cylinder(camera, 0, 1.96, 0, 2.36, 2.28, .17, materials.dressings, 48);
  cylinder(camera, 0, 3.02, 0, 1.94, 1.94, 2.0, materials.limestone, 48);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    window(camera, Math.sin(a) * 1.962, 2.2, Math.cos(a) * 1.962, .65, 1.48, a);
    const bay = a + Math.PI / 12;
    for (const offset of [-.065, .065]) {
      const aa = bay + offset, xx = Math.sin(aa) * 2.13, zz = Math.cos(aa) * 2.13;
      cylinder(camera, xx, 3.03, zz, .075, .105, 1.72, materials.dressings, 10);
      cylinder(camera, xx, 2.15, zz, .14, .14, .15, materials.dressings, 10);
      cylinder(camera, xx, 3.93, zz, .15, .1, .13, materials.dressings, 10);
    }
    window(camera, Math.sin(a) * 2.2, .84, Math.cos(a) * 2.2, .45, .66, a, false, materials.shadow);
  }
  for (const [yy, radius, hh] of [[4.05, 2.27, .17], [4.22, 2.36, .16], [4.4, 2.16, .2]]) cylinder(camera, 0, yy, 0, radius, radius, hh, materials.dressings, 48);
  const profile = [[2.18, 0], [2.16, .2], [2.03, .57], [1.83, .97], [1.51, 1.34], [1.1, 1.65], [.66, 1.85], [.45, 1.92]];
  const dome = mesh(camera, new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), 64), materials.slate);
  dome.position.y = 4.46;
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    tube(camera, profile.map(([r, y]) => [Math.sin(a) * (r + .025), y + 4.46, Math.cos(a) * (r + .025)]), .023, materials.lead);
  }
  cylinder(camera, 0, 6.46, 0, .48, .53, .15, materials.dressings, 16);
  cylinder(camera, 0, 6.75, 0, .33, .33, .46, materials.shadow, 16);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    cylinder(camera, Math.sin(a) * .32, 6.75, Math.cos(a) * .32, .035, .045, .5, materials.dressings, 6);
  }
  cylinder(camera, 0, 7.06, 0, .18, .47, .2, materials.slate, 24);
  cylinder(camera, 0, 7.26, 0, .015, .075, .23, materials.gold, 8);

  tomTower(stonework, -3.24, 2.4);
  const arcade = group(stonework, .45, .47, -3.77);
  box(arcade, 0, .82, 0, 5.35, 1.65, 1.05, materials.limestone);
  const arcadeRoof = group(arcade, 0, 1.69, 0, Math.PI / 2);
  pitchedRoof(arcadeRoof, 0, 0, 0, 1.3, 5.7, .53, materials.slate);
  for (let i = -3; i <= 3; i++) window(arcade, i * .68, .37, .545, .38, .89, 0, true);
  for (let i = -4; i <= 4; i++) box(arcade, i * .63, 1.74, .54, .22, .18, .22, materials.dressings);
  for (const xx of [3.5]) {
    box(stonework, xx, .78, 1.4, .58, .65, 1.5, materials.hedges);
    for (const zz of [.63, 2.18]) cylinder(stonework, xx, .73, zz, .25, .3, .5, materials.dressings, 8);
  }
  for (let i = 0; i < 5; i++) box(stonework, .25, .06 + i * .09, 5.03 - i * .3, 1.8, .16, .42, materials.dressings);
  bake(stonework);
  effects.ring(parent, 0, .49, 0, 4.65, effects.teal, .028);
  effects.flag(parent, -3.8, .5, .25, false, 1, 'oxford');
  // Keep the entire waving cloth clear of the lane-exit arch on this flank.
  effects.flag(parent, 3.05, .5, 2.75, false, 1, 'oxford');
  const heart = effects.mesh(new THREE.OctahedronGeometry(.22), effects.teal, parent);
  heart.position.set(.25, 8.0, .45);
  effects.animations.push(t => { heart.rotation.y = t * .4; heart.position.y = 8.0 + Math.sin(t) * .1; });
  effects.point(parent, .25, 6.4, .45, 0x85eac0, 9, 9);
  effects.point(parent, .25, 1.8, 3, 0x8ddeb6, 8, 8);
  return parent;
}

function trinityGate(parent) {
  // Set the gatehouse behind the broad courtyard entrance, clear of its flank.
  const gate = group(parent, -3.65, .47, .65);
  box(gate, 0, 1.25, 0, 1.68, 2.5, 1.4, materials.brick);
  arch(gate, 0, .01, .72, 1.13, 1.7, materials.dressings, 0, true);
  arch(gate, 0, .02, .765, .84, 1.47, materials.shadow, 0, true);
  box(gate, 0, 2.16, .77, .32, .42, .12, materials.dressings);
  const crest = mesh(gate, new THREE.OctahedronGeometry(.17), materials.gold);
  crest.scale.set(.8, 1, .2); crest.position.set(0, 2.2, .85);
  box(gate, 0, 2.52, 0, 1.9, .15, 1.62, materials.dressings);
  for (const xx of [-.95, .95]) {
    cylinder(gate, xx, 1.55, .17, .28, .34, 3.1, materials.limestone, 8);
    cylinder(gate, xx, 3.14, .17, .38, .29, .2, materials.dressings, 8);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      box(gate, xx + Math.sin(a) * .29, 3.34, .17 + Math.cos(a) * .29, .17, .24, .16, materials.dressings);
    }
    window(gate, xx, 1.92, .47, .18, .6, 0, true, materials.amberGlass);
  }
  for (let i = -2; i <= 2; i++) box(gate, i * .34, 2.72, .65, .19, .27, .24, materials.dressings);
  const wing = group(parent, -3.75, .47, -2.8);
  box(wing, 0, .84, 0, 1.2, 1.68, 2.7, materials.brick);
  pitchedRoof(wing, 0, 1.73, 0, 1.48, 2.95, .7, materials.slate);
  for (const zz of [-.84, 0, .84]) window(wing, .615, .44, zz, .4, .86, Math.PI / 2, false, materials.amberGlass);
}

export function buildCambridgeBase(parent, effects) {
  parent.name = "Cambridge Dire base — King's College Chapel and Trinity gatehouse";
  parent.userData.architecture = ["King's College Chapel", 'Trinity-inspired Great Gate'];
  const stonework = group(parent);
  cylinder(stonework, 0, .18, 0, 5.25, 5.4, .36, materials.weathered, 48);
  cylinder(stonework, 0, .4, 0, 5.1, 5.23, .15, materials.chapel, 48);
  const chapel = group(stonework, .55, .48, -.2);
  box(chapel, 0, .1, 0, 3.45, .2, 7.43, materials.dressings);
  box(chapel, 0, 2.45, 0, 2.9, 4.7, 6.88, materials.chapel);
  for (const yy of [.43, 1.08, 4.78, 4.98]) box(chapel, 0, yy, 0, 3.09, .11, 7.08, materials.dressings);

  // Perpendicular Gothic bays: tall traceried windows divided by projecting buttresses.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const zz = -2.82 + i * 1.13;
      window(chapel, side * 1.465, 1.38, zz, .72, 2.88, side * Math.PI / 2, true, materials.amberGlass);
    }
    for (let i = 0; i < 7; i++) {
      const zz = -3.37 + i * 1.13;
      box(chapel, side * 1.69, 2.48, zz, .34, 4.66, .23, materials.dressings);
      box(chapel, side * 1.88, 1.07, zz, .45, 1.85, .32, materials.weathered);
      for (const yy of [1.98, 3.17, 4.73]) box(chapel, side * 1.73, yy, zz, .47, .13, .35, materials.dressings);
      tube(chapel, [[side * 2.0, 2.0, zz], [side * 1.98, 3.1, zz], [side * 1.63, 3.75, zz]], .07, materials.dressings);
      pinnacle(chapel, side * 1.69, 4.86, zz, .75);
    }
    for (let i = 0; i < 20; i++) box(chapel, side * 1.48, 5.17, -3.39 + i * .355, .15, .3, .16, materials.dressings);
  }

  // Great west/east windows, steep lead roof, and the chapel's four corner turrets.
  for (const side of [-1, 1]) {
    const face = group(chapel, 0, 0, side * 3.461, side < 0 ? Math.PI : 0);
    window(face, 0, 2.0, .01, 2.03, 2.65, 0, true, materials.amberGlass);
    arch(face, 0, .24, .015, .99, 1.37, materials.dressings, 0, true);
    arch(face, 0, .25, .06, .76, 1.18, materials.shadow, 0, true);
    box(face, 0, .83, .11, .03, 1.05, .05, materials.gold);
    for (const xx of [-1.13, 1.13]) pinnacle(face, xx, 5.09, .03, .68);
  }
  pitchedRoof(chapel, 0, 5.02, 0, 2.87, 6.96, 1.03, materials.slate);
  box(chapel, 0, 6.08, 0, .14, .12, 7.06, materials.lead);
  for (let i = 0; i < 18; i++) {
    const zz = -3.35 + i * .39;
    tube(chapel, [[-1.43, 5.05, zz], [0, 6.1, zz], [1.43, 5.05, zz]], .015, materials.lead);
  }
  for (const xx of [-1.54, 1.54]) for (const zz of [-3.52, 3.52]) {
    cylinder(chapel, xx, 2.84, zz, .26, .3, 5.55, materials.dressings, 8);
    cylinder(chapel, xx, 5.63, zz, .41, .31, .2, materials.dressings, 8);
    cylinder(chapel, xx, 6.06, zz, .22, .26, .72, materials.chapel, 8);
    cylinder(chapel, xx, 6.78, zz, 0, .32, .85, materials.dressings, 8);
    cylinder(chapel, xx, 7.26, zz, .015, .035, .16, materials.gold, 6);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; pinnacle(chapel, xx + Math.sin(a) * .29, 5.67, zz + Math.cos(a) * .29, .4); }
  }
  trinityGate(stonework);
  for (let i = 0; i < 5; i++) box(stonework, .55, .06 + i * .09, 5.65 - i * .28, 1.75, .14, .39, materials.dressings);
  for (let i = 0; i < 7; i++) box(stonework, -2.8 + i * .49, .51, 3.88, .44, .04, .69, materials.paving);
  bake(stonework);
  effects.ring(parent, 0, .5, 0, 5.16, effects.orange, .026);
  effects.flag(parent, -4.95, .5, -.7, true, 1, 'cambridge').rotation.y += Math.PI;
  effects.flag(parent, 3.25, .5, 2.8, true, 1, 'cambridge');
  effects.point(parent, 2.65, 3.0, .2, 0xffa359, 8, 9);
  effects.point(parent, .55, 2.0, 4.2, 0xff9b4e, 5, 8);
  const ember = effects.mesh(new THREE.OctahedronGeometry(.27), effects.orange, parent);
  ember.position.set(.55, 1.25, 4.7);
  effects.animations.push(t => { ember.rotation.y = -t * .3; ember.position.y = 1.25 + Math.sin(t) * .08; });
  return parent;
}
