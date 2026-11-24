import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Humanoid, newAnim, RAZMIK_LOOK } from './Humanoid';
import { consume, input, moveVector } from './input';
import { type Interactable, cameraClip, interactablePos, player, resolveCollisions, surfaceBelow, useNearby, world } from './world';
import { useProgress, useUI } from '../core/store';
import { sfx } from '../core/audio';
import { BOOTS } from '../data/shop';

const WALK = 3.4;
const RUN = 7.0;
const GRAV = 24;
const JUMP = 8.2;

export function Player({ start, startYaw = 0, speedMul = 1, camDist = 4.6, onStep }: { start: [number, number, number]; startYaw?: number; speedMul?: number; camDist?: number; onStep?: (dt: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const { camera, gl } = useThree();
  const boots = useProgress((s) => s.boots);
  const accessory = useProgress((s) => s.accessory);
  const look = RAZMIK_LOOK(BOOTS.find((b) => b.id === boots)?.color ?? '#151515', accessory);
  const lastSurf = useRef(0);
  const nearRef = useRef<string | null>(null);
  const autoAlign = useRef(0);

  useEffect(() => {
    player.pos.set(...start);
    player.vel.set(0, 0, 0);
    player.yaw = startYaw;
    player.frozen = false;
    world.respawn.set(...start);
    input.camYaw = startYaw + Math.PI;
    input.camPitch = 0.22;
    input.camDist = camDist;
    camera.position.set(start[0] - Math.sin(startYaw) * camDist, start[1] + 3, start[2] - Math.cos(startYaw) * camDist);
  }, []);

  // camera drag / zoom
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      input.dragging = true;
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const sens = useProgress.getState().settings.camSensitivity;
      if (pointers.size === 2) {
        const arr = [...pointers.values()];
        const d0 = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const arr2 = [...pointers.values()];
        const d1 = Math.hypot(arr2[0].x - arr2[1].x, arr2[0].y - arr2[1].y);
        if (pinch) input.camDist = THREE.MathUtils.clamp(input.camDist - (d1 - d0) * 0.02, 2.5, 14);
        pinch = 1;
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      input.camYaw -= dx * 0.006 * sens;
      input.camPitch = THREE.MathUtils.clamp(input.camPitch + dy * 0.004 * sens, -0.1, 1.2);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      autoAlign.current = 2.5;
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (!pointers.size) input.dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      input.camDist = THREE.MathUtils.clamp(input.camDist + e.deltaY * 0.006, 2.5, 14);
      e.preventDefault();
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  const tmp = useRef(new THREE.Vector3());
  const camTarget = useRef(new THREE.Vector3());
  const camLook = useRef(new THREE.Vector3());

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const ui = useUI.getState();
    if (ui.paused) return;
    const dialog = ui.dialog;
    const blocking = !!dialog && !!(dialog.options?.length || dialog.free);
    if (player.teleport) {
      player.pos.copy(player.teleport.pos);
      player.yaw = player.teleport.yaw;
      input.camYaw = player.teleport.yaw + Math.PI;
      player.vel.set(0, 0, 0);
      player.teleport = null;
    }

    const p = player.pos;
    const cy = input.camYaw;
    let mag = 0;
    let mv = { x: 0, y: 0, run: false };
    if (!player.hidden) {
    // --- movement
    mv = player.frozen || blocking ? { x: 0, y: 0, run: false } : moveVector();
    const fwd = new THREE.Vector3(-Math.sin(cy), 0, -Math.cos(cy));
    const right = new THREE.Vector3(Math.cos(cy), 0, -Math.sin(cy));
    const dir = fwd.multiplyScalar(mv.y).add(right.multiplyScalar(mv.x));
    mag = Math.min(1, dir.length());
    const target = (mv.run ? RUN : WALK) * speedMul * mag;
    const curH = Math.hypot(player.vel.x, player.vel.z);
    const accel = player.grounded ? 14 : 5;
    if (mag > 0.05) {
      dir.normalize();
      const desiredYaw = Math.atan2(dir.x, dir.z);
      let dy = desiredYaw - player.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      player.yaw += dy * Math.min(1, dt * 12);
      const lerped = THREE.MathUtils.lerp(curH, target, Math.min(1, dt * accel));
      const nv = player.grounded ? lerped : Math.max(lerped, Math.min(curH, 16));
      player.vel.x = dir.x * nv;
      player.vel.z = dir.z * nv;
      if (!input.dragging) autoAlign.current -= dt;
    } else {
      const k = Math.max(0, 1 - dt * (player.grounded ? 12 : 0.3));
      player.vel.x *= k;
      player.vel.z *= k;
    }

    if (consume('jumpQueued') && player.grounded && !blocking && !player.frozen) {
      player.vel.y = JUMP;
      player.grounded = false;
      sfx('jump');
    }
    if (consume('kickQueued') && !blocking && !player.frozen) {
      anim.current.kickT = 0.45;
      player.kickAt = performance.now();
    }

    player.vel.y -= GRAV * dt;
    const prevY = p.y;
    const sub = Math.max(1, Math.ceil(dt / 0.025));
    for (let k = 0; k < sub; k++) {
      p.x += (player.vel.x * dt) / sub;
      p.z += (player.vel.z * dt) / sub;
      resolveCollisions(p, player.radius, player.height);
    }
    p.y += player.vel.y * dt;
    const surf = surfaceBelow(p.x, p.z, player.radius, Math.max(prevY, p.y) + 0.45);
    if (p.y <= surf.y + 0.001 && player.vel.y <= 0) {
      if (!player.grounded && player.vel.y < -6) sfx('land');
      p.y = surf.y;
      player.vel.y = 0;
      player.grounded = true;
      player.groundTag = surf.tag;
      if (surf.box?.dx || surf.box?.dz || surf.box?.dy) {
        p.x += surf.box.dx ?? 0;
        p.z += surf.box.dz ?? 0;
        p.y += surf.box.dy ?? 0;
      }
    } else if (p.y > surf.y + 0.05) {
      player.grounded = false;
    }
    if (p.y < world.killY) {
      if (world.onFall) world.onFall();
      else {
        p.copy(world.respawn);
        player.vel.set(0, 0, 0);
      }
    }
    player.speed = Math.hypot(player.vel.x, player.vel.z);
    anim.current.speed = player.speed;
    anim.current.grounded = player.grounded;
    if (player.grounded && player.speed > 1) {
      lastSurf.current += dt * player.speed;
      if (lastSurf.current > (player.speed > 4 ? 1.6 : 1.1)) {
        lastSurf.current = 0;
        sfx('step');
      }
    }

    }
    if (group.current) {
      group.current.visible = !player.hidden;
      group.current.position.copy(p);
      group.current.rotation.y = player.yaw;
    }

    // --- interactables
    let best: Interactable | null = null as Interactable | null;
    let bestD = Infinity;
    world.interactables.forEach((it) => {
      if (it.enabled && !it.enabled()) return;
      const ip = interactablePos(it);
      const d = Math.hypot(ip.x - p.x, ip.z - p.z);
      if (d < it.radius && d < bestD && Math.abs(ip.y - p.y) < 3) {
        best = it;
        bestD = d;
      }
    });
    const b = best as Interactable | null;
    if ((b?.id ?? null) !== nearRef.current) {
      nearRef.current = b?.id ?? null;
      useNearby.getState().set(b);
    }
    if (consume('actionQueued') && b && !dialog) {
      sfx('click');
      b.onInteract();
    }

    onStep?.(dt);

    // --- camera
    if (autoAlign.current < 0 && mag > 0.3 && mv.y > 0.2 && !blocking) {
      let d = player.yaw + Math.PI - cy;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      input.camYaw += d * dt * 1.2;
    }
    const focus = dialog?.focus;
    if (focus && blocking) {
      // conversation camera: over-the-shoulder towards the speaker
      const sp = tmp.current.set(focus[0], focus[1], focus[2]);
      const mid = sp.clone().add(p).multiplyScalar(0.5);
      const side = new THREE.Vector3(sp.z - p.z, 0, -(sp.x - p.x)).normalize();
      const away = p.clone().sub(sp).setY(0).normalize();
      camTarget.current.copy(p).addScaledVector(away, 2.2).addScaledVector(side, 1.1).setY(p.y + 1.75);
      camLook.current.lerp(new THREE.Vector3(sp.x, sp.y + 1.45, sp.z).lerp(mid.setY(sp.y + 1.4), 0.15), 0.12);
    } else {
      const pitch = input.camPitch;
      const dist = input.camDist;
      const head = new THREE.Vector3(p.x, p.y + 1.45, p.z);
      const want = new THREE.Vector3(
        p.x + Math.sin(cy) * Math.cos(pitch) * dist,
        p.y + 1.45 + Math.sin(pitch) * dist,
        p.z + Math.cos(cy) * Math.cos(pitch) * dist,
      );
      const len = cameraClip(head, want);
      const full = want.distanceTo(head);
      if (len < full) {
        const off = want.clone().sub(head).multiplyScalar(len / full);
        want.copy(head).add(off);
      }
      if (want.y < p.y + 0.4) want.y = p.y + 0.4;
      camTarget.current.copy(want);
      // look slightly above head and towards the right (over-shoulder framing like modern adventures)
      const shoulder = new THREE.Vector3(Math.cos(cy), 0, -Math.sin(cy)).multiplyScalar(0.0);
      camLook.current.lerp(head.add(shoulder), 0.35);
    }
    camera.position.lerp(camTarget.current, focus && blocking ? 0.06 : 0.22);
    camera.lookAt(camLook.current);
  });

  return (
    <group ref={group}>
      <Humanoid look={look} anim={anim} />
    </group>
  );
}
