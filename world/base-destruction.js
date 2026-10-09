import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

// Fracture the actual baked architecture only when a base falls. The original
// stone colors and silhouettes survive in the rubble; intact bases cost no
// extra fragment draws during normal play.
export function createBaseDestruction(scene, roots, exits, camera, dustTexture, reduced) {
  const stone = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  const rubble = new THREE.Group(); rubble.name = 'fallen-base-masonry'; scene.add(rubble);
  const bases = roots.map((root, side) => {
    const bar = new THREE.Group(); bar.name = `${side ? 'cambridge' : 'oxford'}-base-health`;
    bar.position.copy(root.position).add(new THREE.Vector3(0, side ? 8.3 : 8.6, 0)); scene.add(bar);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(4.4, .32), new THREE.MeshBasicMaterial({ color: 0x122524, depthTest: false }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(4.18, .16), new THREE.MeshBasicMaterial({ color: side ? 0xd1775d : 0x80cea7, depthTest: false }));
    back.renderOrder = fill.renderOrder = 6; fill.position.z = .01; bar.add(back, fill);
    return { root, exit: exits[side], bar, fill, origin: root.position.clone(), fragments: null, dust: [], lastHealth: null };
  });

  function fracture(base) {
    scene.updateMatrixWorld(true);
    const bins = new Map(), vector = new THREE.Vector3(), center = new THREE.Vector3();
    function addTriangle(a, b, c, color, depth = 0) {
      // Subdivide long wall/roof faces first. Binning their original giant
      // triangles would leave full-height walls sticking out of the rubble.
      if (depth < 6 && Math.max(a.distanceToSquared(b), b.distanceToSquared(c), c.distanceToSquared(a)) > 1.44) {
        const ab = a.clone().add(b).multiplyScalar(.5), bc = b.clone().add(c).multiplyScalar(.5), ca = c.clone().add(a).multiplyScalar(.5);
        addTriangle(a, ab, ca, color, depth + 1); addTriangle(ab, b, bc, color, depth + 1);
        addTriangle(ca, bc, c, color, depth + 1); addTriangle(ab, bc, ca, color, depth + 1);
        return;
      }
      center.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(base.origin);
      const key = [center.x, center.y, center.z].map(v => Math.floor(v / 1.35)).join(':');
      if (!bins.has(key)) bins.set(key, { positions: [], colors: [] });
      const bin = bins.get(key);
      for (const p of [a, b, c]) { bin.positions.push(p.x, p.y, p.z); bin.colors.push(color.r, color.g, color.b); }
    }
    // Flags and the glowing heart disappear with the fallen architecture.
    for (const source of [base.root.children[0], base.exit]) source.traverse(mesh => {
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const positions = geometry.attributes.position;
      const color = mesh.material.color || new THREE.Color(0xb9ac8e);
      for (let i = 0; i < positions.count; i += 3) {
        const triangle = [];
        for (let j = 0; j < 3; j++) {
          vector.fromBufferAttribute(positions, i + j).applyMatrix4(mesh.matrixWorld);
          triangle.push(vector.clone());
        }
        addTriangle(...triangle, color);
      }
      if (geometry !== mesh.geometry) geometry.dispose();
    });
    base.fragments = [...bins.values()].map((bin, index) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(bin.positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(bin.colors, 3));
      geometry.computeBoundingBox();
      const origin = geometry.boundingBox.getCenter(new THREE.Vector3());
      const size = geometry.boundingBox.getSize(new THREE.Vector3());
      geometry.translate(-origin.x, -origin.y, -origin.z); geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, stone); mesh.position.copy(origin); mesh.castShadow = mesh.receiveShadow = true; rubble.add(mesh);
      const angle = index * 2.39996, height = origin.y - base.origin.y;
      // Lower foundations stay close to the ground; towers tumble down last.
      const foundation = height < .65, delay = foundation ? 0 : .18 + Math.max(0, height) * .037;
      const drift = foundation ? .06 : .28 + (index % 5) * .09;
      return { mesh, origin, delay, foundation, dx: Math.cos(angle) * drift, dz: Math.sin(angle) * drift,
        spin: new THREE.Vector3(Math.sin(angle) * .85, Math.cos(angle) * .5, Math.sin(angle + 1) * .88),
        floor: Math.min(origin.y, base.origin.y + .18 + Math.min(size.y, 1.8) * .28 + (index % 4) * .06) };
    });
    base.root.visible = base.exit.visible = false;
    if (!reduced) for (let i = 0; i < 14; i++) {
      const angle = i * Math.PI * 2 / 14;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTexture, color: 0xc4b99b, opacity: 0, transparent: true, depthWrite: false }));
      sprite.position.copy(base.origin).add(new THREE.Vector3(Math.cos(angle) * 2.5, .6, Math.sin(angle) * 2.5));
      rubble.add(sprite); base.dust.push({ sprite, origin: sprite.position.clone(), angle, delay: (i % 4) * .12 });
    }
  }

  function update(state) {
    state.bases.forEach((status, side) => {
      const base = bases[side], ratio = status.health / status.maxHealth;
      base.bar.quaternion.copy(camera.quaternion);
      base.fill.scale.x = ratio; base.fill.position.x = -(1 - ratio) * 2.09;
      base.bar.visible = status.health > 0;
      base.bar.userData.health = status.health; base.bar.userData.maxHealth = status.maxHealth;
      if (base.lastHealth !== status.health) {
        document.querySelectorAll(`[data-base-health="${side}"]`).forEach(element => {
          element.setAttribute('aria-valuenow', status.health); element.setAttribute('aria-valuemax', status.maxHealth);
          element.style.setProperty('--health', `${ratio * 100}%`);
          element.querySelector('span').textContent = `${status.health} / ${status.maxHealth}`;
        });
        base.lastHealth = status.health;
      }
      if (status.destroyedAt === null) return;
      const age = state.time - status.destroyedAt;
      if (!reduced && age < .38) {
        const shake = Math.sin(age * 74) * .065;
        base.root.position.x = base.origin.x + shake; base.root.rotation.z = shake * .065;
        return;
      }
      if (!base.fragments) {
        base.root.position.copy(base.origin); base.root.rotation.z = 0;
        fracture(base);
      }
      if (base.settled) return;
      const elapsed = reduced ? 5 : Math.max(0, age - .38);
      for (const fragment of base.fragments) {
        const { mesh, origin, delay, floor, foundation, spin } = fragment;
        const t = Math.max(0, elapsed - delay), fallTime = Math.sqrt(Math.max(0, origin.y - floor) / 6);
        const fall = Math.min(t, fallTime), settle = Math.max(0, t - fallTime);
        mesh.position.set(origin.x + fragment.dx * fall, Math.max(floor, origin.y - 6 * fall * fall), origin.z + fragment.dz * fall);
        if (!foundation && settle > 0) mesh.position.y += Math.abs(Math.sin(settle * 12)) * Math.exp(-settle * 6) * .17;
        mesh.rotation.set(spin.x * fall, spin.y * fall, spin.z * fall);
      }
      for (const { sprite, origin, angle, delay } of base.dust) {
        const t = Math.max(0, elapsed - .35 - delay);
        sprite.position.copy(origin).add(new THREE.Vector3(Math.cos(angle) * t * .8, t * .65, Math.sin(angle) * t * .8));
        sprite.scale.set(2.6 + t * 3, 1.5 + t * 1.65, 1);
        sprite.material.opacity = Math.min(1, t * 5) * Math.max(0, 1 - t / 2.35) * .27;
        sprite.visible = sprite.material.opacity > .001;
      }
      base.settled = reduced || age >= 3.6;
      if (base.settled) {
        // Once the dust settles, turn the rubble back into a single static draw.
        const geometries = base.fragments.map(({ mesh }) => {
          mesh.updateMatrix(); return mesh.geometry.applyMatrix4(mesh.matrix);
        });
        const settled = new THREE.Mesh(mergeGeometries(geometries), stone);
        settled.name = `${side ? 'cambridge' : 'oxford'}-settled-rubble`;
        settled.castShadow = settled.receiveShadow = true; rubble.add(settled);
        for (const { mesh } of base.fragments) { mesh.removeFromParent(); mesh.geometry.dispose(); }
        base.fragments = [];
        for (const { sprite } of base.dust) { sprite.removeFromParent(); sprite.material.dispose(); }
        base.dust = [];
      }
    });
  }
  return { update };
}
