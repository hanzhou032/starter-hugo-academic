import * as THREE from 'three';

// Stitch to the terrain's actual triangulated outline, not a separate circle.
// The old circular skirt left gaps, faced inward, and had no bottom cap.
export function createIslandRock(terrain) {
  const vertices = terrain.attributes.position, edges = new Map();
  const key = v => `${Math.round(v[0] * 1e5)},${Math.round(v[2] * 1e5)}`;
  for (let i = 0; i < vertices.count; i += 3) {
    const triangle = [0, 1, 2].map(j => [vertices.getX(i + j), vertices.getY(i + j), vertices.getZ(i + j)]);
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3], ak = key(a), bk = key(b);
      const id = ak < bk ? ak + ':' + bk : bk + ':' + ak;
      if (edges.has(id)) edges.delete(id); else edges.set(id, { a, b });
    }
  }
  const next = new Map([...edges.values()].map(e => [key(e.a), e.b]));
  const boundary = [], start = edges.values().next().value.a;
  let vertex = start;
  do {
    boundary.push(vertex);
    vertex = next.get(key(vertex));
  } while (vertex && key(vertex) !== key(start) && boundary.length <= edges.size);
  if (!vertex || boundary.length !== edges.size) throw new Error('Terrain outline must be one closed loop');
  const area = boundary.reduce((sum, a, i) => { const b = boundary[(i + 1) % boundary.length]; return sum + a[0] * b[2] - b[0] * a[2]; }, 0);
  if (area < 0) boundary.reverse();

  const rings = [boundary];
  const levels = [[.995, -1.8], [.94, -5], [.79, -9], [.60, -13.5], [.36, -17.5], [.15, -21.5]];
  levels.forEach(([scale, y], layer) => {
    rings.push(boundary.map(([x, , z]) => {
      const angle = Math.atan2(z, x);
      const fracture = Math.sin(angle * 11 + layer * .8) * .52 + Math.cos(angle * 7 - layer * .9) * .37;
      const radius = Math.hypot(x, z) * scale + fracture * (layer < 2 ? .8 : 1.1);
      return [Math.cos(angle) * radius - layer * .15, y + Math.sin(angle * 9 + layer * 1.3) * .7, Math.sin(angle) * radius + layer * .12];
    }));
  });
  const positions = [], colors = [];
  const palette = [0x657166, 0x59675f, 0x53605c, 0x495b58, 0x465853, 0x435550, 0x40534f];
  function face(a, b, c, layer, sector) {
    const color = new THREE.Color(palette[layer]);
    color.multiplyScalar(.87 + .20 * Math.sin(sector * 12.989 + layer * 3.7) ** 2);
    for (const v of [a, b, c]) { positions.push(...v); colors.push(color.r, color.g, color.b); }
  }
  const n = boundary.length;
  for (let layer = 0; layer < rings.length - 1; layer++) for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, sector = Math.floor(Math.atan2(boundary[i][2], boundary[i][0]) * 13);
    const a = rings[layer][i], b = rings[layer][j], c = rings[layer + 1][j], d = rings[layer + 1][i];
    face(a, b, d, layer, sector); face(b, c, d, layer, sector);
  }
  for (let i = 0; i < n; i++) face(rings.at(-1)[i], rings.at(-1)[(i + 1) % n], [-1.1, -25, .7], 6, Math.floor(i / 8));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const rock = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  rock.name = 'closed-island-bedrock'; rock.castShadow = rock.receiveShadow = true;
  const group = new THREE.Group(); group.name = 'sky-island-foundation'; group.add(rock);

  // Embedded, overlapping buttresses add large rock faces without any holes.
  const stone = new THREE.MeshStandardMaterial({ color: 0x59675f, roughness: 1, flatShading: true });
  const chunks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), stone, 76);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 76; i++) {
    const a = i * 2.39996, lower = i >= 48, y = lower ? -10 - (i % 6) * 1.1 : -2.9 - (i % 3) * .8;
    const radius = lower ? 12.8 - (i % 6) * .6 : 21.2;
    dummy.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    dummy.rotation.set(Math.sin(i) * .15, a, Math.cos(i * .7) * .2);
    dummy.scale.set(lower ? 2.3 : 1.2 + (i % 4) * .26, lower ? 4.6 : 2.2 + (i % 5) * .23, lower ? 2.7 : 1.7);
    dummy.updateMatrix(); chunks.setMatrixAt(i, dummy.matrix);
    chunks.setColorAt(i, new THREE.Color(lower ? 0x718781 : 0xa7b1a0));
  }
  chunks.name = 'embedded-cliff-buttresses'; chunks.castShadow = chunks.receiveShadow = true; group.add(chunks);
  return group;
}

export function createCloudSea(animations, uniforms) {
  const clouds = new THREE.Group(); clouds.name = 'cloud-sea';
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  for (const [x, y, r] of [[48, 82, 39], [86, 57, 48], [130, 52, 50], [173, 75, 44], [206, 87, 31], [124, 88, 61]]) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(222,238,227,.65)'); gradient.addColorStop(.48, 'rgba(211,230,221,.45)'); gradient.addColorStop(1, 'rgba(190,215,211,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 128);
  }
  // Feather all four texture boundaries so no rectangular sprite edges show.
  ctx.globalCompositeOperation = 'destination-in';
  for (const vertical of [true, false]) {
    const mask = ctx.createLinearGradient(0, 0, vertical ? 0 : 256, vertical ? 128 : 0);
    mask.addColorStop(0, '#fff0'); mask.addColorStop(.18, '#fff'); mask.addColorStop(.78, '#fff'); mask.addColorStop(1, '#fff0');
    ctx.fillStyle = mask; ctx.fillRect(0, 0, 256, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  // Camera-facing, world-space cloud banks below the island retain the teal dusk.
  // Nothing is fixed to the screen, and the island never rests on a ground plane.
  for (let i = 0; i < 45; i++) {
    const a = i * 2.39996, radius = 34 + (i % 8) * 8.7;
    const material = new THREE.SpriteMaterial({ map: texture, color: 0x92b7b4, transparent: true, opacity: .22, depthWrite: false });
    const cloud = new THREE.Sprite(material);
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    cloud.position.set(x, -27 - (i % 5) * 3.4, z);
    cloud.scale.set(29 + (i % 5) * 7, 14 + (i % 4) * 3.5, 1);
    clouds.add(cloud);
    animations.push(t => {
      cloud.position.x = x + Math.sin(t * .024 + a) * 3;
      cloud.position.z = z + Math.cos(t * .018 + a) * 2;
      material.opacity = .32 * (1 - uniforms.night.value * .45);
    });
  }
  return clouds;
}
