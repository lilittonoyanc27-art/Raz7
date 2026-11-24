import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { SceneShell } from '../ui/SceneShell';
import { Player } from '../three/Player';
import { addBox, addInteractable, removeBox, resetWorld, type Box } from '../three/world';
import { StaticNPC } from '../world/NPCs';
import { CHARACTERS } from '../data/characters';
import { useProgress, useUI } from '../core/store';
import type { T } from '../core/types';
import { playMusic, sfx } from '../core/audio';
import { MissionPanel } from '../ui/HUD';
import { Es } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { STORIES, type Clue, type Spot, type Story } from '../data/detective';
import { floorTex, textTex, woodTex } from '../three/textures';
import { Item3D } from './interiors/common';
import type { Look } from '../three/Humanoid';

const T_ = (es: string, hy: string): T => ({ es, hy });
const UP = 3.2;
const SPOTS: Record<Spot, [number, number, number]> = {
  'vestuario-banco': [-11, 0, -6],
  'vestuario-taquilla': [-14.4, 0, -5],
  'oficina-mesa': [-10.5, 0, 6.6],
  'oficina-cajon': [-12.5, 0, 6.6],
  'trofeos-vitrina': [11, 0, -9.2],
  'cafeteria-sofa': [13, 0, 8],
  'cafeteria-barra': [8.6, 0, 4.4],
  'almacen-cajas': [-12, UP, -6],
  'lavanderia-cesta': [11, UP, -5],
  'prensa-mesa': [11, UP, 6],
  'pasillo-tablon': [-5.3, 0, 8],
  'puerta-almacen': [-5.0, UP, -10],
  'puerta-lavanderia': [5.0, UP, -10],
  'puerta-prensa': [11, UP, -1.0],
};
const ROOM_NAMES: Record<string, T> = {
  vestuario: T_('el vestuario', 'հանդերձարանը'), oficina: T_('la oficina', 'գրասենյակը'), trofeos: T_('la sala de trofeos', 'գավաթների սրահը'), cafeteria: T_('la cafetería', 'սրճարանը'),
  almacen: T_('el almacén (segundo piso)', 'պահեստը (երկրորդ հարկ)'), lavanderia: T_('la lavandería (segundo piso)', 'լվացքատունը (երկրորդ հարկ)'), prensa: T_('la sala de prensa (segundo piso)', 'մամուլի սրահը (երկրորդ հարկ)'), pasillo: T_('el pasillo', 'միջանցքը'), puerta: T_('una puerta del segundo piso', 'երկրորդ հարկի դռներից մեկը'),
};
const FLAVOR: Record<string, T> = {
  'vestuario-banco': T_('Solo hay unas toallas y una botella de agua.', 'Միայն սրբիչներ և ջրի շիշ կան։'),
  'vestuario-taquilla': T_('Tu taquilla: hay una mochila y una foto del equipo.', 'Քո պահարանը․ ուսապարկ և թիմի լուսանկար կա։'),
  'oficina-mesa': T_('Papeles con tácticas: 4-3-3.', 'Մարտավարական թղթեր՝ 4-3-3։'),
  'oficina-cajon': T_('Bolígrafos y un silbato.', 'Գրիչներ և սուլիչ։'),
  'trofeos-vitrina': T_('Copas y medallas de otros años.', 'Նախորդ տարիների գավաթներ և մեդալներ։'),
  'cafeteria-sofa': T_('Un sofá muy cómodo. Huele a café.', 'Շատ հարմար բազմոց։ Սուրճի հոտ է գալիս։'),
  'cafeteria-barra': T_('Bocadillos y zumos para después del partido.', 'Սենդվիչներ և հյութեր՝ խաղից հետո։'),
  'almacen-cajas': T_('Cajas con conos y petos de entrenamiento.', 'Արկղեր՝ կոներով և մարզական ժիլետներով։'),
  'lavanderia-cesta': T_('Cestas con ropa limpia.', 'Զամբյուղներ՝ մաքուր հագուստով։'),
  'prensa-mesa': T_('Micrófonos y una pancarta del equipo.', 'Միկրոֆոններ և թիմի պաստառ։'),
  'pasillo-tablon': T_('El tablón tiene el calendario de partidos.', 'Տախտակին խաղերի օրացույցն է։'),
};

const NPCS: Record<string, { name: string; role: string; look: Look; pos: [number, number, number]; pitch: number }> = {
  dani: { name: 'Dani', role: 'Compañero', look: CHARACTERS.companero.look, pos: [-3, 0, 3], pitch: 1.25 },
  marta: { name: 'Marta', role: 'Limpieza', look: { ...CHARACTERS.cajera.look, top: '#56ccf2', hairStyle: 'bun', hair: '#6b4423' }, pos: [3, 0, 9], pitch: 1.15 },
  cocinera: { name: 'Rosa', role: 'Cocinera', look: { ...CHARACTERS.camarera.look, top: '#ffffff', hairStyle: 'bun', hair: '#222' }, pos: [9, 0, 3], pitch: 1.1 },
  hugo: { name: 'Hugo', role: 'Portero', look: CHARACTERS.portero.look, pos: [-9, 0, -3], pitch: 1.2 },
  entrenador: { name: 'Óscar', role: 'Entrenador', look: CHARACTERS.coach.look, pos: [-8.5, 0, 9], pitch: 0.8 },
};
const NPC_FLAVOR: Record<string, T> = {
  dani: T_('¡Venga, detective! Seguro que lo encuentras.', 'Դե, դետեկտիվ։ Վստահ եմ՝ կգտնես։'),
  marta: T_('Yo estoy limpiando el pasillo. Si necesitas algo, dímelo.', 'Ես միջանցքն եմ մաքրում։ Եթե ինչ-որ բան պետք լինի, ասա։'),
  cocinera: T_('¿Quieres un zumo? Aquí en la cafetería lo veo todo.', 'Հյութ կուզե՞ս։ Այստեղ՝ սրճարանում, ամեն ինչ տեսնում եմ։'),
  hugo: T_('Estoy preparando los guantes para el partido.', 'Ձեռնոցներս եմ պատրաստում խաղի համար։'),
  entrenador: T_('Confío en ti, Razmik.', 'Վստահում եմ քեզ, Ռազմիկ։'),
};

export function DetectiveScene() {
  const params = useUI((s) => s.params);
  const done = useProgress((s) => s.missions);
  const story: Story = useMemo(() => {
    const byId = STORIES.find((s) => s.id === params.story);
    if (byId) return byId;
    const fresh = STORIES.filter((s) => !done['detective-' + s.id]);
    return (fresh.length ? fresh : STORIES)[Math.floor(Math.random() * (fresh.length || STORIES.length))];
  }, []);
  const [found, setFound] = useState<string[]>([]);
  const foundRef = useRef<string[]>([]);
  foundRef.current = found;
  const [finished, setFinished] = useState(false);
  const doors = useRef<Record<string, Box>>({});
  const [openDoors, setOpenDoors] = useState<string[]>([]);
  const started = useRef(performance.now());
  const ui = useUI.getState;

  useMemo(() => {
    resetWorld();
    buildColliders();
    ['puerta-almacen', 'puerta-lavanderia', 'puerta-prensa'].forEach((d) => {
      if (story.clues.some((c) => c.kind === 'door' && c.where === d)) {
        const [x, y, z] = SPOTS[d as Spot];
        doors.current[d] = d === 'puerta-prensa' ? addBox(11, 0, 2, 0.4, 2.8, UP, 'door') : addBox(x < 0 ? -6 : 6, z, 0.4, 1.8, 2.8, y, 'door');
      }
    });
  }, []);

  useEffect(() => {
    playMusic('calm');
    setTimeout(() => {
      ui().openDialog({ speaker: 'Óscar', role: 'Entrenador', pitch: 0.8, lines: story.intro.map((t) => ({ speaker: 'Óscar', t })) });
    }, 600);
  }, []);

  const active = (c: Clue) => !foundRef.current.includes(c.id) && (c.requires ?? []).every((r) => foundRef.current.includes(r));
  const mark = (c: Clue) => {
    setFound((f) => [...f, c.id]);
    sfx('pickup');
    ui().toast(T_('¡Nueva pista!', 'Նոր հուշում։'), 'good');
    useProgress.getState().addXP(10);
  };

  const run = (c: Clue, speaker: string, pitch = 1, after?: () => void) => {
    ui().openDialog({
      speaker,
      pitch,
      lines: [...c.lines, ...(c.question ? [c.question.q] : [])].map((t) => ({ speaker, t })),
      options: c.question?.options.map((o) => ({ ...o, reply: o.ok ? T_('¡Correcto!', 'Ճիշտ է։') : undefined })),
      cat: 'detective',
      listening: true,
      onClose: (r) => {
        if (c.question && !r.ok) return;
        mark(c);
        after?.();
      },
    });
  };

  const talkNpc = useCallback((id: string) => {
    const n = NPCS[id];
    const c = story.clues.find((x) => x.kind === 'talk' && x.npc === id && active(x));
    if (c) run(c, n.name, n.pitch);
    else {
      const locked = story.clues.find((x) => x.kind === 'talk' && x.npc === id && !foundRef.current.includes(x.id));
      ui().openDialog({ speaker: n.name, role: n.role, pitch: n.pitch, lines: [{ speaker: n.name, t: locked ? T_('Mmm… ahora no sé nada. Busca más pistas y vuelve.', 'Մմմ… հիմա ոչինչ չգիտեմ։ Ավելի շատ հուշումներ գտիր և վերադարձիր։') : NPC_FLAVOR[id] }] });
    }
  }, []);

  const useSpot = useCallback((spot: Spot) => {
    const c = story.clues.find((x) => x.where === spot);
    if (!c) {
      if (FLAVOR[spot]) ui().openDialog({ speaker: 'Razmik', lines: [{ speaker: 'Razmik', t: FLAVOR[spot] }] });
      else ui().openDialog({ speaker: 'Razmik', lines: [{ speaker: 'Razmik', t: T_('La puerta está abierta.', 'Դուռը բաց է։') }] });
      return;
    }
    if (foundRef.current.includes(c.id)) {
      ui().openDialog({ speaker: 'Razmik', lines: [{ speaker: 'Razmik', t: T_('Ya he mirado aquí.', 'Այստեղ արդեն նայել եմ։') }] });
      return;
    }
    if (!active(c)) {
      ui().openDialog({ speaker: 'Razmik', lines: [{ speaker: 'Razmik', t: c.kind === 'door' ? T_('Está cerrada con llave. Necesito más pistas.', 'Փակ է բանալիով։ Ավելի շատ հուշումներ են պետք։') : FLAVOR[spot] ?? T_('No hay nada interesante todavía.', 'Դեռ հետաքրքիր ոչինչ չկա։') }] });
      return;
    }
    run(c, 'Razmik', 1.3, () => {
      if (c.kind === 'door') {
        const b = doors.current[spot];
        if (b) removeBox(b);
        setOpenDoors((d) => [...d, spot]);
        sfx('unlock');
      }
      if (c.kind === 'item') {
        setTimeout(() => {
          ui().openDialog({
            speaker: 'Final', lines: story.ending.map((t) => ({ speaker: '', t })),
            onClose: () => {
              const p = useProgress.getState();
              const mins = (performance.now() - started.current) / 60000;
              p.completeMission('detective-' + story.id, 150, 40, true);
              p.addMedal('Detective: ' + story.title.es);
              p.setRecord('detective-' + story.id + '-min', Math.round(mins * 10) / 10, true);
              sfx('win');
              setFinished(true);
            },
          });
        }, 300);
      }
    });
  }, []);

  useEffect(() => {
    const offs: (() => void)[] = [];
    (Object.keys(SPOTS) as Spot[]).forEach((s) => {
      const c = story.clues.find((x) => x.where === s);
      const label = c?.label ?? (s.startsWith('puerta') ? T_('Mirar la puerta', 'Նայել դուռը') : T_('Examinar', 'Զննել'));
      const [x, y, z] = SPOTS[s];
      offs.push(addInteractable({ id: 'spot-' + s, pos: new THREE.Vector3(x, y, z), radius: 1.7, label, onInteract: () => useSpot(s) }) as unknown as () => void);
    });
    return () => offs.forEach((f) => f());
  }, []);

  const nextHint = (): T => {
    const c = story.clues.find((x) => active(x));
    if (!c) return T_('¡Ya lo tienes casi! Mira bien.', 'Գրեթե գտել ես։ Լավ նայիր։');
    if (c.kind === 'talk') return T_(`Habla con ${NPCS[c.npc!].name}.`, `Խոսիր ${NPCS[c.npc!].name}-ի հետ։`);
    const room = (c.where as string).split('-')[0];
    return T_(`Busca en ${ROOM_NAMES[room]?.es ?? 'el edificio'}.`, `Փնտրիր ${ROOM_NAMES[room]?.hy ?? 'շենքում'}։`);
  };

  return (
    <SceneShell
      follow={false}
      overlay={
        <>
          <MissionPanel title={T_(`Detective Razmik: ${story.title.es}`, `Դետեկտիվ Ռազմիկ․ ${story.title.hy}`)} objective={T_(`Encuentra ${story.item.es}`, `Գտիր ${story.item.hy}`)} lines={story.clues.filter((c) => found.includes(c.id)).map((c) => ({ t: c.lines[0], done: true }))}>
            <div className="mp-row">
              <span className="pill small">🔎 {found.length}/{story.clues.length}</span>
              <button className="btn tiny ghost" onClick={() => { const h = nextHint(); ui().toast(h, 'info'); useProgress.getState().answer(null, true, 'detective'); }}>
                <Icon name="bolt" size={14} /> Pista
              </button>
            </div>
          </MissionPanel>
          {finished && (
            <div className="modal-back">
              <div className="modal">
                <div className="result-title">¡Caso resuelto!</div>
                <Es t={story.title} />
                <div className="result-grid">
                  <div><b>{found.length}</b><span>Pistas</span></div>
                  <div><b>+150</b><span>XP</span></div>
                  <div><b>{Object.keys(useProgress.getState().missions).filter((k) => k.startsWith('detective-')).length}/{STORIES.length}</b><span>Casos</span></div>
                </div>
                <div className="row">
                  {STORIES.filter((s) => s.id !== story.id).slice(0, 2).map((s) => (
                    <button key={s.id} className="btn primary" onClick={() => useUI.getState().go('detective', { story: s.id })}>{s.title.es}</button>
                  ))}
                  <button className="btn ghost" onClick={() => useUI.getState().go('city', { spawn: 'estadio' })}>Volver a la ciudad</button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
      <Clubhouse openDoors={openDoors} lockedDoors={Object.keys(doors.current)} story={story} found={found} />
      {Object.entries(NPCS).map(([id, n]) => (
        <StaticNPC key={id} id={'det-' + id} name={n.name} role={n.role} look={n.look} pos={n.pos} pitch={n.pitch} onTalk={() => talkNpc(id)} />
      ))}
      {story.id === 'balon' && found.includes('p2') && <StaticNPC id="noa" name="Noa" role="Hermana de Hugo" look={{ ...CHARACTERS.sofia.look, height: 1.25, top: '#ff7a1a' }} pos={[-13.5, UP, -8]} pitch={1.5} onTalk={() => ui().openDialog({ speaker: 'Noa', pitch: 1.5, lines: [{ speaker: 'Noa', t: T_('¡Me has encontrado!', 'Գտար ինձ։') }] })} />}
      <Player start={[0, 0, 9]} startYaw={Math.PI} camDist={3.6} />
    </SceneShell>
  );
}

function buildColliders() {
  const H = 3.0;
  const wall = (x0: number, z0: number, x1: number, z1: number, y0: number, h: number) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    addBox(cx, cz, Math.max(0.3, Math.abs(x1 - x0)), Math.max(0.3, Math.abs(z1 - z0)), h, y0, 'wall');
  };
  // outer
  wall(-16, -11, 16, -11, 0, 6);
  wall(-16, 11, 16, 11, 0, 6);
  wall(-16, -11, -16, 11, 0, 6);
  wall(16, -11, 16, 11, 0, 6);
  // ground interior walls with door gaps (gap 2m)
  wall(-6, -11, -6, -6.5, 0, H); wall(-6, -4.5, -6, 4.5, 0, H); wall(-6, 6.5, -6, 11, 0, H);
  wall(6, -11, 6, -6.5, 0, H); wall(6, -4.5, 6, 4.5, 0, H); wall(6, 6.5, 6, 11, 0, H);
  wall(-16, 0, -6, 0, 0, H);
  wall(6, 0, 16, 0, 0, H);
  // stairs x[-2,2] from z=-1 up to z=-9
  for (let i = 0; i < 10; i++) addBox(0, -1.4 - i * 0.8, 4, 0.8, (i + 1) * 0.32, 0, 'stairs');
  // upper slabs
  addBox(-11, -5.5, 10, 11, 0.2, UP - 0.2, 'floor2');
  addBox(0, -10, 12, 2, 0.2, UP - 0.2, 'floor2');
  addBox(11, 0, 10, 22, 0.2, UP - 0.2, 'floor2');
  // upper walls
  wall(-6, -9, -6, 0, UP, 2.8);
  wall(-16, 0, -6, 0, UP, 2.8);
  wall(6, -9, 6, 11, UP, 2.8);
  wall(6, 0, 10, 0, UP, 2.8); wall(12, 0, 16, 0, UP, 2.8);
  // railings
  addBox(-4, -9, 4, 0.2, 1.1, UP, 'rail');
  addBox(4, -9, 4, 0.2, 1.1, UP, 'rail');
  // furniture
  addBox(-11, -6, 3, 0.8, 0.5, 0, 'bench');
  addBox(-11.5, 7.5, 3.2, 1.4, 0.8, 0, 'desk');
  addBox(11, -10.2, 4, 0.8, 2, 0, 'vitrina');
  addBox(13, 9.2, 3, 1, 0.6, 0, 'sofa');
  addBox(8.6, 3, 3, 0.9, 1.1, 0, 'barra');
  addBox(-12, -7.6, 3, 1.4, 1.6, UP, 'cajas');
  addBox(11, -6.5, 3, 1, 0.9, UP, 'cestas');
  addBox(11, 7.5, 3, 1.4, 0.8, UP, 'mesa-prensa');
}

function Clubhouse({ openDoors, lockedDoors, story, found }: { openDoors: string[]; lockedDoors: string[]; story: Story; found: string[] }) {
  const floor = useMemo(() => {
    const t = floorTex('tile').clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 7);
    return t;
  }, []);
  const wood = useMemo(() => {
    const t = woodTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return t;
  }, []);
  const W = (x0: number, z0: number, x1: number, z1: number, y0: number, h: number, color = '#e9e4da') => (
    <mesh position={[(x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2]} castShadow receiveShadow>
      <boxGeometry args={[Math.max(0.25, Math.abs(x1 - x0)), h, Math.max(0.25, Math.abs(z1 - z0))]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
  const label = (text: string, pos: [number, number, number], rot = 0, color = '#ff7a1a') => (
    <mesh position={pos} rotation={[0, rot, 0]}>
      <planeGeometry args={[2.6, 0.5]} />
      <meshBasicMaterial map={textTex(text, { bg: '#1b2233', fg: color, w: 512, h: 98 })} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[32, 22]} />
        <meshStandardMaterial map={floor} />
      </mesh>
      {/* walls ground */}
      {W(-16, -11, 16, -11, 0, 6, '#d9e2ec')}
      {W(-16, -11, -16, 11, 0, 6, '#d9e2ec')}
      {W(16, -11, 16, 11, 0, 6, '#d9e2ec')}
      {W(-6, -11, -6, -6.5, 0, 3)}{W(-6, -4.5, -6, 4.5, 0, 3)}{W(-6, 6.5, -6, 11, 0, 3)}
      {W(6, -11, 6, -6.5, 0, 3)}{W(6, -4.5, 6, 4.5, 0, 3)}{W(6, 6.5, 6, 11, 0, 3)}
      {W(-16, 0, -6, 0, 0, 3)}
      {W(6, 0, 16, 0, 0, 3)}
      {/* stairs */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[0, ((i + 1) * 0.32) / 2, -1.4 - i * 0.8]} castShadow receiveShadow>
          <boxGeometry args={[4, (i + 1) * 0.32, 0.8]} />
          <meshStandardMaterial color={i % 2 ? '#ff9a4a' : '#ff7a1a'} />
        </mesh>
      ))}
      {/* upper floor slabs */}
      <mesh position={[-11, UP - 0.1, -5.5]} receiveShadow castShadow><boxGeometry args={[10, 0.2, 11]} /><meshStandardMaterial map={wood} /></mesh>
      <mesh position={[0, UP - 0.1, -10]} receiveShadow castShadow><boxGeometry args={[12, 0.2, 2]} /><meshStandardMaterial map={wood} /></mesh>
      <mesh position={[11, UP - 0.1, 0]} receiveShadow castShadow><boxGeometry args={[10, 0.2, 22]} /><meshStandardMaterial map={wood} /></mesh>
      {W(-6, -9, -6, 0, UP, 2.8)}
      {W(-16, 0, -6, 0, UP, 2.8)}
      {W(6, -9, 6, 11, UP, 2.8)}
      {W(6, 0, 10, 0, UP, 2.8)}{W(12, 0, 16, 0, UP, 2.8)}
      {W(-6, -9, -2, -9, UP, 1.1, '#8a9099')}
      {W(2, -9, 6, -9, UP, 1.1, '#8a9099')}
      {/* locked doors */}
      {lockedDoors.filter((d) => !openDoors.includes(d)).map((d) => (
        <mesh key={d} position={d === 'puerta-prensa' ? [11, UP + 1.4, 0] : [d === 'puerta-almacen' ? -6 : 6, UP + 1.4, -10]}>
          <boxGeometry args={d === 'puerta-prensa' ? [2, 2.8, 0.3] : [0.3, 2.8, 1.8]} />
          <meshStandardMaterial map={wood} color="#a0703a" />
        </mesh>
      ))}
      {/* labels */}
      {label('VESTUARIO', [-5.85, 2.5, -5.5], -Math.PI / 2)}
      {label('OFICINA', [-5.85, 2.5, 5.5], -Math.PI / 2)}
      {label('TROFEOS', [5.85, 2.5, -5.5], Math.PI / 2)}
      {label('CAFETERÍA', [5.85, 2.5, 5.5], Math.PI / 2)}
      {label('ALMACÉN', [-5.85, UP + 2.4, -10], -Math.PI / 2)}
      {label('LAVANDERÍA', [5.85, UP + 2.4, -10], Math.PI / 2)}
      {label('SALA DE PRENSA', [11, UP + 2.4, -0.2], 0)}
      {label('ESCALERA ↑ 2º PISO', [0, 3.6, -0.6], 0, '#56ccf2')}
      {/* vestuario */}
      <mesh position={[-11, 0.25, -6]} castShadow><boxGeometry args={[3, 0.5, 0.8]} /><meshStandardMaterial map={wood} /></mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={i} position={[-15.4, 1.1, -10 + i * 1.15]}>
          <mesh><boxGeometry args={[0.8, 2.2, 1.05]} /><meshStandardMaterial color={i === 5 ? '#ff7a1a' : '#4a6a90'} metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[0.41, 0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.4, 0.25]} />
            <meshBasicMaterial map={textTex(String(i + 2), { bg: '#ffffff', fg: '#1b2233', w: 128, h: 80 })} />
          </mesh>
        </group>
      ))}
      {/* oficina */}
      <mesh position={[-11.5, 0.4, 7.5]} castShadow><boxGeometry args={[3.2, 0.8, 1.4]} /><meshStandardMaterial color="#7a4b2a" /></mesh>
      <mesh position={[-11.5, 0.9, 10.6]}><planeGeometry args={[3, 1.6]} /><meshStandardMaterial color="#2f7d3a" /></mesh>
      {/* trofeos */}
      <mesh position={[11, 1, -10.2]}><boxGeometry args={[4, 2, 0.8]} /><meshStandardMaterial color="#cde7ff" transparent opacity={0.5} roughness={0.05} /></mesh>
      {[-1.2, 0, 1.2].map((x) => (
        <mesh key={x} position={[11 + x, 1.3, -10.2]}><cylinderGeometry args={[0.15, 0.08, 0.5, 12]} /><meshStandardMaterial color="#ffd34d" metalness={0.9} roughness={0.2} /></mesh>
      ))}
      {/* cafeteria */}
      <mesh position={[13, 0.3, 9.2]} castShadow><boxGeometry args={[3, 0.6, 1]} /><meshStandardMaterial color="#9b51e0" /></mesh>
      <mesh position={[13, 0.75, 9.65]}><boxGeometry args={[3, 0.6, 0.2]} /><meshStandardMaterial color="#9b51e0" /></mesh>
      <mesh position={[8.6, 0.55, 3]} castShadow><boxGeometry args={[3, 1.1, 0.9]} /><meshStandardMaterial color="#7a3b2e" /></mesh>
      {/* tablon */}
      <mesh position={[-5.85, 1.6, 8]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.8, 1.2]} /><meshStandardMaterial color="#c8873a" /></mesh>
      {/* upper: almacen boxes */}
      {[[-13, -7.6], [-11.4, -7.6], [-12.2, -7.6, 0.8]].map(([x, z, y = 0], i) => (
        <mesh key={i} position={[x, UP + 0.4 + y, z]} castShadow><boxGeometry args={[1.4, 0.8, 1.2]} /><meshStandardMaterial map={wood} color="#c8a27a" /></mesh>
      ))}
      {/* lavanderia baskets */}
      {[['#2e6fd8', 10], ['#ff7a1a', 11], ['#27ae60', 12]].map(([c, x]) => (
        <mesh key={c as string} position={[x as number, UP + 0.45, -6.5]}><cylinderGeometry args={[0.45, 0.35, 0.9, 14]} /><meshStandardMaterial color={c as string} /></mesh>
      ))}
      {/* prensa */}
      <mesh position={[11, UP + 0.4, 7.5]} castShadow><boxGeometry args={[3, 0.8, 1.4]} /><meshStandardMaterial color="#1b2233" /></mesh>
      <mesh position={[11, UP + 1.8, 10.85]}><planeGeometry args={[6, 1.4]} /><meshBasicMaterial map={textTex('RUEDA DE PRENSA · RAZMIK 7', { bg: '#ff7a1a', fg: '#fff', w: 1024, h: 240 })} toneMapped={false} /></mesh>
      {story.id === 'botas' && <group position={[11, UP + 0.8, 7.5]}><Item3D kind="bag" color="#e14b4b" /></group>}
      {story.id === 'trofeo' && <mesh position={[12.6, UP + 0.6, -5]}><cylinderGeometry args={[0.2, 0.1, 0.6, 14]} /><meshStandardMaterial color="#ffd34d" metalness={1} roughness={0.1} emissive="#ffb03a" emissiveIntensity={0.4} /></mesh>}
      {/* lights */}
      <pointLight position={[-11, 2.6, -5]} intensity={10} distance={14} />
      <pointLight position={[-11, 2.6, 5]} intensity={10} distance={14} />
      <pointLight position={[0, 2.6, 4]} intensity={12} distance={16} />
      <pointLight position={[11, 2.6, -5]} intensity={10} distance={14} />
      <pointLight position={[11, 2.6, 5]} intensity={10} distance={14} />
      <pointLight position={[-11, UP + 2.4, -5]} intensity={8} distance={12} />
      <pointLight position={[11, UP + 2.4, -5]} intensity={8} distance={12} />
      <pointLight position={[11, UP + 2.4, 6]} intensity={8} distance={12} />
    </group>
  );
}
