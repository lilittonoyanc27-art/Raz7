import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { addBox, addInteractable } from '../../three/world';
import { floorTex, textTex } from '../../three/textures';
import { mat, shade } from '../../three/Humanoid';
import type { T } from '../../core/types';

export function Room({ w, d, h = 4.2, floor = 'tile', wall = '#f1ece3', accent = '#ff7a1a', door = true, sign }: { w: number; d: number; h?: number; floor?: 'tile' | 'wood' | 'carpet'; wall?: string; accent?: string; door?: boolean; sign?: string }) {
  useMemo(() => {
    addBox(0, -d / 2 - 0.25, w + 1, 0.5, h, 0, 'wall');
    addBox(0, d / 2 + 0.25, w + 1, 0.5, h, 0, 'wall');
    addBox(-w / 2 - 0.25, 0, 0.5, d + 1, h, 0, 'wall');
    addBox(w / 2 + 0.25, 0, 0.5, d + 1, h, 0, 'wall');
  }, [w, d, h]);
  const ftex = useMemo(() => {
    const t = floorTex(floor).clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(w / 3, d / 3);
    return t;
  }, [floor, w, d]);
  const wallM = mat(wall, 0.9);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={ftex} roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, h, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#f7f7f2" side={THREE.DoubleSide} />
      </mesh>
      {/* walls */}
      <mesh material={wallM} position={[0, h / 2, -d / 2]} receiveShadow>
        <boxGeometry args={[w, h, 0.2]} />
      </mesh>
      <mesh material={wallM} position={[0, h / 2, d / 2]} receiveShadow>
        <boxGeometry args={[w, h, 0.2]} />
      </mesh>
      <mesh material={wallM} position={[-w / 2, h / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, h, d]} />
      </mesh>
      <mesh material={wallM} position={[w / 2, h / 2, 0]} receiveShadow>
        <boxGeometry args={[0.2, h, d]} />
      </mesh>
      {/* accent stripe */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.1, s * (d / 2 - 0.12)]}>
          <boxGeometry args={[w, 0.25, 0.05]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      ))}
      {/* ceiling lights */}
      {Array.from({ length: Math.max(1, Math.floor(w / 6)) }).map((_, i, arr) =>
        Array.from({ length: Math.max(1, Math.floor(d / 6)) }).map((__, j, arr2) => (
          <mesh key={`${i}-${j}`} position={[(i - (arr.length - 1) / 2) * 6, h - 0.05, (j - (arr2.length - 1) / 2) * 6]}>
            <boxGeometry args={[2.2, 0.06, 0.5]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.4} />
          </mesh>
        )),
      )}
      <pointLight position={[0, h - 0.4, 0]} intensity={30} distance={Math.max(w, d) * 1.2} color="#fff4e0" />
      <pointLight position={[-w / 3, h - 0.4, d / 4]} intensity={14} distance={Math.max(w, d)} color="#fff4e0" />
      <pointLight position={[w / 3, h - 0.4, -d / 4]} intensity={14} distance={Math.max(w, d)} color="#fff4e0" />
      {door && (
        <group position={[0, 0, d / 2 - 0.12]}>
          <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[2.4, 2.6, 0.1]} />
            <meshStandardMaterial color="#7fb3e0" metalness={0.6} roughness={0.1} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 2.85, -0.05]}>
            <planeGeometry args={[2, 0.4]} />
            <meshBasicMaterial map={textTex('SALIDA', { bg: '#27ae60', fg: '#fff', w: 256, h: 64 })} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
      {sign && (
        <mesh position={[0, h - 0.8, -d / 2 + 0.12]}>
          <planeGeometry args={[Math.min(w * 0.6, 10), 0.9]} />
          <meshBasicMaterial map={textTex(sign, { bg: '#1b2233', fg: accent, w: 1024, h: 92 })} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export function Counter({ pos, rot = 0, w = 4, label, color = '#1b2233' }: { pos: [number, number, number]; rot?: number; w?: number; label?: string; color?: string }) {
  useMemo(() => {
    const horizontal = Math.abs(Math.sin(rot)) < 0.5;
    addBox(pos[0], pos[2], horizontal ? w : 1, horizontal ? 1 : w, 1.1, 0, 'counter');
  }, []);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 1.1, 0.9]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[w + 0.1, 0.05, 1]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.3} />
      </mesh>
      {label && (
        <mesh position={[0, 0.6, 0.46]}>
          <planeGeometry args={[w * 0.8, 0.4]} />
          <meshBasicMaterial map={textTex(label, { bg: color, fg: '#ffb03a', w: 512, h: 64 })} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export function ShelfUnit({ pos, rot = 0, w = 4, color = '#e9ecef', label }: { pos: [number, number, number]; rot?: number; w?: number; color?: string; label?: string }) {
  useMemo(() => {
    const horizontal = Math.abs(Math.sin(rot)) < 0.5;
    addBox(pos[0], pos[2], horizontal ? w : 0.8, horizontal ? 0.8 : w, 2, 0, 'shelf');
  }, []);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 1, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[w, 2, 0.15]} />
        <meshStandardMaterial color={shade(color, -0.1)} />
      </mesh>
      {[0.1, 0.75, 1.4].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.06, 0.7]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      {label && (
        <mesh position={[0, 2.3, -0.2]}>
          <planeGeometry args={[Math.min(w, 3), 0.42]} />
          <meshBasicMaterial map={textTex(label, { bg: '#ff7a1a', fg: '#fff', w: 512, h: 72 })} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// --------------------------------------------------- 3D products
export type ItemKind = 'apple' | 'banana' | 'orange' | 'milk' | 'bread' | 'water' | 'cheese' | 'eggs' | 'fish' | 'chicken' | 'rice' | 'juice' | 'tomato' | 'yogurt' | 'cereal' | 'boots' | 'shirt' | 'ball' | 'socks' | 'bag' | 'cap' | 'bottle' | 'suitcase' | 'phone' | 'keys';

export function Item3D({ kind, color }: { kind: ItemKind; color?: string }) {
  switch (kind) {
    case 'apple': case 'orange': case 'tomato':
      return (
        <group>
          {[[-0.12, 0], [0.12, 0], [0, 0.12], [0, -0.12], [0, 0, 0.14]].map(([x, z, y = 0], i) => (
            <mesh key={i} position={[x, 0.08 + y, z]} castShadow>
              <sphereGeometry args={[0.08, 12, 10]} />
              <meshStandardMaterial color={kind === 'apple' ? '#d62828' : kind === 'orange' ? '#f77f00' : '#e63946'} roughness={0.4} />
            </mesh>
          ))}
        </group>
      );
    case 'banana':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[i * 0.06 - 0.06, 0.06, 0]} rotation={[0, 0, 0.3]} castShadow>
              <torusGeometry args={[0.16, 0.035, 8, 16, Math.PI * 0.7]} />
              <meshStandardMaterial color="#ffd23f" roughness={0.5} />
            </mesh>
          ))}
        </group>
      );
    case 'milk': case 'juice': case 'cereal': case 'rice':
      return (
        <group>
          {[-0.18, 0, 0.18].map((x) => (
            <mesh key={x} position={[x, kind === 'cereal' ? 0.18 : 0.14, 0]} castShadow>
              <boxGeometry args={[0.14, kind === 'cereal' ? 0.36 : kind === 'rice' ? 0.2 : 0.28, kind === 'cereal' ? 0.08 : 0.1]} />
              <meshStandardMaterial color={kind === 'milk' ? '#f4f4f4' : kind === 'juice' ? '#ff9f1c' : kind === 'cereal' ? '#e9c46a' : '#f1faee'} />
            </mesh>
          ))}
        </group>
      );
    case 'water': case 'bottle':
      return (
        <group>
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} position={[x, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, 0.32, 12]} />
              <meshStandardMaterial color="#8ecae6" transparent opacity={0.75} roughness={0.1} />
            </mesh>
          ))}
        </group>
      );
    case 'bread':
      return (
        <mesh position={[0, 0.07, 0]} scale={[0.3, 0.1, 0.12]} castShadow>
          <capsuleGeometry args={[0.5, 1, 6, 12]} />
          <meshStandardMaterial color="#c8873a" roughness={0.8} />
        </mesh>
      );
    case 'cheese':
      return (
        <mesh position={[0, 0.08, 0]} rotation={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.14, 3]} />
          <meshStandardMaterial color="#ffd166" />
        </mesh>
      );
    case 'eggs':
      return (
        <group>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.36, 0.08, 0.14]} />
            <meshStandardMaterial color="#b08968" />
          </mesh>
          {[-0.12, 0, 0.12].map((x) => (
            <mesh key={x} position={[x, 0.11, 0]} scale={[1, 1.25, 1]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color="#fefae0" />
            </mesh>
          ))}
        </group>
      );
    case 'fish':
      return (
        <group position={[0, 0.06, 0]}>
          <mesh scale={[0.25, 0.06, 0.08]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#9db4c0" metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.06, 0.1, 3]} />
            <meshStandardMaterial color="#9db4c0" />
          </mesh>
        </group>
      );
    case 'chicken':
      return (
        <mesh position={[0, 0.08, 0]} scale={[0.18, 0.1, 0.14]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#f4a261" roughness={0.6} />
        </mesh>
      );
    case 'yogurt':
      return (
        <group>
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, 0.06, 0]}>
              <cylinderGeometry args={[0.05, 0.04, 0.12, 12]} />
              <meshStandardMaterial color="#fff" />
            </mesh>
          ))}
        </group>
      );
    case 'boots':
      return (
        <group>
          {[-0.1, 0.1].map((x) => (
            <group key={x} position={[x, 0.07, 0]}>
              <mesh scale={[0.08, 0.07, 0.2]} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={color ?? '#111'} roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.04, 0]} scale={[0.085, 0.015, 0.205]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#fff" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'shirt':
      return (
        <group position={[0, 0.35, 0]}>
          <mesh scale={[0.4, 0.5, 0.05]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={color ?? '#ff7a1a'} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.26, 0.17, 0]} rotation={[0, 0, s * -0.6]} scale={[0.18, 0.12, 0.05]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={color ?? '#ff7a1a'} />
            </mesh>
          ))}
        </group>
      );
    case 'ball':
      return (
        <mesh position={[0, 0.11, 0]} castShadow>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color={color ?? '#fff'} />
        </mesh>
      );
    case 'socks':
      return (
        <group>
          {[-0.06, 0.06].map((x) => (
            <mesh key={x} position={[x, 0.03, 0]} scale={[0.05, 0.03, 0.22]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={color ?? '#fff'} />
            </mesh>
          ))}
        </group>
      );
    case 'bag':
      return (
        <mesh position={[0, 0.15, 0]} scale={[0.35, 0.3, 0.2]} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color ?? '#1b2233'} />
        </mesh>
      );
    case 'cap':
      return (
        <mesh position={[0, 0.05, 0]} castShadow>
          <sphereGeometry args={[0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color ?? '#ff7a1a'} />
        </mesh>
      );
    case 'suitcase':
      return (
        <group position={[0, 0.35, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.65, 0.25]} />
            <meshStandardMaterial color={color ?? '#2e6fd8'} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.2, 0.05, 0.05]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      );
    case 'phone':
      return (
        <mesh position={[0, 0.01, 0]} scale={[0.07, 0.01, 0.14]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      );
    case 'keys':
      return (
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.04, 0.008, 6, 14]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
        </mesh>
      );
  }
}

export function useInteract(id: string, pos: [number, number, number], label: T, onInteract: () => void, enabled?: () => boolean, radius = 2.2) {
  useEffect(() => addInteractable({ id, pos: new THREE.Vector3(...pos), radius, label, onInteract, enabled }) as unknown as () => void, [id, onInteract]);
}

export function Plant({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.3, 0.22, 0.6, 14]} />
        <meshStandardMaterial color="#c2703d" />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color="#3f8f4a" flatShading />
      </mesh>
    </group>
  );
}
