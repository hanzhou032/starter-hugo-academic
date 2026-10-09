import * as THREE from 'three';

const noise = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
`;

export function createWaterfalls(riverX, uniforms, compact, mistTexture, animations) {
  const group = new THREE.Group(); group.name = 'sky-waterfalls';
  const positions = [], uv = [], phases = [], indices = [], outlets = [];
  function lip(side, lateral) {
    let lo = 18, hi = 22.45;
    for (let i = 0; i < 30; i++) {
      const z = (lo + hi) * .5 * side, x = riverX(z) + lateral;
      if (Math.hypot(x, z) < 22.45) lo = Math.abs(z); else hi = Math.abs(z);
    }
    const z = (lo + hi) * .5 * side;
    return new THREE.Vector3(riverX(z) + lateral, .64, z);
  }
  for (const side of [-1, 1]) {
    const center = lip(side, 0), slope = (riverX(center.z + .01) - riverX(center.z - .01)) / .02;
    const forward = new THREE.Vector3(slope * side, 0, side).normalize();
    const across = new THREE.Vector3(forward.z, 0, -forward.x);
    outlets.push({ center, forward, across });
    const rows = 96, columns = 32, offset = positions.length / 3;
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++) {
      const t = i / rows, u = j / columns;
      const mouth = lip(side, (u * 2 - 1) * 1.78);
      // Constant horizontal speed and gravitational acceleration create the arc.
      mouth.lerp(center, t * .17).addScaledVector(forward, -.22 + 4.7 * t);
      mouth.y = .64 - .55 * t - 25 * t * t;
      positions.push(mouth.x, mouth.y, mouth.z); uv.push(u, t); phases.push(side < 0 ? 5.7 : 0);
      if (i < rows && j < columns) {
        const a = offset + i * (columns + 1) + j, b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    vertexShader: /* glsl */`
      uniform float time;
      attribute float phase;
      varying vec2 vUv;
      varying float vPhase;
      #include <fog_pars_vertex>
      void main() {
        vUv=uv; vPhase=phase;
        vec3 p=position;
        p+=normal*sin(uv.y*45.-time*8.+uv.x*13.+phase)*.055*smoothstep(0.,.15,uv.y);
        vec4 mvPosition=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      uniform float time, night;
      varying vec2 vUv;
      varying float vPhase;
      #include <fog_pars_fragment>
      ${noise}
      void main() {
        vec2 flow=vec2(vUv.x*16.,vUv.y*21.-time*8.7+vPhase);
        float broad=noise(flow*vec2(.43,.64));
        float threads=pow(.5+.5*sin(vUv.x*133.+noise(flow*.7)*3.),7.);
        float streaks=noise(flow*vec2(1.9,.55));
        float foam=smoothstep(.38,.84,streaks)*(.35+threads*.65);
        foam+=pow(1.-vUv.y,18.)*(.28+broad*.45);
        float edges=smoothstep(0.,.055,vUv.x)*(1.-smoothstep(.945,1.,vUv.x));
        float fade=1.-smoothstep(.58,1.,vUv.y+noise(flow*.35)*.08);
        vec3 water=mix(vec3(.055,.21,.21),vec3(.18,.39,.36),broad);
        vec3 color=mix(water,vec3(.62,.79,.69),min(.83,foam));
        color*=1.-night*.65;
        gl_FragColor=vec4(color,edges*fade*(.51+threads*.24+broad*.12));
        #include <fog_fragment>
      }
    `,
  });
  const curtain = new THREE.Mesh(geometry, material); curtain.name = 'flowing-waterfall-curtains'; group.add(curtain);

  // Fine spray follows ballistic trajectories; particles fade into the cloud sea.
  const count = compact ? 100 : 240, origins = [], launch = [], seeds = [];
  for (let i = 0; i < count; i++) {
    const outlet = outlets[i % 2], u = Math.sin(i * 127.1) * .5 + .5;
    const origin = outlet.center.clone().addScaledVector(outlet.across, (u * 2 - 1) * 1.55);
    origins.push(origin.x, origin.y, origin.z);
    launch.push(outlet.forward.x * (1.5 + u), .15 + (i % 7) * .07, outlet.forward.z * (1.5 + u));
    seeds.push((i * .618034) % 1, .5 + (i % 9) / 9);
  }
  const sprayGeometry = new THREE.BufferGeometry();
  sprayGeometry.setAttribute('position', new THREE.Float32BufferAttribute(origins, 3));
  sprayGeometry.setAttribute('launch', new THREE.Float32BufferAttribute(launch, 3));
  sprayGeometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 2));
  const sprayMaterial = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    transparent: true, depthWrite: false, fog: true,
    vertexShader: /* glsl */`
      uniform float time;
      attribute vec3 launch;
      attribute vec2 seed;
      varying float opacity;
      #include <fog_pars_vertex>
      void main() {
        float life=fract(time*.37+seed.x), age=life*2.7;
        vec3 p=position+launch*age; p.y-=4.8*age*age;
        vec4 mvPosition=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mvPosition;
        gl_PointSize=clamp(90.*seed.y/-mvPosition.z,1.,4.);
        opacity=smoothstep(0.,.08,life)*(1.-smoothstep(.63,1.,life));
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      uniform float night;
      varying float opacity;
      #include <fog_pars_fragment>
      void main() {
        float alpha=1.-smoothstep(.1,.5,length(gl_PointCoord-.5));
        gl_FragColor=vec4(vec3(.46,.67,.61)*(1.-night*.63),alpha*opacity*.38);
        #include <fog_fragment>
      }
    `,
  });
  const spray = new THREE.Points(sprayGeometry, sprayMaterial); spray.name = 'falling-water-spray'; spray.frustumCulled = false; group.add(spray);
  for (const [side, outlet] of outlets.entries()) for (let i = 0; i < 5; i++) {
    const material = new THREE.SpriteMaterial({ map: mistTexture, color: 0xa5c5bb, transparent: true, opacity: .19, depthWrite: false });
    const mist = new THREE.Sprite(material), base = outlet.center.clone().addScaledVector(outlet.forward, 3.4 + i * .45);
    base.y = -12 - i * 2.6; mist.position.copy(base); mist.scale.set(5 + i * 1.2, 4 + i * .65, 1); group.add(mist);
    animations.push(t => {
      mist.position.copy(base).addScaledVector(outlet.across, Math.sin(t * .42 + i + side) * (.7 + i * .16));
      mist.position.y += Math.sin(t * .55 + i) * .5;
      material.opacity = .22 * (1 - uniforms.night.value * .6);
    });
  }
  return group;
}
