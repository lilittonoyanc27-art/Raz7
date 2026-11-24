import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seeded } from '../core/random';
import { addBox, world } from '../three/world';
import { BLOCK_C, BLOCK_S, CITY, CROSS_OFF, ROADS, ROAD_HALF, SIDEWALK, SIDEWALK_Y, cityGround, blockRange } from './layout';
import { asphaltTex, dirtTex, grassTex, pitchTex, plazaTex, sidewalkTex, textTex } from '../three/textures';
import { Bench, Building, BusModel, CarModel, CAR_COLORS, Goal, Hydrant, Palm, Sign, StreetLamp, Tree, Bush, Cone } from '../three/Props';
import { mat, shade } from '../three/Humanoid';
import type { TimeOfDay } from '../core/types';
import { useQuality } from '../three/Stage';

const PALETTE = ['#e8a0a0', '#9ec5e8', '#f1d39b', '#c9b6e4', '#e3b08a', '#a8d5ba', '#f4f1ea', '#f0b6c8', '#8fb1d9', '#d98c6a'];
const SHOPS = ['CAFÉ', 'FARMACIA', 'PANADERÍA', 'LIBRERÍA', 'FRUTERÍA', 'BANCO', 'PELUQUERÍA', 'HELADERÍA', 'ZAPATERÍA', 'FLORISTERÍA', 'CORREOS', 'PIZZERÍA'];
const SHOP_COLORS = ['#e14b4b', '#27ae60', '#2e6fd8', '#9b51e0', '#f2994a', '#1b2233'];
const SPECIAL: Record<string, true> = { '0,0': true, '1,0': true, '2,0': true, '3,0': true, '1,1': true, '2,1': true, '1,2': true, '2,2': true, '3,2': true, '0,3': true, '1,3': true };

interface BSpec { x: number; z: number; w: number; d: number; h: number; color: string; style: number; shop?: string; shopColor?: string; rot?: number }

function genTowers(): BSpec[] {
  const r = seeded(42);
  const out: BSpec[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      if (SPECIAL[`${i},${j}`]) continue;
      const [x0, x1] = blockRange(i);
      const [z0, z1] = blockRange(j);
      const ix0 = x0 + SIDEWALK + 1, ix1 = x1 - SIDEWALK - 1, iz0 = z0 + SIDEWALK + 1, iz1 = z1 - SIDEWALK - 1;
      const lw = (ix1 - ix0) / 2, ld = (iz1 - iz0) / 2;
      for (let a = 0; a < 2; a++)
        for (let b = 0; b < 2; b++) {
          const w = lw - 2 - r() * 4;
          const d = ld - 2 - r() * 4;
          const cx = ix0 + lw * a + lw / 2 + (a ? 1 : -1) * ((lw - w) / 2 - 0.5);
          const cz = iz0 + ld * b + ld / 2 + (b ? 1 : -1) * ((ld - d) / 2 - 0.5);
          out.push({
            x: cx, z: cz, w, d, h: 12 + Math.floor(r() * 7) * 4,
            color: PALETTE[Math.floor(r() * PALETTE.length)], style: Math.floor(r() * 6),
            shop: r() < 0.7 ? SHOPS[Math.floor(r() * SHOPS.length)] : undefined,
            shopColor: SHOP_COLORS[Math.floor(r() * SHOP_COLORS.length)],
            rot: b === 0 ? Math.PI : 0,
          });
        }
    }
  // extra towers on special blocks' back side
  const extra: BSpec[] = [
    { x: 125, z: -128, w: 20, d: 16, h: 30, color: '#9ec5e8', style: 2, rot: Math.PI },
    { x: 100, z: -132, w: 16, d: 12, h: 22, color: '#e8a0a0', style: 4, rot: Math.PI },
    { x: 50, z: -42, w: 22, d: 14, h: 26, color: '#c9b6e4', style: 1, shop: 'CAFÉ', shopColor: '#1b2233' },
    { x: 22, z: -24, w: 16, d: 14, h: 18, color: '#f1d39b', style: 3 },
    { x: 52, z: -20, w: 14, d: 14, h: 34, color: '#8fb1d9', style: 5 },
    { x: -132, z: -112, w: 12, d: 12, h: 9, color: '#f0b6c8', style: 0 },
    { x: -98, z: -132, w: 12, d: 12, h: 9, color: '#a8d5ba', style: 3, rot: Math.PI },
    { x: -132, z: -134, w: 12, d: 10, h: 9, color: '#f1d39b', style: 1, rot: Math.PI },
    { x: 18, z: -130, w: 14, d: 14, h: 24, color: '#e3b08a', style: 2, rot: Math.PI },
    { x: 60, z: -132, w: 12, d: 12, h: 30, color: '#9ec5e8', style: 0, rot: Math.PI },
    { x: -14, z: 134, w: 14, d: 12, h: 20, color: '#c9b6e4', style: 1 },
    { x: -60, z: 134, w: 14, d: 12, h: 26, color: '#8fb1d9', style: 4 },
    { x: -132, z: 140, w: 26, d: 8, h: 8, color: '#d0d6de', style: 2 },
  ];
  return out.concat(extra);
}

export function City({ tod }: { tod: TimeOfDay }) {
  const q = useQuality();
  const night = tod === 'noche';
  const towers = useMemo(genTowers, []);

  useLayoutEffect(() => {
    world.groundAt = cityGround;
    world.bounds = { minX: -CITY - 25, maxX: CITY + 25, minZ: -CITY - 25, maxZ: CITY + 25 };
    towers.forEach((b) => addBox(b.x, b.z, b.w, b.d, b.h, 0, 'building'));
    // special structures colliders
    // casa
    addBox(BLOCK_C[0], -96, 14, 12, 9, 0, 'building');
    addBox(BLOCK_C[0] - 22, -100, 10, 10, 7, 0, 'building');
    // escuela
    addBox(BLOCK_C[1], -100, 40, 20, 13, 0, 'building');
    // super
    addBox(BLOCK_C[2], -102, 40, 24, 8, 0, 'building');
    // restaurante
    addBox(BLOCK_C[3] - 4, -98, 26, 16, 10, 0, 'building');
    // tienda
    addBox(BLOCK_C[2] - 8, -54, 26, 18, 12, 0, 'building');
    // fountain at plaza
    addBox(BLOCK_C[1], -37.5, 9, 9, 1.0, 0, 'fountain');
    // airport terminal
    addBox(BLOCK_C[0], 102, 56, 22, 13, 0, 'building');
    // training center fence (leave gate on east side)
    const ex0 = BLOCK_C[1] - 26, ex1 = BLOCK_C[1] + 26, ez0 = 37.5 - 24, ez1 = 37.5 + 24;
    addBox((ex0 + ex1) / 2, ez0, ex1 - ex0, 0.3, 3, 0, 'fence');
    addBox((ex0 + ex1) / 2, ez1, ex1 - ex0, 0.3, 3, 0, 'fence');
    addBox(ex0, 37.5, 0.3, ez1 - ez0, 3, 0, 'fence');
    addBox(ex1, ez0 + 9, 0.3, 18, 3, 0, 'fence');
    addBox(ex1, ez1 - 9, 0.3, 18, 3, 0, 'fence');
    // stadium ring
    const sx = BLOCK_C[3] + 2, sz = 37.5;
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.2) continue; // gate west
      const px = sx + Math.cos(a) * 27, pz = sz + Math.sin(a) * 25;
      addBox(px, pz, 9, 9, 14, 0, 'stadium');
    }
    addBox(sx, sz, 40, 36, 14, 0, 'stadium');
    KIOSKS.forEach((k) => addBox(BLOCK_C[1] + k.x, -37.5 + k.z, 3.2, 3.2, 3.6, 0, 'kiosk'));
    // secret zone pillars
    addBox(BLOCK_C[1], 112, 6, 6, 10, 0, 'monolith');
  }, []);

  return (
    <group>
      <Ground />
      <RoadMarkings />
      {towers.map((b, i) => (
        <group key={i} position={[b.x, SIDEWALK_Y, b.z]} rotation={[0, b.rot ?? 0, 0]}>
          <Building w={b.w} d={b.d} h={b.h} color={b.color} style={b.style} night={night} shop={b.shop} shopColor={b.shopColor} roof={q.detail >= 1} />
        </group>
      ))}
      <Casa night={night} />
      <Escuela night={night} />
      <Super night={night} />
      <Restaurante night={night} />
      <Tienda night={night} />
      <Plaza night={night} />
      <Entreno />
      <Parque />
      <Estadio night={night} />
      <Aeropuerto night={night} />
      <Secreta />
      <StreetTrees night={night} />
      <BusStops />
      <ParkedCars />
      <Skyline />
    </group>
  );
}

function Ground() {
  const asphalt = useMemo(() => {
    const t = asphaltTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(60, 60);
    return t;
  }, []);
  const grass = useMemo(() => {
    const t = grassTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(80, 80);
    return t;
  }, []);
  const side = useMemo(() => {
    const t = sidewalkTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(16, 16);
    return t;
  }, []);
  const blocks: { x: number; z: number; w: number; d: number }[] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) blocks.push({ x: BLOCK_C[i], z: BLOCK_C[j], w: BLOCK_S[i], d: BLOCK_S[j] });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial map={grass} color="#8fb06a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[CITY * 2 + 60, CITY * 2 + 60]} />
        <meshStandardMaterial map={asphalt} roughness={0.95} />
      </mesh>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, SIDEWALK_Y / 2, b.z]} receiveShadow>
          <boxGeometry args={[b.w, SIDEWALK_Y, b.d]} />
          <meshStandardMaterial map={side} color="#e9b8a8" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function RoadMarkings() {
  const dashes = useRef<THREE.InstancedMesh>(null);
  const zebra = useRef<THREE.InstancedMesh>(null);
  const { dashList, zebraList } = useMemo(() => {
    const dashList: [number, number, number][] = [];
    const zebraList: [number, number, number][] = [];
    for (const r of ROADS) {
      for (let s = -CITY - 25; s < CITY + 25; s += 6) {
        if (ROADS.some((c) => Math.abs(s - c) < ROAD_HALF + 5)) continue;
        dashList.push([s, r, 0]);
        dashList.push([r, s, Math.PI / 2]);
      }
    }
    for (const cx of ROADS)
      for (const cz of ROADS)
        for (const sgn of [-1, 1]) {
          for (let k = -5; k <= 5; k++) {
            // crossing the horizontal road (stripes parallel to z), at x = cx ± CROSS_OFF
            zebraList.push([cx + sgn * CROSS_OFF, cz + k * 1.1, 0]);
            // crossing the vertical road at z = cz ± CROSS_OFF
            zebraList.push([cx + k * 1.1, cz + sgn * CROSS_OFF, Math.PI / 2]);
          }
        }
    return { dashList, zebraList };
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    dashList.forEach(([x, z, rot], i) => {
      q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rot));
      m.compose(new THREE.Vector3(x, 0.012, z), q, new THREE.Vector3(3, 0.18, 1));
      dashes.current!.setMatrixAt(i, m);
    });
    dashes.current!.instanceMatrix.needsUpdate = true;
    zebraList.forEach(([x, z, rot], i) => {
      q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rot));
      m.compose(new THREE.Vector3(x, 0.014, z), q, new THREE.Vector3(3.6, 0.6, 1));
      zebra.current!.setMatrixAt(i, m);
    });
    zebra.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={dashes} args={[undefined, undefined, dashList.length]} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#f4f1e0" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={zebra} args={[undefined, undefined, zebraList.length]} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </instancedMesh>
    </group>
  );
}

function StreetTrees({ night }: { night: boolean }) {
  const q = useQuality();
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const poles = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const { trees, lamps } = useMemo(() => {
    const r = seeded(7);
    const trees: [number, number, number][] = [];
    const lamps: [number, number, number][] = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const [x0, x1] = blockRange(i);
        const [z0, z1] = blockRange(j);
        const step = q.detail >= 2 ? 11 : 16;
        for (let s = x0 + 6; s < x1 - 6; s += step) {
          if (Math.abs(s - BLOCK_C[i]) < 3) continue;
          trees.push([s, z0 + 1.6, 0.8 + r() * 0.4]);
          trees.push([s + 4, z1 - 1.6, 0.8 + r() * 0.4]);
        }
        for (let s = z0 + 6; s < z1 - 6; s += step) {
          if (Math.abs(s - BLOCK_C[j]) < 3 || Math.abs(s - 37.5) < 4) continue;
          trees.push([x0 + 1.6, s, 0.8 + r() * 0.4]);
          trees.push([x1 - 1.6, s + 4, 0.8 + r() * 0.4]);
        }
        lamps.push([x0 + 1.2, z0 + 1.2, 0], [x1 - 1.2, z0 + 1.2, 1], [x0 + 1.2, z1 - 1.2, 2], [x1 - 1.2, z1 - 1.2, 3]);
      }
    return { trees, lamps };
  }, [q.detail]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    trees.forEach(([x, z, s], i) => {
      m.compose(new THREE.Vector3(x, SIDEWALK_Y + 1.3 * s, z), new THREE.Quaternion(), new THREE.Vector3(0.18 * s, 2.6 * s, 0.18 * s));
      trunks.current!.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, SIDEWALK_Y + 3.6 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i, 0)), new THREE.Vector3(1.7 * s, 1.7 * s, 1.7 * s));
      crowns.current!.setMatrixAt(i, m);
      crowns.current!.setColorAt(i, c.setHSL(0.27 + ((i * 37) % 10) / 120, 0.45, 0.3 + ((i * 13) % 10) / 80));
    });
    trunks.current!.instanceMatrix.needsUpdate = true;
    crowns.current!.instanceMatrix.needsUpdate = true;
    if (crowns.current!.instanceColor) crowns.current!.instanceColor.needsUpdate = true;
    lamps.forEach(([x, z], i) => {
      m.compose(new THREE.Vector3(x, SIDEWALK_Y + 3, z), new THREE.Quaternion(), new THREE.Vector3(0.09, 6, 0.09));
      poles.current!.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, SIDEWALK_Y + 6.1, z), new THREE.Quaternion(), new THREE.Vector3(0.5, 0.25, 0.5));
      heads.current!.setMatrixAt(i, m);
    });
    poles.current!.instanceMatrix.needsUpdate = true;
    heads.current!.instanceMatrix.needsUpdate = true;
  }, [trees, lamps]);
  // tree colliders
  useLayoutEffect(() => {
    trees.forEach(([x, z]) => addBox(x, z, 0.4, 0.4, 3, 0, 'tree'));
  }, [trees]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh ref={poles} args={[undefined, undefined, lamps.length]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#3a3f47" roughness={0.5} metalness={0.6} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, lamps.length]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#fff6d8" emissive="#ffd890" emissiveIntensity={night ? 3 : 0.1} toneMapped={!night} />
      </instancedMesh>
    </group>
  );
}

function BusStops() {
  const stops: [number, number, number, string][] = [
    [-37.5, -66.2, Math.PI, 'PARADA · ESCUELA'],
    [37.5, -66.2, Math.PI, 'PARADA · TIENDA DEPORTIVA'],
    [66.2, 37.5, -Math.PI / 2, 'PARADA · PARQUE CENTRAL'],
    [-8.8, -37.5, Math.PI / 2, 'PARADA · PLAZA'],
    [115.5, -66.2, Math.PI, 'PARADA · RESTAURANTE'],
    [-8.8, 115, Math.PI / 2, 'PARADA · ZONA SECRETA'],
    [66.2, 115, -Math.PI / 2, 'PARADA · FINAL'],
  ];
  return (
    <group>
      {stops.map(([x, z, rot, name], i) => (
        <group key={i} position={[x, SIDEWALK_Y, z]} rotation={[0, rot, 0]}>
          <BusShelter name={name} />
        </group>
      ))}
    </group>
  );
}

export function BusShelter({ name }: { name: string }) {
  const glassM = useMemo(() => new THREE.MeshStandardMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.35, roughness: 0.1 }), []);
  const m = mat('#2b2f36', 0.4, 0.6);
  return (
    <group>
      <mesh material={m} position={[0, 2.6, 0]} scale={[4.2, 0.12, 1.8]} castShadow>
        <boxGeometry />
      </mesh>
      <mesh material={glassM} position={[0, 1.3, 0.85]} scale={[4, 2.5, 0.05]}>
        <boxGeometry />
      </mesh>
      {[-2, 2].map((x) => (
        <mesh key={x} material={m} position={[x, 1.3, 0.85]} scale={[0.08, 2.6, 0.08]}>
          <boxGeometry />
        </mesh>
      ))}
      <group position={[-1.2, 0, 0.4]}>
        <Bench />
      </group>
      <group position={[2.6, 0, -0.4]}>
        <Sign text={name} w={3.2} h={0.6} bg="#1b2233" fg="#ffb03a" />
      </group>
    </group>
  );
}

function ParkedCars() {
  const cars: [number, number, number, number][] = [];
  const r = seeded(11);
  for (let k = 0; k < 8; k++) cars.push([BLOCK_C[2] - 24 + k * 6.5, -80 - 5, Math.PI / 2 * 0, Math.floor(r() * CAR_COLORS.length)]);
  return (
    <group>
      {/* supermarket parking */}
      {[0, 1, 2, 3, 4].map((k) => (
        <group key={k} position={[BLOCK_C[2] + 22, SIDEWALK_Y, -128 + k * 5]} rotation={[0, Math.PI / 2, 0]}>
          <CarModel color={CAR_COLORS[(k * 3) % CAR_COLORS.length]} />
        </group>
      ))}
    </group>
  );
}

function Skyline() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const list = useMemo(() => {
    const r = seeded(99);
    const out: [number, number, number, number, number][] = [];
    for (let k = 0; k < 70; k++) {
      const a = (k / 70) * Math.PI * 2 + r() * 0.05;
      const rad = 230 + r() * 120;
      out.push([Math.cos(a) * rad, Math.sin(a) * rad, 14 + r() * 16, 20 + r() * 70, 14 + r() * 16]);
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    list.forEach(([x, z, w, h, d], i) => {
      m.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d));
      ref.current!.setMatrixAt(i, m);
      ref.current!.setColorAt(i, c.set(PALETTE[i % PALETTE.length]).multiplyScalar(0.85));
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, list.length]}>
        <boxGeometry />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
      {/* distant hills */}
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 430, 0, Math.sin(a) * 430]} scale={[90, 60 + (i % 4) * 25, 90]}>
            <coneGeometry args={[1, 1, 7]} />
            <meshStandardMaterial color="#6f8f6a" roughness={1} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

// ------------------------------------------------------------------ special places
function Casa({ night }: { night: boolean }) {
  const x = BLOCK_C[0];
  return (
    <group position={[0, SIDEWALK_Y, 0]}>
      <mesh position={[x, 0.02, -110]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 52]} />
        <meshStandardMaterial map={grassTex()} color="#9cc47a" />
      </mesh>
      <group position={[x, 0, -96]}>
        <House color="#f4f1ea" roof="#c0583a" night={night} label="CASA DE RAZMIK" />
      </group>
      <group position={[x - 22, 0, -100]} scale={0.8}>
        <House color="#a8d5ba" roof="#5b6b7a" night={night} />
      </group>
      {/* path */}
      <mesh position={[x, 0.03, -88]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 5]} />
        <meshStandardMaterial map={plazaTex()} />
      </mesh>
      {[-6, -3, 3, 6].map((dx) => (
        <group key={dx} position={[x + dx, 0, -88.5]}>
          <Bush s={0.8} />
        </group>
      ))}
      <group position={[x + 14, 0, -96]}>
        <Tree s={1.2} />
      </group>
      <group position={[x - 3, 0, -86]}>
        <Sign text="CASA DE RAZMIK · 7" w={2.6} h={0.5} bg="#ff7a1a" />
      </group>
    </group>
  );
}

function House({ color, roof, night, label }: { color: string; roof: string; night: boolean; label?: string }) {
  const winM = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c4a6e', emissive: night ? '#ffcf7a' : '#000', emissiveIntensity: night ? 1 : 0, roughness: 0.1, metalness: 0.4 }), [night]);
  return (
    <group>
      <mesh position={[0, 3.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 7, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 8.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.01, 10.6, 3.4, 4, 1]} />
        <meshStandardMaterial color={roof} roughness={0.8} flatShading />
      </mesh>
      {/* door */}
      <mesh position={[0, 1.2, 6.02]}>
        <boxGeometry args={[1.4, 2.4, 0.1]} />
        <meshStandardMaterial color="#7a4b2a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.6, 6.6]} castShadow>
        <boxGeometry args={[3, 0.15, 1.4]} />
        <meshStandardMaterial color={shade(color, -0.3)} />
      </mesh>
      {[-4.5, 4.5].map((wx) =>
        [1.8, 5].map((wy) => (
          <group key={`${wx}-${wy}`} position={[wx, wy, 6.02]}>
            <mesh material={winM}>
              <boxGeometry args={[2, 1.5, 0.08]} />
            </mesh>
            <mesh position={[0, -0.82, 0.08]}>
              <boxGeometry args={[2.3, 0.12, 0.2]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        )),
      )}
      <mesh position={[0, 5, 6.02]} material={winM}>
        <boxGeometry args={[2, 1.5, 0.08]} />
      </mesh>
      {label && (
        <mesh position={[0, 3.2, 6.1]}>
          <planeGeometry args={[3.2, 0.45]} />
          <meshBasicMaterial map={textTex(label, { bg: '#1b2233', fg: '#ffb03a', w: 512, h: 72 })} />
        </mesh>
      )}
    </group>
  );
}

function Escuela({ night }: { night: boolean }) {
  const x = BLOCK_C[1];
  return (
    <group position={[x, SIDEWALK_Y, -100]}>
      <Building w={40} d={20} h={13} color="#f1d39b" style={1} night={night} shop="ESCUELA · COLEGIO CERVANTES" shopColor="#b5651d" />
      <mesh position={[0, 0.02, -22]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 22]} />
        <meshStandardMaterial color="#c07a5a" roughness={0.95} />
      </mesh>
      {/* flag */}
      <mesh position={[-18, 6, 12]}>
        <cylinderGeometry args={[0.07, 0.07, 12]} />
        <meshStandardMaterial color="#cccccc" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-16.8, 10.6, 12]}>
        <planeGeometry args={[2.4, 1.5]} />
        <meshStandardMaterial color="#ff7a1a" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Super({ night }: { night: boolean }) {
  const x = BLOCK_C[2];
  return (
    <group position={[x, SIDEWALK_Y, -102]}>
      <Building w={40} d={24} h={8} color="#e9ecef" style={3} night={night} shop="SUPERMERCADO · MERCAFRESCO" shopColor="#27ae60" roof />
      {[-10, -6, 6, 10].map((dx) => (
        <group key={dx} position={[dx, 0, 14]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.2, 1, 0.8]} />
            <meshStandardMaterial color="#c0392b" />
          </mesh>
          <mesh position={[0, 1.08, 0]}>
            <boxGeometry args={[1.1, 0.2, 0.7]} />
            <meshStandardMaterial color={dx > 0 ? '#f39c12' : '#27ae60'} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Restaurante({ night }: { night: boolean }) {
  const x = BLOCK_C[3] - 4;
  return (
    <group position={[x, SIDEWALK_Y, -98]}>
      <Building w={26} d={16} h={10} color="#e3b08a" style={4} night={night} shop="RESTAURANTE «EL GOL»" shopColor="#e14b4b" />
      {[-8, 0, 8].map((dx) => (
        <group key={dx} position={[dx, 0, 11.5]}>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.7, 0.7, 0.06, 18]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
          <mesh position={[0, 0.37, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.75]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <coneGeometry args={[1.8, 0.7, 12, 1, true]} />
            <meshStandardMaterial color={dx === 0 ? '#ff7a1a' : '#ffffff'} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 2.4]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Tienda({ night }: { night: boolean }) {
  return (
    <group position={[BLOCK_C[2] - 8, SIDEWALK_Y, -54]} rotation={[0, Math.PI, 0]}>
      <Building w={26} d={18} h={12} color="#8fb1d9" style={5} night={night} shop="TIENDA DEPORTIVA · CAMPEÓN" shopColor="#2e6fd8" />
      <group position={[0, 0, 10.5]}>
        <mesh position={[-6, 1, 0]}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#ff7a1a" />
        </mesh>
      </group>
    </group>
  );
}

function Plaza({ night }: { night: boolean }) {
  const x = BLOCK_C[1];
  const z = -37.5;
  const tiles = useMemo(() => {
    const t = plazaTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10);
    return t;
  }, []);
  const water = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4fb3e8', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 }), []);
  return (
    <group position={[x, SIDEWALK_Y, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <planeGeometry args={[56, 56]} />
        <meshStandardMaterial map={tiles} />
      </mesh>
      {/* fountain */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[4.5, 4.8, 1, 32]} />
        <meshStandardMaterial color="#d8d2c4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.9, 0]} material={water}>
        <cylinderGeometry args={[4.1, 4.1, 0.1, 32]} />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.8, 2.2, 16]} />
        <meshStandardMaterial color="#d8d2c4" />
      </mesh>
      <mesh position={[0, 3.4, 0]} castShadow>
        <sphereGeometry args={[0.9, 20, 16]} />
        <meshStandardMaterial color="#ffd34d" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* giant screen */}
      <group position={[0, 0, -24]}>
        <mesh position={[-6, 4, 0]}>
          <boxGeometry args={[0.4, 8, 0.4]} />
          <meshStandardMaterial color="#2b2f36" />
        </mesh>
        <mesh position={[6, 4, 0]}>
          <boxGeometry args={[0.4, 8, 0.4]} />
          <meshStandardMaterial color="#2b2f36" />
        </mesh>
        <mesh position={[0, 9, 0]}>
          <boxGeometry args={[14, 5.6, 0.5]} />
          <meshStandardMaterial color="#1b2233" />
        </mesh>
        <mesh position={[0, 9, 0.26]}>
          <planeGeometry args={[13.4, 5]} />
          <meshBasicMaterial map={textTex('PLAZA DE COMPETICIONES', { bg: '#ff7a1a', fg: '#ffffff', w: 1024, h: 380, border: '#1b2233' })} toneMapped={false} />
        </mesh>
      </group>
      {/* kiosks */}
      {KIOSKS.map((k) => (
        <group key={k.id} position={[k.x, 0, k.z]} rotation={[0, k.rot, 0]}>
          <Kiosk title={k.title} color={k.color} night={night} />
        </group>
      ))}
      {[[-20, 20], [20, 20], [-20, -16], [20, -16]].map(([bx, bz], i) => (
        <group key={i} position={[bx, 0, bz]}>
          <Palm s={0.9} seed={i + 3} />
        </group>
      ))}
    </group>
  );
}

export const KIOSKS = [
  { id: 'ruleta', title: 'LA RULETA DE LAS PALABRAS', color: '#9b51e0', x: -14, z: -10, rot: Math.PI / 4 },
  { id: 'batalla', title: 'BATALLA DE CONOCIMIENTOS', color: '#e14b4b', x: 14, z: -10, rot: -Math.PI / 4 },
  { id: 'memory', title: 'MEMORY CHAMPIONS', color: '#27ae60', x: -14, z: 12, rot: (3 * Math.PI) / 4 },
  { id: 'trabalenguas', title: 'RETO DE TRABALENGUAS', color: '#f2994a', x: 14, z: 12, rot: (-3 * Math.PI) / 4 },
  { id: 'habla', title: 'HABLA COMO UN CAMPEÓN', color: '#2e6fd8', x: 0, z: 18, rot: Math.PI },
];

function Kiosk({ title, color, night }: { title: string; color: string; night: boolean }) {
  return (
    <group>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[3.4, 2.4, 2.2]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[4, 0.3, 2.8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[4.2, 1.2, 0.12]} />
        <meshStandardMaterial color="#1b2233" />
      </mesh>
      <mesh position={[0, 3.5, 0.07]}>
        <planeGeometry args={[4, 1]} />
        <meshBasicMaterial map={textTex(title, { bg: '#1b2233', fg: '#ffb03a', w: 1024, h: 256 })} toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.5, -0.07]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[4, 1]} />
        <meshBasicMaterial map={textTex(title, { bg: '#1b2233', fg: '#ffb03a', w: 1024, h: 256 })} toneMapped={false} />
      </mesh>
      {night && <pointLight position={[0, 3, 2]} intensity={6} distance={10} color={color} />}
    </group>
  );
}

function Entreno() {
  const x = BLOCK_C[1];
  const z = 37.5;
  const pitch = pitchTex();
  return (
    <group position={[x, SIDEWALK_Y, z]}>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[46, 50]} />
        <meshStandardMaterial map={pitch} roughness={0.95} />
      </mesh>
      <group position={[-21, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.7}>
        <Goal />
      </group>
      <group position={[21, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={0.7}>
        <Goal />
      </group>
      {[-8, -4, 0, 4, 8].map((cz, i) => (
        <group key={cz} position={[-6 + i * 2, 0, cz]}>
          <Cone color={['#ffd34d', '#2e6fd8', '#e14b4b', '#ff7a1a', '#27ae60'][i]} />
        </group>
      ))}
      {/* fence */}
      <Fence x0={-26} x1={26} z0={-24} z1={24} gateEast />
      <group position={[28, 0, -4]}>
        <Sign text="CENTRO DE ENTRENAMIENTO" w={4.2} h={0.7} bg="#1b2233" fg="#56ccf2" />
      </group>
    </group>
  );
}

function Fence({ x0, x1, z0, z1, gateEast }: { x0: number; x1: number; z0: number; z1: number; gateEast?: boolean }) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a4a5a', wireframe: true, transparent: true, opacity: 0.55 }), []);
  const post = mat('#3a3f47', 0.5, 0.6);
  const segs: [number, number, number, number][] = [
    [(x0 + x1) / 2, z0, x1 - x0, 0],
    [(x0 + x1) / 2, z1, x1 - x0, 0],
    [x0, (z0 + z1) / 2, z1 - z0, Math.PI / 2],
  ];
  if (gateEast) {
    segs.push([x1, z0 + 9, 18, Math.PI / 2], [x1, z1 - 9, 18, Math.PI / 2]);
  } else segs.push([x1, (z0 + z1) / 2, z1 - z0, Math.PI / 2]);
  return (
    <group>
      {segs.map(([cx, cz, len, rot], i) => (
        <group key={i} position={[cx, 0, cz]} rotation={[0, rot, 0]}>
          <mesh material={m} position={[0, 1.5, 0]}>
            <planeGeometry args={[len, 3, Math.round(len), 3]} />
          </mesh>
          <mesh material={post} position={[0, 3, 0]} scale={[len, 0.06, 0.06]}>
            <boxGeometry />
          </mesh>
          {Array.from({ length: Math.floor(len / 6) + 1 }).map((_, k) => (
            <mesh key={k} material={post} position={[-len / 2 + k * 6, 1.5, 0]} scale={[0.08, 3, 0.08]}>
              <boxGeometry />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Parque() {
  const x = BLOCK_C[2];
  const z = 37.5;
  const grass = useMemo(() => {
    const t = grassTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    return t;
  }, []);
  const dirt = useMemo(() => {
    const t = dirtTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 8);
    return t;
  }, []);
  const trees: [number, number, number][] = [[-20, -18, 1.3], [-12, -22, 1.1], [18, -20, 1.2], [22, 14, 1.4], [-22, 16, 1.2], [8, 22, 1], [-6, 20, 1.15], [20, -4, 1]];
  return (
    <group position={[x, SIDEWALK_Y, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[55, 55]} />
        <meshStandardMaterial map={grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[4, 55]} />
        <meshStandardMaterial map={dirt} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[4, 55]} />
        <meshStandardMaterial map={dirt} />
      </mesh>
      {/* pond */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-14, 0.05, -10]}>
        <circleGeometry args={[6, 32]} />
        <meshStandardMaterial color="#3d8fc4" roughness={0.05} metalness={0.4} />
      </mesh>
      {trees.map(([tx, tz, s], i) => (
        <group key={i} position={[tx, 0, tz]}>
          {i % 3 === 0 ? <Palm s={s} seed={i} /> : <Tree s={s} />}
        </group>
      ))}
      {[[-6, 6, 0], [6, -6, Math.PI], [6, 8, Math.PI / 2], [-8, -6, -Math.PI / 2]].map(([bx, bz, r], i) => (
        <group key={i} position={[bx, 0, bz]} rotation={[0, r, 0]}>
          <Bench />
        </group>
      ))}
      {/* race arch */}
      <group position={[14, 0, 10]}>
        <mesh position={[-3, 2.5, 0]}>
          <boxGeometry args={[0.5, 5, 0.5]} />
          <meshStandardMaterial color="#ff7a1a" />
        </mesh>
        <mesh position={[3, 2.5, 0]}>
          <boxGeometry args={[0.5, 5, 0.5]} />
          <meshStandardMaterial color="#ff7a1a" />
        </mesh>
        <mesh position={[0, 5.2, 0]}>
          <boxGeometry args={[7, 1, 0.5]} />
          <meshStandardMaterial color="#1b2233" />
        </mesh>
        <mesh position={[0, 5.2, 0.26]}>
          <planeGeometry args={[6.8, 0.9]} />
          <meshBasicMaterial map={textTex('LA GRAN CARRERA', { bg: '#1b2233', fg: '#ffb03a', w: 1024, h: 136 })} toneMapped={false} />
        </mesh>
        <mesh position={[0, 5.2, -0.26]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[6.8, 0.9]} />
          <meshBasicMaterial map={textTex('LA GRAN CARRERA', { bg: '#1b2233', fg: '#ffb03a', w: 1024, h: 136 })} toneMapped={false} />
        </mesh>
      </group>
      <group position={[-24, 0, 0]}>
        <Sign text="PARQUE CENTRAL" w={3.2} h={0.7} bg="#2d6a3e" />
      </group>
      <group position={[20, 0, 24]}>
        <Hydrant />
      </group>
    </group>
  );
}

function Estadio({ night }: { night: boolean }) {
  const sx = BLOCK_C[3] + 2;
  const sz = 37.5;
  const segs = 28;
  return (
    <group position={[sx, SIDEWALK_Y, sz]}>
      {Array.from({ length: segs }).map((_, k) => {
        const a = (k / segs) * Math.PI * 2;
        if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.16) return null;
        const px = Math.cos(a) * 27;
        const pz = Math.sin(a) * 25;
        return (
          <group key={k} position={[px, 0, pz]} rotation={[0, -a + Math.PI / 2, 0]}>
            <mesh position={[0, 7, 0]} castShadow receiveShadow>
              <boxGeometry args={[6.4, 14, 6]} />
              <meshStandardMaterial color={k % 2 ? '#e9ecef' : '#dfe3e8'} roughness={0.7} />
            </mesh>
            <mesh position={[0, 12.2, 1.5]}>
              <boxGeometry args={[6.45, 1.2, 3.2]} />
              <meshStandardMaterial color="#ff7a1a" />
            </mesh>
            <mesh position={[0, 5, -3.02]}>
              <boxGeometry args={[6.45, 1.2, 0.1]} />
              <meshStandardMaterial color="#1b2233" />
            </mesh>
          </group>
        );
      })}
      {/* roof ring */}
      <mesh position={[0, 14.4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 25 / 27, 1]}>
        <ringGeometry args={[22, 31, 48]} />
        <meshStandardMaterial color="#f4f4f4" side={THREE.DoubleSide} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* floodlights */}
      {[[-30, -28], [30, -28], [-30, 28], [30, 28]].map(([fx, fz], i) => (
        <group key={i} position={[fx, 0, fz]}>
          <mesh position={[0, 12, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 24, 10]} />
            <meshStandardMaterial color="#8a9099" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 24.5, 0]} rotation={[0.4, Math.atan2(-fx, -fz), 0]}>
            <boxGeometry args={[4, 2.4, 0.6]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={night ? 3 : 0.4} toneMapped={!night} />
          </mesh>
        </group>
      ))}
      {night && <pointLight position={[0, 30, 0]} intensity={400} distance={80} color="#ffffff" />}
      {/* gate */}
      <group position={[-28.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 6.5, 0]}>
          <boxGeometry args={[12, 2, 1]} />
          <meshStandardMaterial color="#1b2233" />
        </mesh>
        <mesh position={[0, 6.5, 0.51]}>
          <planeGeometry args={[11.6, 1.8]} />
          <meshBasicMaterial map={textTex('ESTADIO DE CAMPEONES', { bg: '#1b2233', fg: '#ffd34d', w: 1024, h: 160 })} toneMapped={false} />
        </mesh>
        <mesh position={[0, 6.5, -0.51]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[11.6, 1.8]} />
          <meshBasicMaterial map={textTex('ESTADIO DE CAMPEONES', { bg: '#1b2233', fg: '#ffd34d', w: 1024, h: 160 })} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[-24, 3.5, 0]}>
        <boxGeometry args={[0.2, 7, 7]} />
        <meshStandardMaterial color="#2c4a6e" metalness={0.6} roughness={0.15} />
      </mesh>
    </group>
  );
}

function Aeropuerto({ night }: { night: boolean }) {
  const x = BLOCK_C[0];
  const glassM = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6fa3d6', metalness: 0.7, roughness: 0.08, emissive: night ? '#ffcf7a' : '#000', emissiveIntensity: night ? 0.35 : 0 }), [night]);
  return (
    <group position={[x, SIDEWALK_Y, 102]}>
      <mesh position={[0, 6.5, 0]} material={glassM} castShadow>
        <boxGeometry args={[56, 13, 22]} />
      </mesh>
      <mesh position={[0, 13.4, 0]} castShadow>
        <boxGeometry args={[60, 0.8, 26]} />
        <meshStandardMaterial color="#e9ecef" />
      </mesh>
      <mesh position={[0, 11, -11.2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[30, 2.6]} />
        <meshBasicMaterial map={textTex('AEROPUERTO INTERNACIONAL', { bg: '#1b2233', fg: '#ffffff', w: 1024, h: 96 })} toneMapped={false} />
      </mesh>
      {/* control tower */}
      <group position={[24, 0, 20]}>
        <mesh position={[0, 12, 0]}>
          <cylinderGeometry args={[1.6, 2.2, 24, 16]} />
          <meshStandardMaterial color="#e9ecef" />
        </mesh>
        <mesh position={[0, 25, 0]} material={glassM}>
          <cylinderGeometry args={[4, 3, 3, 16]} />
        </mesh>
      </group>
      {/* airplane */}
      <group position={[-10, 0, 30]} rotation={[0, Math.PI / 2, 0]}>
        <Airplane />
      </group>
    </group>
  );
}

export function Airplane() {
  return (
    <group>
      <mesh position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[2, 22, 8, 16]} />
        <meshStandardMaterial color="#f4f4f4" metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.6, 1]} castShadow>
        <boxGeometry args={[28, 0.4, 4.5]} />
        <meshStandardMaterial color="#e9ecef" />
      </mesh>
      <mesh position={[0, 7, -11]} castShadow>
        <boxGeometry args={[0.4, 6, 4]} />
        <meshStandardMaterial color="#ff7a1a" />
      </mesh>
      <mesh position={[0, 4.3, -11]}>
        <boxGeometry args={[10, 0.3, 2.5]} />
        <meshStandardMaterial color="#e9ecef" />
      </mesh>
      {[-7, 7].map((ex) => (
        <mesh key={ex} position={[ex, 2.6, 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1, 1, 3.5, 16]} />
          <meshStandardMaterial color="#9aa1a9" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 4.6, 12.4]}>
        <boxGeometry args={[2.6, 0.8, 0.3]} />
        <meshStandardMaterial color="#1d2b3d" metalness={0.8} roughness={0.1} />
      </mesh>
    </group>
  );
}

function Secreta() {
  const x = BLOCK_C[1];
  return (
    <group position={[x, SIDEWALK_Y, 112]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -6]}>
        <circleGeometry args={[24, 48]} />
        <meshStandardMaterial color="#2a2140" roughness={0.6} />
      </mesh>
      <mesh position={[0, 5, 0]} castShadow>
        <boxGeometry args={[6, 10, 6]} />
        <meshStandardMaterial color="#1b1530" metalness={0.5} roughness={0.3} emissive="#ff4fd8" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 7, -3.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[5, 1]} />
        <meshBasicMaterial map={textTex('ZONA SECRETA', { bg: '#1b1530', fg: '#ff4fd8', w: 512, h: 100 })} toneMapped={false} />
      </mesh>
      {PORTALS.map((p) => (
        <group key={p.id} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          <Portal color={p.color} title={p.title} />
        </group>
      ))}
    </group>
  );
}
export const PORTALS = [
  { id: 'maze', title: 'EL LABERINTO SECRETO', color: '#ff4fd8', x: -12, z: -12, rot: Math.PI },
  { id: 'island', title: 'SUPERVIVENCIA LINGÜÍSTICA', color: '#39d3c3', x: 12, z: -12, rot: Math.PI },
];

function Portal({ color, title }: { color: string; title: string }) {
  return (
    <group>
      <mesh position={[0, 3.2, 0]}>
        <torusGeometry args={[2.6, 0.35, 16, 40]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <circleGeometry args={[2.3, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 6.6, 0]}>
        <planeGeometry args={[5, 0.8]} />
        <meshBasicMaterial map={textTex(title, { bg: '#1b1530', fg: color, w: 1024, h: 160 })} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 3, 2]} intensity={8} distance={12} color={color} />
    </group>
  );
}
