import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GameCanvas, Lights } from '../../three/Stage';
import { City } from '../../world/City';
import { Traffic } from '../../world/Traffic';
import { Pedestrians, StaticNPC } from '../../world/NPCs';
import { Player } from '../../three/Player';
import { addInteractable, player, resetWorld } from '../../three/world';
import { useProgress, useUI, levelFromXp } from '../../core/store';
import { BLOCK_C, BLOCK_S, CITY, PLACES, ROADS, ROAD_HALF, SIDEWALK, placeById, BUS_LINES, pointAt } from '../../world/layout';
import { CityDirector, PlaceDoors, getOffRef } from './CityDirector';
import { useMission } from './mission';
import { InteractPrompt, MissionPanel, Minimap, StatsBar, TopLeft, fmt, usePlayTime, type MapMarker } from '../../ui/HUD';
import { DialogPanel } from '../../ui/DialogPanel';
import { TouchControls } from '../../ui/TouchControls';
import { Es } from '../../ui/Es';
import { Icon } from '../../ui/Icon';
import { playAmbience, playMusic, sfx, speak } from '../../core/audio';
import { CHARACTERS } from '../../data/characters';
import type { T } from '../../core/types';
import { KIOSKS, PORTALS } from '../../world/City';

const START: Record<string, [number, number, number, number]> = {};
PLACES.forEach((p) => {
  START[p.id] = [p.door[0] + Math.sin(p.doorYaw) * 4.5, 0.15, p.door[1] + Math.cos(p.doorYaw) * 4.5, p.doorYaw];
});
START.plaza = [BLOCK_C[1], 0.15, -60, Math.PI];
START.secreta = [BLOCK_C[1], 0.15, 90, Math.PI];
START.parque = [BLOCK_C[2] + 14, 0.15, 44, 0];

export function CityScene() {
  const params = useUI((s) => s.params);
  const tod = useProgress((s) => s.settings.timeOfDay);
  const lvl = useProgress((s) => s.level);
  const m = useMission();
  const dialog = useUI((s) => s.dialog);
  usePlayTime();
  const spawn = START[(params.spawn as string) ?? 'casa'] ?? START.casa;

  useMemo(() => {
    resetWorld();
    player.hidden = false;
    player.frozen = false;
  }, []);

  useEffect(() => {
    playMusic(tod === 'noche' ? 'night' : 'city');
    playAmbience('city');
    if (params.mission === 'llegar') {
      useMission.getState().start(lvl);
      setTimeout(() => {
        sfx('phone');
        const c = CHARACTERS.coach;
        useUI.getState().openDialog({
          speaker: c.name,
          role: 'Entrenador · Llamada',
          pitch: c.pitch,
          lines: [
            { speaker: c.name, t: { es: 'Razmik, tienes que llegar al estadio antes de que empiece el entrenamiento.', hy: 'Ռազմիկ, պետք է հասնես մարզադաշտ, մինչև մարզումը սկսվի։' } },
            { speaker: c.name, t: { es: 'Pregunta a tu vecina Carmen. Ella sabe el mejor camino. ¡Date prisa, pero cruza siempre con cuidado!', hy: 'Հարցրու հարևանուհուդ՝ Կարմենին։ Նա գիտի ամենալավ ճանապարհը։ Շտապիր, բայց միշտ զգուշությամբ անցիր։' } },
          ],
        });
      }, 900);
    } else useMission.getState().stop();
    return () => {
      useMission.getState().stop();
      playAmbience(null);
    };
  }, []);

  const onEnter = useCallback((id: string) => enterPlace(id), []);

  return (
    <div className="scene">
      <GameCanvas>
        <Lights tod={tod} />
        <City tod={tod} />
        <Traffic />
        <Pedestrians />
        <PlaceNPCs />
        <PlaceDoors onEnter={onEnter} />
        <Kiosks />
        <CityDirector />
        <NavBeacon />
        <Player start={[spawn[0], spawn[1], spawn[2]]} startYaw={spawn[3]} />
      </GameCanvas>
      <TopLeft>
        <CityMinimap />
      </TopLeft>
      <StatsBar />
      {m.active && !m.finished ? <MissionHUD /> : <FreeHUD />}
      <RidingHUD />
      <InteractPrompt />
      <DialogPanel />
      <TouchControls />
      {m.finished && !dialog && <MissionResult />}
    </div>
  );
}

function enterPlace(id: string) {
  const ui = useUI.getState();
  const lvl = levelFromXp(useProgress.getState().xp);
  const pl = PLACES.find((p) => p.id === id);
  if (pl?.minLevel && lvl < pl.minLevel) {
    ui.toast({ es: `Necesitas el nivel ${pl.minLevel} para entrar. ¡Sigue jugando!`, hy: `Մուտք գործելու համար պետք է ${pl.minLevel}-րդ մակարդակ։ Շարունակիր խաղալ։` }, 'bad');
    sfx('wrong');
    return;
  }
  const opt = (es: string, hy: string, fn: () => void) => ({ t: { es, hy }, onPick: fn });
  const ask = (speaker: string, q: T, options: ReturnType<typeof opt>[]) =>
    ui.openDialog({ speaker, lines: [{ speaker, t: q }], options: [...options, opt('Ahora no, gracias.', 'Հիմա ոչ, շնորհակալություն։', () => {})] });
  switch (id) {
    case 'casa':
      ask('Mamá', { es: 'Hola, cariño. ¿Qué quieres hacer?', hy: 'Բարև, սիրելիս։ Ի՞նչ ես ուզում անել։' }, [
        opt('Quiero jugar por la mañana.', 'Ուզում եմ առավոտյան խաղալ։', () => { useProgress.getState().setSettings({ timeOfDay: 'dia' }); ui.go('city', { spawn: 'casa', k: Date.now() }); }),
        opt('Quiero jugar por la tarde.', 'Ուզում եմ կեսօրից հետո խաղալ։', () => { useProgress.getState().setSettings({ timeOfDay: 'tarde' }); ui.go('city', { spawn: 'casa', k: Date.now() }); }),
        opt('Quiero jugar por la noche.', 'Ուզում եմ գիշերը խաղալ։', () => { useProgress.getState().setSettings({ timeOfDay: 'noche' }); ui.go('city', { spawn: 'casa', k: Date.now() }); }),
        opt('Quiero ver mi perfil.', 'Ուզում եմ տեսնել իմ էջը։', () => ui.go('perfil')),
      ]);
      break;
    case 'super': ui.go('interior', { id: 'super' }); break;
    case 'restaurante': ui.go('interior', { id: 'restaurante' }); break;
    case 'tienda': ui.go('interior', { id: 'tienda' }); break;
    case 'aeropuerto': ui.go('interior', { id: 'aeropuerto' }); break;
    case 'escuela':
      ask('Martín', { es: 'Bienvenido a la escuela. ¿A qué clase vas?', hy: 'Բարի գալուստ դպրոց։ Ո՞ր դասին ես գնում։' }, [
        opt('A la clase de conversación.', 'Խոսակցական դասին։', () => ui.go('habla')),
        opt('A la Batalla de conocimientos.', 'Գիտելիքների ճակատամարտին։', () => ui.go('batalla')),
        opt('A Memory Champions.', 'Memory Champions-ին։', () => ui.go('memory')),
      ]);
      break;
    case 'estadio':
      ask('Óscar', { es: '¡Bienvenido al estadio! ¿Qué quieres hacer?', hy: 'Բարի գալուստ մարզադաշտ։ Ի՞նչ ես ուզում անել։' }, [
        opt('Quiero entrenar: Desafío del entrenador.', 'Ուզում եմ մարզվել՝ Մարզչի մարտահրավեր։', () => ui.go('training', { place: 'estadio' })),
        opt('¡Algo pasa en el vestuario! (Detective Razmik)', 'Հանդերձարանում ինչ-որ բան է կատարվում։ (Դետեկտիվ Ռազմիկ)', () => ui.go('detective')),
      ]);
      break;
    case 'entreno':
      ui.go('training', { place: 'entreno' });
      break;
  }
}

function Kiosks() {
  useEffect(() => {
    const offs: (() => void)[] = [];
    const go = useUI.getState().go;
    const names: Record<string, T> = {
      ruleta: { es: 'Jugar a La ruleta de las palabras', hy: 'Խաղալ «Բառերի ռուլետկա»' },
      batalla: { es: 'Jugar a Batalla de conocimientos', hy: 'Խաղալ «Գիտելիքների ճակատամարտ»' },
      memory: { es: 'Jugar a Memory Champions', hy: 'Խաղալ «Memory Champions»' },
      trabalenguas: { es: 'Reto de trabalenguas', hy: 'Շուտասելուկների մարտահրավեր' },
      habla: { es: 'Habla como un campeón', hy: 'Խոսիր չեմպիոնի պես' },
    };
    KIOSKS.forEach((k) => {
      offs.push(addInteractable({ id: 'kiosk-' + k.id, pos: new THREE.Vector3(BLOCK_C[1] + k.x + Math.sin(k.rot) * 2.6, 0.15, -37.5 + k.z + Math.cos(k.rot) * 2.6), radius: 3.4, label: names[k.id], onInteract: () => go(k.id as never) }));
    });
    PORTALS.forEach((p) => {
      offs.push(
        addInteractable({
          id: 'portal-' + p.id,
          pos: new THREE.Vector3(BLOCK_C[1] + p.x, 0.15, 112 + p.z),
          radius: 4,
          label: p.id === 'maze' ? { es: 'Entrar en El laberinto secreto', hy: 'Մտնել Գաղտնի լաբիրինթոս' } : { es: 'Viajar a la isla: Supervivencia lingüística', hy: 'Ճանապարհորդել կղզի՝ Լեզվական գոյատևում' },
          onInteract: () => {
            if (levelFromXp(useProgress.getState().xp) < 2) {
              useUI.getState().toast({ es: 'La Zona Secreta se abre en el nivel 2.', hy: 'Գաղտնի գոտին բացվում է 2-րդ մակարդակում։' }, 'bad');
              return;
            }
            sfx('unlock');
            go(p.id as never);
          },
        }),
      );
    });
    offs.push(addInteractable({ id: 'race-arch', pos: new THREE.Vector3(BLOCK_C[2] + 14, 0.15, 37.5 + 10), radius: 4, label: { es: 'Empezar La gran carrera', hy: 'Սկսել Մեծ մրցավազքը' }, onInteract: () => go('race') }));
    offs.push(addInteractable({ id: 'bus-team', pos: new THREE.Vector3(-37.5, 0.15, -66.4), radius: 3, label: { es: 'Subir al autobús del equipo', hy: 'Նստել թիմի ավտոբուսը' }, enabled: () => !useMission.getState().active, onInteract: () => go('interior', { id: 'bus' }) }));
    return () => offs.forEach((f) => f());
  }, []);
  return null;
}

function PlaceNPCs() {
  const m = useMission();
  const coach = CHARACTERS.coach;
  const leo = CHARACTERS.leo;
  const talkCoach = useCallback(() => enterPlace('entreno'), []);
  const talkLeo = useCallback(() => {
    useUI.getState().openDialog({
      speaker: leo.name, role: leo.role, pitch: leo.pitch, focus: [BLOCK_C[1] + 6, 0.15, -55],
      lines: [{ speaker: leo.name, t: { es: '¡Razmik! Aquí en la plaza hay un montón de retos. ¿A cuál jugamos?', hy: 'Ռազմիկ։ Այստեղ՝ հրապարակում, մի բուռ մարտահրավերներ կան։ Որի՞ն խաղանք։' } }],
      options: [
        { t: { es: 'A la ruleta de las palabras.', hy: 'Բառերի ռուլետկային։' }, onPick: () => useUI.getState().go('ruleta') },
        { t: { es: 'A la batalla de conocimientos.', hy: 'Գիտելիքների ճակատամարտին։' }, onPick: () => useUI.getState().go('batalla') },
        { t: { es: 'A los trabalenguas.', hy: 'Շուտասելուկներին։' }, onPick: () => useUI.getState().go('trabalenguas') },
        { t: { es: 'Ahora no, voy a pasear.', hy: 'Հիմա ոչ, զբոսնելու եմ։' } },
      ],
    });
  }, []);
  return (
    <>
      {!m.active && <StaticNPC id="coach-city" name={coach.name} role={coach.role} look={coach.look} pos={[-8.5, 0.15, 42]} yaw={Math.PI / 2} pitch={coach.pitch} onTalk={talkCoach} />}
      <StaticNPC id="leo-plaza" name={leo.name} role={leo.role} look={leo.look} pos={[BLOCK_C[1] + 6, 0.15, -55]} yaw={Math.PI} pitch={leo.pitch} onTalk={talkLeo} wave />
    </>
  );
}

function NavBeacon() {
  const ref = useMemo(() => ({ current: null as THREE.Group | null }), []);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const t = navTarget();
    const show = !!t && (useProgress.getState().settings.showNavigator || useMission.getState().showNav > performance.now());
    g.visible = show;
    if (t) {
      g.position.set(t[0], 0, t[1]);
      g.rotation.y += 0.03;
    }
  });
  return (
    <group ref={(el) => (ref.current = el)}>
      <mesh position={[0, 20, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 40, 16, 1, true]} />
        <meshBasicMaterial color="#ffb03a" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 3, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.8, 1.6, 4]} />
        <meshBasicMaterial color="#ff7a1a" />
      </mesh>
    </group>
  );
}

function navTarget(): [number, number] | null {
  const m = useMission.getState();
  if (!m.active) return null;
  const s = m.steps[m.index];
  if (!s) return null;
  if (s.target) return [s.target.x, s.target.z];
  if (s.npc) return [s.npc.pos[0], s.npc.pos[2]];
  if (s.bus) return [-37.5, -66.4];
  return null;
}

function CityMinimap() {
  const draw = useCallback((g: CanvasRenderingContext2D, toMap: (x: number, z: number) => [number, number], scale: number) => {
    g.fillStyle = '#5d8a4a';
    g.fillRect(0, 0, 512, 512);
    // roads
    g.fillStyle = '#3d4250';
    const [a0] = toMap(-CITY - 25, 0);
    const [a1] = toMap(CITY + 25, 0);
    ROADS.forEach((r) => {
      const [, rz] = toMap(0, r);
      g.fillRect(a0, rz - ROAD_HALF * scale, a1 - a0, ROAD_HALF * 2 * scale);
      const [rx] = toMap(r, 0);
      g.fillRect(rx - ROAD_HALF * scale, a0, ROAD_HALF * 2 * scale, a1 - a0);
    });
    // blocks
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const [x, z] = toMap(BLOCK_C[i] - BLOCK_S[i] / 2, BLOCK_C[j] - BLOCK_S[j] / 2);
        g.fillStyle = '#c9b8a8';
        g.fillRect(x, z, BLOCK_S[i] * scale, BLOCK_S[j] * scale);
        g.fillStyle = '#9aa0ab';
        g.fillRect(x + SIDEWALK * scale, z + SIDEWALK * scale, (BLOCK_S[i] - SIDEWALK * 2) * scale, (BLOCK_S[j] - SIDEWALK * 2) * scale);
      }
    PLACES.forEach((p) => {
      const [x, z] = toMap(BLOCK_C[p.block[0]] - BLOCK_S[p.block[0]] / 2 + SIDEWALK, BLOCK_C[p.block[1]] - BLOCK_S[p.block[1]] / 2 + SIDEWALK);
      g.fillStyle = p.color;
      g.globalAlpha = 0.85;
      g.fillRect(x, z, (BLOCK_S[p.block[0]] - SIDEWALK * 2) * scale, (BLOCK_S[p.block[1]] - SIDEWALK * 2) * scale);
      g.globalAlpha = 1;
      const [cx, cz] = toMap(BLOCK_C[p.block[0]], BLOCK_C[p.block[1]]);
      g.fillStyle = '#111';
      g.font = 'bold 13px Rajdhani, Arial';
      g.textAlign = 'center';
      g.fillText(p.short, cx, cz + 4);
    });
    // bus stops
    [[-37.5, -66.4], [37.5, -66.4], [66.4, 37.5], [-8.8, -37.5]].forEach(([x, z]) => {
      const [mx, mz] = toMap(x, z);
      g.fillStyle = '#ffb03a';
      g.fillRect(mx - 3, mz - 3, 6, 6);
    });
    // zebra crossings
    g.fillStyle = '#ffffff';
  }, []);
  const markers = useCallback((): MapMarker[] => {
    const out: MapMarker[] = [];
    const t = navTarget();
    if (t && (useProgress.getState().settings.showNavigator || useMission.getState().showNav > performance.now())) out.push({ x: t[0], z: t[1], color: '#ff7a1a', size: 7, pulse: true });
    const r = useMission.getState().riding;
    if (r) {
      const L = BUS_LINES.find((l) => l.line === r.line)!;
      L.stops.forEach((s) => {
        const p = pointAt(L.path, s.s);
        out.push({ x: p.x, z: p.z, color: '#2e6fd8', size: 4 });
      });
    }
    return out;
  }, []);
  return <Minimap extent={CITY + 30} draw={draw} markers={markers} />;
}

function useNow(ms = 500) {
  const [now, setNow] = useState(performance.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(performance.now()), ms);
    return () => clearInterval(iv);
  }, [ms]);
  return now;
}

function MissionHUD() {
  const m = useMission();
  const now = useNow();
  const step = m.steps[m.index];
  const left = (m.deadline - now) / 1000;
  return (
    <MissionPanel title={{ es: 'Misión: Llegar al estadio', hy: 'Առաքելություն՝ Հասնել մարզադաշտ' }} objective={step?.objective} timer={left}>
      <div className="mp-row">
        <span className="pill small"><Icon name="check" size={14} /> {m.safeCrossings}</span>
        <span className={'pill small ' + (m.violations ? 'bad' : '')}>⚠ {m.violations}</span>
        <button
          className="btn tiny ghost"
          onClick={() => {
            m.set({ showNav: performance.now() + 20000, helps: m.helps + 1 });
            const s = m.steps[m.index];
            if (s?.target) speak(`Busca: ${s.target.name.es}`);
          }}
        >
          <Icon name="map" size={14} /> Navegador
        </button>
      </div>
      <div className="mp-hint">
        <Es t={{ es: 'Pregunta a la gente por la calle si te pierdes.', hy: 'Եթե մոլորվես, հարցրու փողոցում մարդկանց։' }} />
      </div>
    </MissionPanel>
  );
}

function FreeHUD() {
  const daily = useProgress((s) => s.daily);
  return (
    <MissionPanel
      title={{ es: 'Aventura libre · Ciudad de Campeones', hy: 'Ազատ արկած · Չեմպիոնների քաղաք' }}
      objective={{ es: 'Explora la ciudad, habla con la gente y entra en los edificios.', hy: 'Ուսումնասիրիր քաղաքը, խոսիր մարդկանց հետ և մտիր շենքեր։' }}
      lines={daily.tasks.map((t) => ({ t: { es: `${t.es} (${t.progress}/${t.goal})`, hy: t.hy }, done: t.done }))}
    >
      <button className="btn tiny primary" onClick={() => useUI.getState().go('city', { mission: 'llegar', k: Date.now() })}>
        <Icon name="bolt" size={14} /> Misión: Llegar al estadio
      </button>
    </MissionPanel>
  );
}

function RidingHUD() {
  const r = useMission((s) => s.riding);
  useEffect(() => {
    if (!r?.waiting) return;
    const k = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') getOffRef.current();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [r?.waiting]);
  if (!r) return null;
  const L = BUS_LINES.find((l) => l.line === r.line)!;
  const cur = L.stops[r.stopIdx];
  const next = L.stops[r.stopIdx + 1];
  return (
    <div className="riding">
      <div className="bus-line" style={{ background: L.color }}>{L.line}</div>
      <div>
        {r.waiting ? (
          <>
            <div className="small-cap">Parada actual</div>
            <Es t={cur.name} className="big" />
          </>
        ) : (
          <>
            <div className="small-cap">Próxima parada</div>
            {next ? <Es t={next.name} className="big" /> : <span className="big">—</span>}
          </>
        )}
      </div>
      {r.waiting ? (
        <button className="btn primary" onClick={() => getOffRef.current()}>
          Bajar aquí <span className="key">E</span>
        </button>
      ) : null}
    </div>
  );
}

function MissionResult() {
  const f = useMission((s) => s.finished)!;
  const go = useUI((s) => s.go);
  return (
    <div className="modal-back">
      <div className="modal result">
        <div className="result-title">{f.late ? 'Llegada con retraso' : '¡Misión cumplida!'}</div>
        <Es t={f.late ? { es: 'Has llegado, pero tarde. ¡La próxima vez saldrás antes!', hy: 'Հասար, բայց ուշացումով։ Հաջորդ անգամ ավելի շուտ դուրս կգաս։' } : { es: 'Has llegado al estadio a tiempo.', hy: 'Ժամանակին հասար մարզադաշտ։' }} />
        <div className="result-grid">
          <div><b>{fmt(f.time)}</b><span>Tiempo</span></div>
          <div><b>{f.violations}</b><span>Peligros</span></div>
          <div><b>{f.errors}</b><span>Errores de ruta</span></div>
          <div><b>+{f.xp}</b><span>XP</span></div>
          <div><b>+{f.coins}</b><span>Monedas</span></div>
        </div>
        {f.violations > 0 && <div className="note"><Es t={{ es: 'Sin bonus de velocidad: cruzar sin cuidado nunca da puntos.', hy: 'Արագության բոնուս չկա․ անզգույշ անցնելը երբեք միավոր չի տալիս։' }} /></div>}
        <div className="row">
          <button className="btn primary" onClick={() => { useMission.getState().stop(); go('training', { place: 'estadio' }); }}>Empezar el entrenamiento</button>
          <button className="btn" onClick={() => go('city', { mission: 'llegar', k: Date.now() })}>Otra ruta</button>
          <button className="btn ghost" onClick={() => { useMission.getState().set({ active: false, finished: null }); }}>Seguir explorando</button>
        </div>
      </div>
    </div>
  );
}

export { placeById };
