import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mat, shade } from './Humanoid';
import { busSideTex, facadeTex, textTex } from './textures';
import { seeded } from '../core/random';

const RB = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);
const geo = {
  carBody: RB(1.9, 0.62, 4.3, 0.22),
  carCabin: RB(1.66, 0.6, 2.3, 0.26),
  wheel: new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18),
  rim: new THREE.CylinderGeometry(0.2, 0.2, 0.27, 10),
  light: RB(0.4, 0.14, 0.06, 0.04),
  busBody: RB(2.6, 2.9, 11.5, 0.28),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  cylHi: new THREE.CylinderGeometry(1, 1, 1, 20),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  ico: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 16),
  plane: new THREE.PlaneGeometry(1, 1),
};
const glass = new THREE.MeshStandardMaterial({ color: '#1d2b3d', roughness: 0.08, metalness: 0.7 });
const headM = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff3c0', emissiveIntensity: 1.2 });
const tailM = new THREE.MeshStandardMaterial({ color: '#b3121b', emissive: '#ff2a2a', emissiveIntensity: 0.8 });
const tire = mat('#1a1a1a', 0.9);
const rimM = mat('#c8ccd2', 0.3, 0.8);

export const CAR_COLORS = ['#d62828', '#f77f00', '#fcbf49', '#2a9d8f', '#264653', '#e9ecef', '#1d3557', '#6c757d', '#8338ec', '#118ab2', '#111111'];

export function CarModel({ color, castShadow = true, kind = 'sedan' }: { color: string; castShadow?: boolean; kind?: 'sedan' | 'taxi' | 'suv' }) {
  const body = useMemo(() => new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08 }), [color]);
  const suv = kind === 'suv';
  return (
    <group>
      <mesh geometry={geo.carBody} material={body} position={[0, 0.62, 0]} scale={[1, suv ? 1.25 : 1, 1]} castShadow={castShadow} />
      <mesh geometry={geo.carCabin} material={glass} position={[0, suv ? 1.25 : 1.12, -0.2]} scale={[1, suv ? 1.15 : 1, suv ? 1.25 : 1]} castShadow={castShadow} />
      <mesh geometry={geo.box} material={body} position={[0, suv ? 1.6 : 1.43, -0.2]} scale={[1.5, 0.06, suv ? 2.6 : 1.9]} />
      {kind === 'taxi' && (
        <mesh geometry={geo.box} position={[0, 1.55, -0.2]} scale={[0.6, 0.18, 0.25]}>
          <meshStandardMaterial map={textTex('TAXI', { bg: '#ffd34d', fg: '#111', w: 256, h: 96 })} />
        </mesh>
      )}
      {[[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]].map(([x, z], i) => (
        <group key={i} position={[x, 0.36, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh geometry={geo.wheel} material={tire} castShadow={castShadow} />
          <mesh geometry={geo.rim} material={rimM} />
        </group>
      ))}
      <mesh geometry={geo.light} material={headM} position={[-0.6, 0.72, 2.14]} />
      <mesh geometry={geo.light} material={headM} position={[0.6, 0.72, 2.14]} />
      <mesh geometry={geo.light} material={tailM} position={[-0.62, 0.75, -2.14]} />
      <mesh geometry={geo.light} material={tailM} position={[0.62, 0.75, -2.14]} />
      <mesh geometry={geo.box} material={mat('#2a2a2a', 0.6)} position={[0, 0.38, 2.12]} scale={[1.8, 0.2, 0.12]} />
      <mesh geometry={geo.box} material={mat('#2a2a2a', 0.6)} position={[0, 0.38, -2.12]} scale={[1.8, 0.2, 0.12]} />
      {/* license plate */}
      <mesh geometry={geo.plane} position={[0, 0.5, -2.19]} rotation={[0, Math.PI, 0]} scale={[0.52, 0.12, 1]}>
        <meshStandardMaterial map={textTex('R7·2026', { bg: '#f4f4f4', fg: '#1b2233', w: 256, h: 64 })} />
      </mesh>
    </group>
  );
}

export function BusModel({ line, color = '#ff7a1a', castShadow = true }: { line: string; color?: string; castShadow?: boolean }) {
  const side = busSideTex(line, color);
  const front = textTex(`${line} · ESTADIO`, { bg: '#111', fg: '#ffb03a', w: 512, h: 96 });
  const bodyM = useMemo(() => new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.3, clearcoat: 0.8 }), [color]);
  return (
    <group>
      <mesh geometry={geo.busBody} material={bodyM} position={[0, 1.85, 0]} castShadow={castShadow} />
      <mesh geometry={geo.plane} position={[1.31, 2.15, 0]} rotation={[0, Math.PI / 2, 0]} scale={[11, 2.2, 1]}>
        <meshStandardMaterial map={side} />
      </mesh>
      <mesh geometry={geo.plane} position={[-1.31, 2.15, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[11, 2.2, 1]}>
        <meshStandardMaterial map={side} />
      </mesh>
      <mesh geometry={geo.plane} material={glass} position={[0, 2.25, 5.76]} scale={[2.3, 1.5, 1]} />
      <mesh geometry={geo.plane} position={[0, 3.1, 5.77]} scale={[2.2, 0.4, 1]}>
        <meshBasicMaterial map={front} />
      </mesh>
      {[[-1.15, 3.8], [1.15, 3.8], [-1.15, -3.6], [1.15, -3.6]].map(([x, z], i) => (
        <group key={i} position={[x, 0.5, z]} rotation={[0, 0, Math.PI / 2]} scale={1.4}>
          <mesh geometry={geo.wheel} material={tire} />
          <mesh geometry={geo.rim} material={rimM} />
        </group>
      ))}
      <mesh geometry={geo.light} material={headM} position={[-0.9, 0.9, 5.78]} scale={1.3} />
      <mesh geometry={geo.light} material={headM} position={[0.9, 0.9, 5.78]} scale={1.3} />
      <mesh geometry={geo.light} material={tailM} position={[-0.9, 0.9, -5.78]} scale={1.3} />
      <mesh geometry={geo.light} material={tailM} position={[0.9, 0.9, -5.78]} scale={1.3} />
    </group>
  );
}

export function Tree({ s = 1, color = '#4f8f3a', castShadow = true }: { s?: number; color?: string; castShadow?: boolean }) {
  return (
    <group scale={s}>
      <mesh geometry={geo.cyl} material={mat('#6b4a2f', 0.9)} position={[0, 1.3, 0]} scale={[0.18, 2.6, 0.18]} castShadow={castShadow} />
      <mesh geometry={geo.ico} material={mat(color, 0.85)} position={[0, 3.4, 0]} scale={[1.6, 1.5, 1.6]} castShadow={castShadow} />
      <mesh geometry={geo.ico} material={mat(shade(color, 0.06), 0.85)} position={[0.7, 3.0, 0.4]} scale={1.05} castShadow={castShadow} />
      <mesh geometry={geo.ico} material={mat(shade(color, -0.05), 0.85)} position={[-0.6, 3.1, -0.5]} scale={1.1} castShadow={castShadow} />
      <mesh geometry={geo.ico} material={mat(shade(color, 0.1), 0.85)} position={[0, 4.4, 0]} scale={1.0} castShadow={castShadow} />
    </group>
  );
}

export function Palm({ s = 1, castShadow = true, seed = 1 }: { s?: number; castShadow?: boolean; seed?: number }) {
  const leaves = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2 + r() * 0.3, tilt: 0.5 + r() * 0.35, len: 2.4 + r() * 0.8 }));
  }, [seed]);
  const trunkM = mat('#8a6a48', 0.9);
  const leafM = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f8f4a', roughness: 0.8, side: THREE.DoubleSide }), []);
  return (
    <group scale={s}>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} geometry={geo.cyl} material={trunkM} position={[i * 0.05, 0.5 + i * 0.95, 0]} scale={[0.2 - i * 0.012, 1, 0.2 - i * 0.012]} castShadow={castShadow} />
      ))}
      <group position={[0.35, 6.9, 0]}>
        {leaves.map((l, i) => (
          <group key={i} rotation={[0, l.a, 0]}>
            <mesh geometry={geo.box} material={leafM} position={[l.len / 2, -l.tilt * 0.8, 0]} rotation={[0, 0, -l.tilt]} scale={[l.len, 0.04, 0.55]} castShadow={castShadow} />
          </group>
        ))}
        <mesh geometry={geo.sphere} material={mat('#5a4030')} scale={0.3} />
      </group>
    </group>
  );
}

export function Bush({ s = 1, color = '#3f7d3a' }: { s?: number; color?: string }) {
  return (
    <group scale={s}>
      <mesh geometry={geo.ico} material={mat(color, 0.9)} position={[0, 0.5, 0]} scale={[0.9, 0.6, 0.9]} castShadow />
      <mesh geometry={geo.ico} material={mat(shade(color, 0.08), 0.9)} position={[0.5, 0.4, 0.2]} scale={0.5} />
      {color === '#3f7d3a' && <mesh geometry={geo.sphere} material={mat('#e86aa1')} position={[0.2, 0.9, 0.5]} scale={0.1} />}
    </group>
  );
}

export function Bench() {
  const w = mat('#9a6a3c', 0.8);
  const m = mat('#2b2f36', 0.5, 0.6);
  return (
    <group>
      <mesh geometry={geo.box} material={w} position={[0, 0.48, 0]} scale={[1.8, 0.07, 0.5]} castShadow />
      <mesh geometry={geo.box} material={w} position={[0, 0.85, -0.24]} rotation={[-0.15, 0, 0]} scale={[1.8, 0.4, 0.06]} castShadow />
      <mesh geometry={geo.box} material={m} position={[-0.8, 0.24, 0]} scale={[0.06, 0.48, 0.45]} />
      <mesh geometry={geo.box} material={m} position={[0.8, 0.24, 0]} scale={[0.06, 0.48, 0.45]} />
    </group>
  );
}

export function StreetLamp({ night = false }: { night?: boolean }) {
  const m = mat('#3a3f47', 0.5, 0.6);
  return (
    <group>
      <mesh geometry={geo.cyl} material={m} position={[0, 3, 0]} scale={[0.08, 6, 0.08]} castShadow />
      <mesh geometry={geo.box} material={m} position={[0.6, 6, 0]} scale={[1.3, 0.08, 0.12]} />
      <mesh geometry={geo.box} position={[1.15, 5.9, 0]} scale={[0.5, 0.12, 0.3]}>
        <meshStandardMaterial color="#fff6d8" emissive="#ffd890" emissiveIntensity={night ? 2.5 : 0.2} />
      </mesh>
    </group>
  );
}

export function Hydrant() {
  return (
    <group>
      <mesh geometry={geo.cyl} material={mat('#d62828', 0.5)} position={[0, 0.35, 0]} scale={[0.15, 0.7, 0.15]} />
      <mesh geometry={geo.sphere} material={mat('#d62828', 0.5)} position={[0, 0.72, 0]} scale={0.15} />
    </group>
  );
}

export function Cone({ color = '#ff7a1a', s = 1 }: { color?: string; s?: number }) {
  return (
    <group scale={s}>
      <mesh geometry={geo.cone} material={mat(color, 0.5)} position={[0, 0.35, 0]} scale={[0.25, 0.7, 0.25]} castShadow />
      <mesh geometry={geo.box} material={mat(color, 0.5)} position={[0, 0.02, 0]} scale={[0.5, 0.04, 0.5]} />
      <mesh geometry={geo.cyl} material={mat('#ffffff', 0.4)} position={[0, 0.38, 0]} scale={[0.14, 0.08, 0.14]} />
    </group>
  );
}

export function Goal({ w = 7.32, h = 2.44, d = 2 }: { w?: number; h?: number; d?: number }) {
  const post = mat('#ffffff', 0.3, 0.2);
  const net = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, wireframe: true }), []);
  return (
    <group>
      <mesh geometry={geo.cylHi} material={post} position={[-w / 2, h / 2, 0]} scale={[0.06, h, 0.06]} castShadow />
      <mesh geometry={geo.cylHi} material={post} position={[w / 2, h / 2, 0]} scale={[0.06, h, 0.06]} castShadow />
      <mesh geometry={geo.cylHi} material={post} position={[0, h, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.06, w, 0.06]} castShadow />
      <mesh material={net} position={[0, h / 2, -d / 2]}>
        <boxGeometry args={[w, h, d, 14, 6, 4]} />
      </mesh>
    </group>
  );
}

export function Sign({ text, w = 3, h = 0.8, bg = '#1b2233', fg = '#ffffff', post = true, emissive = false }: { text: string; w?: number; h?: number; bg?: string; fg?: string; post?: boolean; emissive?: boolean }) {
  const tex = textTex(text, { bg, fg, w: 512, h: Math.round((512 * h) / w) });
  return (
    <group>
      {post && <mesh geometry={geo.cyl} material={mat('#4a4f57', 0.5, 0.5)} position={[0, 1.2, 0]} scale={[0.05, 2.4, 0.05]} />}
      <group position={[0, post ? 2.4 + h / 2 : 0, 0]}>
        <mesh geometry={geo.box} material={mat('#2b2f36')} scale={[w + 0.08, h + 0.08, 0.05]} />
        <mesh geometry={geo.plane} position={[0, 0, 0.03]} scale={[w, h, 1]}>
          {emissive ? <meshBasicMaterial map={tex} toneMapped={false} /> : <meshStandardMaterial map={tex} />}
        </mesh>
        <mesh geometry={geo.plane} position={[0, 0, -0.03]} rotation={[0, Math.PI, 0]} scale={[w, h, 1]}>
          {emissive ? <meshBasicMaterial map={tex} toneMapped={false} /> : <meshStandardMaterial map={tex} />}
        </mesh>
      </group>
    </group>
  );
}

/** Multi-storey building with facade textures, shop at street level and roof details */
export function Building({ w, d, h, color, style, night, shop, shopColor = '#ff7a1a', roof = true }: { w: number; d: number; h: number; color: string; style: number; night?: boolean; shop?: string; shopColor?: string; roof?: boolean }) {
  const mats = useMemo(() => {
    const day = facadeTex(style);
    const lit = facadeTex(style, true);
    const mk = (rw: number) => {
      const m = day.clone();
      m.needsUpdate = true;
      m.wrapS = m.wrapT = THREE.RepeatWrapping;
      m.repeat.set(Math.max(1, Math.round(rw / 8)), Math.max(1, Math.round(h / 24)));
      const e = lit.clone();
      e.needsUpdate = true;
      e.wrapS = e.wrapT = THREE.RepeatWrapping;
      e.repeat.copy(m.repeat);
      return new THREE.MeshStandardMaterial({ color, map: m, roughness: 0.85, emissiveMap: e, emissive: night ? '#ffffff' : '#000000', emissiveIntensity: night ? 0.9 : 0 });
    };
    return { front: mk(w), side: mk(d) };
  }, [w, d, h, color, style, night]);
  const topM = mat(shade(color, -0.25), 0.9);
  const materials = [mats.side, mats.side, topM, topM, mats.front, mats.front];
  const shopTex = shop ? textTex(shop, { bg: shopColor, fg: '#ffffff', w: 512, h: 96 }) : null;
  return (
    <group>
      <mesh material={materials} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* cornice */}
      <mesh geometry={geo.box} material={mat(shade(color, 0.15), 0.8)} position={[0, h + 0.15, 0]} scale={[w + 0.4, 0.3, d + 0.4]} />
      {/* ground floor storefront band */}
      <mesh geometry={geo.box} material={mat(shade(color, -0.35), 0.6)} position={[0, 1.8, 0]} scale={[w + 0.06, 3.6, d + 0.06]} />
      {[1, -1].map((sd) => (
        <group key={sd} position={[0, 0, (sd * (d + 0.08)) / 2]} rotation={[0, sd > 0 ? 0 : Math.PI, 0]}>
          {Array.from({ length: Math.max(1, Math.floor(w / 5)) }).map((_, i, arr) => (
            <mesh key={i} geometry={geo.plane} material={glass} position={[(i - (arr.length - 1) / 2) * (w / arr.length), 1.6, 0.01]} scale={[w / arr.length - 1, 2.4, 1]} />
          ))}
          {shopTex && sd > 0 && (
            <>
              <mesh geometry={geo.box} position={[0, 3.3, 0.6]} rotation={[0.35, 0, 0]} scale={[w * 0.8, 0.08, 1.4]} material={mat(shopColor, 0.7)} castShadow />
              <mesh geometry={geo.plane} position={[0, 4.1, 0.05]} scale={[Math.min(w * 0.7, 10), 1, 1]}>
                <meshBasicMaterial map={shopTex} toneMapped={false} />
              </mesh>
            </>
          )}
        </group>
      ))}
      {roof && (
        <group position={[0, h + 0.3, 0]}>
          <mesh geometry={geo.box} material={mat('#9aa1a9', 0.7, 0.3)} position={[w * 0.2, 0.5, d * 0.15]} scale={[2, 1, 1.4]} castShadow />
          <mesh geometry={geo.cyl} material={mat('#7d858f', 0.6, 0.4)} position={[-w * 0.25, 1, -d * 0.2]} scale={[0.8, 2, 0.8]} castShadow />
        </group>
      )}
    </group>
  );
}

export function TrafficLightModel({ state }: { state: 'red' | 'yellow' | 'green' }) {
  const m = mat('#2b2f36', 0.5, 0.5);
  const on = (c: string, active: boolean) => (
    <meshStandardMaterial color={active ? c : '#222'} emissive={active ? c : '#000'} emissiveIntensity={active ? 2.2 : 0} toneMapped={!active} />
  );
  return (
    <group>
      <mesh geometry={geo.cyl} material={m} position={[0, 1.6, 0]} scale={[0.07, 3.2, 0.07]} />
      <group position={[0, 3.6, 0]}>
        <mesh geometry={geo.box} material={m} scale={[0.36, 1.05, 0.3]} />
        <mesh geometry={geo.sphere} position={[0, 0.32, 0.16]} scale={[0.11, 0.11, 0.04]}>{on('#ff2d2d', state === 'red')}</mesh>
        <mesh geometry={geo.sphere} position={[0, 0, 0.16]} scale={[0.11, 0.11, 0.04]}>{on('#ffc21a', state === 'yellow')}</mesh>
        <mesh geometry={geo.sphere} position={[0, -0.32, 0.16]} scale={[0.11, 0.11, 0.04]}>{on('#2dff6a', state === 'green')}</mesh>
        <mesh geometry={geo.sphere} position={[0, 0.32, -0.16]} scale={[0.11, 0.11, 0.04]}>{on('#ff2d2d', state === 'red')}</mesh>
        <mesh geometry={geo.sphere} position={[0, -0.32, -0.16]} scale={[0.11, 0.11, 0.04]}>{on('#2dff6a', state === 'green')}</mesh>
      </group>
    </group>
  );
}

export function Ball3D({ skin = 'clasico', r = 0.11 }: { skin?: string; r?: number }) {
  const tex = useMemo(() => ballTex(skin), [skin]);
  return (
    <mesh castShadow scale={r}>
      <sphereGeometry args={[1, 24, 18]} />
      <meshStandardMaterial map={tex} roughness={0.45} />
    </mesh>
  );
}
const ballCache = new Map<string, THREE.Texture>();
import { BALLS } from '../data/shop';
function ballTex(skin: string) {
  const hit = ballCache.get(skin);
  if (hit) return hit;
  const item = BALLS.find((b) => b.id === skin) ?? BALLS[0];
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = item.color;
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = item.color2 ?? '#111';
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 6; x++) {
      const cx = x * 44 + (y % 2) * 22 + 10;
      const cy = 20 + y * 44;
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11);
      }
      g.closePath();
      g.fill();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  ballCache.set(skin, t);
  return t;
}
