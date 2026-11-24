import * as THREE from 'three';
import { create } from 'zustand';
import type { T } from '../core/types';

export interface Box {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number;
  tag?: string;
  dx?: number; dz?: number; dy?: number; // per-frame delta for moving platforms
  solid?: boolean; // default true
}

export interface Interactable {
  id: string;
  pos: THREE.Vector3 | (() => THREE.Vector3);
  radius: number;
  label: T;
  verb?: string;
  onInteract: () => void;
  enabled?: () => boolean;
}

/** Mutable singleton describing the current scene's physical world */
export const world = {
  boxes: [] as Box[],
  interactables: new Map<string, Interactable>(),
  killY: -6,
  bounds: { minX: -400, maxX: 400, minZ: -400, maxZ: 400 },
  groundAt: (_x: number, _z: number) => 0 as number,
  respawn: new THREE.Vector3(0, 0, 0),
  onFall: null as null | (() => void),
};

export function resetWorld() {
  world.boxes = [];
  world.interactables.clear();
  world.killY = -6;
  world.bounds = { minX: -400, maxX: 400, minZ: -400, maxZ: 400 };
  world.groundAt = () => 0;
  world.onFall = null;
}

export function addBox(cx: number, cz: number, w: number, d: number, h: number, y0 = 0, tag?: string): Box {
  const b: Box = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, minY: y0, maxY: y0 + h, tag };
  world.boxes.push(b);
  return b;
}
export function removeBox(b: Box) {
  const i = world.boxes.indexOf(b);
  if (i >= 0) world.boxes.splice(i, 1);
}
export function addInteractable(i: Interactable) {
  world.interactables.set(i.id, i);
  return () => world.interactables.delete(i.id);
}

/** Player runtime state readable from anywhere */
export const player = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  yaw: 0,
  speed: 0,
  grounded: true,
  groundTag: '' as string | undefined,
  kickAt: 0,
  frozen: false,
  hidden: false,
  teleport: null as null | { pos: THREE.Vector3; yaw: number },
  radius: 0.33,
  height: 1.56,
};

export function teleportPlayer(x: number, y: number, z: number, yaw = player.yaw) {
  player.teleport = { pos: new THREE.Vector3(x, y, z), yaw };
}

export const useNearby = create<{ near: Interactable | null; set: (n: Interactable | null) => void }>((set) => ({
  near: null,
  set: (near) => set({ near }),
}));

export function interactablePos(i: Interactable) {
  return typeof i.pos === 'function' ? i.pos() : i.pos;
}

/** Return the highest walkable surface under (x,z) not higher than maxY */
export function surfaceBelow(x: number, z: number, r: number, maxY: number) {
  let g = world.groundAt(x, z);
  let tag: string | undefined;
  let box: Box | undefined;
  for (const b of world.boxes) {
    if (b.solid === false) continue;
    if (x + r * 0.6 < b.minX || x - r * 0.6 > b.maxX || z + r * 0.6 < b.minZ || z - r * 0.6 > b.maxZ) continue;
    if (b.maxY <= maxY && b.maxY > g) {
      g = b.maxY;
      tag = b.tag;
      box = b;
    }
  }
  return { y: g, tag, box };
}

/** push circle (x,z,r) out of boxes that block at height range [y0,y1] */
export function resolveCollisions(p: THREE.Vector3, r: number, height: number, step = 0.45) {
  for (let iter = 0; iter < 2; iter++) {
    for (const b of world.boxes) {
      if (b.solid === false) continue;
      if (b.maxY <= p.y + step || b.minY >= p.y + height) continue;
      const cx = THREE.MathUtils.clamp(p.x, b.minX, b.maxX);
      const cz = THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ);
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      } else {
        // center inside box: push out along smallest axis
        const pen = [p.x - b.minX, b.maxX - p.x, p.z - b.minZ, b.maxZ - p.z];
        const m = Math.min(...pen);
        if (m === pen[0]) p.x = b.minX - r;
        else if (m === pen[1]) p.x = b.maxX + r;
        else if (m === pen[2]) p.z = b.minZ - r;
        else p.z = b.maxZ + r;
      }
    }
  }
  p.x = THREE.MathUtils.clamp(p.x, world.bounds.minX, world.bounds.maxX);
  p.z = THREE.MathUtils.clamp(p.z, world.bounds.minZ, world.bounds.maxZ);
}

/** camera occlusion: shorten segment from a to b if it enters a tall box */
export function cameraClip(from: THREE.Vector3, to: THREE.Vector3) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  dir.normalize();
  const stepN = 24;
  for (let i = 1; i <= stepN; i++) {
    const tt = (i / stepN) * len;
    const x = from.x + dir.x * tt;
    const y = from.y + dir.y * tt;
    const z = from.z + dir.z * tt;
    for (const b of world.boxes) {
      if (b.maxY - b.minY < 1.2) continue;
      if (x > b.minX - 0.2 && x < b.maxX + 0.2 && z > b.minZ - 0.2 && z < b.maxZ + 0.2 && y > b.minY && y < b.maxY + 0.2) {
        return Math.max(0.9, tt - 0.6);
      }
    }
  }
  return len;
}
