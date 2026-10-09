import * as THREE from 'three';

export function createRiver(riverX, uniforms) {
  const positions = [], uv = [], indices = [], rows = 180, columns = 18;
  for (let i = 0; i <= rows; i++) {
    const z = -22.4 + i * 44.8 / rows, center = riverX(z), edge = Math.sqrt(Math.max(0, 22.45 ** 2 - z * z));
    for (let j = 0; j <= columns; j++) {
      positions.push(THREE.MathUtils.clamp(center + (j / columns * 2 - 1) * 1.78, -edge, edge), .64, z); uv.push(j / columns, i / rows);
      if (i < rows && j < columns) { const a = i * (columns + 1) + j, b = a + columns + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide,
    vertexShader: `
      uniform float time;varying vec2 vUv;varying vec3 world;
      void main(){vUv=uv;vec3 p=position;float edge=sin(uv.x*3.14159);
        p.y+=edge*(sin(p.z*2.8-time*1.9+p.x*1.5)*.026+sin(p.x*5.3+p.z*1.7-time*2.7)*.017);
        world=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
      }`,
    fragmentShader: `
      uniform float time,night;varying vec2 vUv;varying vec3 world;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float ripple(vec2 p){return sin(p.x*8.+p.y*3.)*.4+sin(p.x*4.1-p.y*7.8)*.23+noise(p*7.)*.42;}
      void main(){
        vec2 flow=world.xz+vec2(.12,-.57)*time;
        float wave=ripple(flow),dx=(ripple(flow+vec2(.025,0))-wave)/.025,dz=(ripple(flow+vec2(0,.025))-wave)/.025;
        vec3 normal=normalize(vec3(-dx*.037,1.,-dz*.037));
        vec3 view=normalize(cameraPosition-world);float facing=max(.001,dot(view,normal));
        float fresnel=.025+.975*pow(1.-facing,5.);
        float depth=pow(sin(vUv.x*3.14159),.65);
        float caustic=pow(max(0.,sin(flow.x*6.2+sin(flow.y*4.3))*sin(flow.y*5.6+sin(flow.x*3.6))),5.);
        vec3 bed=mix(vec3(.16,.19,.115),vec3(.035,.135,.145),depth);
        bed+=caustic*vec3(.13,.19,.11)*(1.-depth*.8);
        vec3 water=mix(bed,vec3(.012,.065,.09),depth*.6);
        vec3 reflected=reflect(-view,normal);
        float cloud=noise(reflected.xz*5.+wave*.05);
        vec3 sky=mix(vec3(.07,.135,.19),vec3(.3,.41,.46),smoothstep(-.1,.85,reflected.y))*(.65+cloud*.35);
        sky=mix(sky,vec3(.025,.07,.125)+vec3(.08,.035,.12)*cloud,night*.85);
        vec3 color=mix(water,sky,.22+fresnel*.68);
        vec3 sun=normalize(vec3(-22.,38.,15.)),halfway=normalize(sun+view);
        float spec=pow(max(0.,dot(normal,halfway)),130.)+pow(max(0.,dot(normal,halfway)),520.)*.65;
        color+=vec3(1.,.85,.58)*spec*(1.-night*.9)*1.5;
        float bank=abs(vUv.x*2.-1.);float edgeNoise=noise(flow*vec2(6.,2.));
        float foam=smoothstep(.77+edgeNoise*.16,.99,bank)*(.32+edgeNoise*.55);
        // Foam gathers against the four central masonry supports and trails downstream.
        for(int i=0;i<4;i++){
          float a=i<2?-1.7:1.7,b=mod(float(i),2.)<.5?-2.05:2.05;
          vec2 pier=vec2(a+b,-a+b)*.70710678;
          vec2 p=world.xz-pier;float wake=exp(-abs(p.x)*8.)*exp(-max(0.,p.y)*2.3)*step(0.,p.y)*step(p.y,1.6);
          foam+=wake*.42*(.4+noise(flow*13.)*.6);
        }
        color=mix(color,vec3(.61,.77,.73)*(1.-night*.5),clamp(foam,0.,.8));
        vec2 bridge=vec2(world.x-world.z,world.x+world.z)*.70710678;
        float shadow=(1.-smoothstep(5.25,5.9,abs(bridge.x)))*(1.-smoothstep(2.05,2.6,abs(bridge.y)));
        color*=1.-shadow*.6;
        color*=1.-night*.23;
        gl_FragColor=vec4(color,1.);
      }`,
  });
  const river = new THREE.Mesh(geometry, material); river.name = 'flowing-river'; river.receiveShadow = true; return river;
}
