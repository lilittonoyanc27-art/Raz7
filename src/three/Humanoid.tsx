import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { jerseyBackTex, jerseyFrontTex } from './textures';

export interface Anim {
  speed: number; // m/s
  grounded: boolean;
  kickT: number; // seconds remaining of kick animation
  waveT: number; // seconds remaining of wave animation
  talk: boolean;
  sit?: boolean;
  phase?: number;
}
export const newAnim = (): Anim => ({ speed: 0, grounded: true, kickT: 0, waveT: 0, talk: false, phase: Math.random() * 10 });

export interface Look {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'curly' | 'long' | 'bun' | 'bald' | 'cap' | 'pony';
  top: string;
  topStyle?: 'jersey' | 'shirt' | 'jacket' | 'hoodie' | 'dress';
  bottom: string;
  bottomStyle?: 'shorts' | 'pants';
  shoes: string;
  socks?: string;
  height: number; // meters
  build?: number; // width multiplier
  capColor?: string;
  jerseyName?: string;
  jerseyNum?: string;
  accessory?: string;
  eyes?: string;
}

// -------------------------------------------------- shared geometry / materials
const G = {
  sphere: new THREE.SphereGeometry(1, 20, 16),
  sphereLo: new THREE.SphereGeometry(1, 10, 8),
  cap: new THREE.CapsuleGeometry(1, 1, 6, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  torso: new RoundedBoxGeometry(1, 1, 1, 4, 0.22),
  body: new THREE.CylinderGeometry(0.5, 0.4, 1, 28, 1),
  backDecal: new THREE.CylinderGeometry(0.507, 0.407, 1, 28, 1, true, Math.PI - 1.05, 2.1),
  frontDecal: new THREE.CylinderGeometry(0.507, 0.407, 1, 28, 1, true, -0.75, 1.5),
  box: new RoundedBoxGeometry(1, 1, 1, 2, 0.12),
  plane: new THREE.PlaneGeometry(1, 1),
  hair: new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
  hairTop: new THREE.SphereGeometry(1, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.46),
  capBrim: new THREE.CylinderGeometry(1, 1, 0.1, 18, 1, false, 0, Math.PI),
};
const matCache = new Map<string, THREE.Material>();
export function mat(color: string, rough = 0.7, metal = 0) {
  const k = `${color}-${rough}-${metal}`;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    matCache.set(k, m);
  }
  return m;
}
const decalMat = (tex: THREE.Texture) => {
  const k = 'decal-' + tex.uuid;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
    matCache.set(k, m);
  }
  return m;
};

type J = MutableRefObject<THREE.Group | null>;

export function Humanoid({ look, anim, castShadow = true }: { look: Look; anim: MutableRefObject<Anim>; castShadow?: boolean }) {
  const H = look.height;
  const B = look.build ?? 1;
  const s = H / 1.75; // scale relative to adult reference

  const hips = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lHip = useRef<THREE.Group>(null);
  const rHip = useRef<THREE.Group>(null);
  const lKnee = useRef<THREE.Group>(null);
  const rKnee = useRef<THREE.Group>(null);
  const lSh = useRef<THREE.Group>(null);
  const rSh = useRef<THREE.Group>(null);
  const lEl = useRef<THREE.Group>(null);
  const rEl = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);

  const dims = useMemo(() => {
    const legTop = 0.92 * s;
    const thigh = 0.43 * s;
    const shin = 0.42 * s;
    const torsoH = 0.5 * s;
    const torsoW = 0.36 * s * B;
    const torsoD = 0.2 * s * B;
    const upperArm = 0.29 * s;
    const foreArm = 0.26 * s;
    const headR = 0.115 * s * (H < 1.6 ? 1.06 : 1);
    return { legTop, thigh, shin, torsoH, torsoW, torsoD, upperArm, foreArm, headR };
  }, [s, B, H]);

  const skin = mat(look.skin, 0.55);
  const topM = mat(look.top, 0.75);
  const bottomM = mat(look.bottom, 0.8);
  const shoeM = mat(look.shoes, 0.4, 0.1);
  const sockM = mat(look.socks ?? (look.bottomStyle === 'pants' ? look.bottom : '#f2f2f2'), 0.8);
  const hairM = mat(look.hair, 0.85);
  const white = mat('#ffffff', 0.3);
  const iris = mat(look.eyes ?? '#3b2a1e', 0.3);
  const dark = mat('#111111', 0.4);
  const lip = mat(shade(look.skin, -0.25), 0.6);
  const brow = mat(shade(look.hair, -0.1), 0.9);
  const isJersey = look.topStyle === 'jersey';
  const pants = look.bottomStyle === 'pants';

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const a = anim.current;
    const sp = Math.min(a.speed, 9);
    const running = sp > 3.2;
    a.phase = (a.phase ?? 0) + dt * (sp > 0.1 ? 2.2 + sp * 1.25 : 0);
    const p = a.phase;
    const amp = sp > 0.1 ? Math.min(1, sp / 2) * (running ? 0.95 : 0.55) : 0;
    const t = performance.now() / 1000;

    let lh = Math.sin(p) * amp;
    let rh = -Math.sin(p) * amp;
    let lk = Math.max(0, -Math.sin(p - 0.9)) * amp * (running ? 1.6 : 1.1);
    let rk = Math.max(0, Math.sin(p - 0.9)) * amp * (running ? 1.6 : 1.1);
    let ls = -Math.sin(p) * amp * (running ? 1.1 : 0.7);
    let rs = Math.sin(p) * amp * (running ? 1.1 : 0.7);
    let le = -0.25 - (running ? 1.1 : 0.25);
    let re = le;
    let lean = running ? 0.18 : sp > 0.1 ? 0.05 : 0;
    let bob = sp > 0.1 ? Math.abs(Math.sin(p)) * (running ? 0.06 : 0.03) * s : Math.sin(t * 2) * 0.006 * s;
    let rsZ = -0.08;
    let lsZ = 0.08;

    if (!a.grounded) {
      lh = -0.6; rh = 0.25; lk = 1.1; rk = 0.5;
      ls = -0.9; rs = -0.9; lsZ = 0.5; rsZ = -0.5;
      lean = 0.1;
    }
    if (a.sit) {
      lh = -1.5; rh = -1.5; lk = 1.5; rk = 1.5; ls = -0.2; rs = -0.2; lean = 0; bob = -0.42 * s;
    }
    if (a.kickT > 0) {
      const k = 1 - a.kickT / 0.45; // 0..1
      const swing = k < 0.4 ? THREE.MathUtils.lerp(0, 0.9, k / 0.4) : THREE.MathUtils.lerp(0.9, -1.4, Math.min(1, (k - 0.4) / 0.35));
      rh = -swing;
      rk = k < 0.5 ? 1.2 : 0.2;
      lh = 0.1; lk = 0.2;
      ls = -0.5; rs = 0.6; lsZ = 0.6; rsZ = -0.3;
      a.kickT -= dt;
    }
    if (a.waveT > 0) {
      rs = -2.6;
      rsZ = -0.3 + Math.sin(t * 12) * 0.3;
      re = -0.4;
      a.waveT -= dt;
    }

    const lerp = (o: J, x: number, z = 0) => {
      if (!o.current) return;
      o.current.rotation.x = THREE.MathUtils.lerp(o.current.rotation.x, x, 0.35);
      o.current.rotation.z = THREE.MathUtils.lerp(o.current.rotation.z, z, 0.35);
    };
    lerp(lHip, lh);
    lerp(rHip, rh);
    lerp(lKnee, lk);
    lerp(rKnee, rk);
    lerp(lSh, ls, lsZ);
    lerp(rSh, rs, rsZ);
    lerp(lEl, le);
    lerp(rEl, re);
    if (spine.current) spine.current.rotation.x = THREE.MathUtils.lerp(spine.current.rotation.x, lean, 0.2);
    if (hips.current) hips.current.position.y = dims.legTop + bob;
    if (head.current) head.current.rotation.y = Math.sin(t * 0.5 + (a.phase ?? 0) * 0.01) * 0.12;
    if (mouth.current) mouth.current.scale.y = a.talk ? 0.012 * s + Math.abs(Math.sin(t * 14)) * 0.02 * s : 0.012 * s;
  });

  const { legTop, thigh, shin, torsoH, torsoW, torsoD, upperArm, foreArm, headR } = dims;
  const legR = 0.068 * s * B;
  const armR = 0.048 * s * B;
  const hipX = 0.095 * s * B;
  const shX = torsoW / 2 + armR * 0.6;

  const Leg = ({ side, hipRef, kneeRef }: { side: 1 | -1; hipRef: J; kneeRef: J }) => (
    <group ref={hipRef} position={[side * hipX, 0, 0]}>
      {/* thigh */}
      <mesh geometry={G.cap} material={pants ? bottomM : skin} castShadow={castShadow} position={[0, -thigh / 2, 0]} scale={[legR, thigh / 2 - legR * 0.3, legR]} />
      {!pants && <mesh geometry={G.cyl} material={bottomM} castShadow={castShadow} position={[0, -thigh * 0.22, 0]} scale={[legR * 1.45, thigh * 0.5, legR * 1.4]} />}
      <group ref={kneeRef} position={[0, -thigh, 0]}>
        <mesh geometry={G.cap} material={pants ? bottomM : skin} castShadow={castShadow} position={[0, -shin / 2, 0]} scale={[legR * 0.85, shin / 2 - legR * 0.3, legR * 0.85]} />
        {!pants && <mesh geometry={G.cyl} material={sockM} castShadow={castShadow} position={[0, -shin * 0.62, 0]} scale={[legR * 0.95, shin * 0.62, legR * 0.95]} />}
        {/* shoe */}
        <group position={[0, -shin - 0.02 * s, 0.045 * s]}>
          <mesh geometry={G.box} material={shoeM} castShadow={castShadow} scale={[legR * 1.45, 0.075 * s, 0.25 * s]} />
          <mesh geometry={G.box} material={white} position={[0, -0.03 * s, 0]} scale={[legR * 1.5, 0.025 * s, 0.255 * s]} />
        </group>
      </group>
    </group>
  );

  const Arm = ({ side, shRef, elRef }: { side: 1 | -1; shRef: J; elRef: J }) => (
    <group ref={shRef} position={[side * shX, torsoH * 0.88, 0]}>
      <mesh geometry={G.sphere} material={look.topStyle === 'dress' ? skin : topM} castShadow={castShadow} scale={armR * 1.35} />
      <mesh geometry={G.cap} material={skin} castShadow={castShadow} position={[0, -upperArm / 2, 0]} scale={[armR, upperArm / 2 - armR * 0.3, armR]} />
      {look.topStyle !== 'dress' && (
        <mesh geometry={G.cyl} material={topM} castShadow={castShadow} position={[0, -upperArm * (look.topStyle === 'jacket' || look.topStyle === 'hoodie' ? 0.5 : 0.25), 0]} scale={[armR * 1.3, upperArm * (look.topStyle === 'jacket' || look.topStyle === 'hoodie' ? 1 : 0.5), armR * 1.3]} />
      )}
      {isJersey && <mesh geometry={G.cyl} material={mat('#1b2233')} position={[0, -upperArm * 0.5, 0]} scale={[armR * 1.33, 0.02 * s, armR * 1.33]} />}
      <group ref={elRef} position={[0, -upperArm, 0]}>
        <mesh geometry={G.cap} material={look.topStyle === 'jacket' || look.topStyle === 'hoodie' ? topM : skin} castShadow={castShadow} position={[0, -foreArm / 2, 0]} scale={[armR * 0.9, foreArm / 2 - armR * 0.3, armR * 0.9]} />
        <mesh geometry={G.sphere} material={skin} castShadow={castShadow} position={[0, -foreArm - 0.03 * s, 0]} scale={[armR * 0.95, armR * 1.3, armR * 0.7]} />
        {look.accessory === 'muñequera' && side === -1 && <mesh geometry={G.cyl} material={mat('#ff7a1a')} position={[0, -foreArm * 0.8, 0]} scale={[armR * 1.05, 0.05 * s, armR * 1.05]} />}
      </group>
      {look.accessory === 'brazalete' && side === -1 && <mesh geometry={G.cyl} material={mat('#ffd34d')} position={[0, -upperArm * 0.35, 0]} scale={[armR * 1.36, 0.05 * s, armR * 1.36]} />}
    </group>
  );

  const backTex = isJersey ? jerseyBackTex(look.jerseyName ?? 'RAZMIK', look.jerseyNum ?? '7') : null;
  const frontTex = isJersey ? jerseyFrontTex(look.jerseyNum ?? '7') : null;

  const lookKey = JSON.stringify(look);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (
    <group>
      <group ref={hips} position={[0, legTop, 0]}>
        {/* pelvis */}
        <mesh geometry={G.torso} material={look.topStyle === 'dress' ? topM : bottomM} castShadow={castShadow} position={[0, 0.02 * s, 0]} scale={[torsoW * 0.92, 0.17 * s, torsoD * 1.05]} />
        {look.topStyle === 'dress' && <mesh geometry={G.cyl} material={topM} castShadow={castShadow} position={[0, -0.15 * s, 0]} scale={[torsoW * 0.62, 0.3 * s, torsoD * 0.9]} />}
        <Leg side={1} hipRef={lHip} kneeRef={lKnee} />
        <Leg side={-1} hipRef={rHip} kneeRef={rKnee} />
        <group ref={spine} position={[0, 0.08 * s, 0]}>
          {/* torso */}
          <mesh geometry={G.body} material={topM} castShadow={castShadow} position={[0, torsoH / 2, 0]} scale={[torsoW, torsoH, torsoD]} />
          <mesh geometry={G.sphere} material={topM} castShadow={castShadow} position={[0, torsoH, 0]} scale={[torsoW * 0.5, torsoH * 0.14, torsoD * 0.5]} />
          {isJersey && (
            <>
              <mesh geometry={G.body} material={mat('#1b2233')} position={[0, torsoH * 0.03, 0]} scale={[torsoW * 0.83, 0.05 * s, torsoD * 0.83]} />
              <mesh geometry={G.backDecal} material={decalMat(backTex!)} position={[0, torsoH / 2, 0]} scale={[torsoW, torsoH, torsoD]} />
              <mesh geometry={G.frontDecal} material={decalMat(frontTex!)} position={[0, torsoH / 2, 0]} scale={[torsoW, torsoH, torsoD]} />
              {/* collar */}
              <mesh geometry={G.cyl} material={mat('#1b2233')} position={[0, torsoH * 0.98, 0]} scale={[0.07 * s, 0.03 * s, 0.065 * s]} />
            </>
          )}
          {look.topStyle === 'jacket' && <mesh geometry={G.box} material={mat(shade(look.top, 0.25))} position={[0, torsoH * 0.5, torsoD / 2 + 0.002]} scale={[0.02 * s, torsoH * 0.95, 0.01]} />}
          {look.topStyle === 'hoodie' && <mesh geometry={G.sphere} material={topM} position={[0, torsoH * 0.95, -torsoD * 0.38]} scale={[torsoW * 0.36, 0.09 * s, 0.09 * s]} />}
          {/* neck */}
          <mesh geometry={G.cyl} material={skin} castShadow={castShadow} position={[0, torsoH + 0.04 * s, 0]} scale={[0.05 * s, 0.1 * s, 0.05 * s]} />
          <group ref={head} position={[0, torsoH + 0.09 * s + headR, 0.005 * s]}>
            <mesh geometry={G.sphere} material={skin} castShadow={castShadow} scale={[headR * 0.9, headR * 1.08, headR * 0.98]} />
            {/* jaw */}
            <mesh geometry={G.sphere} material={skin} position={[0, -headR * 0.45, headR * 0.18]} scale={[headR * 0.66, headR * 0.5, headR * 0.7]} />
            {/* ears */}
            <mesh geometry={G.sphereLo} material={skin} position={[headR * 0.88, -headR * 0.05, 0]} scale={[headR * 0.12, headR * 0.24, headR * 0.16]} />
            <mesh geometry={G.sphereLo} material={skin} position={[-headR * 0.88, -headR * 0.05, 0]} scale={[headR * 0.12, headR * 0.24, headR * 0.16]} />
            {/* eyes */}
            {[1, -1].map((sd) => (
              <group key={sd} position={[sd * headR * 0.33, headR * 0.08, headR * 0.83]}>
                <mesh geometry={G.sphereLo} material={white} scale={[headR * 0.15, headR * 0.1, headR * 0.08]} />
                <mesh geometry={G.sphereLo} material={iris} position={[0, 0, headR * 0.06]} scale={[headR * 0.07, headR * 0.075, headR * 0.04]} />
                <mesh geometry={G.sphereLo} material={dark} position={[0, 0, headR * 0.085]} scale={[headR * 0.035, headR * 0.04, headR * 0.02]} />
                <mesh geometry={G.box} material={brow} position={[0, headR * 0.17, headR * 0.02]} rotation={[0, 0, sd * -0.12]} scale={[headR * 0.3, headR * 0.05, headR * 0.06]} />
              </group>
            ))}
            {/* nose */}
            <mesh geometry={G.sphereLo} material={skin} position={[0, -headR * 0.12, headR * 0.95]} scale={[headR * 0.11, headR * 0.17, headR * 0.12]} />
            {/* mouth */}
            <mesh ref={mouth} geometry={G.sphereLo} material={lip} position={[0, -headR * 0.42, headR * 0.83]} scale={[headR * 0.2, 0.012 * s, headR * 0.06]} />
            <Hair look={look} r={headR} hairM={hairM} />
          </group>
          <Arm side={1} shRef={lSh} elRef={lEl} />
          <Arm side={-1} shRef={rSh} elRef={rEl} />
        </group>
      </group>
    </group>
  ), [lookKey, castShadow]);
}

function Hair({ look, r, hairM }: { look: Look; r: number; hairM: THREE.Material }) {
  switch (look.hairStyle) {
    case 'bald':
      return null;
    case 'cap':
      return (
        <group>
          <mesh geometry={G.hair} material={mat(look.capColor ?? '#1b2233')} position={[0, r * 0.12, -r * 0.02]} scale={[r * 0.95, r * 1.0, r * 1.02]} />
          <mesh geometry={G.capBrim} material={mat(look.capColor ?? '#1b2233')} position={[0, r * 0.38, r * 0.55]} rotation={[0.15, Math.PI / 2, 0]} scale={[r * 0.75, 1, r * 0.95]} />
        </group>
      );
    case 'curly':
      return (
        <group>
          <mesh geometry={G.hair} material={hairM} position={[0, r * 0.1, -r * 0.05]} scale={[r * 0.98, r * 1.12, r * 1.06]} />
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <mesh key={i} geometry={G.sphereLo} material={hairM} position={[Math.cos(a) * r * 0.6, r * 0.72, Math.sin(a) * r * 0.55 - r * 0.1]} scale={r * 0.3} />;
          })}
        </group>
      );
    case 'long':
    case 'pony':
    case 'bun':
      return (
        <group>
          <mesh geometry={G.hair} material={hairM} position={[0, r * 0.06, -r * 0.04]} scale={[r * 0.97, r * 1.14, r * 1.06]} />
          {look.hairStyle === 'long' && <mesh geometry={G.box} material={hairM} position={[0, -r * 0.6, -r * 0.55]} scale={[r * 1.6, r * 1.6, r * 0.5]} />}
          {look.hairStyle === 'pony' && <mesh geometry={G.cap} material={hairM} position={[0, -r * 0.3, -r * 1.05]} rotation={[0.4, 0, 0]} scale={[r * 0.22, r * 0.55, r * 0.22]} />}
          {look.hairStyle === 'bun' && <mesh geometry={G.sphere} material={hairM} position={[0, r * 0.95, -r * 0.45]} scale={r * 0.38} />}
        </group>
      );
    default:
      return (
        <group>
          <mesh geometry={G.hairTop} material={hairM} position={[0, r * 0.08, -r * 0.03]} scale={[r * 0.95, r * 1.12, r * 1.03]} />
          <mesh geometry={G.sphere} material={hairM} position={[0, -r * 0.08, -r * 0.42]} scale={[r * 0.8, r * 0.62, r * 0.6]} />
          <mesh geometry={G.sphereLo} material={hairM} position={[0, r * 0.72, r * 0.38]} scale={[r * 0.66, r * 0.24, r * 0.4]} rotation={[0.35, 0, 0]} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} geometry={G.sphereLo} material={hairM} position={[sd * r * 0.55, r * 0.6, r * 0.05]} scale={[r * 0.35, r * 0.3, r * 0.5]} />
          ))}
        </group>
      );
  }
}

export function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amt, 0, 1));
  return '#' + c.getHexString();
}

// ------------------------------------------------- presets
export const RAZMIK_LOOK = (boots = '#151515', accessory = 'ninguno'): Look => ({
  skin: '#d9a77f',
  hair: '#2a1b12',
  hairStyle: 'short',
  top: '#ff7a1a',
  topStyle: 'jersey',
  bottom: '#ff7a1a',
  bottomStyle: 'shorts',
  shoes: boots,
  socks: '#ff7a1a',
  height: 1.56,
  build: 1,
  jerseyName: 'RAZMIK',
  jerseyNum: '7',
  accessory,
  eyes: '#4a3220',
});

const SKINS = ['#f1c9a5', '#e0ac85', '#c98e64', '#a86b45', '#7b4a2e', '#f5d3b8'];
const HAIRS = ['#1d140e', '#3a2416', '#6b4423', '#a8743a', '#d9b46a', '#222222', '#8a8a8a'];
const TOPS = ['#2e6fd8', '#e14b4b', '#f2c94c', '#27ae60', '#9b51e0', '#ffffff', '#1b2233', '#e67ea8', '#56ccf2', '#7d5a3c', '#3c4a5c'];
const BOTTOMS = ['#2b3a55', '#1d1d1d', '#56657a', '#c2b59b', '#3f5f8a', '#6b4f3a'];
const SHOES = ['#f2f2f2', '#1d1d1d', '#7a4b2a', '#d94b4b', '#2e6fd8'];

export function randomLook(r: () => number, opts: Partial<Look> = {}): Look {
  const pickr = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const female = r() < 0.5;
  const kid = r() < 0.2;
  return {
    skin: pickr(SKINS),
    hair: pickr(HAIRS),
    hairStyle: female ? pickr(['long', 'pony', 'bun'] as const) : pickr(['short', 'curly', 'bald', 'cap', 'short'] as const),
    top: pickr(TOPS),
    topStyle: female && r() < 0.25 ? 'dress' : pickr(['shirt', 'jacket', 'hoodie', 'shirt'] as const),
    bottom: pickr(BOTTOMS),
    bottomStyle: r() < 0.8 ? 'pants' : 'shorts',
    shoes: pickr(SHOES),
    height: kid ? 1.4 + r() * 0.15 : female ? 1.6 + r() * 0.12 : 1.7 + r() * 0.15,
    build: 0.92 + r() * 0.2,
    capColor: pickr(TOPS),
    ...opts,
  };
}
