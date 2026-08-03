import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { AppPage } from '../types';

interface Props {
  currentPage: AppPage;
}

const vertShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragShader = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.3, 0.5, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const nebulaVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFrag = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.0 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float t = uTime * 0.05;
    float n = fbm(uv * 3.0 + t);
    float n2 = fbm(uv * 5.0 - t * 0.7 + vec2(3.4, 1.2));
    float cloud = n * n2 * 2.5;
    float radial = 1.0 - length(uv) * 2.0;
    radial = clamp(radial, 0.0, 1.0);
    float alpha = cloud * radial * 0.18;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const rimVert = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const rimFrag = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform vec3 uColor;
  void main() {
    float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    rim = pow(rim, 3.0);
    gl_FragColor = vec4(uColor, rim * 0.25);
  }
`;

function hsl(h: number, s: number, l: number): THREE.Color {
  const c = new THREE.Color();
  c.setHSL(h, s, l);
  return c;
}

export default function ThreeBackground({ currentPage }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isMobile = window.innerWidth < 768;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x00000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 1, 10000);
    camera.position.z = 1000;

    // ---- Stars ----
    function makeStarLayer(count: number, spread: number, sizeRange: [number, number]) {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * spread;
        positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.4;

        const rng = Math.random();
        let col: THREE.Color;
        if (rng < 0.7) {
          const v = 0.7 + Math.random() * 0.3;
          col = new THREE.Color(v, v, v);
        } else if (rng < 0.9) {
          col = hsl(0.08 + Math.random() * 0.02, 0.5, 0.75 + Math.random() * 0.1);
        } else {
          col = hsl(0.73 + Math.random() * 0.04, 0.5, 0.75 + Math.random() * 0.1);
        }

        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
        sizes[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.ShaderMaterial({
        vertexShader: vertShader,
        fragmentShader: fragShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      return new THREE.Points(geo, mat);
    }

    const mult = isMobile ? 0.5 : 1;
    const layer1 = makeStarLayer(Math.floor(2000 * mult), 4000, [0.4, 1.2]);
    const layer2 = makeStarLayer(Math.floor(1200 * mult), 3000, [0.8, 1.8]);
    const layer3 = makeStarLayer(Math.floor(600 * mult), 2000, [1.2, 2.8]);
    scene.add(layer1, layer2, layer3);

    // ---- Nebula planes ----
    function makeNebula(color: THREE.Color, size: number, x: number, y: number, z: number) {
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.ShaderMaterial({
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: color },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      return mesh;
    }

    const nebula1 = makeNebula(new THREE.Color(0.5, 0.3, 1.0), 2400, -300, 200, -800);
    const nebula2 = makeNebula(new THREE.Color(0.8, 0.6, 0.1), 1800, 400, -100, -600);
    const nebula3 = makeNebula(new THREE.Color(0.3, 0.2, 0.8), 2000, 100, -300, -900);
    scene.add(nebula1, nebula2, nebula3);

    // ---- Atmosphere rim sphere ----
    const rimGeo = new THREE.SphereGeometry(600, 32, 32);
    const rimMat = new THREE.ShaderMaterial({
      vertexShader: rimVert,
      fragmentShader: rimFrag,
      uniforms: { uColor: { value: new THREE.Color(0.52, 0.36, 1.0) } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const rimSphere = new THREE.Mesh(rimGeo, rimMat);
    rimSphere.position.set(-200, 100, -1200);
    scene.add(rimSphere);

    // ---- Scroll & parallax ----
    let scrollY = 0;
    let targetCameraZ = 1000;
    let currentCameraZ = 1000;

    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ---- Resize ----
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ---- Animation loop ----
    let frameId: number;
    let time = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      time += 0.016;

      const page = currentPageRef.current;
      if (page === 'hero') {
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const scrollFrac = docH > 0 ? scrollY / docH : 0;
        targetCameraZ = 1000 - scrollFrac * 600;
      } else {
        targetCameraZ = 400;
      }
      currentCameraZ += (targetCameraZ - currentCameraZ) * 0.05;
      camera.position.z = currentCameraZ;

      // Parallax rotation
      layer1.rotation.y = time * 0.00015;
      layer2.rotation.y = time * 0.00008;
      layer3.rotation.y = time * 0.00004;

      layer1.position.y = -scrollY * 0.03;
      layer2.position.y = -scrollY * 0.015;
      layer3.position.y = -scrollY * 0.007;

      // Nebula time uniforms
      (nebula1.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      (nebula2.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      (nebula3.material as THREE.ShaderMaterial).uniforms.uTime.value = time;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 30%, #0d0820 0%, #050510 40%, #000000 100%)',
      }}
    />
  );
}
