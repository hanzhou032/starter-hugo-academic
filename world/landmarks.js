import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

const cube = new THREE.BoxGeometry(1, 1, 1);
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .48, ...extra });
const ivory = material(0xc1c2b0), basalt = material(0x303d46), brass = material(0xbda879, { metalness: .7 });
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
  g.name = 'google-publications'; g.userData.logoSource = 'assets/google.svg';
  const library = new THREE.Group(); library.rotation.y = .58; g.add(library);
  const stone = material(0xb5b395, { roughness: .95 });
  const pale = material(0xd6c8a2, { roughness: .85 });
  const shadow = material(0x152f32, { roughness: .9 });
  const copper = material(0x456e6a, { roughness: .7, metalness: .45 });
  const moss = material(0x4d6b49, { roughness: 1 });
  const jewel = googlePaths.map(({ color }) => material(color, { roughness: .4, metalness: .2, emissive: color, emissiveIntensity: .2 }));
  const makeCylinder = (x,y,z,top,bottom,h,m,n=8) => {const o=mesh(library,new THREE.CylinderGeometry(top,bottom,h,n),m,x,y,z);return o;};
  cylinder(library, .16, 3.05, .32, basalt, 3.2);
  cylinder(library, .37, 2.84, .14, pale);
  cylinder(library, .54, 2.63, .2, stone);
  makeCylinder(0,2.08,0,2.17,2.3,3.02,stone);
  makeCylinder(0,.85,0,2.37,2.4,.18,pale);
  makeCylinder(0,3.55,0,2.4,2.3,.22,pale);
  makeCylinder(0,3.7,0,2.48,2.43,.11,brass);
  // Buttresses, jewel windows and pointed pinnacles tie the library to the Radiant architecture.
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,x=Math.sin(a)*2.24,z=Math.cos(a)*2.24;
    const pier=box(library,x,2.1,z,.3,2.88,.4,pale);pier.rotation.y=a;
    makeCylinder(x,.77,z,.27,.34,.2,pale);
    makeCylinder(x,3.77,z,.26,.3,.28,pale);
    makeCylinder(x,4.1,z,0,.24,.48,stone,4);
    if(i===0)continue;
    const a2=a+Math.PI/8,frame=new THREE.Group();frame.position.set(Math.sin(a2)*2.14,1.23,Math.cos(a2)*2.14);frame.rotation.y=a2;library.add(frame);
    const window=new THREE.Shape();window.moveTo(-.3,0);window.lineTo(.3,0);window.lineTo(.3,1.15);window.quadraticCurveTo(.23,1.4,0,1.63);window.quadraticCurveTo(-.23,1.4,-.3,1.15);window.closePath();
    mesh(frame,new THREE.ExtrudeGeometry(window,{depth:.08,bevelEnabled:false}),shadow);
    const pane=mesh(frame,new THREE.ShapeGeometry(window),jewel[i%4],0,.04,.09);pane.scale.set(.72,.9,1);
    box(frame,0,.75,.12,.04,1.42,.04,pale);box(frame,0,.73,.12,.58,.04,.04,pale);
    box(frame,0,-.07,.04,.78,.12,.27,pale);
  }
  makeCylinder(0,4.51,0,.17,2.69,1.52,copper);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const from=new THREE.Vector3(Math.sin(a)*2.66,3.76,Math.cos(a)*2.66),to=new THREE.Vector3(Math.sin(a)*.17,5.27,Math.cos(a)*.17);
    const delta=to.clone().sub(from),seam=mesh(library,new THREE.CylinderGeometry(.024,.034,delta.length(),5),brass);
    seam.position.copy(from).add(to).multiplyScalar(.5);seam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  makeCylinder(0,5.37,0,.24,.32,.2,pale);
  // The G is a raised enamel medallion in the gatehouse, not a freestanding sign.
  box(library,0,2.82,2.26,2.78,2.55,.38,stone);
  const pediment=new THREE.Shape();pediment.moveTo(-1.57,0);pediment.lineTo(1.57,0);pediment.lineTo(0,.67);pediment.closePath();
  mesh(library,new THREE.ExtrudeGeometry(pediment,{depth:.46,bevelEnabled:false}),copper,0,4.08,2.07);
  mesh(library,new THREE.TorusGeometry(1.23,.085,8,64),brass,0,2.88,2.53);
  mesh(library,new THREE.CircleGeometry(1.21,64),shadow,0,2.88,2.47);
  googlePaths.forEach(({path},i)=>{
    const symbol=mesh(library,new THREE.ExtrudeGeometry(googleShape(path),{depth:.22,bevelEnabled:false,curveSegments:32}),jewel[i],0,2.88,2.5+i*.003);
    symbol.scale.setScalar(.5);
  });
  const doorway=new THREE.Shape();doorway.moveTo(-.46,0);doorway.lineTo(.46,0);doorway.lineTo(.46,.8);doorway.quadraticCurveTo(.38,1.18,0,1.45);doorway.quadraticCurveTo(-.38,1.18,-.46,.8);doorway.closePath();
  mesh(library,new THREE.ExtrudeGeometry(doorway,{depth:.045,bevelEnabled:false}),shadow,0,.59,2.52);
  for(const x of [-.6,.6]){box(library,x,1.2,2.5,.16,1.28,.3,pale);box(library,x,1.89,2.5,.25,.13,.34,brass);}
  for(let i=0;i<5;i++)box(library,0,.11+i*.1,3.72-i*.23,1.86,.2,.52,stone);
  for(let i=0;i<6;i++){
    const a=i*.77+.7,x=Math.sin(a)*2.75,z=Math.cos(a)*2.75;
    const patch=mesh(library,new THREE.IcosahedronGeometry(.18,0),moss,x,.58,z);patch.scale.set(1.6,.35,1);
  }
  for(const x of [-2.35,2.35])for(let i=0;i<3;i++)box(library,x,.76+i*.13,1.08,.61,.1,.43,i===1?copper:pale);
  bakeStatic(library);
  // Keep the small luminous inlays clear of shadow-map self-shadowing artifacts.
  for (const part of library.children) if (part.isMesh && jewel.includes(part.material)) part.receiveShadow = false;
  const rune=mesh(g,new THREE.OctahedronGeometry(.23),cyan,0,5.75,0);
  animations.push(t=>{rune.rotation.y=t*.25;rune.position.y=5.75+Math.sin(t*.9)*.07;});
  point(g,0,2.2,2.2,0xbde3cc,6,7);
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
