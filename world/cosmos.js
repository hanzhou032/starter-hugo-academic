import * as THREE from 'three';

// An original Stellaris-inspired vista, rendered before the island with its own depth buffer.
const noiseGLSL = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=mat2(1.6,1.2,-1.2,1.6)*p+7.3;a*=.5;}return v;}
`;

export function createCosmos(camera, renderer) {
  const scene = new THREE.Scene(); scene.name = 'stellaris-inspired-cosmos'; scene.background = new THREE.Color(0x030814);
  const root = new THREE.Group(); root.quaternion.copy(camera.quaternion); scene.add(root);
  const time = { value: 0 }, night = { value: 0 };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(222, 40, 24), new THREE.ShaderMaterial({
    uniforms: { time, night }, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `${noiseGLSL}
      uniform float time,night;varying vec3 direction;
      void main(){
        vec3 d=normalize(direction);vec2 q=vec2(atan(d.x,-d.z),asin(d.y));
        vec2 drift=vec2(time*.0008,-time*.0003);
        float detail=fbm(q*9.+drift),turbulence=fbm(q*4.7+detail*2.2);
        float band=exp(-abs(q.y+q.x*.32-.12+(turbulence-.5)*.17)*10.);
        float dust=pow(max(0.,detail*.7+turbulence*.5-.23),1.7)*band;
        vec3 cloud=mix(vec3(.018,.078,.12),vec3(.10,.029,.145),smoothstep(-.6,.55,q.x));
        vec3 color=vec3(.002,.005,.016)+cloud*dust*2.5;
        float core=exp(-length((q-vec2(-.24,.17))*vec2(3.,6.)))*band;
        color+=vec3(.037,.052,.075)*core*(.3+detail);
        color*=1.+night*.18;
        gl_FragColor=vec4(color,1.);
      }`,
  })); sky.name = 'nebula-panorama'; sky.renderOrder = -100; root.add(sky);
  let seed = 118206;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const positions = [], colors = [], sizes = [], phases = [];
  const count = innerWidth < 720 ? 2100 : 3500;
  for (let i = 0; i < count; i++) {
    const band = i % 3 === 0;
    const longitude = band ? (random() - .5) * 2.3 : random() * Math.PI * 2;
    const latitude = band ? -.32 * longitude + .12 + (random() - .5) * .26 : Math.asin(random() * 2 - 1);
    positions.push(Math.sin(longitude) * Math.cos(latitude) * 212, Math.sin(latitude) * 212, -Math.cos(longitude) * Math.cos(latitude) * 212);
    const c = new THREE.Color().setHSL(random() > .22 ? .57 + random() * .07 : .1, .12 + random() * .36, .64 + random() * .34);
    colors.push(c.r, c.g, c.b); sizes.push((i % 29 === 0 ? 2.4 : .7) + random() * 1.15); phases.push(random() * 6.28);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('starSize', new THREE.Float32BufferAttribute(sizes, 1)); geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const stars = new THREE.Points(geometry, new THREE.ShaderMaterial({
    uniforms: { time, pixelRatio: { value: renderer.getPixelRatio() } }, transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time,pixelRatio;attribute float starSize,phase;varying vec3 tint;varying float flicker;void main(){tint=color;flicker=.78+.22*sin(time*.65+phase);gl_PointSize=starSize*pixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 tint;varying float flicker;void main(){float d=length(gl_PointCoord-.5);float glow=exp(-d*d*14.);if(d>.5)discard;gl_FragColor=vec4(tint*1.3,glow*flicker);}`,
  })); stars.name = 'distant-stars'; root.add(stars);

  function planet(name, radius, colorA, colorB, gas = true) {
    const material = new THREE.ShaderMaterial({
      uniforms: { time, tintA: { value: new THREE.Color(colorA) }, tintB: { value: new THREE.Color(colorB) }, gas: { value: gas ? 1 : 0 } },
      vertexShader: `varying vec3 n;varying vec2 vUv;void main(){n=normal;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `${noiseGLSL}
        uniform float time,gas;uniform vec3 tintA,tintB;varying vec3 n;varying vec2 vUv;
        void main(){vec3 normal=normalize(n);float turbulence=fbm(vUv*vec2(9.,16.)+vec2(time*.0004,0));
          float bands=.5+.5*sin(vUv.y*105.+turbulence*7.);
          float terrain=mix(smoothstep(.35,.63,turbulence),bands,gas);
          vec3 color=mix(tintA,tintB,terrain*.78+.1);
          float lit=max(0.,dot(normal,normalize(vec3(-.75,.45,.65))));
          color*=.035+lit*.94;
          float rim=pow(1.-max(0.,normal.z),4.5)*pow(lit,.4);
          color+=vec3(.07,.22,.38)*rim;
          gl_FragColor=vec4(color,1.);
        }`,
    });
    const g = new THREE.Group(); g.name = name; root.add(g);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), material); g.add(globe);
    return g;
  }
  const giant = planet('ringed-gas-giant', 11, 0x728596, 0xc6b5a0);
  const rings = new THREE.Mesh(new THREE.RingGeometry(14, 23, 120, 1), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 p;void main(){float r=length(p.xy);float bands=.55+.45*sin(r*17.)*sin(r*6.3);float gaps=smoothstep(.08,.22,abs(r-18.3));float edge=smoothstep(14.,14.5,r)*(1.-smoothstep(22.2,23.,r));vec3 col=mix(vec3(.17,.23,.29),vec3(.52,.46,.35),bands);gl_FragColor=vec4(col,edge*gaps*(.18+bands*.52));}`,
  })); rings.rotation.set(1.1, .25, -.36); giant.add(rings);
  const moon = planet('blue-frontier-world', 5.8, 0x164d67, 0x8db1bd, false);

  // Sparse stellar systems and hyperlanes echo a galactic strategy map.
  const systems = [[-.96,.28],[-.82,.57],[-.55,.7],[-.36,.56],[-.29,.84],[.34,.83],[.57,.69],[.75,.21],[.93,.02],[.77,-.33]];
  const nodes = new THREE.Group(); nodes.name = 'stellar-hyperlanes'; root.add(nodes);
  const systemMeshes = systems.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0x98d4e9 })); nodes.add(m); return m; });
  const lineGeometry = new THREE.BufferGeometry(); const linePositions = new Float32Array(8 * 6); lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const links = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x6097b4, transparent: true, opacity: .14, depthWrite: false })); nodes.add(links);
  const pairs = [[0,1],[1,2],[2,3],[2,4],[5,6],[6,7],[7,8],[8,9]];
  const fleet = new THREE.Group(); fleet.name = 'distant-exploration-fleet'; root.add(fleet);
  const hull = new THREE.MeshStandardMaterial({ color: 0x5f7e8c, roughness: .6, metalness: .65 });
  const engine = new THREE.MeshBasicMaterial({ color: 0x9adcff });
  for (let i = 0; i < 5; i++) {
    const ship = new THREE.Group(); ship.position.set(i * 1.4, Math.abs(i - 2) * .55, 0); fleet.add(ship);
    const body = new THREE.Mesh(new THREE.ConeGeometry(.28, 1.8, 4), hull); body.rotation.z = -Math.PI / 2; body.scale.z = .4; ship.add(body);
    const drive = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), engine); drive.position.x = -.8; ship.add(drive);
  }
  const light = new THREE.DirectionalLight(0xc5dbef, 2); light.position.set(-100, 70, 60); root.add(light); scene.add(new THREE.AmbientLight(0x637899, .6));
  const place = (g, x, y, depth) => g.position.set(x * depth * .364 * camera.aspect, y * depth * .364, -depth);
  let aspect = 0;
  function layout() {
    aspect = camera.aspect; const mobile = aspect < 1;
    place(giant, mobile ? .85 : .8, .63, 162); giant.scale.setScalar(mobile ? .52 : 1);
    place(moon, -.85, -.22, 170); moon.scale.setScalar(mobile ? .6 : 1);
    systems.forEach(([x,y], i) => place(systemMeshes[i], x, y, 198));
    pairs.forEach(([a,b], i) => { systemMeshes[a].position.toArray(linePositions, i * 6); systemMeshes[b].position.toArray(linePositions, i * 6 + 3); }); lineGeometry.attributes.position.needsUpdate = true;
  }
  layout();
  return {
    scene,
    update(t, darkness) {
      time.value = t; night.value = darkness; root.position.copy(camera.position);
      if (camera.aspect !== aspect) layout();
      place(fleet, -.67 + Math.sin(t * .014) * .12, .82, 144);
    },
  };
}
