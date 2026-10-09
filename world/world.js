import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { buildOxfordBase, buildCambridgeBase } from './architecture.js';
import { buildGoogle, buildMistral, bakeStatic } from './landmarks.js';
import { BRIDGE, createLane } from './lane.js';
import { createMeepoBattle } from './meepo.js';
import { createRiver } from './water.js';

export function createWorld(onVisit) {
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const mobile = matchMedia('(max-width: 720px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x17272c);
  scene.fog = new THREE.FogExp2(0x17272c, .0065);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-label', 'Drag to orbit the world, scroll to zoom. Use the landmark buttons to explore.');
  renderer.domElement.setAttribute('role','img');
  document.querySelector('#world').append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .5, 250);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .05;
  controls.minDistance = 9; controls.maxDistance = mobile ? 190 : 110;
  controls.minPolarAngle = .25; controls.maxPolarAngle = 1.25;
  controls.maxTargetRadius = 36;
  controls.autoRotate = false; controls.autoRotateSpeed = .13;
  controls.enablePan = true;
  const desktopPosition = new THREE.Vector3(36, 46, 53);
  const desktopTarget = new THREE.Vector3(-5.2, -.6, 1.8);
  const mobilePosition = new THREE.Vector3(65, 82, 97);
  const mobileTarget = new THREE.Vector3(-1, 8, 0);
  camera.position.copy(mobile ? mobilePosition : desktopPosition);
  controls.target.copy(mobile ? mobileTarget : desktopTarget);
  controls.update();
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .34, .55, 1.05);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  const ambient = new THREE.HemisphereLight(0xb9dfe2, 0x344032, 1.5); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe1a6, 3.1); sun.position.set(-22, 38, 15);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -31, right: 31, top: 31, bottom: -31, near: 1, far: 100 });
  sun.shadow.normalBias = .08; sun.shadow.bias = -.0003; scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6ba6bc, 2.1); rim.position.set(18, 20, -23); scene.add(rim);
  const warm = new THREE.PointLight(0xf77541, 32, 30, 2); warm.position.set(12, 7, -8); scene.add(warm);

  let seed = 7628;
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a,b) => a + rand() * (b-a);
  const noise = (x,z) => Math.sin(x*.49+Math.cos(z*.35))*.35 + Math.sin(z*.73+x*.25)*.21 + Math.cos(x*1.15-z*.64)*.11;
  const riverX = z => .32*z + Math.sin(z*.23)*1.7;
  const isDire = (x,z) => x > riverX(z);
  const radius = (x,z) => Math.hypot(x,z);
  function height(x,z) {
    const coast = THREE.MathUtils.smoothstep(22.7-radius(x,z),0,3.5);
    const bank = THREE.MathUtils.smoothstep(Math.abs(x-riverX(z)),1.0,3.4);
    const hill = isDire(x,z) ? .75 + Math.max(0,-z)*.028 : .2;
    let y = .32 + (1.5 + hill + noise(x,z)*1.25)*bank*coast;
    for (const [bx,bz,level,r] of [[-11.7,10.5,2.15,5.1],[11.6,-9.3,2.9,5.7]]) {
      const blend=1-THREE.MathUtils.smoothstep(Math.hypot(x-bx,z-bz),r-.4,r+1.2);
      y=THREE.MathUtils.lerp(y,level,blend);
    }
    return y;
  }
  const mats = {};
  function mat(key,color,props={}) { return mats[key] || (mats[key]=new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true,...props})); }
  const stone = mat('stone',0x7c8271), trim = mat('trim',0xbab18a), darkStone = mat('darkStone',0x454442);
  const bark = mat('bark',0x584832), deadBark=mat('deadBark',0x403c38);
  const gold = mat('gold',0xb39960,{metalness:.65,roughness:.36});
  const teal = mat('teal',0x8be5bd,{emissive:0x4bd7a2,emissiveIntensity:2,roughness:.18,metalness:.3});
  const orange = mat('orange',0xffbc67,{emissive:0xff631f,emissiveIntensity:2.4,roughness:.4});
  const blue = mat('blue',0x95dcff,{emissive:0x428ee5,emissiveIntensity:2});
  const crystalGeo = new THREE.OctahedronGeometry(1,0);
  const rockGeo = new THREE.DodecahedronGeometry(1,0);
  const sphereGeo = new THREE.IcosahedronGeometry(1,1);
  const boxGeo = new THREE.BoxGeometry(1,1,1);
  const animations = [], markers = [], waterUniforms = { time: { value: 0 }, night: { value: 0 } };

  function mesh(geo,material,parent=scene) { const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  function box(parent,x,y,z,w,h,d,material) { const m=mesh(boxGeo,material,parent);m.position.set(x,y,z);m.scale.set(w,h,d);return m; }
  function cone(parent,x,y,z,r1,r2,h,material,segments=8) { const m=mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material,parent);m.position.set(x,y,z);return m; }
  function segment(parent,a,b,r1,r2,material) { const delta=new THREE.Vector3().subVectors(b,a);const m=cone(parent,0,0,0,r2,r1,delta.length(),material,6);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m; }
  function ring(parent,x,y,z,r,material,tube=.035) { const m=mesh(new THREE.TorusGeometry(r,tube,6,64),material,parent);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);return m; }
  function point(parent,x,y,z,color,intensity=20,distance=8) { const p=new THREE.PointLight(color,intensity,distance,2);p.position.set(x,y,z);parent.add(p);return p; }
  function groupAt(x,z) { const g=new THREE.Group();g.position.set(x,height(x,z),z);scene.add(g);return g; }
  function randomRock(x,z,s,material=stone) { const m=mesh(rockGeo,material);m.position.set(x,height(x,z)+s*.22,z);m.scale.set(s*range(.6,1.5),s*range(.4,1),s);m.rotation.set(rand(),rand()*6,rand());return m; }

  // A triangulated landscape, with a carved river channel and a fractured underside.
  const terrainPositions=[], terrainColors=[];const grid=116, size=46, step=size/grid;
  const greens=[new THREE.Color(0x4f6d43),new THREE.Color(0x647847),new THREE.Color(0x496b4d)];
  const reds=[new THREE.Color(0x62554c),new THREE.Color(0x524940),new THREE.Color(0x6a5a48)];
  function triangle(a,b,c) {
    const cx=(a[0]+b[0]+c[0])/3, cz=(a[1]+b[1]+c[1])/3;
    if(radius(cx,cz)>22.5)return;
    const bank=Math.abs(cx-riverX(cz));
    const palette=isDire(cx,cz)?reds:greens;
    const color=palette[0].clone().lerp(palette[1],THREE.MathUtils.clamp(noise(cx*.5,cz*.5)+.5,0,1));
    if(bank<2.8)color.set(0x737d66);if(radius(cx,cz)>20.5)color.multiplyScalar(.84);
    color.multiplyScalar(range(.97,1.03));
    for(const v of [a,b,c]){terrainPositions.push(v[0],height(v[0],v[1]),v[1]);terrainColors.push(color.r,color.g,color.b);}
  }
  for(let iz=0;iz<grid;iz++)for(let ix=0;ix<grid;ix++){
    const x=-23+ix*step,z=-23+iz*step;
    triangle([x,z],[x,z+step],[x+step,z]);triangle([x+step,z],[x,z+step],[x+step,z+step]);
  }
  const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(terrainPositions,3));tg.setAttribute('color',new THREE.Float32BufferAttribute(terrainColors,3));tg.computeVertexNormals();
  mesh(tg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));
  const sides=[], sideColors=[];const sideN=92;
  const rings=[[],[],[],[]];
  for(let i=0;i<=sideN;i++){
    const a=i/sideN*Math.PI*2;const rough=Math.sin(a*11)*.5+Math.sin(a*23)*.25;
    for(let j=0;j<4;j++){
      const r=[22.48,22.1+rough,19.5+rough*1.4,13.5+rough*1.8][j];
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      rings[j].push([x,j===0?height(x,z)-.02:[0,-1.7,-5.3,-8][j]+Math.sin(a*13)*.7,z]);
    }
  }
  for(let j=0;j<3;j++)for(let i=0;i<sideN;i++){
    for(const verts of [[rings[j][i],rings[j+1][i],rings[j][i+1]],[rings[j][i+1],rings[j+1][i],rings[j+1][i+1]]]){
      const c=new THREE.Color(j===0?0x5f6353:0x3e4541).multiplyScalar(range(.64,1.1));
      for(const v of verts){sides.push(...v);sideColors.push(c.r,c.g,c.b);}
    }
  }
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sides,3));sg.setAttribute('color',new THREE.Float32BufferAttribute(sideColors,3));sg.computeVertexNormals();mesh(sg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));
  for(let i=0;i<66;i++) { const a=rand()*Math.PI*2,r=range(20,22);const m=mesh(rockGeo,mat('cliff',0x535950));m.position.set(Math.cos(a)*r,-range(1.5,5),Math.sin(a)*r);m.scale.set(range(1,2.8),range(1.8,4),range(1,2.8));m.rotation.set(rand(),rand(),rand()); }

  // Flowing, reflective water with a finely subdivided surface and shoreline foam.
  const water=createRiver(riverX,waterUniforms);water.castShadow=false;scene.add(water);
  for(let i=0;i<95;i++){const z=range(-21,21);const x=riverX(z)+(rand()>.5?1:-1)*range(2,3.0);randomRock(x,z,range(.15,.55),mat('riverRock',0x8c9380));}

  // Three routes through the world, laid by hand from irregular stone slabs.
  const laneCurves=[];
  function lane(points,width=1.7) {
    const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)));laneCurves.push(curve);
    const n=Math.ceil(curve.getLength()/.72);
    for(let i=0;i<n;i++) {
      const t=i/(n-1),p=curve.getPoint(t),tan=curve.getTangent(t);if(Math.abs(p.x-riverX(p.z))<2.0)continue;
      for(let j=-1;j<=1;j++) { const x=p.x+tan.z*j*width*.32+range(-.1,.1),z=p.z-tan.x*j*width*.32+range(-.1,.1);const m=box(scene,x,height(x,z)+.045,z,width*.3,range(.07,.13),range(.49,.67),mat('paving'+Math.floor(rand()*4),[0x9c9981,0x888974,0xaba58a,0x777e6c][Math.floor(rand()*4)]));m.rotation.y=Math.atan2(tan.x,tan.z)+range(-.13,.13); }
    }return curve;
  }
  const midRoute=createLane(height);
  const mid={getPoint(t){const p=midRoute.sample(midRoute.min+t*midRoute.length);return new THREE.Vector3(p.x,0,p.z);}};
  laneCurves.push(mid);
  for(let d=midRoute.min;d<=midRoute.max;d+=.48){
    if(Math.abs(d)<BRIDGE.halfLength)continue;
    for(let lateral=-1.55;lateral<=1.56;lateral+=.62){const p=midRoute.sample(d,lateral);const m=box(scene,p.x,height(p.x,p.z)+.055,p.z,.59,.12,.47,stone);m.rotation.y=Math.atan2(p.dx,p.dz);}
  }
  lane([[-12,11],[-16,7],[-17,-2],[-13,-12],[-5,-15],[6,-14],[12,-10]]);
  lane([[-12,11],[-7,16],[3,16],[13,12],[17,5],[17,-3],[12,-10]]);
  const landmarks={bio:new THREE.Vector3(-11.7,0,10.5),experience:new THREE.Vector3(11.6,0,-9.3),research:new THREE.Vector3(13.4,0,9.6),publications:new THREE.Vector3(-11,0,-7)};
  for(const p of Object.values(landmarks))p.y=height(p.x,p.z);
  const clearOfPaths=(x,z)=>{
    if(Math.hypot(x,z)<8.1)return false;
    for(const [id,p] of Object.entries(landmarks)){
      const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      const clearance=id==='bio'?6.7:id==='experience'?6.8:4.4;
      if(d<clearance||(d<clearance+4.5&&dx+dz>0&&Math.abs(dx-dz)<7))return false;
    }
    for(const c of laneCurves)for(let t=0;t<=1;t+=.025){const p=c.getPoint(t);if(Math.hypot(x-p.x,z-p.z)<(c===mid?3.5:1.5))return false;}
    return true;
  };

  // Stone bridge, parapets, and four burning braziers.
  const bridge=new THREE.Group();bridge.name='midlane-bridge';bridge.rotation.y=BRIDGE.angle;scene.add(bridge);
  const slabs=30,slabLength=BRIDGE.halfLength*2/slabs;
  for(let i=0;i<slabs;i++){
    const x=-BRIDGE.halfLength+(i+.5)*slabLength,y=midRoute.bridgeY(x);
    const deck=box(bridge,x,y-.16,0,slabLength-.007,.32,BRIDGE.width,stone);
    deck.rotation.z=Math.atan2(midRoute.bridgeY(x+.01)-midRoute.bridgeY(x-.01),.02);
    for(const z of [-BRIDGE.width/2,BRIDGE.width/2]){
      box(bridge,x,y+.18,z,slabLength-.009,.35,.2,trim);
      if(i%3===0)box(bridge,x,y+.35,z,.25,.68,.29,stone);
    }
  }
  for(const z of [-BRIDGE.width/2+.1,BRIDGE.width/2-.1]){
    const shape=new THREE.Shape();shape.moveTo(-BRIDGE.halfLength,.55);shape.lineTo(BRIDGE.halfLength,.55);
    for(let i=30;i>=0;i--){const x=-BRIDGE.halfLength+i*BRIDGE.halfLength*2/30;shape.lineTo(x,midRoute.bridgeY(x)-.18);}shape.closePath();
    for(const center of [-3.5,0,3.5]){const hole=new THREE.Path();hole.moveTo(center-1.15,.58);hole.lineTo(center-1.15,1.06);hole.absarc(center,1.06,1.15,Math.PI,0,true);hole.lineTo(center+1.15,.58);hole.closePath();shape.holes.push(hole);}
    const wall=mesh(new THREE.ExtrudeGeometry(shape,{depth:.21,bevelEnabled:false,curveSegments:18}),darkStone,bridge);wall.position.z=z-.1;
  }
  for(const x of [-BRIDGE.halfLength,BRIDGE.halfLength])for(const z of [-2.18,2.18]){
    const y=midRoute.bridgeY(x);cone(bridge,x,y+.55,z,.18,.29,1.1,stone);cone(bridge,x,y+1.13,z,.32,.22,.2,gold);
  }
  for(const x of [-.32,.32]){const tile=box(bridge,x,midRoute.bridgeY(x)+.009,0,.29,.025,.29,x<0?teal:orange);tile.rotation.y=Math.PI/4;}
  bakeStatic(bridge);

  // Instanced grove: layered leaf clusters and branching trunks.
  const trunkTransforms=[],leafTransforms=[],leafColors=[],grassTransforms=[],grassColors=[],deadTransforms=[];
  const dummy=new THREE.Object3D(),matrix=new THREE.Matrix4();
  function saveSegment(array,a,b,r1,r2=1) {dummy.position.copy(a).add(b).multiplyScalar(.5);const delta=b.clone().sub(a);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());dummy.scale.set(r1,delta.length(),r1*r2);dummy.updateMatrix();array.push(dummy.matrix.clone());}
  const leafPalette=[0x3e6945,0x527847,0x6d874f,0x829354,0x416951,0x607d48];
  for(let i=0;i<340;i++) {
    const x=range(-21,21),z=range(-21,21);if(radius(x,z)>20.8||Math.abs(x-riverX(z))<3.7||!clearOfPaths(x,z))continue;
    const y=height(x,z),dire=isDire(x,z),h=range(2.0,4.4);const top=new THREE.Vector3(x+range(-.35,.35),y+h,z+range(-.35,.35));
    saveSegment(dire?deadTransforms:trunkTransforms,new THREE.Vector3(x,y,z),top,.13+(h-2)*.045);
    for(let j=0;j<4;j++) {
      const a=j*Math.PI*.5+rand(),branch=new THREE.Vector3(x+Math.cos(a)*h*.32,y+h*range(.6,.95),z+Math.sin(a)*h*.32);
      const origin=new THREE.Vector3(x,y+h*.43,z);saveSegment(dire?deadTransforms:trunkTransforms,origin,branch,.07);
      if(dire) {
        const twig=branch.clone().add(new THREE.Vector3(Math.cos(a)*.2,.8,Math.sin(a)*.2));saveSegment(deadTransforms,branch,twig,.034);
        if(rand()>.65){const ember=mesh(crystalGeo,orange);ember.scale.set(.07,.15,.07);ember.position.copy(twig);}
      }else{
        dummy.position.copy(branch).add(new THREE.Vector3(0,.2,0));dummy.rotation.set(rand(),rand()*6,rand());dummy.scale.set(h*.33,h*.25,h*.32);dummy.updateMatrix();leafTransforms.push(dummy.matrix.clone());leafColors.push(new THREE.Color(leafPalette[Math.floor(rand()*leafPalette.length)]));
      }
    }
    if(!dire){dummy.position.copy(top);dummy.scale.set(h*.37,h*.36,h*.36);dummy.rotation.set(rand(),rand(),rand());dummy.updateMatrix();leafTransforms.push(dummy.matrix.clone());leafColors.push(new THREE.Color(leafPalette[Math.floor(rand()*leafPalette.length)]));}
  }
  function instanced(geo,material,transforms,colors){const m=new THREE.InstancedMesh(geo,material,transforms.length);transforms.forEach((v,i)=>{m.setMatrixAt(i,v);if(colors)m.setColorAt(i,colors[i]);});m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  const trunkGeometry=new THREE.CylinderGeometry(.55,1,1,6);
  instanced(trunkGeometry,bark,trunkTransforms);instanced(trunkGeometry,deadBark,deadTransforms);
  instanced(sphereGeo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true}),leafTransforms,leafColors);
  // Small plants, wildflowers, mossy boulders and Dire crystal outcrops.
  for(let i=0;i<2200;i++) {
    const x=range(-22,22),z=range(-22,22);if(radius(x,z)>21.3||Math.abs(x-riverX(z))<2.5)continue;
    dummy.position.set(x,height(x,z)+.12,z);dummy.rotation.set(range(-.2,.2),rand()*6,range(-.15,.15));dummy.scale.set(range(.045,.11),range(.16,.4),range(.045,.11));dummy.updateMatrix();grassTransforms.push(dummy.matrix.clone());grassColors.push(new THREE.Color(isDire(x,z)?0x8b7e62:rand()>.94?0xc8c791:0x91a668));
  }
  instanced(new THREE.ConeGeometry(1,1,3),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}),grassTransforms,grassColors);
  for(let i=0;i<170;i++) {const x=range(-21,21),z=range(-21,21);if(radius(x,z)>21||Math.abs(x-riverX(z))<3||!clearOfPaths(x,z))continue;randomRock(x,z,range(.25,1.15),isDire(x,z)?darkStone:stone);}
  for(let i=0;i<24;i++) {
    const x=range(4,19),z=range(-17,15);if(radius(x,z)>20||!clearOfPaths(x,z))continue;
    for(let j=0;j<3;j++){const m=mesh(crystalGeo,j===0?mat('blackcrystal',0x494445,{metalness:.35,roughness:.45}):mat('embercrystal',0x9e6744,{emissive:0xb22d12,emissiveIntensity:.24}));m.position.set(x+j*.28,height(x,z)+range(.3,.6),z+range(-.3,.3));m.scale.set(range(.22,.5),range(.55,1.5),range(.23,.5));m.rotation.z=range(-.3,.3);}
  }

  function runeCircle(g,r,colorMat) {
    ring(g,0,.18,0,r,colorMat,.028);ring(g,0,.18,0,r*.82,colorMat,.015);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const tile=box(g,Math.cos(a)*r*.91,.19,Math.sin(a)*r*.91,.09,.015,.2,colorMat);tile.rotation.y=-a;}
  }
  const flags=[];
  const flagMaterials={};
  function universityFlag(emblem){
    if(flagMaterials[emblem])return flagMaterials[emblem];
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const c=canvas.getContext('2d');
    c.fillStyle=emblem==='oxford'?'#002147':'#8c242a';c.fillRect(0,0,512,768);
    c.strokeStyle='#c8ad7d';c.lineWidth=12;c.strokeRect(19,19,474,730);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const material=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,roughness:.9});
    const logo=new Image();logo.onload=()=>{const w=386,h=w*logo.height/logo.width;c.drawImage(logo,(512-w)/2,(768-h)/2,w,h);texture.needsUpdate=true;material.userData.crestLoaded=true;};logo.src=`assets/${emblem}.png`;
    return flagMaterials[emblem]=material;
  }
  function flag(parent,x,y,z,dire=false,scale=1,emblem=null) {
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    const w=emblem?1.35:1.03,h=emblem?1.85:1.5;
    if(emblem){g.name=`${emblem}-flag`;g.rotation.y=.58;}
    cone(g,0,1.65,0,.04,.055,3.3,gold,6);segment(g,new THREE.Vector3(-.02,3.14,0),new THREE.Vector3(w+.04,3.14,0),.035,.035,gold);
    const fg=new THREE.PlaneGeometry(w,h,12,16);fg.translate(w/2+.015,3.14-h/2,0);
    const fm=emblem?universityFlag(emblem):new THREE.MeshStandardMaterial({color:dire?0x8d392b:0x427569,side:THREE.DoubleSide,roughness:1});
    const f=mesh(fg,fm,g);f.name=emblem?`${emblem}-flag-cloth`:'realm-flag-cloth';flags.push({mesh:f,base:fg.attributes.position.array.slice(),phase:rand()*6});
    if(!emblem){const symbol=mesh(crystalGeo,trim,g);symbol.scale.set(.13,.27,.025);symbol.position.set(.52,2.5,.045);}
    cone(g,0,3.4,0,0,.14,.35,gold,4);return g;
  }
  const flames=[];
  function torch(x,z,parent=scene,y=height(x,z),color=0xff973e) {
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);cone(g,0,.65,0,.12,.2,1.3,darkStone);cone(g,0,1.37,0,.32,.15,.3,gold);
    const flame=mesh(sphereGeo,orange,g);flame.position.y=1.73;flame.scale.set(.17,.5,.17);flames.push({m:flame,phase:rand()*6});
    point(g,0,1.9,0,color,12,6);return g;
  }
  [[-4,-1.5],[3,1.4],[-8,5],[5,-6],[-13,7],[10,-6],[-14,-7],[14,7]].forEach(([x,z])=>torch(x,z));

  const architectureEffects={mesh,ring,flag,point,animations,teal,orange};
  buildOxfordBase(groupAt(-11.7,10.5),architectureEffects);

  buildGoogle(groupAt(-11,-7),architectureEffects);
  buildCambridgeBase(groupAt(11.6,-9.3),architectureEffects);
  buildMistral(groupAt(13.4,9.6),architectureEffects);

  // Lane defense towers and small outposts add familiar silhouettes to the map.
  function defense(x,z,dire=false) {const g=groupAt(x,z);cone(g,0,.13,0,.95,1.1,.26,stone);cone(g,0,1.0,0,.42,.68,1.65,dire?darkStone:stone,6);cone(g,0,1.85,0,.8,.55,.3,trim,6);const head=mesh(crystalGeo,dire?orange:teal,g);head.position.y=2.35;head.scale.set(.31,.65,.31);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;segment(g,new THREE.Vector3(Math.cos(a)*.55,1.8,Math.sin(a)*.55),new THREE.Vector3(Math.cos(a)*.46,2.85,Math.sin(a)*.46),.12,.02,dire?darkStone:stone);}return g;}
  [[-6,5,false],[6,-4,true],[-16,1,false],[-6,-14,false],[7,-14,true],[-4,15,false],[15,1,true],[10,14,true]].forEach(v=>defense(...v));
  function hut(x,z) {const g=groupAt(x,z);box(g,0,.62,0,1.6,1.25,1.3,stone);const roof=cone(g,0,1.75,0,0,1.5,1.45,mat('roof',0x76664b),4);roof.rotation.y=Math.PI/4;box(g,0,.55,.66,.42,.9,.04,darkStone);box(g,.5,.8,.67,.26,.3,.05,orange);flag(g,-1.2,0,.1,false,.6);}
  hut(-17,3);hut(-6,-10);

  // Scattered ruins and glowing cracks in the Dire terrain.
  for(let i=0;i<9;i++){const x=range(7,19),z=range(-13,5);if(radius(x,z)>20||!clearOfPaths(x,z))continue;const g=groupAt(x,z);cone(g,0,.5,0,.3,.4,range(.6,1.6),stone,7);const b=box(g,.4,.3,.3,.9,.5,.6,darkStone);b.rotation.set(.3,rand(),.4);}
  const crackMat=new THREE.LineBasicMaterial({color:0xec6a30,transparent:true,opacity:.5});
  for(let i=0;i<18;i++) {const x=range(7,19),z=range(-16,7);if(radius(x,z)>20)continue;const pts=[];for(let j=0;j<6;j++){const xx=x+j*.4,zz=z+Math.sin(j*1.6+i)*.23;pts.push(new THREE.Vector3(xx,height(xx,zz)+.025,zz));}const crack=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),crackMat);scene.add(crack);}

  // Waterfall strands carry the river over the edge of the floating island.
  const fallMat=new THREE.MeshBasicMaterial({color:0x93cabf,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false});
  for(const z of [-21.8,21.8])for(let i=0;i<14;i++){const x=riverX(z)+range(-1.0,1.0);const m=mesh(new THREE.PlaneGeometry(range(.045,.17),range(5,10)),fallMat);m.position.set(x,-3.2,z);m.rotation.y=range(-.2,.2);m.castShadow=false;animations.push(t=>{m.material.opacity=.17+Math.sin(t*1.5)*.035;});}

  // Soft volumetric wisps, fireflies and drifting embers.
  const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=128;const ctx=texCanvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(220,241,227,.65)');gradient.addColorStop(.25,'rgba(195,224,209,.23)');gradient.addColorStop(1,'rgba(160,204,203,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);const fogTexture=new THREE.CanvasTexture(texCanvas);
  for(let i=0;i<35;i++) {const a=rand()*Math.PI*2,r=range(19,28);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:fogTexture,color:0x9ebcba,opacity:range(.05,.16),depthWrite:false,blending:THREE.NormalBlending}));sprite.position.set(Math.cos(a)*r,range(-6,-2),Math.sin(a)*r);sprite.scale.set(range(10,20),range(3,6),1);scene.add(sprite);const bx=sprite.position.x;animations.push(t=>sprite.position.x=bx+Math.sin(t*.1+a)*1.2);}
  const particleCount=230,pp=new Float32Array(particleCount*3),pc=new Float32Array(particleCount*3),particleData=[];
  for(let i=0;i<particleCount;i++){const x=range(-22,22),z=range(-21,21),y=height(x,z)+range(.6,5);particleData.push({x,y,z,p:rand()*6,s:range(.2,.8)});const c=new THREE.Color(isDire(x,z)?0xffa46a:0xcbeaa0);pc.set([c.r,c.g,c.b],i*3);}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('color',new THREE.BufferAttribute(pc,3));
  const pm=new THREE.PointsMaterial({size:.16,map:fogTexture,vertexColors:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});scene.add(new THREE.Points(pg,pm));
  animations.push(t=>{particleData.forEach((p,i)=>{pp[i*3]=p.x+Math.sin(t*p.s*.4+p.p)*.7;pp[i*3+1]=p.y+Math.sin(t*p.s+p.p)*.45;pp[i*3+2]=p.z+Math.cos(t*p.s*.3+p.p)*.6;});pg.attributes.position.needsUpdate=true;});

  const meepoBattle=createMeepoBattle(scene,midRoute,camera,reduced);
  // A hawk circles above the river.
  const birds=[];for(let i=0;i<3;i++){const bird=new THREE.Group();const bm=mat('bird',0x292e27);const left=box(bird,-.3,0,0,.6,.035,.15,bm),right=box(bird,.3,0,0,.6,.035,.15,bm);scene.add(bird);birds.push({bird,left,right,p:i*2.1});}
  animations.push(t=>birds.forEach(({bird,left,right,p})=>{const a=t*.13+p;bird.position.set(Math.cos(a)*8,11+Math.sin(a)*1.2,Math.sin(a)*8);bird.rotation.y=-a;left.rotation.z=Math.sin(t*3+p)*.2;right.rotation.z=-Math.sin(t*3+p)*.2;}));

  // Batch static terrain details into a few draws; animated groups stay independent.
  scene.updateMatrixWorld(true);
  const batches=new Map();
  for(const object of [...scene.children]) {
    if(!object.isMesh||object.isInstancedMesh||Array.isArray(object.material))continue;
    const key=object.material.uuid+':'+object.castShadow;
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);
  }
  for(const objects of batches.values()) {
    if(objects.length<3)continue;
    const geometries=objects.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return g.applyMatrix4(o.matrixWorld);});
    const merged=mergeGeometries(geometries);if(!merged)continue;
    const batch=new THREE.Mesh(merged,objects[0].material);batch.castShadow=objects[0].castShadow;batch.receiveShadow=true;scene.add(batch);
    for(const object of objects)scene.remove(object);for(const geometry of geometries)geometry.dispose();
  }

  // HTML landmark labels retain keyboard and screen-reader access.
  const labels=document.querySelector('#world-labels');
  const markerNames={bio:'Bio',experience:'Experience',research:'Research',publications:'Publications'};
  Object.entries(landmarks).forEach(([id,pos],i)=>{
    const button=document.createElement('button');button.className='landmark';button.dataset.destination=id;button.setAttribute('aria-label',`Explore ${markerNames[id].toLowerCase()}`);
    button.innerHTML=`<span class="marker-gem"><b>${i+1}</b></span><span class="marker-name">${markerNames[id]}</span><span class="marker-line"></span>`;
    labels.append(button);button.addEventListener('click',()=>onVisit(id));markers.push({id,button,pos:pos.clone().add(new THREE.Vector3(0,id==='bio'?9.1:id==='experience'?8.8:id==='publications'?6.3:5.6,0))});
  });
  const duskBackground=new THREE.Color(0x1b3034),nightBackground=new THREE.Color(0x0a121e);
  let flight=null,night=false,nightMix=0,userInteracting=false,frame=0,last=performance.now(),elapsed=0,paused=false;
  function cancelFlight(){if(flight){flight.resolve(false);flight=null;}}
  controls.addEventListener('start',()=>{cancelFlight();userInteracting=true;});
  controls.addEventListener('end',()=>{userInteracting=false;});
  const temp=new THREE.Vector3();
  function fly(position,target,duration=1600,opening=false){
    cancelFlight();
    return new Promise(resolve=>{
      flight={from:camera.position.clone(),to:position.clone(),fromTarget:controls.target.clone(),toTarget:target.clone(),start:performance.now(),duration:reduced?1:duration,opening,resolve};
    });
  }
  function reset(explore=false) {
    const sm=innerWidth<=720;
    const target=(sm?mobileTarget:desktopTarget).clone();if(explore)target.set(0,1,0);
    const position=(sm?mobilePosition:desktopPosition).clone();if(explore)position.multiplyScalar(sm?.84:.9);
    return fly(position,target);
  }
  function focus(id,{opening=false}={}) {
    const p=landmarks[id];if(!p)return Promise.resolve(false);
    const sm=innerWidth<=720,base=id==='bio'||id==='experience';
    const target=p.clone().add(sm?new THREE.Vector3(0,-3,0):new THREE.Vector3(5.3,base?1.8:0,-3.5));
    const offset=sm?new THREE.Vector3(24,26,38):new THREE.Vector3(base?19:18,base?18:21,base?25:24);
    return fly(p.clone().add(offset),target,opening?2800:1500,opening);
  }
  function watchBattle(){
    const sm=innerWidth<=720;
    return fly(new THREE.Vector3(sm?12:9,sm?17:13.2,sm?17:13.5),new THREE.Vector3(0,2.3,0),1500);
  }
  let wasMobile=mobile;
  function resize(){const nowMobile=innerWidth<=720;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);if(nowMobile!==wasMobile){controls.maxDistance=nowMobile?190:110;wasMobile=nowMobile;reset(document.querySelector('#intro').classList.contains('explored'));}}
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{paused=document.hidden;last=performance.now();});
  function tick(now) {
    requestAnimationFrame(tick);if(paused)return;
    const delta=THREE.MathUtils.clamp((now-last)/1000,0,.05);last=now;elapsed+=delta;frame++;
    const t=reduced?10:elapsed;
    if(flight){
      let u=THREE.MathUtils.clamp((now-flight.start)/flight.duration,0,1);u=u*u*u*(u*(u*6-15)+10);
      camera.position.lerpVectors(flight.from,flight.to,u);controls.target.lerpVectors(flight.fromTarget,flight.toTarget,u);
      if(flight.opening&&!reduced){camera.position.x+=Math.sin(Math.PI*u)*4;camera.position.y+=Math.sin(Math.PI*u)*3;}
      if(u>=1){const resolve=flight.resolve;flight=null;resolve(true);}
    }
    controls.update();
    nightMix=THREE.MathUtils.lerp(nightMix,night?1:0,.025);
    ambient.intensity=1.5-nightMix*.75;sun.intensity=3.1-nightMix*2.55;rim.intensity=1.8+nightMix*.3;
    sun.color.setHex(night?0xa2b8e5:0xffe1a6);renderer.toneMappingExposure=1.15-nightMix*.06;
    scene.background.lerpColors(duskBackground,nightBackground,nightMix);scene.fog.color.copy(scene.background);
    bloom.strength=.34+nightMix*.2;waterUniforms.time.value=t;waterUniforms.night.value=nightMix;
    for(const fn of animations)fn(t);
    meepoBattle.update(reduced?0:delta);
    for(const {m,phase} of flames){m.scale.y=.44+Math.sin(t*7+phase)*.07;m.scale.x=.17+Math.sin(t*9+phase)*.025;}
    flags.forEach(({mesh:m,base,phase})=>{const arr=m.geometry.attributes.position.array;for(let i=0;i<arr.length;i+=3){const u=base[i];arr[i+2]=Math.sin(u*4+t*2.4+phase)*.12*u+Math.sin(base[i+1]*3+t*1.8)*.055*u;}m.geometry.attributes.position.needsUpdate=true;});
    for(const marker of markers){temp.copy(marker.pos).project(camera);const x=(temp.x*.5+.5)*innerWidth,y=(-temp.y*.5+.5)*innerHeight;const visible=temp.z<1&&x>15&&x<innerWidth-15&&y>120&&y<innerHeight-155;marker.button.style.left=x+'px';marker.button.style.top=y+'px';marker.button.style.opacity=visible?'1':'0';marker.button.style.visibility=visible?'visible':'hidden';}
    renderer.info.reset();composer.render();
    if(frame===3){document.querySelector('#loading').classList.add('loaded');document.body.dataset.worldReady='true';resolveReady();}
    if(frame%60===0){document.body.dataset.drawCalls=renderer.info.render.calls;}
  }
  requestAnimationFrame(tick);
  return {focus,reset,watchBattle,get battle(){return meepoBattle.snapshot();},get lane(){return midRoute;},toggleNight(){night=!night;return night;},get ready(){return ready;},get renderer(){return renderer;},get camera(){return camera;},get scene(){return scene;}};
}
