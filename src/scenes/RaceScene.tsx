import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SceneShell } from '../ui/SceneShell';
import { Player } from '../three/Player';
import { addBox, player, removeBox, resetWorld, teleportPlayer, world, type Box } from '../three/world';
import { Humanoid, newAnim, randomLook, type Look } from '../three/Humanoid';
import { useProgress, useUI } from '../core/store';
import type { Level, T, TimeOfDay } from '../core/types';
import { pick, seeded, shuffle } from '../core/random';
import { playMusic, sfx, speak, repeatLast } from '../core/audio';
import { MissionPanel, fmt } from '../ui/HUD';
import { Es, openTranslation } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { textTex, woodTex, sandTex } from '../three/textures';
import { Ball3D, Palm, Tree } from '../three/Props';

const T_ = (es: string, hy: string): T => ({ es, hy });

export const TRACKS: { id: string; name: T; tod: TimeOfDay; ground: string; water: string; plat: string; deco: 'city' | 'sport' | 'mountain' | 'beach' | 'park' | 'future' }[] = [
  { id: 'ciudad', name: T_('Ciudad de noche', 'Գիշերային քաղաք'), tod: 'noche', ground: '#2b2f3a', water: '#1d2b55', plat: '#3c4a6b', deco: 'city' },
  { id: 'complejo', name: T_('Complejo deportivo', 'Սպորտային համալիր'), tod: 'dia', ground: '#3f9a45', water: '#2a7fd4', plat: '#e14b4b', deco: 'sport' },
  { id: 'montana', name: T_('Carretera de montaña', 'Լեռնային ճանապարհ'), tod: 'tarde', ground: '#7a6a55', water: '#3d6e8f', plat: '#9a8468', deco: 'mountain' },
  { id: 'playa', name: T_('La playa', 'Լողափ'), tod: 'dia', ground: '#ecd6a4', water: '#2ec4d6', plat: '#b07a45', deco: 'beach' },
  { id: 'parque', name: T_('El parque', 'Այգի'), tod: 'tarde', ground: '#5f9a3c', water: '#3d8fc4', plat: '#c99868', deco: 'park' },
  { id: 'futuro', name: T_('Estadio futurista', 'Ապագայի մարզադաշտ'), tod: 'noche', ground: '#1b1530', water: '#3b0f5a', plat: '#56ccf2', deco: 'future' },
];

const COLORS = [
  { id: 'rojo', es: 'rojo', hy: 'կարմիր', c: '#e14b4b' },
  { id: 'verde', es: 'verde', hy: 'կանաչ', c: '#27ae60' },
  { id: 'azul', es: 'azul', hy: 'կապույտ', c: '#2e6fd8' },
  { id: 'amarillo', es: 'amarillo', hy: 'դեղին', c: '#f2c94c' },
];

type SecKind = 'bridges' | 'stars' | 'key' | 'moving' | 'ball' | 'tunnel';
interface Section {
  kind: SecKind;
  z0: number; // start z (course runs towards -z)
  len: number;
  text: T;
  data: Record<string, unknown>;
}

function buildCourse(lvl: Level, seed: number): Section[] {
  const r = seeded(seed);
  const kinds = shuffle<SecKind>(['bridges', 'stars', 'key', 'moving', 'ball', 'tunnel']).slice(0, lvl === 'A1' ? 4 : 5);
  let z = -14;
  const out: Section[] = [];
  for (const k of kinds) {
    let s: Section;
    switch (k) {
      case 'bridges': {
        const cols = shuffle(COLORS).slice(0, 3);
        const good = cols[Math.floor(r() * 3)];
        const bad = cols.find((c) => c !== good)!;
        s = { kind: k, z0: z, len: 34, data: { cols, good: good.id }, text: lvl === 'A1' ? T_(`Cruza el puente ${good.es}.`, `Անցիր ${good.hy} կամրջով։`) : T_(`No pases por el puente ${bad.es}. Tienes que cruzar el puente ${good.es}.`, `Մի՛ անցիր ${bad.hy} կամրջով։ Պետք է անցնես ${good.hy} կամրջով։`) };
        break;
      }
      case 'stars': {
        const right = r() < 0.5;
        s = { kind: k, z0: z, len: 36, data: { right }, text: T_(`Recoge las tres estrellas y gira a la ${right ? 'derecha' : 'izquierda'}.`, `Հավաքիր երեք աստղերը և թեքվիր ${right ? 'աջ' : 'ձախ'}։`) };
        break;
      }
      case 'key': {
        const cols = shuffle(COLORS).slice(0, 3);
        const target = cols[Math.floor(r() * 3)];
        const prep = lvl === 'A1' ? 'detrás' : pick(['detrás', 'delante', 'al lado']);
        const prepHy = prep === 'detrás' ? 'հետևում' : prep === 'delante' ? 'առջևում' : 'կողքին';
        s = { kind: k, z0: z, len: 30, data: { cols, target: target.id, prep }, text: T_(`Busca la llave que está ${prep} de la caja ${target.es === 'azul' ? 'azul' : target.es === 'verde' ? 'verde' : target.es === 'rojo' ? 'roja' : 'amarilla'}.`, `Փնտրիր բանալին, որը ${target.hy} արկղի ${prepHy} է։`) };
        break;
      }
      case 'moving':
        s = { kind: k, z0: z, len: 30, data: {}, text: lvl === 'A1' ? T_('Salta a las plataformas. ¡Cuidado!', 'Ցատկիր հարթակների վրա։ Զգույշ։') : T_('Espera a que la plataforma esté cerca y luego salta.', 'Սպասիր, մինչև հարթակը մոտենա, հետո ցատկիր։') };
        break;
      case 'ball':
        s = { kind: k, z0: z, len: 30, data: {}, text: T_('Antes de saltar, recoge el balón. El trampolín solo funciona con el balón.', 'Ցատկելուց առաջ վերցրու գնդակը։ Բատուտը աշխատում է միայն գնդակով։') };
        break;
      case 'tunnel': {
        const left = r() < 0.5;
        s = { kind: k, z0: z, len: 34, data: { left }, text: T_(`Entra en el túnel de la ${left ? 'izquierda' : 'derecha'}. El otro túnel no tiene salida.`, `Մտիր ${left ? 'ձախ' : 'աջ'} թունելը։ Մյուս թունելը ելք չունի։`) };
        break;
      }
    }
    out.push(s);
    z -= s.len + 8; // 8m connector platform
  }
  return out;
}

interface RaceState {
  started: number;
  finished: number;
  errors: number;
  stars: number;
  hasKey: boolean;
  hasBall: boolean;
  checkpoint: THREE.Vector3;
  section: number;
  announced: number;
  countdown: number;
}

export function RaceScene() {
  const params = useUI((s) => s.params);
  const lvl = useProgress((s) => s.level);
  const track = TRACKS.find((t) => t.id === params.track) ?? TRACKS[Math.floor(Math.random() * TRACKS.length)];
  const seed = useMemo(() => Math.floor(Math.random() * 1e6), []);
  const course = useMemo(() => buildCourse(lvl, seed), []);
  const finishZ = course.length ? course[course.length - 1].z0 - course[course.length - 1].len - 8 : -60;
  const st = useRef<RaceState>({ started: 0, finished: 0, errors: 0, stars: 0, hasKey: false, hasBall: false, checkpoint: new THREE.Vector3(0, 0, 0), section: -1, announced: -1, countdown: 3 });
  const [, force] = useState(0);
  const [result, setResult] = useState<null | { time: number; errors: number; pos: number; record: boolean }>(null);
  const rivals = useMemo(() => {
    const r = seeded(seed + 1);
    const names = ['Leo', 'Sofía', 'Hugo', 'Dani'];
    return names.slice(0, lvl === 'A1' ? 3 : 4).map((n, i) => ({ name: n, look: { ...randomLook(r), height: 1.5, bottomStyle: 'shorts' as const, topStyle: 'jersey' as const, jerseyName: n.toUpperCase(), jerseyNum: String(i + 2), top: ['#27ae60', '#9b51e0', '#2e6fd8', '#e14b4b'][i] }, speed: (lvl === 'A1' ? 5.1 : lvl === 'A2' ? 5.6 : 6.1) + r() * 0.8, x: -3 + i * 2 }));
  }, []);
  const rivalProg = useRef<number[]>(rivals.map(() => 0));

  useMemo(() => {
    resetWorld();
    world.killY = -4;
    world.bounds = { minX: -30, maxX: 30, minZ: finishZ - 30, maxZ: 20 };
    // start platform & connectors
    addBox(0, 2, 16, 24, 1, -1, 'plat');
    course.forEach((s) => addBox(0, s.z0 - s.len - 4, 16, 8.4, 1, -1, 'plat'));
    addBox(0, finishZ - 6, 20, 16, 1, -1, 'plat');
    world.onFall = () => {
      sfx('wrong');
      st.current.errors++;
      const t = T_('¡Al agua! Vuelves al último punto de control.', 'Ջուրն ընկար։ Վերադառնում ես վերջին ստուգակետ։');
      useUI.getState().toast(t, 'bad');
      teleportPlayer(st.current.checkpoint.x, 0.2, st.current.checkpoint.z, Math.PI);
      player.vel.set(0, 0, 0);
    };
  }, []);

  useEffect(() => {
    playMusic('action');
    player.frozen = true;
    const iv = setInterval(() => {
      const s = st.current;
      if (s.countdown > 0) {
        sfx('tick');
        s.countdown--;
        force((x) => x + 1);
        if (s.countdown === 0) {
          sfx('whistle');
          s.started = performance.now();
          player.frozen = false;
          speak('¡Ya!');
        }
      } else force((x) => x + 1);
    }, 1000);
    speak(`${track.name.es}. Tres, dos, uno…`);
    return () => clearInterval(iv);
  }, []);

  const onStep = (dt: number) => {
    const s = st.current;
    if (!s.started || s.finished) return;
    const z = player.pos.z;
    // section entry → announce instruction
    const idx = course.findIndex((sec) => z < sec.z0 + 4 && z > sec.z0 - sec.len - 8);
    if (idx >= 0 && idx !== s.announced) {
      s.announced = idx;
      s.section = idx;
      s.checkpoint.set(0, 0, course[idx].z0 + 3);
      if (course[idx].kind === 'stars') s.stars = 0;
      if (course[idx].kind === 'key') s.hasKey = false;
      if (course[idx].kind === 'ball') s.hasBall = false;
      speak(course[idx].text.es);
      force((x) => x + 1);
    }
    if (z < finishZ - 2 && !s.finished) {
      s.finished = performance.now();
      const time = (s.finished - s.started) / 1000 + s.errors * 5;
      const ahead = rivalProg.current.filter((p) => p >= -finishZ).length;
      const pos = ahead + 1;
      const p = useProgress.getState();
      const record = p.setRecord(`carrera-${track.id}`, Math.round(time * 10) / 10, true);
      p.completeMission('gran-carrera', 70 + Math.max(0, 4 - pos) * 20, 15 + Math.max(0, 4 - pos) * 10, pos === 1);
      p.dailyProgress('race');
      p.answer(T_('La gran carrera', 'Մեծ մրցավազք'), s.errors === 0, 'comprension_auditiva', true);
      if (pos === 1) p.addMedal(`Campeón: ${track.name.es}`);
      sfx(pos === 1 ? 'win' : 'goal');
      player.frozen = true;
      setResult({ time, errors: s.errors, pos, record });
    }
    void dt;
  };

  const sec = course[st.current.section];
  const s = st.current;
  const elapsed = s.started ? ((s.finished || performance.now()) - s.started) / 1000 : 0;
  const myProg = -player.pos.z;
  const place = 1 + rivalProg.current.filter((p) => p > myProg).length;

  return (
    <SceneShell
      tod={track.tod}
      overlay={
        <>
          <MissionPanel title={T_(`La gran carrera · ${track.name.es}`, `Մեծ մրցավազք · ${track.name.hy}`)} objective={sec?.text ?? T_('¡Corre hasta la meta!', 'Վազիր մինչև վերջնագիծ։')} timer={elapsed}>
            <div className="mp-row">
              <span className="pill small gold">{place}º</span>
              <span className="pill small">⭐ {s.stars}/3</span>
              {s.hasKey && <span className="pill small">🔑</span>}
              {s.hasBall && <span className="pill small">⚽</span>}
              <span className={'pill small ' + (s.errors ? 'bad' : '')}>✗ {s.errors}</span>
            </div>
            <div className="mp-row">
              <button className="btn tiny" onClick={() => sec && speak(sec.text.es)}><Icon name="speaker" size={14} /> Escuchar</button>
              <button className="btn tiny ghost" onClick={() => repeatLast(true)}><Icon name="slow" size={14} /></button>
              <button className="btn tiny ghost" onClick={() => sec && openTranslation(sec.text)}><Icon name="translate" size={14} /></button>
            </div>
          </MissionPanel>
          {s.countdown > 0 && <div className="countdown">{s.countdown}</div>}
          {sec && !result && (
            <div className="coach-sub" onClick={() => openTranslation(sec.text)}>
              {sec.text.es}
            </div>
          )}
          {result && (
            <div className="modal-back">
              <div className="modal">
                <div className="result-title">{result.pos === 1 ? '¡Primer puesto!' : `Puesto ${result.pos}º`}</div>
                <Es t={result.record ? T_('¡Nuevo récord personal!', 'Նոր անձնական ռեկորդ։') : T_('¡Buena carrera! Inténtalo otra vez para mejorar tu tiempo.', 'Լավ մրցավազք էր։ Նորից փորձիր՝ ժամանակդ լավացնելու համար։')} />
                <div className="result-grid">
                  <div><b>{fmt(result.time)}</b><span>Tiempo (+5 s por error)</span></div>
                  <div><b>{result.errors}</b><span>Errores</span></div>
                  <div><b>{result.pos}º</b><span>Posición</span></div>
                  <div><b>{fmt(useProgress.getState().records[`carrera-${track.id}`] ?? result.time)}</b><span>Récord</span></div>
                </div>
                <div className="row">
                  <button className="btn primary" onClick={() => useUI.getState().go('race', { track: track.id, k: Date.now() })}>Repetir</button>
                  {TRACKS.filter((t) => t.id !== track.id).slice(0, 3).map((t) => (
                    <button key={t.id} className="btn" onClick={() => useUI.getState().go('race', { track: t.id, k: Date.now() })}>{t.name.es}</button>
                  ))}
                  <button className="btn ghost" onClick={() => useUI.getState().go('city', { spawn: 'parque' })}>Ciudad</button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
      <Environment track={track} finishZ={finishZ} />
      {course.map((sec, i) => (
        <SectionView key={i} sec={sec} track={track} st={st} onChange={() => force((x) => x + 1)} />
      ))}
      <Finish z={finishZ} />
      {rivals.map((rv, i) => (
        <Rival key={i} look={rv.look} speed={rv.speed} x={rv.x} finishZ={finishZ} started={() => st.current.started} progRef={rivalProg} idx={i} />
      ))}
      <Player start={[0, 0, 4]} startYaw={Math.PI} onStep={onStep} />
    </SceneShell>
  );
}

function Environment({ track, finishZ }: { track: (typeof TRACKS)[number]; finishZ: number }) {
  const len = -finishZ + 60;
  const r = useMemo(() => seeded(3), []);
  const decos = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (14 + r() * 12), z: 10 - (i / 30) * len, s: 0.8 + r() * 0.8 })), [len]);
  const platTex = useMemo(() => (track.deco === 'beach' || track.deco === 'park' || track.deco === 'mountain' ? woodTex() : null), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, -len / 2 + 20]}>
        <planeGeometry args={[200, len + 120]} />
        <meshStandardMaterial color={track.water} roughness={0.1} metalness={0.5} transparent opacity={0.92} />
      </mesh>
      {/* side land */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 40, -1, -len / 2 + 20]} receiveShadow>
          <boxGeometry args={[40, 2, len + 120]} />
          {track.deco === 'beach' ? <meshStandardMaterial map={sandTex()} /> : <meshStandardMaterial color={track.ground} />}
        </mesh>
      ))}
      {/* platforms visuals (start + connectors) */}
      <mesh position={[0, -0.5, 2]} receiveShadow castShadow>
        <boxGeometry args={[16, 1, 24]} />
        <meshStandardMaterial color={track.plat} map={platTex ?? undefined} />
      </mesh>
      <mesh position={[0, 0.02, -8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {decos.map((d, i) => (
        <group key={i} position={[d.x, 0, d.z]} scale={d.s}>
          {track.deco === 'beach' || track.deco === 'sport' ? <Palm seed={i} /> : track.deco === 'park' || track.deco === 'mountain' ? <Tree color={track.deco === 'mountain' ? '#2f6b3a' : '#4f8f3a'} /> : (
            <mesh position={[0, 8, 0]}>
              <boxGeometry args={[6, 16 + (i % 4) * 6, 6]} />
              <meshStandardMaterial color={track.deco === 'future' ? '#2a2150' : '#2c3550'} emissive={track.deco === 'future' ? '#56ccf2' : '#ffcf7a'} emissiveIntensity={0.15} />
            </mesh>
          )}
        </group>
      ))}
      {track.deco === 'mountain' && [-1, 1].map((sd) => Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`${sd}-${i}`} position={[sd * 70, 20, -i * 50]}>
          <coneGeometry args={[30, 60, 6]} />
          <meshStandardMaterial color="#6f7f6a" flatShading />
        </mesh>
      )))}
    </group>
  );
}

function Plat({ x, z, w, d, color, y = 0 }: { x: number; z: number; w: number; d: number; color: string; y?: number }) {
  return (
    <mesh position={[x, y - 0.5, z]} receiveShadow castShadow>
      <boxGeometry args={[w, 1, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function SectionView({ sec, track, st, onChange }: { sec: Section; track: (typeof TRACKS)[number]; st: React.MutableRefObject<RaceState>; onChange: () => void }) {
  const z0 = sec.z0;
  const end = z0 - sec.len;
  return (
    <group>
      {/* connector after section */}
      <Plat x={0} z={end - 4} w={16} d={8.4} color={track.plat} />
      <mesh position={[0, 3.5, z0 + 1]}>
        <planeGeometry args={[6, 0.9]} />
        <meshBasicMaterial map={textTex(sectionTitle(sec.kind), { bg: '#1b2233', fg: '#ffb03a', w: 512, h: 76 })} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {sec.kind === 'bridges' && <Bridges sec={sec} track={track} />}
      {sec.kind === 'stars' && <Stars sec={sec} track={track} st={st} onChange={onChange} />}
      {sec.kind === 'key' && <KeyBoxes sec={sec} track={track} st={st} onChange={onChange} />}
      {sec.kind === 'moving' && <Moving sec={sec} track={track} />}
      {sec.kind === 'ball' && <BallJump sec={sec} track={track} st={st} onChange={onChange} />}
      {sec.kind === 'tunnel' && <Tunnels sec={sec} track={track} />}
    </group>
  );
}
const sectionTitle = (k: SecKind) => ({ bridges: 'LOS PUENTES', stars: 'LAS ESTRELLAS', key: 'LA LLAVE', moving: 'PLATAFORMAS', ball: 'EL TRAMPOLÍN', tunnel: 'LOS TÚNELES' })[k];

function Bridges({ sec, track }: { sec: Section; track: (typeof TRACKS)[number] }) {
  const cols = sec.data.cols as typeof COLORS;
  const good = sec.data.good as string;
  const z0 = sec.z0;
  const L = sec.len - 8;
  const fall = useRef<number[]>([0, 0, 0]);
  const boxes = useRef<(Box | null)[]>([]);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  useMemo(() => {
    addBox(0, z0 - 2, 16, 4, 1, -1, 'plat');
    addBox(0, z0 - sec.len + 2, 16, 4, 1, -1, 'plat');
    boxes.current = cols.map((c, i) => addBox(-5 + i * 5, z0 - 4 - L / 2, 2.6, L, 0.4, -0.4, c.id === good ? 'bridge-ok' : 'bridge-bad'));
  }, []);
  useFrame((_, dt) => {
    cols.forEach((c, i) => {
      if (c.id === good) return;
      const onIt = player.grounded && player.groundTag === 'bridge-bad' && Math.abs(player.pos.x - (-5 + i * 5)) < 1.5 && player.pos.z < z0 - 4 && player.pos.z > z0 - 4 - L;
      if (onIt && fall.current[i] === 0) {
        fall.current[i] = 0.001;
        sfx('wrong');
        useUI.getState().toast(T_('¡Ese puente no! Se está rompiendo…', 'Այդ կամուրջը չէ։ Փլվում է…'), 'bad');
      }
      if (fall.current[i] > 0) {
        fall.current[i] += dt;
        if (fall.current[i] > 0.45 && boxes.current[i]) {
          removeBox(boxes.current[i]!);
          boxes.current[i] = null;
        }
        const m = meshes.current[i];
        if (m) m.position.y = -0.2 - Math.max(0, fall.current[i] - 0.45) * 8;
        if (fall.current[i] > 4) {
          // rebuild
          fall.current[i] = 0;
          boxes.current[i] = addBox(-5 + i * 5, z0 - 4 - L / 2, 2.6, L, 0.4, -0.4, 'bridge-bad');
          if (m) m.position.y = -0.2;
        }
      }
    });
  });
  return (
    <group>
      <Plat x={0} z={z0 - 2} w={16} d={4} color={track.plat} />
      <Plat x={0} z={z0 - sec.len + 2} w={16} d={4} color={track.plat} />
      {cols.map((c, i) => (
        <group key={c.id}>
          <mesh ref={(el) => (meshes.current[i] = el)} position={[-5 + i * 5, -0.2, z0 - 4 - L / 2]} castShadow receiveShadow>
            <boxGeometry args={[2.6, 0.4, L]} />
            <meshStandardMaterial color={c.c} />
          </mesh>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[-5 + i * 5 + sd * 1.3, 0.5, z0 - 4 - L / 2]}>
              <boxGeometry args={[0.08, 0.08, L]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Star({ pos, onTake }: { pos: [number, number, number]; onTake: () => void }) {
  const g = useRef<THREE.Group>(null);
  const taken = useRef(false);
  useFrame((_, dt) => {
    if (!g.current || taken.current) return;
    g.current.rotation.y += dt * 2;
    if (Math.hypot(player.pos.x - pos[0], player.pos.z - pos[2]) < 1.1 && Math.abs(player.pos.y - pos[1]) < 2) {
      taken.current = true;
      g.current.visible = false;
      sfx('star');
      onTake();
    }
  });
  return (
    <group ref={g} position={pos}>
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.12, 5]} />
        <meshStandardMaterial color="#ffd34d" emissive="#ffb03a" emissiveIntensity={0.8} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Stars({ sec, track, st, onChange }: { sec: Section; track: (typeof TRACKS)[number]; st: React.MutableRefObject<RaceState>; onChange: () => void }) {
  const right = sec.data.right as boolean;
  const z0 = sec.z0;
  const plazaD = 20;
  const gate = useRef<Box | null>(null);
  const gateMesh = useRef<THREE.Mesh>(null);
  const open = useRef(false);
  useMemo(() => {
    addBox(0, z0 - plazaD / 2, 16, plazaD, 1, -1, 'plat');
    // two corridors
    addBox(-5, z0 - plazaD - 6, 4, 12, 1, -1, 'plat');
    addBox(5, z0 - plazaD - 6, 4, 12, 1, -1, 'plat');
    // wrong corridor dead-end wall
    addBox(right ? -5 : 5, z0 - plazaD - 11, 4, 0.6, 3, 0, 'wall');
    gate.current = addBox(right ? 5 : -5, z0 - plazaD - 1, 4, 0.6, 3, 0, 'gate');
    // middle separator
    addBox(0, z0 - plazaD - 6, 6, 12, 3, 0, 'wall');
  }, []);
  useFrame(() => {
    if (!open.current && st.current.stars >= 3 && gate.current) {
      open.current = true;
      removeBox(gate.current);
      sfx('unlock');
      useUI.getState().toast(T_('¡Tres estrellas! La puerta se abre.', 'Երեք աստղ։ Դուռը բացվում է։'), 'good');
      if (gateMesh.current) gateMesh.current.visible = false;
    }
  });
  const stars: [number, number, number][] = [[-5, 0, z0 - 5], [5, 0, z0 - 10], [-3, 0, z0 - 16]];
  return (
    <group>
      <Plat x={0} z={z0 - plazaD / 2} w={16} d={plazaD} color={track.plat} />
      <Plat x={-5} z={z0 - plazaD - 6} w={4} d={12} color={track.plat} />
      <Plat x={5} z={z0 - plazaD - 6} w={4} d={12} color={track.plat} />
      <mesh position={[0, 1.5, z0 - plazaD - 6]}>
        <boxGeometry args={[6, 3, 12]} />
        <meshStandardMaterial color="#56657a" />
      </mesh>
      <mesh position={[right ? -5 : 5, 1.5, z0 - plazaD - 11]}>
        <boxGeometry args={[4, 3, 0.6]} />
        <meshStandardMaterial color="#8a2a2a" />
      </mesh>
      <mesh ref={gateMesh} position={[right ? 5 : -5, 1.5, z0 - plazaD - 1]}>
        <boxGeometry args={[4, 3, 0.6]} />
        <meshStandardMaterial color="#ffd34d" transparent opacity={0.7} />
      </mesh>
      <mesh position={[-5, 3.3, z0 - plazaD + 0.5]}>
        <planeGeometry args={[3.6, 0.6]} />
        <meshBasicMaterial map={textTex('IZQUIERDA', { bg: '#1b2233', fg: '#fff', w: 256, h: 44 })} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[5, 3.3, z0 - plazaD + 0.5]}>
        <planeGeometry args={[3.6, 0.6]} />
        <meshBasicMaterial map={textTex('DERECHA', { bg: '#1b2233', fg: '#fff', w: 256, h: 44 })} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {stars.map((p, i) => (
        <Star key={i} pos={p} onTake={() => { st.current.stars++; onChange(); }} />
      ))}
    </group>
  );
}

function KeyBoxes({ sec, track, st, onChange }: { sec: Section; track: (typeof TRACKS)[number]; st: React.MutableRefObject<RaceState>; onChange: () => void }) {
  const cols = sec.data.cols as typeof COLORS;
  const target = sec.data.target as string;
  const prep = sec.data.prep as string;
  const z0 = sec.z0;
  const door = useRef<Box | null>(null);
  const doorMesh = useRef<THREE.Mesh>(null);
  const keyG = useRef<THREE.Group>(null);
  const opened = useRef(false);
  const boxesPos = cols.map((_, i) => [-5 + i * 5, z0 - 11] as [number, number]);
  const ti = cols.findIndex((c) => c.id === target);
  const keyPos: [number, number] = prep === 'detrás' ? [boxesPos[ti][0], boxesPos[ti][1] - 2] : prep === 'delante' ? [boxesPos[ti][0], boxesPos[ti][1] + 2] : [boxesPos[ti][0] + (ti === 2 ? -2.2 : 2.2), boxesPos[ti][1]];
  useMemo(() => {
    addBox(0, z0 - (sec.len - 4) / 2, 16, sec.len - 4, 1, -1, 'plat');
    boxesPos.forEach(([x, z]) => addBox(x, z, 1.6, 1.6, 1.6, 0, 'crate'));
    door.current = addBox(0, z0 - sec.len + 4, 16, 0.6, 3.5, 0, 'door');
  }, []);
  useFrame((_, dt) => {
    if (keyG.current && !st.current.hasKey) {
      keyG.current.rotation.y += dt * 2;
      if (Math.hypot(player.pos.x - keyPos[0], player.pos.z - keyPos[1]) < 1.0) {
        st.current.hasKey = true;
        keyG.current.visible = false;
        sfx('pickup');
        useUI.getState().toast(T_('¡Tienes la llave!', 'Բանալին քեզ մոտ է։'), 'good');
        onChange();
      }
    }
    if (!opened.current && st.current.hasKey && Math.abs(player.pos.z - (z0 - sec.len + 4)) < 3 && door.current) {
      opened.current = true;
      removeBox(door.current);
      if (doorMesh.current) doorMesh.current.visible = false;
      sfx('unlock');
    }
  });
  return (
    <group>
      <Plat x={0} z={z0 - (sec.len - 4) / 2} w={16} d={sec.len - 4} color={track.plat} />
      {boxesPos.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.8, z]} castShadow>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial color={cols[i].c} map={woodTex()} />
        </mesh>
      ))}
      <group ref={keyG} position={[keyPos[0], 0.6, keyPos[1]]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.18, 0.05, 8, 16]} />
          <meshStandardMaterial color="#ffd34d" metalness={0.9} roughness={0.2} emissive="#ffb03a" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.35, 0, 0]}>
          <boxGeometry args={[0.45, 0.07, 0.07]} />
          <meshStandardMaterial color="#ffd34d" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      <mesh ref={doorMesh} position={[0, 1.75, z0 - sec.len + 4]}>
        <boxGeometry args={[16, 3.5, 0.6]} />
        <meshStandardMaterial color="#7a4b2a" map={woodTex()} />
      </mesh>
      <mesh position={[0, 4, z0 - sec.len + 4.4]}>
        <planeGeometry args={[5, 0.7]} />
        <meshBasicMaterial map={textTex('SE NECESITA LLAVE', { bg: '#1b2233', fg: '#ffd34d', w: 512, h: 72 })} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Moving({ sec, track }: { sec: Section; track: (typeof TRACKS)[number] }) {
  const z0 = sec.z0;
  const n = 4;
  const boxes = useRef<Box[]>([]);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const phase = useMemo(() => Array.from({ length: n }, (_, i) => i * 1.3), []);
  useMemo(() => {
    addBox(0, z0 - 2, 16, 4, 1, -1, 'plat');
    for (let i = 0; i < n; i++) boxes.current.push(addBox(0, z0 - 6 - i * 5.5, 3.4, 3.4, 0.5, -0.5, 'moving'));
  }, []);
  useFrame(() => {
    const t = performance.now() / 1000;
    for (let i = 0; i < n; i++) {
      const b = boxes.current[i];
      const x = Math.sin(t * 0.9 + phase[i]) * 5;
      const cx = (b.minX + b.maxX) / 2;
      b.dx = x - cx;
      b.minX += b.dx;
      b.maxX += b.dx;
      const m = meshes.current[i];
      if (m) m.position.x = x;
    }
  });
  return (
    <group>
      <Plat x={0} z={z0 - 2} w={16} d={4} color={track.plat} />
      {Array.from({ length: n }).map((_, i) => (
        <mesh key={i} ref={(el) => (meshes.current[i] = el)} position={[0, -0.25, z0 - 6 - i * 5.5]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 0.5, 3.4]} />
          <meshStandardMaterial color="#ffb03a" />
        </mesh>
      ))}
    </group>
  );
}

function BallJump({ sec, track, st, onChange }: { sec: Section; track: (typeof TRACKS)[number]; st: React.MutableRefObject<RaceState>; onChange: () => void }) {
  const z0 = sec.z0;
  const ballG = useRef<THREE.Group>(null);
  const padZ = z0 - 12;
  const used = useRef(0);
  useMemo(() => {
    addBox(0, z0 - 7, 16, 14, 1, -1, 'plat');
    addBox(0, z0 - sec.len + 4, 16, 8, 1, 1, 'plat-high'); // landing higher than normal
    addBox(0, z0 - sec.len - 1, 16, 2, 2, -1, 'step');
  }, []);
  useFrame((_, dt) => {
    if (ballG.current && !st.current.hasBall) {
      ballG.current.rotation.y += dt;
      if (Math.hypot(player.pos.x - 3, player.pos.z - (z0 - 6)) < 1.1) {
        st.current.hasBall = true;
        ballG.current.visible = false;
        sfx('pickup');
        useUI.getState().toast(T_('¡Balón recogido! Ahora salta en el trampolín.', 'Գնդակը վերցված է։ Հիմա ցատկիր բատուտի վրա։'), 'good');
        onChange();
      }
    }
    if (player.grounded && Math.hypot(player.pos.x, player.pos.z - padZ) < 1.6 && performance.now() - used.current > 800) {
      used.current = performance.now();
      if (st.current.hasBall) {
        player.vel.y = 13;
        player.vel.x = 0;
        player.vel.z = -13;
        player.grounded = false;
        sfx('jump');
      } else {
        player.vel.y = 6;
        player.grounded = false;
        useUI.getState().toast(T_('Sin balón, el trampolín no funciona. ¡Recógelo antes de saltar!', 'Առանց գնդակի բատուտը չի աշխատում։ Վերցրու այն ցատկելուց առաջ։'), 'bad');
        sfx('wrong');
      }
    }
  });
  return (
    <group>
      <Plat x={0} z={z0 - 7} w={16} d={14} color={track.plat} />
      <mesh position={[0, 0.5, z0 - sec.len + 4]} castShadow receiveShadow>
        <boxGeometry args={[16, 1, 8]} />
        <meshStandardMaterial color={track.plat} />
      </mesh>
      <mesh position={[0, 0.5, z0 - sec.len - 1]} castShadow receiveShadow>
        <boxGeometry args={[16, 2, 2]} />
        <meshStandardMaterial color={track.plat} />
      </mesh>
      <mesh position={[0, 0.08, padZ]}>
        <cylinderGeometry args={[1.5, 1.5, 0.16, 24]} />
        <meshStandardMaterial color="#e14b4b" emissive="#e14b4b" emissiveIntensity={0.3} />
      </mesh>
      <group ref={ballG} position={[3, 0.3, z0 - 6]}>
        <Ball3D r={0.28} />
      </group>
    </group>
  );
}

function Tunnels({ sec, track }: { sec: Section; track: (typeof TRACKS)[number] }) {
  const left = sec.data.left as boolean;
  const z0 = sec.z0;
  const L = sec.len - 8;
  useMemo(() => {
    addBox(0, z0 - 2, 16, 4, 1, -1, 'plat');
    addBox(0, z0 - sec.len + 2, 16, 4, 1, -1, 'plat');
    // good tunnel floor, bad tunnel floor has a hole near its end
    addBox(left ? -4 : 4, z0 - 4 - L / 2, 4, L, 1, -1, 'tunnel');
    addBox(left ? 4 : -4, z0 - 4 - L * 0.3, 4, L * 0.6, 1, -1, 'tunnel');
    // walls
    for (const x of [-6.2, -1.8, 1.8, 6.2]) addBox(x, z0 - 4 - L / 2, 0.4, L, 3, 0, 'wall');
  }, []);
  return (
    <group>
      <Plat x={0} z={z0 - 2} w={16} d={4} color={track.plat} />
      <Plat x={0} z={z0 - sec.len + 2} w={16} d={4} color={track.plat} />
      <Plat x={left ? -4 : 4} z={z0 - 4 - L / 2} w={4} d={L} color="#444" />
      <Plat x={left ? 4 : -4} z={z0 - 4 - L * 0.3} w={4} d={L * 0.6} color="#444" />
      {[-4, 4].map((x) => (
        <group key={x}>
          <mesh position={[x, 3.1, z0 - 4 - L / 2]}>
            <boxGeometry args={[4.8, 0.3, L]} />
            <meshStandardMaterial color="#56657a" />
          </mesh>
          <mesh position={[x, 3.8, z0 - 3.8]}>
            <planeGeometry args={[3.8, 0.7]} />
            <meshBasicMaterial map={textTex(x < 0 ? 'TÚNEL IZQUIERDO' : 'TÚNEL DERECHO', { bg: '#1b2233', fg: '#fff', w: 512, h: 94 })} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[x, 2.5, z0 - 4 - L / 2]} intensity={6} distance={14} color="#ffcf7a" />
        </group>
      ))}
      {[-6.2, -1.8, 1.8, 6.2].map((x) => (
        <mesh key={x} position={[x, 1.5, z0 - 4 - L / 2]}>
          <boxGeometry args={[0.4, 3, L]} />
          <meshStandardMaterial color="#3a4256" />
        </mesh>
      ))}
    </group>
  );
}

function Finish({ z }: { z: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, -0.5, -6]} receiveShadow>
        <boxGeometry args={[20, 1, 16]} />
        <meshStandardMaterial color="#ff7a1a" />
      </mesh>
      {[-8, 8].map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[0.6, 5, 0.6]} />
          <meshStandardMaterial color="#1b2233" />
        </mesh>
      ))}
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[17, 1.4, 0.5]} />
        <meshStandardMaterial color="#1b2233" />
      </mesh>
      <mesh position={[0, 5.2, 0.26]}>
        <planeGeometry args={[16.6, 1.2]} />
        <meshBasicMaterial map={textTex('META', { bg: '#1b2233', fg: '#ffd34d', w: 1024, h: 74 })} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Rival({ look, speed, x, finishZ, started, progRef, idx }: { look: Look; speed: number; x: number; finishZ: number; started: () => number; progRef: React.MutableRefObject<number[]>; idx: number }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const z = useRef(4);
  const stall = useRef(0);
  useFrame((_, dt) => {
    if (!started()) return;
    if (z.current > finishZ - 6) {
      if (stall.current > 0) {
        stall.current -= dt;
        anim.current.speed = 0;
      } else {
        z.current -= speed * dt;
        anim.current.speed = speed;
        if (Math.random() < dt * 0.06) stall.current = 1 + Math.random() * 2.5; // hesitates at instructions
      }
    } else anim.current.speed = 0;
    progRef.current[idx] = -z.current;
    if (g.current) {
      g.current.position.set(x + Math.sin(z.current * 0.2 + idx) * 0.8, 0, z.current);
      g.current.rotation.y = Math.PI;
    }
  });
  return (
    <group ref={g}>
      <Humanoid look={look} anim={anim} castShadow={false} />
    </group>
  );
}
