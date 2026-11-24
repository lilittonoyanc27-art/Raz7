import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Humanoid, newAnim, randomLook, type Anim, type Look } from '../three/Humanoid';
import { blockRange, SIDEWALK_Y } from './layout';
import { seeded } from '../core/random';
import { addInteractable, player } from '../three/world';
import type { T } from '../core/types';
import { useUI } from '../core/store';
import { useQuality } from '../three/Stage';

export interface NpcRuntime {
  id: string;
  name: string;
  pos: THREE.Vector3;
  yaw: number;
  look: Look;
  talking: boolean;
  lastTalk: number;
  pitch: number;
  anim: Anim;
}
export const npcRegistry = new Map<string, NpcRuntime>();

const NAMES_M = ['Pablo', 'Diego', 'Javier', 'Mateo', 'Hugo', 'Daniel', 'Álvaro', 'Sergio', 'Marcos', 'Iván', 'Carlos', 'Luis'];
const NAMES_F = ['Lucía', 'Sofía', 'Marta', 'Carmen', 'Elena', 'Paula', 'Irene', 'Laura', 'Alba', 'Noa', 'Julia', 'Sara'];

interface Walker { id: string; i: number; j: number; u: number; dir: 1 | -1; speed: number; look: Look; name: string; pitch: number }

function perimeterPoint(i: number, j: number, u: number) {
  const [x0, x1] = blockRange(i);
  const [z0, z1] = blockRange(j);
  const inset = 1.9;
  const ax0 = x0 + inset, ax1 = x1 - inset, az0 = z0 + inset, az1 = z1 - inset;
  const w = ax1 - ax0, d = az1 - az0;
  const L = 2 * (w + d);
  let s = ((u % L) + L) % L;
  if (s < w) return { x: ax0 + s, z: az0, yaw: Math.PI / 2, L };
  s -= w;
  if (s < d) return { x: ax1, z: az0 + s, yaw: 0, L };
  s -= d;
  if (s < w) return { x: ax1 - s, z: az1, yaw: -Math.PI / 2, L };
  s -= w;
  return { x: ax0, z: az1 - s, yaw: Math.PI, L };
}

export function Pedestrians() {
  const q = useQuality();
  const walkers = useMemo<Walker[]>(() => {
    const r = seeded(77);
    const out: Walker[] = [];
    for (let k = 0; k < q.npc; k++) {
      const look = randomLook(r);
      const female = ['long', 'pony', 'bun'].includes(look.hairStyle);
      out.push({
        id: 'walker-' + k,
        i: Math.floor(r() * 4),
        j: Math.floor(r() * 4),
        u: r() * 200,
        dir: r() < 0.5 ? 1 : -1,
        speed: 1.1 + r() * 0.6,
        look,
        name: female ? NAMES_F[k % NAMES_F.length] : NAMES_M[k % NAMES_M.length],
        pitch: female ? 1.15 + r() * 0.1 : 0.85 + r() * 0.1,
      });
    }
    return out;
  }, [q.npc]);
  return (
    <group>
      {walkers.map((w) => (
        <WalkerNPC key={w.id} w={w} />
      ))}
    </group>
  );
}

function WalkerNPC({ w }: { w: Walker }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const u = useRef(w.u);
  const rt = useMemo<NpcRuntime>(() => ({ id: w.id, name: w.name, pos: new THREE.Vector3(), yaw: 0, look: w.look, talking: false, lastTalk: -999, pitch: w.pitch, anim: anim.current }), [w]);
  useEffect(() => {
    npcRegistry.set(w.id, rt);
    return () => {
      npcRegistry.delete(w.id);
    };
  }, [rt]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const near = rt.pos.distanceTo(player.pos) < 1.3;
    if (rt.talking) {
      anim.current.speed = 0;
      const yaw = Math.atan2(player.pos.x - rt.pos.x, player.pos.z - rt.pos.z);
      rt.yaw += Math.atan2(Math.sin(yaw - rt.yaw), Math.cos(yaw - rt.yaw)) * Math.min(1, dt * 6);
    } else if (near) {
      anim.current.speed = 0;
    } else {
      u.current += w.speed * dt * w.dir;
      const p = perimeterPoint(w.i, w.j, u.current);
      rt.pos.set(p.x, SIDEWALK_Y, p.z);
      const targetYaw = w.dir > 0 ? p.yaw : p.yaw + Math.PI;
      rt.yaw += Math.atan2(Math.sin(targetYaw - rt.yaw), Math.cos(targetYaw - rt.yaw)) * Math.min(1, dt * 5);
      anim.current.speed = w.speed;
    }
    if (rt.pos.lengthSq() === 0) {
      const p = perimeterPoint(w.i, w.j, u.current);
      rt.pos.set(p.x, SIDEWALK_Y, p.z);
    }
    anim.current.talk = rt.talking && !!useUI.getState().dialog;
    if (g.current) {
      g.current.position.copy(rt.pos);
      g.current.rotation.y = rt.yaw;
      // distance culling
      g.current.visible = rt.pos.distanceToSquared(player.pos) < 110 * 110;
    }
  });
  return (
    <group ref={g}>
      <Humanoid look={w.look} anim={anim} castShadow={false} />
    </group>
  );
}

/** A standing character you can talk to */
export function StaticNPC({ id, name, role, look, pos, yaw = 0, onTalk, label, pitch = 1, wave = false, enabled, sit = false, marker = true }: { id: string; name: string; role?: string; look: Look; pos: [number, number, number]; yaw?: number; onTalk: () => void; label?: T; pitch?: number; wave?: boolean; enabled?: () => boolean; sit?: boolean; marker?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const rt = useMemo<NpcRuntime>(() => ({ id, name, pos: new THREE.Vector3(...pos), yaw, look, talking: false, lastTalk: -999, pitch, anim: anim.current }), [id]);
  useEffect(() => {
    npcRegistry.set(id, rt);
    const off = addInteractable({
      id: 'npc-' + id,
      pos: rt.pos,
      radius: 3.6,
      label: label ?? { es: `Hablar con ${name}`, hy: `Խոսել ${name}-ի հետ` },
      onInteract: () => {
        rt.talking = true;
        onTalk();
      },
      enabled,
    });
    return () => {
      off();
      npcRegistry.delete(id);
    };
  }, [rt, onTalk]);
  useFrame((_, dt) => {
    rt.pos.set(...pos);
    const d = rt.pos.distanceTo(player.pos);
    const dlg = useUI.getState().dialog;
    if (!dlg) rt.talking = false;
    let target = yaw;
    if ((d < 6 || rt.talking) && !sit) target = Math.atan2(player.pos.x - rt.pos.x, player.pos.z - rt.pos.z);
    rt.yaw += Math.atan2(Math.sin(target - rt.yaw), Math.cos(target - rt.yaw)) * Math.min(1, dt * 4);
    anim.current.talk = rt.talking && !!dlg;
    anim.current.sit = sit;
    if (wave && d < 9 && d > 3 && anim.current.waveT <= 0 && Math.random() < 0.005) anim.current.waveT = 1.6;
    if (g.current) {
      g.current.position.copy(rt.pos);
      g.current.rotation.y = rt.yaw;
    }
  });
  return (
    <group ref={g}>
      <Humanoid look={look} anim={anim} />
      {marker && (
        <mesh position={[0, look.height + (sit ? -0.1 : 0.35), 0]}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshBasicMaterial color="#ffb03a" />
        </mesh>
      )}
    </group>
  );
}

export function npcFocus(id: string): [number, number, number] | undefined {
  const n = npcRegistry.get(id);
  return n ? [n.pos.x, n.pos.y, n.pos.z] : undefined;
}
