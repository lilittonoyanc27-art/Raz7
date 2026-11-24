import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Ball3D } from './Props';
import { player, world } from './world';
import { sfx } from '../core/audio';
import { useProgress } from '../core/store';

export interface BallState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  lastTouch: 'player' | 'npc' | 'none';
  lastKick: number;
  frozen: boolean;
  held?: boolean;
}
export const R = 0.11;

export function makeBall(x = 0, z = 0): BallState {
  return { pos: new THREE.Vector3(x, R, z), vel: new THREE.Vector3(), lastTouch: 'none', lastKick: 0, frozen: false };
}

/** Simple football physics: gravity, bounce, rolling friction, box walls, dribble and kick by the player */
export function BallBody({ ball, bounds, onKick, onStep, power = 1 }: { ball: BallState; bounds?: { minX: number; maxX: number; minZ: number; maxZ: number }; onKick?: () => void; onStep?: (dt: number) => void; power?: number }) {
  const g = useRef<THREE.Group>(null);
  const skin = useProgress((s) => s.ballSkin);
  const handledKick = useRef(0);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const b = ball;
    if (!b.frozen && !b.held) {
      // kick
      if (player.kickAt !== handledKick.current && performance.now() - player.kickAt < 350) {
        const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
        const to = b.pos.clone().sub(player.pos).setY(0);
        const d = to.length();
        if (d < 1.7 && to.normalize().dot(fwd) > 0.2 && b.pos.y < 1.2) {
          handledKick.current = player.kickAt;
          const sp = 17 * power;
          b.vel.set(fwd.x * sp, 3.2 * power, fwd.z * sp);
          b.lastTouch = 'player';
          b.lastKick = performance.now();
          sfx('kick');
          onKick?.();
        }
      }
      // dribble: the ball is pushed ahead of the running player
      const dx = b.pos.x - player.pos.x;
      const dz = b.pos.z - player.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.62 && b.pos.y < 0.6 && performance.now() - b.lastKick > 300) {
        const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
        const sp = Math.max(player.speed * 1.25, 1.5);
        b.vel.x = fwd.x * sp + (dx / (dist || 1)) * 0.8;
        b.vel.z = fwd.z * sp + (dz / (dist || 1)) * 0.8;
        b.pos.x = player.pos.x + (dx / (dist || 1)) * 0.63;
        b.pos.z = player.pos.z + (dz / (dist || 1)) * 0.63;
        b.lastTouch = 'player';
        if (player.speed > 2 && Math.random() < 0.05) sfx('kick');
      }
      // integrate
      b.vel.y -= 22 * dt;
      b.pos.addScaledVector(b.vel, dt);
      if (b.pos.y < R) {
        b.pos.y = R;
        if (b.vel.y < -2) {
          b.vel.y = -b.vel.y * 0.5;
          if (b.vel.y > 2.5) sfx('land');
        } else b.vel.y = 0;
      }
      if (b.pos.y <= R + 0.01) {
        const k = Math.max(0, 1 - dt * 1.4);
        b.vel.x *= k;
        b.vel.z *= k;
      }
      // walls
      for (const box of world.boxes) {
        if (box.solid === false || b.pos.y > box.maxY) continue;
        if (b.pos.x > box.minX - R && b.pos.x < box.maxX + R && b.pos.z > box.minZ - R && b.pos.z < box.maxZ + R) {
          const pen = [b.pos.x - (box.minX - R), box.maxX + R - b.pos.x, b.pos.z - (box.minZ - R), box.maxZ + R - b.pos.z];
          const m = Math.min(...pen);
          if (m === pen[0]) { b.pos.x = box.minX - R; b.vel.x = -Math.abs(b.vel.x) * 0.6; }
          else if (m === pen[1]) { b.pos.x = box.maxX + R; b.vel.x = Math.abs(b.vel.x) * 0.6; }
          else if (m === pen[2]) { b.pos.z = box.minZ - R; b.vel.z = -Math.abs(b.vel.z) * 0.6; }
          else { b.pos.z = box.maxZ + R; b.vel.z = Math.abs(b.vel.z) * 0.6; }
        }
      }
      if (bounds) {
        if (b.pos.x < bounds.minX) { b.pos.x = bounds.minX; b.vel.x = Math.abs(b.vel.x) * 0.5; }
        if (b.pos.x > bounds.maxX) { b.pos.x = bounds.maxX; b.vel.x = -Math.abs(b.vel.x) * 0.5; }
        if (b.pos.z < bounds.minZ) { b.pos.z = bounds.minZ; b.vel.z = Math.abs(b.vel.z) * 0.5; }
        if (b.pos.z > bounds.maxZ) { b.pos.z = bounds.maxZ; b.vel.z = -Math.abs(b.vel.z) * 0.5; }
      }
    }
    onStep?.(dt);
    if (g.current) {
      g.current.position.copy(b.pos);
      const sp = Math.hypot(b.vel.x, b.vel.z);
      if (sp > 0.05) {
        const axis = new THREE.Vector3(b.vel.z, 0, -b.vel.x).normalize();
        g.current.rotateOnWorldAxis(axis, (sp * dt) / R);
      }
    }
  });
  return (
    <group ref={g}>
      <Ball3D skin={skin} r={R} />
    </group>
  );
}
