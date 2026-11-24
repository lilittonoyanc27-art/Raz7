import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SceneShell } from '../ui/SceneShell';
import { Player } from '../three/Player';
import { addBox, addInteractable, player, removeBox, resetWorld, type Box } from '../three/world';
import { useProgress, useUI } from '../core/store';
import type { Level, T } from '../core/types';
import { pick, shuffle } from '../core/random';
import { playMusic, sfx, speak } from '../core/audio';
import { MissionPanel, fmt } from '../ui/HUD';
import { Es, openTranslation } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { textTex, woodTex } from '../three/textures';

const T_ = (es: string, hy: string): T => ({ es, hy });
const S = 3; // cell size
const RIDDLES: { q: T; options: { t: T; ok: boolean }[] }[] = [
  { q: T_('¿Qué palabra es un verbo?', 'Ո՞ր բառն է բայ։'), options: [{ t: T_('Correr', 'Վազել'), ok: true }, { t: T_('Mesa', 'Սեղան'), ok: false }, { t: T_('Azul', 'Կապույտ'), ok: false }] },
  { q: T_('Completa: «Ayer yo ___ al fútbol».', 'Լրացրու․ «Երեկ ես ___ ֆուտբոլ»։'), options: [{ t: T_('jugué', 'խաղացի'), ok: true }, { t: T_('juego', 'խաղում եմ'), ok: false }, { t: T_('jugaré', 'կխաղամ'), ok: false }] },
  { q: T_('«Tengo agujas pero no sé coser, tengo números pero no sé leer». ¿Qué soy?', '«Սլաքներ ունեմ, բայց կարել չգիտեմ, թվեր ունեմ, բայց կարդալ չգիտեմ»։ Ի՞նչ եմ ես։'), options: [{ t: T_('Un reloj', 'Ժամացույց'), ok: true }, { t: T_('Un libro', 'Գիրք'), ok: false }, { t: T_('Un balón', 'Գնդակ'), ok: false }] },
  { q: T_('¿Cuál es el contrario de «cerca»?', 'Ո՞րն է «մոտ»-ի հականիշը։'), options: [{ t: T_('Lejos', 'Հեռու'), ok: true }, { t: T_('Encima', 'Վրա'), ok: false }, { t: T_('Dentro', 'Ներսում'), ok: false }] },
  { q: T_('Completa: «Mañana ___ a jugar un partido».', 'Լրացրու․ «Վաղը ___ խաղ խաղալու»։'), options: [{ t: T_('voy', 'գնում եմ'), ok: true }, { t: T_('fui', 'գնացի'), ok: false }, { t: T_('iba', 'գնում էի'), ok: false }] },
  { q: T_('Si hoy es lunes, ¿qué día es mañana?', 'Եթե այսօր երկուշաբթի է, վաղը ի՞նչ օր է։'), options: [{ t: T_('Martes', 'Երեքշաբթի'), ok: true }, { t: T_('Domingo', 'Կիրակի'), ok: false }, { t: T_('Jueves', 'Հինգշաբթի'), ok: false }] },
];

interface MazeDef {
  grid: number[][];
  rows: number;
  cols: number;
  start: [number, number];
  key: [number, number];
  decoy: [number, number];
  gate1: [number, number];
  doors: { cell: [number, number]; n: number; ok: boolean }[];
  statue: [number, number];
  exit: [number, number];
  coins: [number, number][];
  secret: [number, number];
  num: number;
  zoneRows: number;
}

function generate(lvl: Level): MazeDef {
  const cx = lvl === 'A1' ? 5 : lvl === 'A2' ? 6 : 7;
  const cy = lvl === 'A1' ? 3 : lvl === 'A2' ? 4 : 5;
  const cols = cx * 2 + 1;
  const zr = cy * 2;
  const rows = zr * 3 + 1;
  const g: number[][] = Array.from({ length: rows }, () => Array(cols).fill(1));
  for (let z = 0; z < 3; z++) {
    const r0 = z * zr;
    const vis = new Set<string>();
    const stack: [number, number][] = [[r0 + 1, 1]];
    g[r0 + 1][1] = 0;
    vis.add(`${r0 + 1},1`);
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const nb = shuffle([[0, 2], [0, -2], [2, 0], [-2, 0]] as [number, number][]).map(([dr, dc]) => [r + dr, c + dc] as [number, number]).filter(([nr, nc]) => nr > r0 && nr < r0 + zr && nc > 0 && nc < cols - 1 && !vis.has(`${nr},${nc}`));
      if (!nb.length) {
        stack.pop();
        continue;
      }
      const [nr, nc] = nb[0];
      g[(r + nr) / 2][(c + nc) / 2] = 0;
      g[nr][nc] = 0;
      vis.add(`${nr},${nc}`);
      stack.push([nr, nc]);
    }
    // add a few loops for fun
    for (let k = 0; k < cx; k++) {
      const r = r0 + 1 + 2 * Math.floor(Math.random() * cy);
      const c = 2 + 2 * Math.floor(Math.random() * (cx - 1));
      if (r < r0 + zr) g[r][c] = 0;
    }
  }
  const oddCols = Array.from({ length: cx }, (_, i) => i * 2 + 1);
  const gateCol = pick(oddCols);
  const gate1: [number, number] = [zr, gateCol];
  g[zr][gateCol] = 0;
  const doorCols = shuffle(oddCols).slice(0, 3);
  const nums = shuffle([3, 7, 9, 5, 2, 8]).slice(0, 3);
  const okIdx = Math.floor(Math.random() * 3);
  const doors = doorCols.map((c, i) => ({ cell: [zr * 2, c] as [number, number], n: nums[i], ok: i === okIdx }));
  doors.forEach((d) => (g[d.cell[0]][d.cell[1]] = 0));
  const exitCol = pick(oddCols);
  const exit: [number, number] = [rows - 1, exitCol];
  g[rows - 1][exitCol] = 0;
  const statue: [number, number] = [rows - 2, exitCol];
  // dead ends in zone 0 (far from start)
  const deadEnds = (r0: number, r1: number) => {
    const out: [number, number][] = [];
    for (let r = r0 + 1; r < r1; r += 2)
      for (let c = 1; c < cols - 1; c += 2) {
        if (g[r][c]) continue;
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dr, dc]) => !g[r + dr]?.[c + dc]).length;
        if (open === 1 && !(r === 1 && c === 1)) out.push([r, c]);
      }
    return out;
  };
  const de0 = shuffle(deadEnds(0, zr)).filter(([r, c]) => !(r === gate1[0] - 1 && c === gate1[1]));
  const key = de0[0] ?? [zr - 1, cols - 2];
  const decoy = de0[1] ?? [zr - 1, 1];
  const de1 = shuffle(deadEnds(zr, zr * 2));
  const secret = de1[0] ?? [zr + 1, cols - 2];
  const floors: [number, number][] = [];
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) if (!g[r][c]) floors.push([r, c]);
  const coins = shuffle(floors).slice(0, 14);
  return { grid: g, rows, cols, start: [1, 1], key, decoy, gate1, doors, statue, exit, coins, secret, num: nums[okIdx], zoneRows: zr };
}

export function MazeScene() {
  const lvl = useProgress((s) => s.level);
  const m = useMemo(() => generate(lvl), []);
  const W = (c: number) => c * S - (m.cols * S) / 2 + S / 2;
  const Z = (r: number) => r * S;
  const [state, setState] = useState({ key: false, gate1: false, door: false, statue: false, exit: false, coins: 0, secret: false, zone: 0, wrong: 0 });
  const sref = useRef(state);
  sref.current = state;
  const blocks = useRef<Record<string, Box>>({});
  const started = useRef(performance.now());
  const [done, setDone] = useState<null | { time: number }>(null);
  const ui = useUI.getState;
  const visited = useRef(new Set<string>());

  useMemo(() => {
    resetWorld();
    for (let r = 0; r < m.rows; r++)
      for (let c = 0; c < m.cols; c++) if (m.grid[r][c]) addBox(W(c), Z(r), S, S, 3.2, 0, 'wall');
    blocks.current.gate1 = addBox(W(m.gate1[1]), Z(m.gate1[0]), S, S, 3.2, 0, 'gate');
    m.doors.forEach((d) => (blocks.current['door' + d.n] = addBox(W(d.cell[1]), Z(d.cell[0]), S, S, 3.2, 0, 'door')));
    blocks.current.statue = addBox(W(m.statue[1]), Z(m.statue[0]), S * 0.8, S * 0.8, 3, 0, 'statue');
    blocks.current.exit = addBox(W(m.exit[1]), Z(m.exit[0]), S, S, 3.2, 0, 'exit');
  }, []);

  const instructions: T[] = useMemo(() => [
    T_('La llave está entre las dos cajas. ¡Cuidado: hay una llave falsa entre dos barriles!', 'Բանալին երկու արկղերի միջև է։ Զգույշ․ երկու տակառի միջև կեղծ բանալի կա։'),
    T_(`Busca una puerta que tenga el número ${m.num}. Las otras puertas están cerradas.`, `Փնտրիր այն դուռը, որի վրա ${m.num} թիվն է։ Մյուս դռները փակ են։`),
    T_('El camino correcto está detrás de la estatua. Para abrir la última puerta, responde a la pregunta.', 'Ճիշտ ճանապարհը արձանի հետևում է։ Վերջին դուռը բացելու համար պատասխանիր հարցին։'),
  ], []);

  useEffect(() => {
    playMusic('night');
    setTimeout(() => {
      ui().openDialog({ speaker: 'Voz misteriosa', pitch: 0.7, lines: [{ speaker: 'Voz misteriosa', t: T_('Bienvenido al laberinto secreto, Razmik. Escucha bien cada instrucción.', 'Բարի գալուստ գաղտնի լաբիրինթոս, Ռազմիկ։ Լավ լսիր յուրաքանչյուր հրահանգ։') }, { speaker: 'Voz misteriosa', t: instructions[0] }] });
    }, 500);
  }, []);

  const pickKey = useCallback((real: boolean) => {
    if (sref.current.key) return;
    if (!real) {
      sfx('wrong');
      useProgress.getState().answer(instructions[0], false, 'preposiciones', true);
      ui().openDialog({ speaker: 'Voz misteriosa', pitch: 0.7, lines: [{ speaker: 'Voz misteriosa', t: T_('¡Esta llave es falsa! Está entre dos barriles, no entre dos cajas.', 'Այս բանալին կեղծ է։ Այն երկու տակառի միջև է, ոչ թե երկու արկղի։') }] });
      setState((s) => ({ ...s, wrong: s.wrong + 1 }));
      return;
    }
    sfx('pickup');
    useProgress.getState().answer(instructions[0], true, 'preposiciones', true);
    setState((s) => ({ ...s, key: true }));
    ui().toast(T_('¡Tienes la llave! Busca la puerta dorada.', 'Բանալին քեզ մոտ է։ Փնտրիր ոսկեգույն դուռը։'), 'good');
  }, []);

  const openGate = useCallback(() => {
    if (sref.current.gate1) return;
    if (!sref.current.key) {
      ui().openDialog({ speaker: 'Puerta dorada', lines: [{ speaker: 'Puerta dorada', t: T_('Esta puerta necesita una llave.', 'Այս դռանը բանալի է պետք։') }] });
      return;
    }
    removeBox(blocks.current.gate1);
    sfx('unlock');
    setState((s) => ({ ...s, gate1: true, zone: 1 }));
    speak(instructions[1].es);
    useUI.getState().toast(instructions[1], 'info');
  }, []);

  const tryDoor = useCallback((n: number, ok: boolean) => {
    if (sref.current.door) return;
    if (!ok) {
      sfx('wrong');
      useProgress.getState().answer(instructions[1], false, 'numeros', true);
      ui().openDialog({ speaker: 'Puerta', lines: [{ speaker: 'Puerta', t: T_(`Esta puerta tiene el número ${n}. No es la correcta.`, `Այս դուռը ${n} համարն ունի։ Ճիշտը չէ։`) }] });
      setState((s) => ({ ...s, wrong: s.wrong + 1 }));
      return;
    }
    removeBox(blocks.current['door' + n]);
    sfx('unlock');
    useProgress.getState().answer(instructions[1], true, 'numeros', true);
    setState((s) => ({ ...s, door: true, zone: 2 }));
    speak(instructions[2].es);
    useUI.getState().toast(instructions[2], 'info');
  }, []);

  const moveStatue = useCallback(() => {
    if (sref.current.statue) return;
    removeBox(blocks.current.statue);
    sfx('door');
    setState((s) => ({ ...s, statue: true }));
  }, []);

  const riddle = useCallback(() => {
    if (sref.current.exit) return;
    const rd = pick(RIDDLES);
    ui().openDialog({
      speaker: 'Puerta final', pitch: 0.8,
      lines: [{ speaker: 'Puerta final', t: T_('Para abrir esta puerta, responde a la pregunta:', 'Այս դուռը բացելու համար պատասխանիր հարցին․') }, { speaker: 'Puerta final', t: rd.q }],
      options: rd.options.map((o) => ({ ...o, reply: o.ok ? T_('¡Correcto! La puerta se abre.', 'Ճիշտ է։ Դուռը բացվում է։') : undefined })),
      cat: 'gramatica',
      onClose: (r) => {
        if (!r.ok) return;
        removeBox(blocks.current.exit);
        sfx('unlock');
        setState((s) => ({ ...s, exit: true }));
      },
    });
  }, []);

  const secret = useCallback(() => {
    if (sref.current.secret) return;
    sfx('coin');
    useProgress.getState().addCoins(20);
    useProgress.getState().unlockSecret('laberinto-cuadro');
    setState((s) => ({ ...s, secret: true }));
    ui().openDialog({ speaker: 'Razmik', lines: [{ speaker: 'Razmik', t: T_('¡Una habitación secreta detrás del cuadro! Hay un cofre con veinte monedas.', 'Գաղտնի սենյակ նկարի հետևում։ Սնդուկ կա՝ քսան մետաղադրամով։') }] });
  }, []);

  useEffect(() => {
    const offs: (() => void)[] = [];
    const add = (id: string, rc: [number, number], label: T, fn: () => void, r = 2.2) => offs.push(addInteractable({ id, pos: new THREE.Vector3(W(rc[1]), 0, Z(rc[0])), radius: r, label, onInteract: fn }) as unknown as () => void);
    add('key', m.key, T_('Coger la llave', 'Վերցնել բանալին'), () => pickKey(true), 1.6);
    add('decoy', m.decoy, T_('Coger la llave', 'Վերցնել բանալին'), () => pickKey(false), 1.6);
    add('gate1', [m.gate1[0] - 1, m.gate1[1]], T_('Abrir la puerta dorada', 'Բացել ոսկեգույն դուռը'), openGate, 2.0);
    m.doors.forEach((d) => add('door' + d.n, [d.cell[0] - 1, d.cell[1]], T_(`Abrir la puerta número ${d.n}`, `Բացել ${d.n} համարի դուռը`), () => tryDoor(d.n, d.ok), 2.0));
    add('statue', [m.statue[0] - 1, m.statue[1]], T_('Empujar la estatua', 'Հրել արձանը'), moveStatue, 2.2);
    add('exit', m.statue, T_('Responder a la pregunta de la puerta', 'Պատասխանել դռան հարցին'), riddle, 2.0);
    add('secret', m.secret, T_('Mirar el cuadro del balón dorado', 'Նայել ոսկե գնդակի նկարը'), secret, 1.6);
    return () => offs.forEach((f) => f());
  }, []);

  const onStep = () => {
    const r = Math.round(player.pos.z / S);
    const c = Math.round((player.pos.x + (m.cols * S) / 2 - S / 2) / S);
    visited.current.add(`${r},${c}`);
    if (!done && sref.current.exit && r >= m.rows - 1) {
      const time = (performance.now() - started.current) / 1000;
      const p = useProgress.getState();
      p.completeMission('laberinto', 130 + sref.current.coins * 3, 30 + sref.current.coins * 2, sref.current.wrong === 0);
      p.setRecord('laberinto-' + lvl, Math.round(time), true);
      sfx('win');
      setDone({ time });
    }
  };

  const zoneT = instructions[state.zone];

  return (
    <SceneShell
      tod="noche"
      follow
      minimap={<MazeMap m={m} visited={visited.current} />}
      overlay={
        <>
          <MissionPanel title={T_('El laberinto secreto', 'Գաղտնի լաբիրինթոս')} objective={zoneT} timer={(performance.now() - started.current) / 1000}>
            <div className="mp-row">
              <span className="pill small">{state.key ? '🔑 ✓' : '🔑 —'}</span>
              <span className="pill small gold">🪙 {state.coins}</span>
              <span className={'pill small ' + (state.wrong ? 'bad' : '')}>✗ {state.wrong}</span>
              <button className="btn tiny" onClick={() => speak(zoneT.es)}><Icon name="speaker" size={14} /></button>
              <button className="btn tiny ghost" onClick={() => openTranslation(zoneT)}><Icon name="translate" size={14} /></button>
            </div>
          </MissionPanel>
          {done && (
            <div className="modal-back">
              <div className="modal">
                <div className="result-title">¡Has salido del laberinto!</div>
                <div className="result-grid">
                  <div><b>{fmt(done.time)}</b><span>Tiempo</span></div>
                  <div><b>{state.coins}</b><span>Monedas</span></div>
                  <div><b>{state.wrong}</b><span>Errores</span></div>
                  <div><b>{state.secret ? 'Sí' : 'No'}</b><span>Sala secreta</span></div>
                </div>
                <Es t={T_('Cada vez que entres, el laberinto será diferente.', 'Ամեն անգամ մտնելիս լաբիրինթոսը տարբեր կլինի։')} />
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={() => useUI.getState().go('maze', { k: Date.now() })}>Nuevo laberinto</button>
                  <button className="btn ghost" onClick={() => useUI.getState().go('city', { spawn: 'secreta' })}>Volver a la ciudad</button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
      <MazeView m={m} W={W} Z={Z} state={state} onCoin={() => setState((s) => ({ ...s, coins: s.coins + 1 }))} />
      <Player start={[W(1), 0, Z(1)]} startYaw={0} camDist={3.4} onStep={onStep} />
    </SceneShell>
  );
}

function MazeMap({ m, visited }: { m: MazeDef; visited: Set<string> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const cv = ref.current;
      if (!cv) return;
      const g = cv.getContext('2d')!;
      const px = Math.min(cv.width / m.cols, cv.height / m.rows);
      g.fillStyle = '#120e22';
      g.fillRect(0, 0, cv.width, cv.height);
      for (let r = 0; r < m.rows; r++)
        for (let c = 0; c < m.cols; c++) {
          if (!visited.has(`${r},${c}`) && ![[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => visited.has(`${r + dr},${c + dc}`))) continue;
          g.fillStyle = m.grid[r][c] ? '#ff4fd8' : '#3a2f5e';
          g.fillRect(c * px, r * px, px, px);
        }
      const pr = player.pos.z / S;
      const pc = (player.pos.x + (m.cols * S) / 2 - S / 2) / S;
      g.fillStyle = '#ff7a1a';
      g.beginPath();
      g.arc(pc * px + px / 2, pr * px + px / 2, px * 0.6, 0, Math.PI * 2);
      g.fill();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="minimap square" width={150} height={Math.round((150 * m.rows) / m.cols)} />;
}

function MazeView({ m, W, Z, state, onCoin }: { m: MazeDef; W: (c: number) => number; Z: (r: number) => number; state: { gate1: boolean; door: boolean; statue: boolean; exit: boolean; key: boolean; secret: boolean }; onCoin: () => void }) {
  const walls = useRef<THREE.InstancedMesh>(null);
  const list = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) if (m.grid[r][c]) out.push([r, c]);
    return out;
  }, []);
  useLayoutEffect(() => {
    const mtx = new THREE.Matrix4();
    const col = new THREE.Color();
    list.forEach(([r, c], i) => {
      mtx.compose(new THREE.Vector3(W(c), 1.6, Z(r)), new THREE.Quaternion(), new THREE.Vector3(S, 3.2, S));
      walls.current!.setMatrixAt(i, mtx);
      const zone = Math.min(2, Math.floor(r / m.zoneRows));
      walls.current!.setColorAt(i, col.set(['#5b3fa0', '#2e6f8f', '#8f3a5b'][zone]).offsetHSL(0, 0, ((r * 7 + c * 3) % 5) * 0.015));
    });
    walls.current!.instanceMatrix.needsUpdate = true;
    if (walls.current!.instanceColor) walls.current!.instanceColor.needsUpdate = true;
  }, []);
  const stone = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ddd';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#999';
    g.lineWidth = 3;
    for (let y = 0; y < 128; y += 32) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke();
      for (let x = (y / 32) % 2 ? 0 : 32; x < 128; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const at = (rc: [number, number], y = 0): [number, number, number] => [W(rc[1]), y, Z(rc[0])];
  // decoration around key / decoy
  const side = (rc: [number, number]) => (m.grid[rc[0]][rc[1] - 1] ? [[-0.9, 0], [0.9, 0]] : [[0, -0.9], [0, 0.9]]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (m.rows * S) / 2]} receiveShadow>
        <planeGeometry args={[m.cols * S + 20, m.rows * S + 20]} />
        <meshStandardMaterial color="#2a2140" roughness={0.8} />
      </mesh>
      <instancedMesh ref={walls} args={[undefined, undefined, list.length]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial map={stone} roughness={0.8} />
      </instancedMesh>
      {/* torches */}
      {list.filter((_, i) => i % 11 === 0).map(([r, c], i) => (
        <pointLight key={i} position={[W(c), 2.6, Z(r) + (m.grid[r + 1]?.[c] === 0 ? 1.7 : -1.7)]} intensity={5} distance={9} color={i % 2 ? '#ff9a4a' : '#56ccf2'} />
      ))}
      <ambientLight intensity={0.55} color="#b9a7ff" />
      <pointLight position={at(m.start, 2.5)} intensity={6} distance={10} color="#ffd34d" />
      {/* key between boxes */}
      {!state.key && <KeyMesh pos={at(m.key, 0.6)} />}
      {side(m.key).map(([dx, dz], i) => (
        <mesh key={'k' + i} position={[W(m.key[1]) + dx, 0.4, Z(m.key[0]) + dz]} castShadow>
          <boxGeometry args={[0.7, 0.8, 0.7]} />
          <meshStandardMaterial map={woodTex()} />
        </mesh>
      ))}
      <KeyMesh pos={at(m.decoy, 0.6)} fake />
      {side(m.decoy).map(([dx, dz], i) => (
        <mesh key={'d' + i} position={[W(m.decoy[1]) + dx, 0.45, Z(m.decoy[0]) + dz]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.9, 14]} />
          <meshStandardMaterial color="#7a4b2a" />
        </mesh>
      ))}
      {/* gate 1 */}
      {!state.gate1 && (
        <mesh position={at(m.gate1, 1.6)}>
          <boxGeometry args={[S, 3.2, S * 0.4]} />
          <meshStandardMaterial color="#ffd34d" metalness={0.8} roughness={0.25} />
        </mesh>
      )}
      {/* numbered doors */}
      {m.doors.map((d) => (
        <group key={d.n}>
          {!(state.door && d.ok) && (
            <mesh position={at(d.cell, 1.6)}>
              <boxGeometry args={[S, 3.2, S * 0.4]} />
              <meshStandardMaterial map={woodTex()} color="#b07a45" />
            </mesh>
          )}
          <mesh position={[W(d.cell[1]), 2.4, Z(d.cell[0]) - S * 0.21]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={textTex(String(d.n), { bg: '#1b2233', fg: '#ffd34d', w: 128, h: 128 })} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* statue */}
      <group position={state.statue ? [W(m.statue[1]) + 1.0, 0, Z(m.statue[0]) - 0.2] : at(m.statue)}>
        <mesh position={[0, 0.4, 0]}><boxGeometry args={[1.4, 0.8, 1.4]} /><meshStandardMaterial color="#9aa1a9" /></mesh>
        <mesh position={[0, 1.5, 0]}><capsuleGeometry args={[0.35, 0.9, 6, 12]} /><meshStandardMaterial color="#c8ccd2" /></mesh>
        <mesh position={[0, 2.35, 0]}><sphereGeometry args={[0.28, 16, 12]} /><meshStandardMaterial color="#c8ccd2" /></mesh>
        <mesh position={[0.45, 1.0, 0.2]}><sphereGeometry args={[0.22, 16, 12]} /><meshStandardMaterial color="#ffd34d" metalness={0.8} /></mesh>
      </group>
      {/* exit door */}
      {!state.exit && (
        <mesh position={at(m.exit, 1.6)}>
          <boxGeometry args={[S, 3.2, S * 0.4]} />
          <meshStandardMaterial color="#ff4fd8" emissive="#ff4fd8" emissiveIntensity={0.4} />
        </mesh>
      )}
      <mesh position={[W(m.exit[1]), 3.6, Z(m.exit[0])]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.6, 0.6]} />
        <meshBasicMaterial map={textTex('SALIDA', { bg: '#1b1530', fg: '#ff4fd8', w: 256, h: 60 })} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* secret painting */}
      {!state.secret && (
        <mesh position={[W(m.secret[1]), 1.8, Z(m.secret[0]) + (m.grid[m.secret[0] + 1]?.[m.secret[1]] ? S / 2 - 0.05 : -S / 2 + 0.05)]} rotation={[0, m.grid[m.secret[0] + 1]?.[m.secret[1]] ? Math.PI : 0, 0]}>
          <planeGeometry args={[1.2, 1]} />
          <meshBasicMaterial map={textTex('⚽', { bg: '#c8873a', fg: '#ffd34d', w: 128, h: 106, font: '80px serif' })} />
        </mesh>
      )}
      {m.coins.map((rc, i) => (
        <Coin key={i} pos={at(rc, 0.8)} onTake={onCoin} />
      ))}
    </group>
  );
}

function KeyMesh({ pos, fake }: { pos: [number, number, number]; fake?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 1.6;
  });
  return (
    <group ref={g} position={pos}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.16, 0.05, 8, 16]} />
        <meshStandardMaterial color={fake ? '#d9c27a' : '#ffd34d'} metalness={0.9} roughness={0.2} emissive="#ffb03a" emissiveIntensity={fake ? 0.1 : 0.5} />
      </mesh>
      <mesh position={[0.3, 0, 0]}>
        <boxGeometry args={[0.4, 0.06, 0.06]} />
        <meshStandardMaterial color="#ffd34d" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function Coin({ pos, onTake }: { pos: [number, number, number]; onTake: () => void }) {
  const g = useRef<THREE.Group>(null);
  const taken = useRef(false);
  useFrame((_, dt) => {
    if (!g.current || taken.current) return;
    g.current.rotation.y += dt * 3;
    if (Math.hypot(player.pos.x - pos[0], player.pos.z - pos[2]) < 0.9 && Math.abs(player.pos.y + 0.8 - pos[1]) < 1.6) {
      taken.current = true;
      g.current.visible = false;
      sfx('coin');
      useProgress.getState().addCoins(1);
      onTake();
    }
  });
  return (
    <group ref={g} position={pos}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.06, 20]} />
        <meshStandardMaterial color="#ffd34d" metalness={0.9} roughness={0.25} emissive="#ffb03a" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}
