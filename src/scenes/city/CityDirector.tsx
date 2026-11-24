import { useEffect, useMemo, useReducer, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMission, type Step } from './mission';
import { player, addInteractable, teleportPlayer } from '../../three/world';
import { roadZone, pedestrianGreen, BUS_LINES, pointAt, stopSidewalk, placeById } from '../../world/layout';
import { clock, obstacles } from '../../world/Traffic';
import { useProgress, useUI } from '../../core/store';
import { sfx, speak } from '../../core/audio';
import { npcRegistry, StaticNPC } from '../../world/NPCs';
import { ENCOUNTERS, COACH_CALLS } from '../../data/encounters';
import { levelIndex, type T } from '../../core/types';
import { pick, shuffle } from '../../core/random';
import { BusModel } from '../../three/Props';
import { CHARACTERS } from '../../data/characters';
import { input } from '../../three/input';

const say = (speaker: string, t: T, extra: { role?: string; focus?: [number, number, number]; pitch?: number; onClose?: () => void } = {}) =>
  useUI.getState().openDialog({ speaker, role: extra.role, lines: [{ speaker, t }], focus: extra.focus, pitch: extra.pitch, onClose: () => extra.onClose?.() });

/** Road safety, ambient encounters, phone calls and mission step logic */
export function CityDirector() {
  const lastZone = useRef<'none' | 'road'>('none');
  const crossingBad = useRef(false);
  const lastViolation = useRef(0);
  const nextEncounter = useRef(performance.now() + 25000);
  const nextCall = useRef(performance.now() + 70000);
  const wrongCooldown = useRef<Record<string, number>>({});
  const used = useRef(new Set<number>());

  // walkers can be asked for directions / talked to
  useEffect(() => {
    const offs: (() => void)[] = [];
    // register an interactable that resolves the nearest walker dynamically
    const near = () => {
      let best: ReturnType<typeof npcRegistry.get> = undefined;
      let bd = 3.2;
      npcRegistry.forEach((n) => {
        if (!n.id.startsWith('walker-')) return;
        const d = n.pos.distanceTo(player.pos);
        if (d < bd) {
          bd = d;
          best = n;
        }
      });
      return best as ReturnType<typeof npcRegistry.get>;
    };
    offs.push(
      addInteractable({
        id: 'walker-talk',
        pos: () => near()?.pos ?? new THREE.Vector3(9999, 0, 9999),
        radius: 3.2,
        label: { es: 'Hablar con la persona', hy: 'Խոսել մարդու հետ' },
        onInteract: () => {
          const n = near();
          if (n) talkToWalker(n.id);
        },
      }),
    );
    return () => offs.forEach((f) => f());
  }, []);

  const talkToWalker = (id: string) => {
    const n = npcRegistry.get(id);
    if (!n || useUI.getState().dialog) return;
    n.talking = true;
    n.lastTalk = performance.now();
    const m = useMission.getState();
    const focus: [number, number, number] = [n.pos.x, n.pos.y, n.pos.z];
    if (m.active) {
      const step = m.steps[m.index];
      const target = step?.target?.name ?? (step?.npc ? { es: step.npc.ch.name, hy: step.npc.ch.name } : null);
      const hint = hintFor(step);
      if (target && hint) {
        useUI.getState().openDialog({
          speaker: n.name,
          lines: [
            { speaker: 'Razmik', t: { es: `Perdona, ¿sabes dónde está ${step.kind === 'talk' ? step.npc!.ch.name : 'el sitio: ' + target.es}?`, hy: `Ներողություն, գիտե՞ս որտեղ է ${target.hy}-ը։` } },
            { speaker: n.name, t: hint },
          ],
          pitch: n.pitch,
          focus,
          onClose: () => {
            n.talking = false;
            useMission.getState().set({ helps: useMission.getState().helps + 1 });
          },
        });
        return;
      }
    }
    startEncounter(n.id);
  };

  const startEncounter = (id: string) => {
    const n = npcRegistry.get(id);
    if (!n) return;
    const lvl = useProgress.getState().level;
    const pool = ENCOUNTERS.filter((e) => levelIndex(e.lvl) <= levelIndex(lvl));
    const fresh = pool.filter((_, i) => !used.current.has(i));
    const e = fresh.length ? pick(fresh) : pick(pool);
    used.current.add(pool.indexOf(e));
    n.talking = true;
    n.lastTalk = performance.now();
    useUI.getState().openDialog({
      speaker: n.name,
      lines: e.lines.map((t) => ({ speaker: n.name, t })),
      options: e.options?.map((o) => ({ ...o })),
      free: lvl === 'B1' || (lvl === 'A2' && Math.random() < 0.4) ? e.free : undefined,
      cat: e.cat,
      listening: true,
      pitch: n.pitch,
      focus: [n.pos.x, n.pos.y, n.pos.z],
      onClose: () => {
        n.talking = false;
      },
    });
  };

  useFrame(() => {
    const now = performance.now();
    const ui = useUI.getState();
    const m = useMission.getState();
    if (ui.paused || player.hidden) return;

    // ---------------- road safety
    const z = roadZone(player.pos.x, player.pos.z);
    if (z.kind !== 'none' && lastZone.current === 'none') {
      let bad: T | null = null;
      if (z.kind === 'intersection') bad = { es: '¡Cuidado! No cruces por el medio del cruce. Usa el paso de peatones.', hy: 'Զգույշ։ Մի՛ անցիր խաչմերուկի մեջտեղով։ Օգտվիր հետիոտնային անցումից։' };
      else if (!z.crosswalk) bad = { es: '¡Cuidado! Cruza la calle por el paso de peatones.', hy: 'Զգույշ։ Փողոցն անցիր հետիոտնային անցումով։' };
      else if (!pedestrianGreen(z.axis, clock.t)) bad = { es: '¡No cruces todavía! El semáforo está en rojo. Espera un momento.', hy: 'Դեռ մի՛ անցիր։ Լուսացույցը կարմիր է։ Մի պահ սպասիր։' };
      crossingBad.current = !!bad;
      if (bad && now - lastViolation.current > 4000) {
        lastViolation.current = now;
        sfx('wrong');
        speak(bad.es);
        ui.toast(bad, 'bad');
        if (m.active) m.set({ violations: m.violations + 1 });
      }
      lastZone.current = 'road';
    } else if (z.kind === 'none' && lastZone.current === 'road') {
      lastZone.current = 'none';
      if (!crossingBad.current) {
        if (m.active) {
          m.set({ safeCrossings: m.safeCrossings + 1 });
          ui.toast({ es: '¡Cruce seguro! +3 monedas', hy: 'Անվտանգ անցում։ +3 մետաղադրամ' }, 'good');
          useProgress.getState().addCoins(3);
          sfx('coin');
        }
      }
    }

    // ---------------- mission steps
    if (m.active && !m.finished) {
      const step = m.steps[m.index];
      if (step?.kind === 'reach' && step.target) {
        const d = Math.hypot(player.pos.x - step.target.x, player.pos.z - step.target.z);
        if (d < step.target.r) {
          sfx('ok');
          ui.toast({ es: `¡Has llegado: ${step.target.name.es}!`, hy: `Հասար՝ ${step.target.name.hy}։` }, 'good');
          if (m.index >= m.steps.length - 1) finishMission();
          else m.next();
        }
        step.wrong?.forEach((w, i) => {
          const key = m.index + '-' + i;
          if (Math.hypot(player.pos.x - w.x, player.pos.z - w.z) < w.r && now - (wrongCooldown.current[key] ?? 0) > 20000 && !ui.dialog) {
            wrongCooldown.current[key] = now;
            m.set({ errors: m.errors + 1 });
            sfx('phone');
            say(w.speaker, w.msg, { pitch: 1.1 });
          }
        });
      }
    }

    // ---------------- ambient encounters
    if (!ui.dialog && now > nextEncounter.current && player.speed < 6) {
      let best: string | null = null;
      let bd = 5;
      npcRegistry.forEach((n) => {
        if (!n.id.startsWith('walker-') || now - n.lastTalk < 120000) return;
        const d = n.pos.distanceTo(player.pos);
        if (d < bd) {
          bd = d;
          best = n.id;
        }
      });
      if (best) {
        nextEncounter.current = now + (m.active ? 60000 : 35000) + Math.random() * 20000;
        startEncounter(best);
      }
    }
    // ---------------- coach phone calls
    if (!ui.dialog && !m.active && now > nextCall.current) {
      nextCall.current = now + 150000 + Math.random() * 60000;
      sfx('phone');
      ui.toast({ es: 'Llamada del entrenador', hy: 'Զանգ մարզչից' }, 'info');
      setTimeout(() => say('Óscar', pick(COACH_CALLS), { role: 'Entrenador · Teléfono', pitch: 0.8 }), 1200);
    }
  });

  return (
    <>
      <MissionNPC />
      <MissionBus />
    </>
  );
}

function hintFor(step?: Step): T | null {
  if (!step) return null;
  if (step.kind === 'talk' && step.npc) return { es: `${step.npc.ch.name} está muy cerca. Busca la persona con la estrella naranja encima.`, hy: `${step.npc.ch.name}-ը շատ մոտ է։ Փնտրիր մարդուն, որի գլխավերևում նարնջագույն աստղ կա։` };
  const id = step.target?.name.es ?? '';
  if (id.startsWith('Estadio')) return { es: 'El estadio está enfrente del Parque Central, al otro lado de la calle.', hy: 'Մարզադաշտը Կենտրոնական այգու դիմաց է՝ փողոցի մյուս կողմում։' };
  if (id.startsWith('Escuela')) return { es: 'La escuela está en esta calle, cerca de la casa grande amarilla.', hy: 'Դպրոցը այս փողոցում է՝ մեծ դեղին շենքի մոտ։' };
  if (id.startsWith('Tienda')) return { es: 'La tienda deportiva está enfrente del supermercado. Tiene un cartel azul.', hy: 'Սպորտային խանութը սուպերմարկետի դիմաց է։ Կապույտ ցուցանակ ունի։' };
  if (id.startsWith('Parada')) return { es: 'La parada está enfrente de la escuela, al lado de la plaza.', hy: 'Կանգառը դպրոցի դիմաց է՝ հրապարակի կողքին։' };
  return { es: 'Mira el mapa: está muy cerca.', hy: 'Նայիր քարտեզին․ շատ մոտ է։' };
}

export function finishMission() {
  const m = useMission.getState();
  const p = useProgress.getState();
  const now = performance.now();
  const time = (now - m.startedAt) / 1000;
  const late = now > m.deadline;
  const safe = m.violations === 0;
  const xp = Math.max(60, 120 + (late ? 0 : 40) + (safe ? 40 : 0) - m.errors * 5);
  const coins = 40 + (safe && !late ? 30 : 0);
  p.completeMission('llegar-estadio', xp, coins, safe && !late && m.errors === 0);
  if (safe) p.setRecord('llegar-estadio-tiempo', Math.round(time), true);
  if (safe && !late) p.addMedal('Llegada perfecta');
  m.set({ finished: { time, late, xp, coins, violations: m.violations, errors: m.errors } });
  sfx('win');
  const coach = CHARACTERS.coach;
  const focus: [number, number, number] = [player.pos.x + 2, 0.15, player.pos.z];
  if (late) {
    useUI.getState().openDialog({
      speaker: coach.name,
      role: coach.role,
      pitch: coach.pitch,
      lines: [{ speaker: coach.name, t: { es: '¡Razmik! ¿Por qué llegas tarde?', hy: 'Ռազմիկ։ Ինչո՞ւ ես ուշանում։' } }],
      options: [
        { t: { es: 'Perdón, me he perdido por el camino.', hy: 'Ներողություն, ճանապարհին մոլորվեցի։' }, ok: true, reply: { es: 'Vale. La próxima vez pregunta antes. ¡A entrenar!', hy: 'Լավ։ Հաջորդ անգամ նախապես հարցրու։ Գնացինք մարզվելու։' } },
        { t: { es: 'Lo siento, el autobús ha tardado mucho.', hy: 'Ներողություն, ավտոբուսը շատ ուշացավ։' }, ok: true, reply: { es: 'Entiendo. Lo importante es que estás aquí y has venido con cuidado.', hy: 'Հասկանում եմ։ Կարևորն այն է, որ այստեղ ես և զգուշությամբ ես եկել։' } },
        { t: { es: 'Porque mañana es sábado.', hy: 'Որովհետև վաղը շաբաթ է։' }, ok: false },
      ],
      focus,
    });
  } else {
    say(coach.name, safe
      ? { es: '¡Muy bien, Razmik! Has llegado a tiempo y has cruzado siempre con cuidado. ¡Así se hace!', hy: 'Շատ լավ, Ռազմիկ։ Ժամանակին ես հասել և միշտ զգուշությամբ ես անցել։ Այդպես էլ պետք է։' }
      : { es: 'Has llegado a tiempo, pero recuerda: la seguridad es más importante que la velocidad.', hy: 'Ժամանակին ես հասել, բայց հիշիր՝ անվտանգությունն ավելի կարևոր է, քան արագությունը։' }, { role: coach.role, pitch: coach.pitch });
  }
}

function MissionNPC() {
  const m = useMission();
  const step = m.active ? m.steps[m.index] : undefined;
  const onTalk = useMemo(
    () => () => {
      if (!step?.npc) return;
      const ch = step.npc.ch;
      const focus: [number, number, number] = step.npc.pos;
      useUI.getState().openDialog({
        speaker: ch.name,
        role: ch.role,
        pitch: ch.pitch,
        lines: [...(step.lines ?? []), ...(step.check ? [step.check.q] : [])].map((t) => ({ speaker: ch.name, t })),
        options: step.check?.options,
        cat: 'instrucciones',
        listening: true,
        focus,
        onClose: (r) => {
          if (r.ok !== false) {
            useMission.getState().next();
            const ns = useMission.getState().steps[useMission.getState().index];
            if (ns) useUI.getState().toast(ns.objective, 'info');
          }
        },
      });
    },
    [step],
  );
  if (!step || step.kind !== 'talk' || !step.npc) return null;
  return <StaticNPC key={step.npc.ch.id + m.index} id={'mission-' + step.npc.ch.id} name={step.npc.ch.name} role={step.npc.ch.role} look={step.npc.ch.look} pos={step.npc.pos} yaw={step.npc.yaw} pitch={step.npc.ch.pitch} onTalk={onTalk} wave />;
}

// ------------------------------------------------------------- mission bus
interface BusSim { line: string; s: number; v: number; phase: 'arrive' | 'dwell' | 'leave' | 'ride'; dwell: number; stopIdx: number; boarded: boolean; gone: boolean }

function MissionBus() {
  const m = useMission();
  const step = m.active ? m.steps[m.index] : undefined;
  const active = step?.kind === 'bus';
  const order = useRef<string[]>([]);
  const sim = useRef<BusSim | null>(null);
  const group = useRef<THREE.Group>(null);
  const ob = useRef({ x: 0, z: 0, active: false });
  const [, force] = useForce();

  useEffect(() => {
    obstacles.push(ob.current);
    return () => {
      const i = obstacles.indexOf(ob.current);
      if (i >= 0) obstacles.splice(i, 1);
      player.hidden = false;
      player.frozen = false;
    };
  }, []);

  useEffect(() => {
    if (active && step?.bus) {
      order.current = shuffle(['3', '12', '7']);
      if (order.current[0] === '7' && Math.random() < 0.7) order.current.push(order.current.shift()!);
      spawnNext();
    } else if (!sim.current?.gone) {
      sim.current = null;
      force();
    }
  }, [active]);

  const lineObj = () => BUS_LINES.find((l) => l.line === sim.current?.line)!;
  const boardStop = () => lineObj().stops.find((s) => s.id === 'escuela')!;

  const spawnNext = () => {
    const line = order.current.shift() ?? '7';
    order.current.push(line);
    const L = BUS_LINES.find((l) => l.line === line)!;
    const st = L.stops.find((s) => s.id === 'escuela')!;
    sim.current = { line, s: st.s - 90, v: 10, phase: 'arrive', dwell: 0, stopIdx: L.stops.indexOf(st), boarded: false, gone: false };
    force();
  };

  // boarding interactable
  useEffect(() => {
    if (!active) return;
    const off = addInteractable({
      id: 'mission-bus-door',
      pos: () => {
        if (!sim.current) return new THREE.Vector3(9999, 0, 9999);
        const L = lineObj();
        const p = pointAt(L.path, sim.current.s + 3.5);
        const side = stopSidewalk(L, L.stops[sim.current.stopIdx]);
        const dx = side[0] - p.x, dz = side[1] - p.z;
        const len = Math.hypot(dx, dz) || 1;
        return new THREE.Vector3(p.x + (dx / len) * 2.2, 0.15, p.z + (dz / len) * 2.2);
      },
      radius: 4,
      label: { es: 'Subir al autobús', hy: 'Նստել ավտոբուս' },
      enabled: () => !!sim.current && sim.current.phase === 'dwell' && !sim.current.boarded,
      onInteract: () => board(),
    });
    return () => {
      off();
    };
  }, [active]);

  const board = () => {
    const s = sim.current;
    if (!s) return;
    s.boarded = true;
    player.hidden = true;
    player.frozen = true;
    sfx('bus');
    const ch = CHARACTERS.conductor;
    const right = s.line === '7';
    useUI.getState().openDialog({
      speaker: ch.name,
      role: ch.role,
      pitch: ch.pitch,
      lines: [{ speaker: ch.name, t: { es: `Buenos días. Este es el autobús número ${s.line}. ¿Adónde vas?`, hy: `Բարի օր։ Սա ${s.line} համարի ավտոբուսն է։ Ու՞ր ես գնում։` } }],
      options: [
        {
          t: { es: 'Voy al estadio, por favor.', hy: 'Գնում եմ մարզադաշտ, խնդրում եմ։' },
          reply: right
            ? { es: 'Muy bien. Siéntate y estate atento a las paradas.', hy: 'Շատ լավ։ Նստիր և ուշադիր եղիր կանգառներին։' }
            : { es: '¡Uy! Este autobús no va al estadio. Tienes que bajar en la próxima parada.', hy: 'Վա՜յ։ Այս ավտոբուսը մարզադաշտ չի գնում։ Պետք է իջնես հաջորդ կանգառում։' },
        },
      ],
      onClose: () => {
        if (!right) useMission.getState().set({ errors: useMission.getState().errors + 1 });
        s.phase = 'leave';
        s.dwell = 0;
        announce();
      },
    });
  };

  const announce = () => {
    const s = sim.current;
    if (!s) return;
    const L = lineObj();
    const nextStop = L.stops[s.stopIdx + 1];
    if (nextStop) {
      const t = { es: `Próxima parada: ${nextStop.name.es}.`, hy: `Հաջորդ կանգառը՝ ${nextStop.name.hy}։` };
      useUI.getState().toast(t, 'info');
      speak(t.es, { pitch: 0.8 });
    }
  };

  const getOff = (forced = false) => {
    const s = sim.current;
    if (!s) return;
    const L = lineObj();
    const stop = L.stops[s.stopIdx];
    const side = stopSidewalk(L, stop);
    player.hidden = false;
    player.frozen = false;
    const p = pointAt(L.path, stop.s);
    teleportPlayer(side[0], 0.15, side[1], Math.atan2(side[0] - p.x, side[1] - p.z));
    useMission.getState().set({ riding: null });
    s.boarded = false;
    s.gone = true;
    s.phase = 'leave';
    sfx('bus');
    const mm = useMission.getState();
    const ch = CHARACTERS.conductor;
    const reach: Step = { kind: 'reach', objective: { es: 'Llega al estadio (enfrente del Parque Central)', hy: 'Հասիր մարզադաշտ (Կենտրոնական այգու դիմաց)' }, target: { x: 86.5, z: 37.5, r: 7, name: { es: 'Estadio', hy: 'Մարզադաշտ' } } };
    if (s.line === '7' && stop.id === 'parque') {
      useUI.getState().toast({ es: '¡Parada correcta! Ahora cruza con cuidado.', hy: 'Ճիշտ կանգառ։ Հիմա զգուշությամբ անցիր փողոցը։' }, 'good');
      sfx('ok');
      mm.next();
      return;
    }
    mm.set({ errors: mm.errors + (forced && s.line === '7' ? 1 : s.line === '7' ? 1 : 0) });
    mm.insertSteps([reach]);
    mm.next();
    let msg: T;
    if (s.line !== '7') msg = { es: 'Desde aquí tienes que ir andando. Busca el Parque Central: el estadio está enfrente.', hy: 'Այստեղից պետք է ոտքով գնաս։ Գտիր Կենտրոնական այգին․ մարզադաշտը դիմացն է։' };
    else if (forced) msg = { es: 'Final de línea. ¡Te has pasado de parada! Vuelve andando hacia el Parque Central. El estadio está enfrente.', hy: 'Գծի վերջն է։ Կանգառդ անցել ես։ Ոտքով վերադարձիր դեպի Կենտրոնական այգի։ Մարզադաշտը դիմացն է։' };
    else msg = { es: 'Te has bajado antes de tiempo. No pasa nada: sigue por esta calle hasta el Parque Central. El estadio está enfrente.', hy: 'Շուտ իջար։ Ոչինչ․ շարունակիր այս փողոցով մինչև Կենտրոնական այգի։ Մարզադաշտը դիմացն է։' };
    setTimeout(() => say(ch.name, msg, { role: ch.role, pitch: ch.pitch }), 400);
  };

  useEffect(() => {
    getOffRef.current = () => getOff(false);
  });

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = sim.current;
    if (!s) {
      ob.current.active = false;
      return;
    }
    const L = lineObj();
    const stop = L.stops[s.stopIdx];
    const total = L.path.length;
    void total;
    if (s.phase === 'arrive') {
      const dist = stop.s - s.s;
      const target = Math.min(11, Math.max(1.5, dist * 0.5));
      s.v += (target - s.v) * Math.min(1, dt * 2);
      s.s += s.v * dt;
      if (dist < 0.3) {
        s.phase = 'dwell';
        s.dwell = s.boarded ? 5 : 11;
        sfx('bus');
        if (!s.boarded) {
          const t = { es: `Ha llegado el autobús número ${s.line}.`, hy: `Եկավ ${s.line} համարի ավտոբուսը։` };
          useUI.getState().toast(t, 'info');
          if (player.pos.distanceTo(new THREE.Vector3(stop.pos[0], 0, stop.pos[1])) < 30) speak(t.es);
        } else {
          useMission.getState().set({ riding: { line: s.line, s: s.s, stopIdx: s.stopIdx, waiting: 1, announced: 0 } });
          if (s.stopIdx === L.stops.length - 1) {
            getOff(true);
          }
        }
      }
    } else if (s.phase === 'dwell') {
      s.dwell -= dt;
      if (s.dwell <= 0 && !useUI.getState().dialog) {
        if (s.boarded) {
          // didn't get off — continue (wrong bus forces off at its first stop)
          if (s.line !== '7') {
            getOff(true);
            return;
          }
          useMission.getState().set({ riding: { line: s.line, s: s.s, stopIdx: s.stopIdx, waiting: 0, announced: 0 } });
          announce();
        }
        s.phase = 'leave';
      }
    } else if (s.phase === 'leave') {
      s.v = Math.min(11, s.v + dt * 3);
      s.s += s.v * dt;
      const nextStop = L.stops[s.stopIdx + 1];
      if (s.boarded && nextStop && nextStop.s - s.s < 40) {
        s.stopIdx++;
        s.phase = 'arrive';
      } else if (!s.boarded && (s.gone || s.s > stop.s + 70)) {
        if (s.s > stop.s + 70) {
          if (s.gone) {
            sim.current = null;
            ob.current.active = false;
            force();
            return;
          }
          spawnNext();
          return;
        }
      }
    }
    const p = pointAt(L.path, s.s);
    if (group.current) {
      group.current.position.set(p.x, 0, p.z);
      group.current.rotation.y = p.yaw;
    }
    ob.current.x = p.x;
    ob.current.z = p.z;
    ob.current.active = true;
    if (s.boarded) {
      player.pos.set(p.x, 1.2, p.z);
      player.yaw = p.yaw;
      let d = p.yaw + Math.PI - input.camYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      input.camYaw += d * dt * 2;
    }
  });

  if (!sim.current) return null;
  const L = BUS_LINES.find((l) => l.line === sim.current!.line)!;
  return (
    <group ref={group}>
      <BusModel line={L.line} color={L.color} />
    </group>
  );
}

export const getOffRef = { current: () => {} };

function useForce() {
  return useReducer((x: number) => x + 1, 0);
}

/** doors and kiosks of the city */
export function PlaceDoors({ onEnter }: { onEnter: (id: string) => void }) {
  useEffect(() => {
    const offs: (() => void)[] = [];
    const doors: { id: string; place: Parameters<typeof placeById>[0]; label: T }[] = [
      { id: 'casa', place: 'casa', label: { es: 'Entrar en casa', hy: 'Մտնել տուն' } },
      { id: 'super', place: 'super', label: { es: 'Entrar en el supermercado', hy: 'Մտնել սուպերմարկետ' } },
      { id: 'restaurante', place: 'restaurante', label: { es: 'Entrar en el restaurante', hy: 'Մտնել ռեստորան' } },
      { id: 'tienda', place: 'tienda', label: { es: 'Entrar en la tienda deportiva', hy: 'Մտնել սպորտային խանութ' } },
      { id: 'escuela', place: 'escuela', label: { es: 'Entrar en la escuela', hy: 'Մտնել դպրոց' } },
      { id: 'estadio', place: 'estadio', label: { es: 'Entrar en el estadio', hy: 'Մտնել մարզադաշտ' } },
      { id: 'entreno', place: 'entreno', label: { es: 'Entrar al centro de entrenamiento', hy: 'Մտնել մարզական կենտրոն' } },
      { id: 'aeropuerto', place: 'aeropuerto', label: { es: 'Entrar en el aeropuerto', hy: 'Մտնել օդանավակայան' } },
    ];
    doors.forEach((d) => {
      const pl = placeById(d.place);
      offs.push(addInteractable({ id: 'door-' + d.id, pos: new THREE.Vector3(pl.door[0], 0.15, pl.door[1]), radius: 3.2, label: d.label, onInteract: () => onEnter(d.id), enabled: () => !useMission.getState().active || d.id === 'casa' }));
    });
    return () => offs.forEach((f) => f());
  }, [onEnter]);
  return null;
}
