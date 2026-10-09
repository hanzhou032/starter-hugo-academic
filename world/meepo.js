import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { createBattleSimulation } from './battle-simulation.js';

const cube = new THREE.BoxGeometry(1, 1, 1), sphere = new THREE.IcosahedronGeometry(1, 2);
const characterMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, flatShading: true });
const palette = new Map();
const skin = 0xa5afad, darkSkin = 0x7e9295, leather = 0x785538, hood = 0x355d83, metal = 0xa7b9bf;
function part(g, geometry, color, x, y, z, sx = 1, sy = sx, sz = sx) {
  if (!palette.has(color)) palette.set(color, new THREE.MeshStandardMaterial({ color }));
  const m = new THREE.Mesh(geometry, palette.get(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m;
}
const ellipsoid = (g, color, x, y, z, sx, sy, sz) => part(g, sphere, color, x, y, z, sx, sy, sz);
const box = (g, color, x, y, z, w, h, d) => part(g, cube, color, x, y, z, w, h, d);
function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
function bakeColored(g) {
  g.updateMatrixWorld(true); const inverse = g.matrixWorld.clone().invert(), geometries = [];
  g.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    const c = o.material.color, colors = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometries.push(geo);
  });
  g.clear(); const m = new THREE.Mesh(mergeGeometries(geometries), characterMaterial); m.castShadow = m.receiveShadow = true; g.add(m);
  geometries.forEach(geometry => geometry.dispose());
}
function createMeepo(side, index) {
  const root = new THREE.Group(); root.name = `${side ? 'dire' : 'radiant'}-meepo-${index + 1}`;
  const body = group(root), torso = group(body), head = group(body, 0, 1.19, .03);
  const accent = side ? 0xc26447 : 0x64bda0;
  // Squat leather-clad body, rope belt, backpack, bedroll and clipped-on lantern.
  ellipsoid(torso, leather, 0, .73, 0, .3, .39, .23);
  ellipsoid(torso, hood, 0, .99, -.02, .34, .16, .25);
  box(torso, 0x423729, 0, .57, .015, .6, .11, .45);
  box(torso, 0xc7a572, 0, .57, .26, .13, .13, .05);
  for (const x of [-.2, .2]) {
    const strap = box(torso, 0x3b322a, x, .8, .205, .07, .37, .055); strap.rotation.z = x * .65;
    ellipsoid(torso, 0x987449, x * 1.38, .53, .08, .12, .15, .14);
  }
  ellipsoid(torso, 0x73503b, 0, .79, -.32, .31, .31, .22);
  box(torso, 0xa6885f, 0, .77, -.52, .045, .49, .04);
  const roll = part(torso, new THREE.CylinderGeometry(.115, .115, .63, 10), 0x7c897a, 0, 1.02, -.34); roll.rotation.z = Math.PI / 2;
  for (const x of [-.21, .21]) box(torso, 0x4c3b2f, x, 1.02, -.34, .05, .245, .25);
  box(torso, accent, -.35, .75, -.21, .12, .17, .12);
  bakeColored(torso);
  // Oversized blue hood and pale face; ears are solid tapered wedges, not flat decals.
  ellipsoid(head, hood, 0, .045, -.075, .39, .405, .33);
  ellipsoid(head, skin, 0, -.005, .15, .3, .29, .21);
  ellipsoid(head, darkSkin, 0, -.17, .25, .265, .12, .125);
  ellipsoid(head, skin, 0, -.145, .29, .22, .1, .12);
  ellipsoid(head, skin, 0, .005, .355, .13, .105, .13);
  for (const sign of [-1, 1]) {
    const ear = new THREE.Shape(); ear.moveTo(sign * .28, .13); ear.lineTo(sign * .82, .32); ear.quadraticCurveTo(sign * .63, -.06, sign * .31, -.12); ear.closePath();
    part(head, new THREE.ExtrudeGeometry(ear, { depth: .11, bevelEnabled: false }), skin, 0, 0, .015);
    const inner = new THREE.Shape(); inner.moveTo(sign * .37, .1); inner.lineTo(sign * .71, .25); inner.lineTo(sign * .4, -.04); inner.closePath();
    part(head, new THREE.ShapeGeometry(inner), 0x727f86, 0, 0, .129);
    ellipsoid(head, 0xe1dca6, sign * .14, .078, .322, .085, .062, .036);
    ellipsoid(head, 0x1e292a, sign * .145, .077, .352, .029, .044, .012);
    const brow = box(head, 0x506875, sign * .15, .145, .315, .205, .065, .08); brow.rotation.z = sign * .22;
    part(head, new THREE.ConeGeometry(.034, .11, 5), 0xe9e0c0, sign * .09, -.196, .366).rotation.z = Math.PI;
  }
  const hoodRim = part(head, new THREE.TorusGeometry(.317, .048, 6, 24, Math.PI * 1.45), 0x517a9a, 0, .026, .176); hoodRim.rotation.z = -.23 * Math.PI;
  box(head, accent, 0, .31, .105, .13, .1, .09);
  bakeColored(head);
  head.scale.x = .85;
  const legs = [], arms = [];
  for (const sign of [-1, 1]) {
    const leg = group(body, sign * .16, .47, 0);
    ellipsoid(leg, 0x4e4d41, 0, -.12, 0, .12, .23, .13);
    ellipsoid(leg, 0x493b2f, 0, -.34, .095, .15, .14, .23);
    box(leg, 0x9c845c, 0, -.23, .03, .25, .07, .27);
    bakeColored(leg); legs.push(leg);
    const arm = group(body, sign * .325, .94, 0);
    ellipsoid(arm, skin, sign * .06, -.17, 0, .12, .235, .13);
    ellipsoid(arm, 0x4e5e60, sign * .025, -.03, 0, .17, .13, .17);
    box(arm, accent, sign * .08, -.09, .095, .17, .09, .055);
    ellipsoid(arm, skin, sign * .07, -.34, .04, .13, .12, .12);
    if (sign === 1) {
      // Meepo's signature shovel: wooden haft, metal socket, broad pointed steel spade.
      part(arm, new THREE.CylinderGeometry(.033, .04, 1.24, 8), 0x9c7950, .08, .12, .095);
      part(arm, new THREE.CylinderGeometry(.055, .047, .24, 8), metal, .08, .74, .095);
      const blade = new THREE.Shape(); blade.moveTo(-.21, 0); blade.lineTo(-.22, .29); blade.lineTo(0, .43); blade.lineTo(.22, .29); blade.lineTo(.21, 0); blade.closePath();
      part(arm, new THREE.ExtrudeGeometry(blade, { depth: .055, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 1 }), metal, .08, .82, .065);
      box(arm, 0xd6dfdc, .08, 1.02, .137, .032, .31, .014);
    } else {
      // Coiled rope and digging pouch on the free wrist.
      part(arm, new THREE.TorusGeometry(.1, .025, 5, 12), 0xb39a68, -.09, -.27, .12);
    }
    bakeColored(arm); arms.push(arm);
  }
  const health = group(root, 0, 2.37, 0);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(.87, .1), new THREE.MeshBasicMaterial({ color: 0x142324, depthTest: false })); health.add(back);
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(.79, .045), new THREE.MeshBasicMaterial({ color: accent, depthTest: false })); bar.position.z = .001; health.add(bar);
  back.renderOrder = bar.renderOrder = 5;
  const ring = new THREE.Mesh(new THREE.RingGeometry(.32, .36, 32), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .012; root.add(ring);
  return { root, body, head, arms, legs, health, bar, ring };
}

export function createMeepoBattle(scene, route, camera, reduced) {
  const simulation = createBattleSimulation(), actors = [], bursts = [];
  const battle = new THREE.Group(); battle.name = 'meepo-battle'; scene.add(battle);
  for (let side = 0; side < 2; side++) for (let i = 0; i < 3; i++) { const actor = createMeepo(side, i); battle.add(actor.root); actors.push(actor); }
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffd68d, transparent: true, depthWrite: false });
  const sparkGeometry = new THREE.IcosahedronGeometry(.035, 0);
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group(); battle.add(g); g.visible = false;
    for (let j = 0; j < 7; j++) g.add(new THREE.Mesh(sparkGeometry, sparkMaterial));
    bursts.push({ g, age: 10 });
  }
  let burstIndex = 0;
  const label = document.querySelector('#battle-status');
  let oldLabel = '';
  if (reduced) { for (let i = 0; i < 570; i++) simulation.advance(1 / 60); simulation.drainEvents(); }
  function update(delta) {
    if (!reduced) simulation.advance(delta);
    const state = simulation.snapshot();
    for (const event of simulation.drainEvents()) if (event.type === 'hit') {
      const u = state.units[event.target], burst = bursts[burstIndex++ % bursts.length], p = route.sample(u.distance, u.lateral);
      burst.g.position.set(p.x, route.surface(u.distance, u.lateral) + 1, p.z); burst.g.visible = true; burst.age = 0;
    }
    for (const burst of bursts) {
      burst.age += delta; burst.g.visible = burst.age < .34;
      if (!burst.g.visible) continue;
      burst.g.children.forEach((p, i) => { const a = i * Math.PI * 2 / 7; p.position.set(Math.cos(a) * burst.age * 1.8, Math.sin(a * 3) * burst.age + .13 - burst.age * burst.age * 3, Math.sin(a) * burst.age * 1.8); p.scale.setScalar(1 - burst.age / .34); });
    }
    for (const u of state.units) {
      const a = actors[u.id], p = route.sample(u.distance, u.lateral), dead = u.state === 'dying' || u.state === 'dead';
      a.root.visible = u.state !== 'dead'; a.root.scale.setScalar(1);
      a.root.position.set(p.x, route.surface(u.distance, u.lateral) + .035, p.z);
      a.root.rotation.y = Math.atan2(p.dx, p.dz) + (u.side ? Math.PI : 0);
      a.body.rotation.set(0, 0, 0); a.body.position.set(0, 0, 0); a.head.rotation.set(0, 0, 0);
      a.legs[0].rotation.x = a.legs[1].rotation.x = 0;
      a.arms[0].rotation.set(.18, 0, -.13); a.arms[1].rotation.set(.22, 0, .1);
      a.health.visible = !dead; a.ring.visible = !dead;
      a.health.quaternion.copy(a.root.quaternion).invert().multiply(camera.quaternion);
      a.bar.scale.x = u.health / 100; a.bar.position.x = -(1 - u.health / 100) * .395;
      if (u.state === 'marching') {
        const gait = Math.sin(state.time * 10 + u.lane);
        a.legs[0].rotation.x = gait * .5; a.legs[1].rotation.x = -gait * .5;
        a.arms[0].rotation.x = -gait * .3; a.arms[1].rotation.x += gait * .16;
        a.body.position.y = Math.abs(gait) * .055; a.body.rotation.z = gait * .055;
      } else if (u.state === 'fighting') {
        const t = u.attackAge;
        let swing;
        if (t < .42) swing = .22 - t / .42 * 1.12;
        else if (t < .59) swing = -.9 + (t - .42) / .17 * 2.5;
        else swing = 1.6 - Math.min(1, (t - .59) / .5) * 1.38;
        a.arms[1].rotation.x = swing; a.arms[0].rotation.x = .3 + Math.max(0, swing) * .3;
        const lunge = Math.sin(Math.min(1, t / .85) * Math.PI) * .15;
        a.body.position.z = lunge; a.body.rotation.x = lunge * .5;
        a.legs[0].rotation.x = -.16; a.legs[1].rotation.x = .18;
        if (u.hitAge < .22) { a.head.rotation.x = -.28 * Math.sin(u.hitAge / .22 * Math.PI); a.body.position.z -= .1; }
      } else if (dead) {
        const fall = THREE.MathUtils.smoothstep(u.age, 0, .68);
        a.body.rotation.x = -fall * Math.PI * .49;
        a.body.position.y = .53 * fall; a.body.position.z = -.15 * fall;
        a.arms[1].rotation.x = 1.8 * fall;
        if (u.age > 1.85) a.root.scale.setScalar(Math.max(.01, 1 - (u.age - 1.85) / .75));
      }
    }
    const alive = side => state.units.filter(u => u.side === side && u.health > 0).length;
    const phase = state.units.some(u => u.state === 'fighting') ? 'Shovels clash' : state.units.every(u => u.state === 'dead') ? 'Reinforcements incoming' : state.units.some(u => u.state === 'dying') ? 'The dust settles' : 'Marching to mid';
    const text = `WAVE ${state.wave} · ${phase} · ${alive(0)} : ${alive(1)}`;
    if (label && text !== oldLabel) { label.textContent = text; oldLabel = text; }
  }
  update(0);
  return { update, snapshot: () => simulation.snapshot() };
}
