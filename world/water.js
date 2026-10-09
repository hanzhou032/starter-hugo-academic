import * as THREE from 'three';

const WATER_LEVEL = .64;

// Low, overlapping waves travel along the measured channel rather than across it.
// The same analytic height/gradient is used by the geometry and the lighting.
const waves = /* glsl */`
  vec3 wave(vec2 p, vec2 direction, float frequency, float amplitude, float phase, float footprint) {
    float a = dot(direction, p) * frequency + phase;
    amplitude *= exp(-frequency * frequency * footprint * footprint * .6);
    return vec3(sin(a) * amplitude, cos(a) * amplitude * frequency * direction);
  }
  vec3 surface(vec2 p, float footprint) {
    p.y -= time * .58;
    return wave(p, vec2(.42, .9075), 3.1, .017, .4, footprint)
      + wave(p, vec2(-.72, .694), 5.7, .009, 2.1, footprint)
      + wave(p, vec2(.94, .342), 10.8, .004, 4.3 + time * .13, footprint)
      + wave(p, vec2(-.23, .973), 18.5, .0018, 1.3, footprint)
      + wave(p, vec2(.81, -.586), 27.0, .0009, 3.6 - time * .17, footprint);
  }
`;

export function createRiver(riverX, uniforms, { height, reduced = false } = {}) {
  const positions = [], uv = [], flow = [], depths = [], slopes = [], indices = [];
  const rows = 180, columns = 18;
  let distance = 0, lastCenter = riverX(-22.4);
  for (let i = 0; i <= rows; i++) {
    const z = -22.4 + i * 44.8 / rows, center = riverX(z);
    const edge = Math.sqrt(Math.max(0, 22.45 ** 2 - z * z));
    const slope = (riverX(z + .01) - riverX(z - .01)) / .02;
    if (i) distance += Math.hypot(44.8 / rows, center - lastCenter);
    lastCenter = center;
    for (let j = 0; j <= columns; j++) {
      const x = THREE.MathUtils.clamp(center + (j / columns * 2 - 1) * 1.78, -edge, edge);
      positions.push(x, WATER_LEVEL, z);
      uv.push(j / columns, i / rows);
      flow.push(x - center, distance);
      depths.push(height ? Math.max(0, WATER_LEVEL - height(x, z)) : .32 * Math.sin(j / columns * Math.PI));
      slopes.push(slope);
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j, b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, data, size] of [['position', positions, 3], ['uv', uv, 2], ['flow', flow, 2], ['depth', depths, 1], ['slope', slopes, 1]]) {
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(data, size));
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const reflection = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
  reflection.texture.name = 'river-scene-reflection';
  const reflectionMatrix = new THREE.Matrix4();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms,
      reflectionMap: { value: reflection.texture },
      reflectionMatrix: { value: reflectionMatrix },
      reflectionTexel: { value: new THREE.Vector2(1, 1) },
    },
    side: THREE.DoubleSide, fog: true,
    vertexShader: /* glsl */`
      uniform float time;
      uniform mat4 reflectionMatrix;
      attribute vec2 flow;
      attribute float depth, slope;
      varying vec2 vFlow;
      varying float vDepth, vSlope;
      varying vec3 world;
      varying vec4 vReflection;
      #include <fog_pars_vertex>
      ${waves}
      void main() {
        vFlow = flow; vDepth = depth; vSlope = slope;
        vec3 p = position;
        p.y += surface(flow, 0.).x * smoothstep(0., .16, depth);
        world = (modelMatrix * vec4(p, 1.)).xyz;
        vReflection = reflectionMatrix * vec4(world, 1.);
        vec4 mvPosition = viewMatrix * vec4(world, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float time, night;
      uniform sampler2D reflectionMap;
      uniform vec2 reflectionTexel;
      varying vec2 vFlow;
      varying float vDepth, vSlope;
      varying vec3 world;
      varying vec4 vReflection;
      #include <fog_pars_fragment>
      ${waves}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        // Remove subpixel ripples at distant/mobile views instead of letting them sparkle.
        float footprint = max(length(dFdx(vFlow)), length(dFdy(vFlow)));
        vec3 wave = surface(vFlow, footprint);
        float bankDamping = smoothstep(0., .16, vDepth);
        vec2 gradient = wave.yz * bankDamping;
        vec3 normal = normalize(vec3(-gradient.x, 1., gradient.x * vSlope - gradient.y * sqrt(1. + vSlope * vSlope)));
        vec3 view = normalize(cameraPosition - world);
        float facing = max(.001, dot(view, normal));
        float fresnel = .0204 + .9796 * pow(1. - facing, 5.);
        vec2 current = vec2(vFlow.x, vFlow.y - time * .58);

        // Beer–Lambert absorption: the shallows retain a stony olive bed,
        // while the deeper channel loses red light and becomes jade/teal.
        float opticalDepth = max(0., vDepth) * 4.5 / max(.38, view.y);
        vec3 transmission = exp(-vec3(2.5, .95, .72) * opticalDepth);
        float bedGrain = noise(world.xz * 7.) * .55 + noise(world.xz * 19.) * .25;
        vec3 bed = vec3(.115, .142, .091) * (.74 + bedGrain * .36);
        vec2 causticUV = world.xz * 3.3 + wave.yz * 2.;
        float caustic = 1. - abs(sin(causticUV.x + sin(causticUV.y + time * .28))
          + sin(causticUV.y * 1.23 - time * .21)) * .5;
        caustic = pow(max(0., caustic), 15.);
        bed += vec3(.085, .12, .055) * caustic * (1. - night * .92) * exp(-vDepth * 5.);
        vec3 deepWater = mix(vec3(.011, .064, .068), vec3(.005, .027, .034), night);
        vec3 color = mix(deepWater, bed * (1. - night * .76), transmission);

        // A clipped mirrored camera captures actual trees, bridge arches, and lights.
        // Gentle normal-driven distortion and a small filter soften the reflection.
        vec2 projectedNormal = (viewMatrix * vec4(normal - vec3(0, 1, 0), 0.)).xy;
        vec2 reflectUV = vReflection.xy / vReflection.w + projectedNormal * .035;
        reflectUV = clamp(reflectUV, reflectionTexel * 2., vec2(1.) - reflectionTexel * 2.);
        vec2 blur = reflectionTexel * 1.25;
        vec3 reflected = texture2D(reflectionMap, reflectUV).rgb * .4;
        reflected += texture2D(reflectionMap, reflectUV + vec2(blur.x, 0)).rgb * .15;
        reflected += texture2D(reflectionMap, reflectUV - vec2(blur.x, 0)).rgb * .15;
        reflected += texture2D(reflectionMap, reflectUV + vec2(0, blur.y)).rgb * .15;
        reflected += texture2D(reflectionMap, reflectUV - vec2(0, blur.y)).rgb * .15;
        color = mix(color, reflected, min(.92, .065 + fresnel * .9));

        vec2 bridge = vec2(world.x - world.z, world.x + world.z) * .70710678;
        float shadow = (1. - smoothstep(5.2, 5.9, abs(bridge.x))) * (1. - smoothstep(1.9, 2.8, abs(bridge.y)));
        color *= 1. - shadow * .46;
        vec3 sun = normalize(vec3(-22., 38., 15.));
        float halfDot = max(0., dot(normal, normalize(sun + view)));
        float glint = pow(halfDot, 22.) * .045 + pow(halfDot, 160.) * .3 + pow(halfDot, 640.) * .8;
        color += mix(vec3(1., .77, .43), vec3(.23, .39, .55), night)
          * glint * (1. - shadow * .92) * (1. - night * .7);

        // Broken, narrow foam follows actual terrain depth, not a painted border.
        float foamNoise = noise(current * vec2(7., 2.6));
        float foam = exp(-vDepth * 68.) * smoothstep(.42, .78, foamNoise) * .3;
        vec2 downstream = normalize(vec2(vSlope, 1.));
        vec2 across = vec2(downstream.y, -downstream.x);
        for (int i = 0; i < 4; i++) {
          float a = i < 2 ? -1.75 : 1.75, b = mod(float(i), 2.) < .5 ? -2.05 : 2.05;
          vec2 pier = vec2(a + b, -a + b) * .70710678;
          vec2 offset = world.xz - pier;
          float along = dot(offset, downstream), crossFlow = dot(offset, across);
          float wakeWidth = .07 + max(0., along) * .15;
          float wake = exp(-pow(crossFlow / wakeWidth, 2.)) * exp(-max(0., along) * 1.8)
            * smoothstep(-.08, .12, along);
          foam += wake * smoothstep(.3, .75, foamNoise) * .28;
        }
        vec3 foamColor = mix(vec3(.32, .43, .34), vec3(.08, .16, .17), night);
        color = mix(color, foamColor * (1. - shadow * .6), min(.45, foam));
        gl_FragColor = vec4(color, 1.);
        #include <fog_fragment>
      }`,
  });
  const river = new THREE.Mesh(geometry, material);
  river.name = 'flowing-river';
  river.receiveShadow = true;

  // One compact HDR planar reflection. Cache it between updates; camera movement
  // always refreshes immediately, so orbiting does not drag a stale mirror image.
  const mirrorCamera = new THREE.PerspectiveCamera();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WATER_LEVEL);
  const cameraPlane = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  const direction = new THREE.Vector3(), up = new THREE.Vector3(), target = new THREE.Vector3();
  const rotation = new THREE.Matrix4(), lastView = new THREE.Matrix4(), lastProjection = new THREE.Matrix4();
  const viewport = new THREE.Vector4();
  let lastTime = -Infinity, lastNight = -1, captures = 0;
  river.userData.reflection = { captures: 0, width: 0, height: 0 };
  river.onBeforeRender = (renderer, scene, camera) => {
    if (camera.position.y <= WATER_LEVEL || camera === mirrorCamera) return;
    const compact = renderer.domElement.clientWidth <= 720;
    const cameraMoved = !lastView.equals(camera.matrixWorld) || !lastProjection.equals(camera.projectionMatrix);
    const lightingChanged = Math.abs(uniforms.night.value - lastNight) > .006;
    const elapsed = uniforms.time.value - lastTime;
    if (captures && !cameraMoved && !lightingChanged && (reduced || elapsed < (compact ? 1 / 24 : 1 / 30))) return;

    const size = compact ? 384 : 768, aspect = camera.aspect;
    const width = Math.round(size * Math.min(1, aspect)), height = Math.round(size * Math.min(1, 1 / aspect));
    if (reflection.width !== width || reflection.height !== height) {
      reflection.setSize(width, height);
      material.uniforms.reflectionTexel.value.set(1 / width, 1 / height);
    }
    mirrorCamera.position.copy(camera.position);
    mirrorCamera.position.y = WATER_LEVEL * 2 - camera.position.y;
    rotation.extractRotation(camera.matrixWorld);
    direction.set(0, 0, -1).applyMatrix4(rotation).reflect(plane.normal);
    up.set(0, 1, 0).applyMatrix4(rotation).reflect(plane.normal);
    mirrorCamera.up.copy(up);
    mirrorCamera.lookAt(target.copy(mirrorCamera.position).add(direction));
    mirrorCamera.near = camera.near; mirrorCamera.far = camera.far;
    mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);
    mirrorCamera.updateMatrixWorld();
    reflectionMatrix.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1)
      .multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);

    // Oblique near plane removes everything below the water from the reflection.
    cameraPlane.copy(plane).applyMatrix4(mirrorCamera.matrixWorldInverse);
    clip.set(cameraPlane.normal.x, cameraPlane.normal.y, cameraPlane.normal.z, cameraPlane.constant);
    const projection = mirrorCamera.projectionMatrix.elements;
    q.set((Math.sign(clip.x) + projection[8]) / projection[0], (Math.sign(clip.y) + projection[9]) / projection[5], -1, (1 + projection[10]) / projection[14]);
    clip.multiplyScalar(2 / clip.dot(q));
    projection[2] = clip.x; projection[6] = clip.y; projection[10] = clip.z + 1 - .003; projection[14] = clip.w;
    mirrorCamera.projectionMatrixInverse.copy(mirrorCamera.projectionMatrix).invert();

    const previousTarget = renderer.getRenderTarget(), previousShadowUpdate = renderer.shadowMap.autoUpdate;
    const previousXR = renderer.xr.enabled;
    renderer.getViewport(viewport);
    river.visible = false;
    try {
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(reflection);
      renderer.clear();
      renderer.render(scene, mirrorCamera);
      lastView.copy(camera.matrixWorld); lastProjection.copy(camera.projectionMatrix);
      lastTime = uniforms.time.value; lastNight = uniforms.night.value;
      Object.assign(river.userData.reflection, { captures: ++captures, width, height });
    } finally {
      river.visible = true;
      renderer.xr.enabled = previousXR;
      renderer.shadowMap.autoUpdate = previousShadowUpdate;
      renderer.setRenderTarget(previousTarget);
      renderer.setViewport(viewport);
    }
  };
  material.addEventListener('dispose', () => reflection.dispose());
  return river;
}
