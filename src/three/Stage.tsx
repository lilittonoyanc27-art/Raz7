import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { useProgress } from '../core/store';
import type { Quality, TimeOfDay } from '../core/types';
import { player } from './world';

export const QUALITY: Record<Quality, { dpr: number; shadows: boolean; shadowSize: number; npc: number; cars: number; far: number; detail: number }> = {
  Bajo: { dpr: 0.85, shadows: false, shadowSize: 512, npc: 8, cars: 8, far: 160, detail: 0 },
  Medio: { dpr: 1.25, shadows: true, shadowSize: 1024, npc: 16, cars: 16, far: 240, detail: 1 },
  Alto: { dpr: 1.75, shadows: true, shadowSize: 2048, npc: 26, cars: 24, far: 320, detail: 2 },
  Ultra: { dpr: 2, shadows: true, shadowSize: 4096, npc: 36, cars: 32, far: 420, detail: 3 },
};
export const useQuality = () => QUALITY[useProgress((s) => s.settings.quality)];

const TOD: Record<TimeOfDay, { sun: [number, number, number]; sunColor: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; fog: string; turbidity: number; rayleigh: number; exposure: number }> = {
  dia: { sun: [60, 90, 40], sunColor: '#fff4e0', sunI: 2.4, hemiSky: '#bcd8ff', hemiGround: '#8a7a5a', hemiI: 1.0, fog: '#cfe2f3', turbidity: 6, rayleigh: 1.2, exposure: 1.0 },
  tarde: { sun: [-80, 26, -60], sunColor: '#ffc68a', sunI: 2.2, hemiSky: '#9fb8ff', hemiGround: '#c98a6a', hemiI: 0.95, fog: '#e7b7b9', turbidity: 9, rayleigh: 2.6, exposure: 0.95 },
  noche: { sun: [-40, 60, 30], sunColor: '#9db4ff', sunI: 0.45, hemiSky: '#2a3d7a', hemiGround: '#1a1620', hemiI: 0.45, fog: '#0f1630', turbidity: 2, rayleigh: 0.2, exposure: 1.05 },
};

export function Lights({ tod, followPlayer = true }: { tod: TimeOfDay; followPlayer?: boolean }) {
  const q = useQuality();
  const cfg = TOD[tod];
  const sun = useRef<THREE.DirectionalLight>(null);
  const { scene, gl } = useThree();
  useEffect(() => {
    scene.fog = new THREE.Fog(cfg.fog, q.far * 0.35, q.far);
    scene.background = new THREE.Color(cfg.fog);
    gl.toneMappingExposure = cfg.exposure;
  }, [tod, q.far]);
  useEffect(() => {
    if (sun.current) {
      sun.current.shadow.mapSize.set(q.shadowSize, q.shadowSize);
      sun.current.shadow.map?.dispose();
      sun.current.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    }
  }, [q.shadowSize]);
  useFrame(() => {
    if (!sun.current || !followPlayer) return;
    const p = player.pos;
    const d = new THREE.Vector3(...cfg.sun).normalize().multiplyScalar(60);
    sun.current.position.set(p.x + d.x, p.y + d.y, p.z + d.z);
    sun.current.target.position.copy(p);
    sun.current.target.updateMatrixWorld();
  });
  const sunDir = new THREE.Vector3(...cfg.sun).normalize();
  return (
    <>
      {tod !== 'noche' ? (
        <Sky distance={4500} sunPosition={[sunDir.x * 100, sunDir.y * 100, sunDir.z * 100]} turbidity={cfg.turbidity} rayleigh={cfg.rayleigh} mieCoefficient={0.006} mieDirectionalG={0.85} />
      ) : (
        <NightSky />
      )}
      <hemisphereLight args={[cfg.hemiSky, cfg.hemiGround, cfg.hemiI]} />
      <ambientLight intensity={tod === 'noche' ? 0.25 : 0.18} />
      <directionalLight
        ref={sun}
        position={cfg.sun}
        intensity={cfg.sunI}
        color={cfg.sunColor}
        castShadow={q.shadows}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={160}
      />
    </>
  );
}

function NightSky() {
  const geo = useRef<THREE.BufferGeometry>(null);
  useEffect(() => {
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.45;
      const r = 900;
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * r;
      pos[i * 3 + 1] = Math.cos(ph) * r;
      pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
    }
    geo.current?.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }, []);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1000, 24, 16]} />
        <meshBasicMaterial color="#0b1230" side={THREE.BackSide} fog={false} />
      </mesh>
      <points>
        <bufferGeometry ref={geo} />
        <pointsMaterial size={2.2} color="#ffffff" sizeAttenuation={false} fog={false} />
      </points>
      <mesh position={[-300, 420, -500]}>
        <sphereGeometry args={[22, 24, 16]} />
        <meshBasicMaterial color="#f4f1d0" fog={false} />
      </mesh>
    </group>
  );
}

export function GameCanvas({ children, camFov = 60 }: { children: ReactNode; camFov?: number }) {
  const q = useQuality();
  return (
    <Canvas
      className="game-canvas"
      shadows={q.shadows ? 'soft' : false}
      dpr={[0.75, Math.min(q.dpr, window.devicePixelRatio || 1)]}
      gl={{ antialias: q.detail >= 1, powerPreference: 'high-performance' }}
      camera={{ fov: camFov, near: 0.1, far: 2000, position: [0, 4, 8] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      {children}
    </Canvas>
  );
}
