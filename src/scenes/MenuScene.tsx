import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GameCanvas, Lights } from '../three/Stage';
import { Humanoid, newAnim, RAZMIK_LOOK } from '../three/Humanoid';
import { pitchTex, textTex } from '../three/textures';
import { Ball3D, Goal } from '../three/Props';
import { useProgress } from '../core/store';
import { BOOTS } from '../data/shop';

function Razmik() {
  const g = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const t0 = useRef(performance.now());
  const boots = useProgress((s) => s.boots);
  const acc = useProgress((s) => s.accessory);
  const skin = useProgress((s) => s.ballSkin);
  useFrame(({ camera }) => {
    const t = (performance.now() - t0.current) / 1000;
    // entrance: run in, stop, turn showing back, juggle
    if (g.current) {
      const enter = Math.min(1, t / 1.6);
      const e = 1 - Math.pow(1 - enter, 3);
      g.current.position.x = THREE.MathUtils.lerp(-7, 0, e);
      anim.current.speed = enter < 1 ? 6 : 0;
      const showBack = Math.sin(t * 0.35) > 0.2;
      const targetYaw = enter < 1 ? Math.PI / 2 : showBack ? Math.PI * 0.92 : 0.25;
      g.current.rotation.y += (targetYaw - g.current.rotation.y) * 0.04;
      if (enter >= 1 && Math.floor(t * 1.4) !== Math.floor((t - 0.016) * 1.4)) anim.current.kickT = 0.45;
    }
    if (ball.current && g.current) {
      const ph = (t * 1.4) % 1;
      const h = 0.15 + Math.sin(ph * Math.PI) * 1.4;
      const fwd = new THREE.Vector3(Math.sin(g.current.rotation.y), 0, Math.cos(g.current.rotation.y));
      ball.current.position.set(g.current.position.x + fwd.x * 0.45, h, g.current.position.z + fwd.z * 0.45);
      ball.current.rotation.x += 0.1;
    }
    const a = t * 0.08;
    camera.position.set(Math.sin(a) * 1.2 + 1.2, 1.5, 4.4);
    camera.lookAt(0.6, 1.05, 0);
  });
  return (
    <>
      <group ref={g} position={[-7, 0, 0]}>
        <Humanoid look={RAZMIK_LOOK(BOOTS.find((b) => b.id === boots)?.color, acc)} anim={anim} />
      </group>
      <group ref={ball}>
        <Ball3D skin={skin} />
      </group>
    </>
  );
}

function Stadium() {
  const segs = 36;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[68, 105]} />
        <meshStandardMaterial map={pitchTex()} />
      </mesh>
      {Array.from({ length: segs }).map((_, k) => {
        const a = (k / segs) * Math.PI * 2;
        return (
          <group key={k} position={[Math.cos(a) * 62, 0, Math.sin(a) * 45]} rotation={[0, -a + Math.PI / 2, 0]}>
            <mesh position={[0, 9, 0]} rotation={[-0.5, 0, 0]}>
              <boxGeometry args={[11, 22, 2]} />
              <meshStandardMaterial color={k % 3 === 0 ? '#ff7a1a' : k % 3 === 1 ? '#1b2233' : '#2c3a55'} />
            </mesh>
          </group>
        );
      })}
      <group position={[0, 0, -30]}>
        <Goal />
      </group>
      <mesh position={[0, 16, -44]}>
        <planeGeometry args={[30, 6]} />
        <meshBasicMaterial map={textTex('RAZMIK 7 · MISIÓN CAMPEÓN', { bg: '#1b2233', fg: '#ff7a1a', w: 1024, h: 205 })} toneMapped={false} />
      </mesh>
      {[[-40, -35], [40, -35], [-40, 35], [40, 35]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 15, 0]}>
            <cylinderGeometry args={[0.4, 0.6, 30]} />
            <meshStandardMaterial color="#8a9099" />
          </mesh>
          <mesh position={[0, 30, 0]}>
            <boxGeometry args={[5, 3, 0.6]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function MenuScene() {
  return (
    <GameCanvas camFov={45}>
      <Lights tod="tarde" followPlayer={false} />
      <Stadium />
      <Razmik />
    </GameCanvas>
  );
}
