import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CarModel, CAR_COLORS, TrafficLightModel } from '../three/Props';
import { CITY, CROSS_OFF, ROADS, ROAD_HALF, SIDEWALK_Y, lightFor, pedestrianGreen } from './layout';
import { player } from '../three/world';
import { seeded } from '../core/random';
import { sfx } from '../core/audio';
import { useQuality } from '../three/Stage';

export const clock = { t: 0 };
/** extra moving obstacles (e.g. mission bus) that cars must not drive through */
export const obstacles: { x: number; z: number; active: boolean }[] = [];

interface CarSim { axis: 'x' | 'z'; dir: 1 | -1; lane: number; s: number; v: number; max: number; color: string; kind: 'sedan' | 'taxi' | 'suv'; honk: number }

const LIMIT = CITY + 28;

export function Traffic() {
  const q = useQuality();
  const cars = useMemo<CarSim[]>(() => {
    const r = seeded(21);
    const out: CarSim[] = [];
    for (let i = 0; i < q.cars; i++) {
      const axis = i % 2 ? 'x' : 'z';
      const dir = (r() < 0.5 ? 1 : -1) as 1 | -1;
      const road = ROADS[Math.floor(r() * ROADS.length)];
      // right-hand traffic: moving +x uses z=road+3 ; moving -x uses z=road-3 ; moving +z uses x=road-3 ; moving -z uses x=road+3
      const lane = axis === 'x' ? road + 3 * dir : road - 3 * dir;
      out.push({ axis, dir, lane, s: -LIMIT + r() * LIMIT * 2, v: 6, max: 8 + r() * 4, color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], kind: r() < 0.15 ? 'taxi' : r() < 0.3 ? 'suv' : 'sedan', honk: 0 });
    }
    return out;
  }, [q.cars]);
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    clock.t += dt;
    const t = clock.t;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      let target = c.max;
      // traffic light ahead
      for (const ic of ROADS) {
        const stopLine = ic - c.dir * (CROSS_OFF + 3.2);
        const dist = (stopLine - c.s) * c.dir;
        if (dist > 0 && dist < 22) {
          const l = lightFor(c.axis, t);
          if (l === 'red' || (l === 'yellow' && dist > 6)) target = Math.min(target, Math.max(0, (dist - 1) * 0.8));
        }
      }
      // car ahead
      for (let j = 0; j < cars.length; j++) {
        if (j === i) continue;
        const o = cars[j];
        if (o.axis !== c.axis || o.lane !== c.lane) continue;
        const gap = (o.s - c.s) * c.dir;
        if (gap > 0 && gap < 14) target = Math.min(target, Math.max(0, (gap - 6.5) * 1.2));
      }
      for (const ob of obstacles) {
        if (!ob.active) continue;
        const ox = c.axis === 'x' ? ob.x : ob.z;
        const ol = c.axis === 'x' ? ob.z : ob.x;
        const gap = (ox - c.s) * c.dir;
        if (Math.abs(ol - c.lane) < 2 && gap > 0 && gap < 16) target = Math.min(target, Math.max(0, (gap - 9) * 1.2));
      }
      // pedestrian (player) ahead
      const px = c.axis === 'x' ? player.pos.x : player.pos.z;
      const pl = c.axis === 'x' ? player.pos.z : player.pos.x;
      const ahead = (px - c.s) * c.dir;
      if (Math.abs(pl - c.lane) < 2.2 && ahead > 0 && ahead < 11 && player.pos.y < 2) {
        target = 0;
        if (c.honk <= 0 && ahead < 8) {
          sfx('horn');
          c.honk = 4;
        }
      }
      c.honk -= dt;
      c.v += Math.sign(target - c.v) * Math.min(Math.abs(target - c.v), dt * (target < c.v ? 14 : 4));
      c.s += c.v * dt * c.dir;
      if (c.s * c.dir > LIMIT) c.s = -LIMIT * c.dir;
      const g = refs.current[i];
      if (g) {
        if (c.axis === 'x') {
          g.position.set(c.s, 0, c.lane);
          g.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          g.position.set(c.lane, 0, c.s);
          g.rotation.y = c.dir > 0 ? 0 : Math.PI;
        }
      }
    }
  });

  return (
    <group>
      {cars.map((c, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <CarModel color={c.color} kind={c.kind} castShadow={q.detail >= 2} />
        </group>
      ))}
      <TrafficLights />
    </group>
  );
}

function TrafficLights() {
  const [phase, setPhase] = useState({ x: 'green', z: 'red', px: false, pz: true } as { x: 'red' | 'yellow' | 'green'; z: 'red' | 'yellow' | 'green'; px: boolean; pz: boolean });
  useFrame(() => {
    const x = lightFor('x', clock.t);
    const z = lightFor('z', clock.t);
    const px = pedestrianGreen('x', clock.t);
    const pz = pedestrianGreen('z', clock.t);
    if (x !== phase.x || z !== phase.z || px !== phase.px || pz !== phase.pz) setPhase({ x, z, px, pz });
  });
  const items = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; axis: 'x' | 'z' }[] = [];
    for (const cx of ROADS)
      for (const cz of ROADS) {
        const o = ROAD_HALF + 1.2;
        // for cars moving along x (facing them): place at corners
        out.push({ pos: [cx - CROSS_OFF - 3, SIDEWALK_Y, cz + o], rot: -Math.PI / 2, axis: 'x' });
        out.push({ pos: [cx + CROSS_OFF + 3, SIDEWALK_Y, cz - o], rot: Math.PI / 2, axis: 'x' });
        out.push({ pos: [cx - o, SIDEWALK_Y, cz - CROSS_OFF - 3], rot: Math.PI, axis: 'z' });
        out.push({ pos: [cx + o, SIDEWALK_Y, cz + CROSS_OFF + 3], rot: 0, axis: 'z' });
      }
    return out;
  }, []);
  const peds = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number; road: 'x' | 'z' }[] = [];
    for (const cx of ROADS)
      for (const cz of ROADS)
        for (const sg of [-1, 1]) {
          const o = ROAD_HALF + 0.9;
          out.push({ pos: [cx + sg * CROSS_OFF + 2.2, SIDEWALK_Y, cz + o], rot: Math.PI, road: 'x' });
          out.push({ pos: [cx + sg * CROSS_OFF - 2.2, SIDEWALK_Y, cz - o], rot: 0, road: 'x' });
          out.push({ pos: [cx + o, SIDEWALK_Y, cz + sg * CROSS_OFF - 2.2], rot: -Math.PI / 2, road: 'z' });
          out.push({ pos: [cx - o, SIDEWALK_Y, cz + sg * CROSS_OFF + 2.2], rot: Math.PI / 2, road: 'z' });
        }
    return out;
  }, []);
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.pos} rotation={[0, it.rot, 0]}>
          <TrafficLightModel state={phase[it.axis]} />
        </group>
      ))}
      {peds.map((p, i) => (
        <group key={'p' + i} position={p.pos} rotation={[0, p.rot, 0]}>
          <PedLight walk={p.road === 'x' ? phase.px : phase.pz} />
        </group>
      ))}
    </group>
  );
}

const pedGeo = new THREE.BoxGeometry(1, 1, 1);
const poleM = new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.5, metalness: 0.5 });
const redOn = new THREE.MeshStandardMaterial({ color: '#ff2d2d', emissive: '#ff2d2d', emissiveIntensity: 2.4, toneMapped: false });
const greenOn = new THREE.MeshStandardMaterial({ color: '#2dff6a', emissive: '#2dff6a', emissiveIntensity: 2.4, toneMapped: false });
const off = new THREE.MeshStandardMaterial({ color: '#222' });
function PedLight({ walk }: { walk: boolean }) {
  return (
    <group>
      <mesh geometry={pedGeo} material={poleM} position={[0, 1.2, 0]} scale={[0.07, 2.4, 0.07]} />
      <mesh geometry={pedGeo} material={poleM} position={[0, 2.5, 0]} scale={[0.3, 0.6, 0.2]} />
      <mesh geometry={pedGeo} material={walk ? off : redOn} position={[0, 2.65, 0.11]} scale={[0.18, 0.2, 0.02]} />
      <mesh geometry={pedGeo} material={walk ? greenOn : off} position={[0, 2.38, 0.11]} scale={[0.18, 0.2, 0.02]} />
      <mesh geometry={pedGeo} material={walk ? off : redOn} position={[0, 2.65, -0.11]} scale={[0.18, 0.2, 0.02]} />
      <mesh geometry={pedGeo} material={walk ? greenOn : off} position={[0, 2.38, -0.11]} scale={[0.18, 0.2, 0.02]} />
    </group>
  );
}
