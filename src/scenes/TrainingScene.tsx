import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SceneShell } from '../ui/SceneShell';
import { Player } from '../three/Player';
import { addBox, player, resetWorld, teleportPlayer } from '../three/world';
import { BallBody, makeBall, R } from '../three/Ball';
import { Cone, Goal } from '../three/Props';
import { Humanoid, newAnim, type Look } from '../three/Humanoid';
import { pitchTex, textTex } from '../three/textures';
import { CHARACTERS } from '../data/characters';
import { useProgress, useUI } from '../core/store';
import type { Level, T } from '../core/types';
import { pick, shuffle } from '../core/random';
import { playMusic, playAmbience, sfx, speak, repeatLast } from '../core/audio';
import { MissionPanel, fmt } from '../ui/HUD';
import { Es, openTranslation } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { input } from '../three/input';

// ------------------------------------------------------------------ field layout
const W = 25, L = 36;
const CONES: { id: string; color: string; name: T; pos: [number, number] }[] = [
  { id: 'amarillo', color: '#ffd34d', name: { es: 'amarillo', hy: 'դեղին' }, pos: [-10, -6] },
  { id: 'azul', color: '#2e6fd8', name: { es: 'azul', hy: 'կապույտ' }, pos: [9, -6] },
  { id: 'rojo', color: '#e14b4b', name: { es: 'rojo', hy: 'կարմիր' }, pos: [-12, 10] },
  { id: 'verde', color: '#27ae60', name: { es: 'verde', hy: 'կանաչ' }, pos: [12, 10] },
  { id: 'blanco', color: '#f4f4f4', name: { es: 'blanco', hy: 'սպիտակ' }, pos: [0, 16] },
];
const TEAMMATE: [number, number] = [15, -14];
const DEFENDERS: [number, number][] = [[-3, -16], [3, -19], [-1, -22]];
const HURDLES: [number, number][] = [[-17, 0], [-17, -5], [-17, 5]];
const START: [number, number, number] = [0, 0, 6];

type CmdKind = 'cone' | 'coneAvoid' | 'pass' | 'jump' | 'shoot' | 'side' | 'dribble' | 'recover' | 'defend' | 'goals2' | 'carry' | 'jumps3';
interface Cmd { kind: CmdKind; text: T; cone?: string; avoid?: string; side?: 1 | -1; limit: number }

const T_ = (es: string, hy: string): T => ({ es, hy });
function makeCommand(kind: CmdKind, lvl: Level): Cmd {
  const c = pick(CONES);
  const other = pick(CONES.filter((x) => x.id !== c.id));
  switch (kind) {
    case 'cone':
      return { kind, cone: c.id, limit: 20, text: lvl === 'A1' ? T_(`Corre hasta el cono ${c.name.es}.`, `Վազիր մինչև ${c.name.hy} կոնը։`) : lvl === 'A2' ? T_(`Ve corriendo hasta el cono ${c.name.es}, rápido.`, `Արագ վազիր մինչև ${c.name.hy} կոնը։`) : T_(`Quiero que vayas al cono ${c.name.es} lo más rápido que puedas.`, `Ուզում եմ, որ հնարավորինս արագ հասնես ${c.name.hy} կոնին։`) };
    case 'coneAvoid':
      return { kind, cone: c.id, avoid: other.id, limit: 22, text: T_(`Corre hasta el cono ${c.name.es}, pero no toques el cono ${other.name.es}.`, `Վազիր մինչև ${c.name.hy} կոնը, բայց մի՛ դիպչիր ${other.name.hy} կոնին։`) };
    case 'pass':
      return { kind, limit: 25, text: lvl === 'B1' ? T_('Lleva el balón y, cuando estés cerca, pásaselo a Dani.', 'Տար գնդակը և, երբ մոտ լինես, փոխանցիր Դանիին։') : T_('Pasa el balón a tu compañero Dani.', 'Գնդակը փոխանցիր թիմակցիդ՝ Դանիին։') };
    case 'jump':
      return { kind, limit: 20, text: T_('Salta por encima del obstáculo.', 'Ցատկիր խոչընդոտի վրայով։') };
    case 'shoot':
      return { kind, limit: 25, text: lvl === 'A1' ? T_('Tira a portería.', 'Հարվածիր դարպասին։') : T_('Coge el balón y tira a portería.', 'Վերցրու գնդակը և հարվածիր դարպասին։') };
    case 'side': {
      const side = (Math.random() < 0.5 ? 1 : -1) as 1 | -1;
      return { kind, side, limit: 12, text: side > 0 ? T_('Corre hacia la derecha.', 'Վազիր դեպի աջ։') : T_('Corre hacia la izquierda.', 'Վազիր դեպի ձախ։') };
    }
    case 'dribble':
      return { kind, limit: 35, text: lvl === 'A1' ? T_('Regatea a tres jugadores.', 'Դրիբլինգով անցիր երեք խաղացողի։') : T_('Lleva el balón y regatea a los tres defensas. ¡No pierdas el balón!', 'Տար գնդակը և դրիբլինգով անցիր երեք պաշտպաններին։ Գնդակը մի՛ կորցրու։') };
    case 'recover':
      return { kind, limit: 25, text: T_('Recupera el balón. ¡Corre!', 'Վերադարձրու գնդակը։ Վազիր։') };
    case 'defend':
      return { kind, limit: 15, text: T_('¡Defiende tu portería! Para el balón antes de que entre.', 'Պաշտպանիր քո դարպասը։ Կանգնեցրու գնդակը, մինչև ներս մտնի։') };
    case 'goals2':
      return { kind, limit: 60, text: T_('Marca dos goles.', 'Խփիր երկու գոլ։') };
    case 'carry':
      return { kind, cone: c.id, limit: 30, text: T_(`Lleva el balón hasta el cono ${c.name.es}.`, `Գնդակը տար մինչև ${c.name.hy} կոնը։`) };
    case 'jumps3':
      return { kind, limit: 12, text: T_('Salta tres veces.', 'Երեք անգամ ցատկիր։') };
  }
}

function buildSession(lvl: Level, n: number): Cmd[] {
  const base: CmdKind[] = lvl === 'A1' ? ['cone', 'jump', 'shoot', 'side', 'pass', 'jumps3', 'cone', 'carry', 'goals2'] : lvl === 'A2' ? ['cone', 'coneAvoid', 'pass', 'jump', 'shoot', 'side', 'dribble', 'recover', 'carry', 'goals2', 'defend'] : ['coneAvoid', 'pass', 'dribble', 'recover', 'defend', 'goals2', 'carry', 'side', 'shoot', 'jumps3'];
  const out: CmdKind[] = shuffle(base).slice(0, n);
  return out.map((k) => makeCommand(k, lvl));
}

// ------------------------------------------------------------------ session state
interface Sess {
  cmds: Cmd[];
  i: number;
  started: number;
  cmdStart: number;
  ok: number;
  fail: number;
  points: number;
  goals: number;
  jumps: number;
  state: 'intro' | 'run' | 'feedback' | 'done';
  rival: number;
  mode: string;
}

export function TrainingScene() {
  const params = useUI((s) => s.params);
  const lvl = useProgress((s) => s.level);
  const mode = (params.mode as string) || 'entrenamiento';
  const total = mode === 'contrarreloj' ? 99 : 8;
  const ball = useMemo(() => makeBall(0, 3), []);
  const npcBall = useRef({ owner: 'none' as 'none' | 'rival' | 'keeper' });
  const [sess, setSess] = useState<Sess>(() => ({ cmds: buildSession(lvl, mode === 'contrarreloj' ? 11 : total), i: 0, started: 0, cmdStart: 0, ok: 0, fail: 0, points: 0, goals: 0, jumps: 0, state: 'intro', rival: 0, mode }));
  const sref = useRef(sess);
  sref.current = sess;
  const [, setTick] = useState(0);

  useMemo(() => {
    resetWorld();
    // goal posts
    for (const sz of [-L, L]) {
      addBox(-3.7, sz, 0.15, 0.15, 2.4, 0, 'post');
      addBox(3.7, sz, 0.15, 0.15, 2.4, 0, 'post');
    }
  }, []);

  useEffect(() => {
    playMusic('action');
    playAmbience('crowd');
    const c = CHARACTERS.coach;
    useUI.getState().openDialog({
      speaker: c.name, role: c.role, pitch: c.pitch,
      lines: [
        { speaker: c.name, t: T_('¡Bienvenido al entrenamiento, Razmik! Escucha bien mis órdenes.', 'Բարի գալուստ մարզում, Ռազմիկ։ Լավ լսիր իմ հրահանգները։') },
        { speaker: c.name, t: mode === 'contrarreloj' ? T_('Tienes noventa segundos. ¡Haz todos los ejercicios que puedas!', 'Ունես իննսուն վայրկյան։ Կատարիր որքան հնարավոր է շատ վարժություն։') : mode === 'competicion' ? T_('Hoy compites contra Hugo. Gana el que haga más puntos.', 'Այսօր մրցում ես Հուգոյի դեմ։ Կհաղթի նա, ով ավելի շատ միավոր կհավաքի։') : T_('Te diré qué hacer. Si no entiendes, pulsa «Repetir» o «Traducción».', 'Ես կասեմ՝ ինչ անել։ Եթե չհասկանաս, սեղմիր «Կրկնել» կամ «Թարգմանություն»։') },
      ],
      onClose: () => {
        const now = performance.now();
        setSess((s) => ({ ...s, state: 'run', started: now, cmdStart: now }));
        setTimeout(() => announce(sref.current.cmds[0]), 300);
      },
    });
    const iv = setInterval(() => setTick((t) => t + 1), 250);
    return () => {
      clearInterval(iv);
      playAmbience(null);
    };
  }, []);

  const announce = (c?: Cmd) => {
    if (!c) return;
    sfx('whistle');
    setTimeout(() => speak(c.text.es, { pitch: 0.8 }), 350);
    prep(c);
  };

  // per-command setup (ball / rival placement)
  const cmdState = useRef({ origin: new THREE.Vector3(), right: new THREE.Vector3(), touchedAvoid: false, passed: false, wasAir: false, defStart: false, goalsAtStart: 0, jumpsAtStart: 0, ballStart: new THREE.Vector3() });
  const prep = (c: Cmd) => {
    const st = cmdState.current;
    st.origin.copy(player.pos);
    st.right.set(Math.cos(input.camYaw), 0, -Math.sin(input.camYaw));
    st.touchedAvoid = false;
    st.passed = false;
    st.defStart = false;
    st.goalsAtStart = sref.current.goals;
    st.jumpsAtStart = sref.current.jumps;
    npcBall.current.owner = 'none';
    ball.frozen = false;
    const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const near = () => ball.pos.set(player.pos.x + fwd.x * 1.2, R, player.pos.z + fwd.z * 1.2);
    switch (c.kind) {
      case 'pass': case 'shoot': case 'goals2': case 'carry':
        near();
        ball.vel.set(0, 0, 0);
        break;
      case 'dribble':
        teleportPlayer(0, 0, -8, Math.PI);
        ball.pos.set(0, R, -9.3);
        ball.vel.set(0, 0, 0);
        break;
      case 'recover':
        ball.pos.set(player.pos.x > 0 ? -10 : 10, R, -14);
        ball.vel.set(0, 0, 0);
        npcBall.current.owner = 'rival';
        break;
      case 'defend':
        teleportPlayer(0, 0, L - 7, 0);
        ball.pos.set(pick([-6, 0, 6]), R, 8);
        ball.vel.set(0, 0, 0);
        npcBall.current.owner = 'rival';
        break;
    }
    st.ballStart.copy(ball.pos);
  };

  const complete = (ok: boolean, msg?: T) => {
    const s = sref.current;
    if (s.state !== 'run') return;
    const cmd = s.cmds[s.i];
    const elapsed = (performance.now() - s.cmdStart) / 1000;
    const pts = ok ? Math.round(100 + Math.max(0, cmd.limit - elapsed) * 8) : 0;
    const p = useProgress.getState();
    p.answer(cmd.text, ok, 'comprension_auditiva', true);
    if (ok) sfx('ok');
    else sfx('wrong');
    const c = CHARACTERS.coach;
    const fb = msg ?? (ok ? pick([T_('¡Muy bien!', 'Շատ լավ։'), T_('¡Perfecto, campeón!', 'Կատարյալ է, չեմպիոն։'), T_('¡Eso es!', 'Հենց այդպես։'), T_('¡Genial!', 'Հիանալի է։')]) : T_('No pasa nada. Vamos con el siguiente.', 'Ոչինչ։ Անցնենք հաջորդին։'));
    speak(fb.es, { pitch: c.pitch });
    useUI.getState().toast(fb, ok ? 'good' : 'bad');
    const rivalGain = mode === 'competicion' ? Math.round((lvl === 'A1' ? 90 : lvl === 'A2' ? 115 : 135) + Math.random() * 60) : 0;
    const next = { ...s, ok: s.ok + (ok ? 1 : 0), fail: s.fail + (ok ? 0 : 1), points: s.points + pts, rival: s.rival + rivalGain, state: 'feedback' as const };
    setSess(next);
    setTimeout(() => {
      const cur = sref.current;
      const timeUp = mode === 'contrarreloj' && (performance.now() - cur.started) / 1000 > 90;
      if (cur.i + 1 >= cur.cmds.length || timeUp) finish();
      else {
        const nn = { ...sref.current, i: cur.i + 1, cmdStart: performance.now(), state: 'run' as const };
        setSess(nn);
        sref.current = nn;
        announce(nn.cmds[nn.i]);
      }
    }, 1800);
  };

  const finish = () => {
    const s = sref.current;
    const time = (performance.now() - s.started) / 1000;
    const p = useProgress.getState();
    const acc = s.ok / Math.max(1, s.ok + s.fail);
    const xp = 60 + s.ok * 15;
    const coins = 20 + s.ok * 5;
    p.completeMission('desafio-entrenador', xp, coins, acc >= 0.85);
    p.setRecord(`entreno-${mode}-puntos`, s.points);
    if (mode !== 'contrarreloj') p.setRecord(`entreno-${mode}-tiempo`, Math.round(time), true);
    if (acc === 1) p.addMedal('Entrenamiento perfecto');
    if (mode === 'competicion' && s.points > s.rival) p.addMedal('Ganador del desafío');
    sfx(acc >= 0.6 ? 'win' : 'lose');
    setSess({ ...s, state: 'done' });
  };

  // ---- per-frame checks
  const onStep = () => {
    const s = sref.current;
    if (s.state !== 'run') return;
    const cmd = s.cmds[s.i];
    if (!cmd) return;
    const st = cmdState.current;
    const el = (performance.now() - s.cmdStart) / 1000;
    if (mode === 'contrarreloj' && (performance.now() - s.started) / 1000 > 90) {
      complete(false, T_('¡Se acabó el tiempo!', 'Ժամանակը սպառվեց։'));
      return;
    }
    if (el > cmd.limit) {
      complete(false, T_('¡Tiempo! Escucha mejor la próxima vez.', 'Ժամանակը վերջացավ։ Հաջորդ անգամ ավելի ուշադիր լսիր։'));
      return;
    }
    const pp = player.pos;
    const coneDist = (id: string) => {
      const c = CONES.find((x) => x.id === id)!;
      return Math.hypot(pp.x - c.pos[0], pp.z - c.pos[1]);
    };
    // wrong cone touched?
    if (cmd.kind === 'cone' || cmd.kind === 'coneAvoid') {
      for (const c of CONES) {
        if (c.id === cmd.cone) continue;
        if (coneDist(c.id) < 1.1) {
          if (cmd.avoid === c.id || cmd.kind === 'cone') {
            complete(false, T_(`¡No! Ese es el cono ${c.name.es}. Te he dicho ${CONES.find((x) => x.id === cmd.cone)!.name.es}.`, `Ոչ։ Դա ${c.name.hy} կոնն է։ Ասացի՝ ${CONES.find((x) => x.id === cmd.cone)!.name.hy}։`));
            return;
          }
        }
      }
      if (coneDist(cmd.cone!) < 1.3) complete(true);
    }
    if (cmd.kind === 'carry') {
      const c = CONES.find((x) => x.id === cmd.cone)!;
      if (Math.hypot(ball.pos.x - c.pos[0], ball.pos.z - c.pos[1]) < 1.6) complete(true);
    }
    if (cmd.kind === 'pass') {
      const d = Math.hypot(ball.pos.x - TEAMMATE[0], ball.pos.z - TEAMMATE[1]);
      if (d < 1.8 && ball.lastTouch === 'player') {
        ball.vel.set(0, 0, 0);
        complete(true, T_('¡Buen pase! Dani lo ha recibido.', 'Լավ փոխանցում։ Դանին ստացավ։'));
      }
    }
    if (cmd.kind === 'jump' || cmd.kind === 'jumps3') {
      if (!player.grounded) st.wasAir = true;
      else if (st.wasAir) {
        st.wasAir = false;
        if (cmd.kind === 'jumps3') {
          const n = s.jumps + 1;
          setSess((x) => ({ ...x, jumps: n }));
          sref.current = { ...sref.current, jumps: n };
          if (n - st.jumpsAtStart >= 3) complete(true);
        } else {
          const over = HURDLES.some(([hx, hz]) => Math.abs(pp.x - hx) < 1.6 && Math.abs(pp.z - hz) < 1.3);
          if (over) complete(true);
        }
      }
      if (cmd.kind === 'jump' && player.grounded) {
        const hit = HURDLES.some(([hx, hz]) => Math.abs(pp.x - hx) < 1.0 && Math.abs(pp.z - hz) < 0.4);
        if (hit) {
          complete(false, T_('¡Has tocado el obstáculo! Tienes que saltar por encima.', 'Դիպար խոչընդոտին։ Պետք է ցատկես վրայով։'));
        }
      }
    }
    if (cmd.kind === 'side') {
      const d = pp.clone().sub(st.origin).dot(st.right);
      if (d * cmd.side! > 6) complete(true);
      if (d * cmd.side! < -5) complete(false, cmd.side! > 0 ? T_('¡Esa es la izquierda! Te he dicho a la derecha.', 'Դա ձախն է։ Ասացի՝ աջ։') : T_('¡Esa es la derecha! Te he dicho a la izquierda.', 'Դա աջն է։ Ասացի՝ ձախ։'));
    }
    if (cmd.kind === 'dribble') {
      const close = Math.hypot(ball.pos.x - pp.x, ball.pos.z - pp.z) < 2.2;
      if (ball.pos.z < -25 && close) complete(true, T_('¡Qué regate! Has pasado a los tres.', 'Ինչ դրիբլինգ։ Անցար երեքին էլ։'));
      if (npcBall.current.owner === 'rival') complete(false, T_('Te han quitado el balón. ¡Protégelo con el cuerpo!', 'Գնդակը խլեցին քեզանից։ Պաշտպանիր այն մարմնով։'));
    }
    if (cmd.kind === 'recover') {
      if (Math.hypot(ball.pos.x - pp.x, ball.pos.z - pp.z) < 1.0) {
        npcBall.current.owner = 'none';
        complete(true, T_('¡Balón recuperado!', 'Գնդակը վերադարձված է։'));
      }
    }
    if (cmd.kind === 'defend') {
      if (Math.hypot(ball.pos.x - pp.x, ball.pos.z - pp.z) < 1.2 && ball.pos.z > 12) {
        npcBall.current.owner = 'none';
        ball.vel.multiplyScalar(-0.3);
        complete(true, T_('¡Gran defensa!', 'Հիանալի պաշտպանություն։'));
      }
      if (ball.pos.z > L - 0.5 && Math.abs(ball.pos.x) < 3.6) complete(false, T_('Gol en contra… ¡Tienes que ponerte delante del balón!', 'Գոլ մեր դարպասում… Պետք է կանգնես գնդակի առաջ։'));
    }
  };

  // goal detection (attack goal at z=-L)
  const goalCheck = () => {
    const s = sref.current;
    if (ball.pos.z < -L - 0.2 && Math.abs(ball.pos.x) < 3.6 && ball.pos.y < 2.4) {
      sfx('goal');
      useUI.getState().toast(T_('¡GOOOL!', 'ԳՈ՜Լ։'), 'gold');
      useProgress.getState().dailyProgress('goal');
      const goals = s.goals + 1;
      setSess((x) => ({ ...x, goals }));
      sref.current = { ...sref.current, goals };
      ball.pos.set(0, R, -L + 14);
      ball.vel.set(0, 0, 0);
      const cmd = s.cmds[s.i];
      if (s.state === 'run' && cmd?.kind === 'shoot') complete(true, T_('¡Golazo!', 'Հիանալի գոլ։'));
      if (s.state === 'run' && cmd?.kind === 'goals2' && goals - cmdState.current.goalsAtStart >= 2) complete(true, T_('¡Dos goles! Eres un crack.', 'Երկու գոլ։ Դու աստղ ես։'));
    }
    if (ball.pos.z < -L - 3 || Math.abs(ball.pos.x) > W + 2 || ball.pos.z > L + 3) {
      ball.pos.set(0, R, 0);
      ball.vel.set(0, 0, 0);
    }
  };

  const cur = sess.cmds[sess.i];
  const elapsed = sess.state === 'run' ? (performance.now() - sess.cmdStart) / 1000 : 0;
  const totalEl = sess.started ? (performance.now() - sess.started) / 1000 : 0;

  return (
    <SceneShell
      kick
      tod={useProgress.getState().settings.timeOfDay === 'noche' ? 'noche' : 'dia'}
      overlay={
        <>
          <MissionPanel
            title={T_('Desafío del entrenador', 'Մարզչի մարտահրավեր')}
            objective={cur && sess.state !== 'done' ? cur.text : undefined}
            timer={mode === 'contrarreloj' ? Math.max(0, 90 - totalEl) : cur ? Math.max(0, cur.limit - elapsed) : null}
          >
            <div className="mp-row">
              <span className="pill small">{Math.min(sess.i + 1, sess.cmds.length)}/{mode === 'contrarreloj' ? '∞' : sess.cmds.length}</span>
              <span className="pill small gold">{sess.points} pts</span>
              <span className="pill small"><Icon name="check" size={12} /> {sess.ok}</span>
              <span className="pill small">⚽ {sess.goals}</span>
              {mode === 'competicion' && <span className="pill small">Hugo: {sess.rival}</span>}
            </div>
            <div className="mp-row">
              <button className="btn tiny" onClick={() => cur && speak(cur.text.es, { pitch: 0.8 })}><Icon name="speaker" size={14} /> Escuchar</button>
              <button className="btn tiny ghost" onClick={() => repeatLast(true)}><Icon name="slow" size={14} /> Despacio</button>
              <button className="btn tiny ghost" onClick={() => cur && openTranslation(cur.text)}><Icon name="translate" size={14} /></button>
            </div>
            <div className="mp-hint">
              <Es t={T_('Chutar: F o el botón del balón · Saltar: espacio', 'Հարված՝ F կամ գնդակի կոճակը · Ցատկ՝ բացատ')} />
            </div>
          </MissionPanel>
          {cur && sess.state === 'run' && (
            <div className="coach-sub" onClick={() => openTranslation(cur.text)}>
              <span className="speaker">Óscar</span> {cur.text.es}
            </div>
          )}
          {sess.state === 'done' && <TrainingResult s={sess} mode={mode} />}
        </>
      }
    >
      <Field />
      <BallBody ball={ball} bounds={{ minX: -W - 1, maxX: W + 1, minZ: -L - 2.5, maxZ: L + 2.5 }} onStep={goalCheck} />
      <Keeper ball={ball} lvl={lvl} />
      <Rival ball={ball} ctl={npcBall.current} />
      <StaticPerson look={CHARACTERS.companero.look} pos={[TEAMMATE[0], 0, TEAMMATE[1]]} label="DANI" />
      {DEFENDERS.map((d, i) => (
        <Defender key={i} pos={d} ball={ball} ctl={npcBall.current} active={() => sref.current.cmds[sref.current.i]?.kind === 'dribble' && sref.current.state === 'run'} />
      ))}
      <StaticPerson look={CHARACTERS.coach.look} pos={[-W + 2, 0, 2]} label="ÓSCAR" talk />
      <Player start={START} startYaw={Math.PI} onStep={onStep} />
    </SceneShell>
  );
}

function Field() {
  const tex = useMemo(() => {
    const t = pitchTex();
    t.anisotropy = 8;
    return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W * 2 + 2, L * 2 + 4]} />
        <meshStandardMaterial map={tex} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#3d7d3f" />
      </mesh>
      <group position={[0, 0, -L]}><Goal /></group>
      <group position={[0, 0, L]} rotation={[0, Math.PI, 0]}><Goal /></group>
      {CONES.map((c) => (
        <group key={c.id} position={[c.pos[0], 0, c.pos[1]]}>
          <Cone color={c.color} s={1.6} />
        </group>
      ))}
      {HURDLES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[2, 0.08, 0.08]} />
            <meshStandardMaterial color="#ff7a1a" />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx, 0.22, 0]}>
              <boxGeometry args={[0.06, 0.45, 0.06]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ))}
      {/* stands */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (W + 8), 0, 0]} rotation={[0, sd > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          {[0, 1, 2, 3, 4].map((r) => (
            <mesh key={r} position={[0, 0.6 + r * 0.9, -r * 1.2]} castShadow receiveShadow>
              <boxGeometry args={[L * 2, 0.9, 1.2]} />
              <meshStandardMaterial map={crowdTex()} color={r % 2 ? '#ffffff' : '#dddddd'} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 6, -L - 10]}>
        <planeGeometry args={[24, 4]} />
        <meshBasicMaterial map={textTex('CENTRO DE ENTRENAMIENTO · RAZMIK 7', { bg: '#1b2233', fg: '#ff7a1a', w: 1024, h: 170 })} toneMapped={false} />
      </mesh>
    </group>
  );
}

let crowd: THREE.CanvasTexture | null = null;
export function crowdTex() {
  if (crowd) return crowd;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2c3a55';
  g.fillRect(0, 0, 512, 64);
  const cols = ['#ff7a1a', '#ffffff', '#ffd34d', '#2e6fd8', '#e14b4b', '#1b2233', '#f1c9a5', '#7b4a2e'];
  for (let i = 0; i < 260; i++) {
    g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
    const x = Math.random() * 512, y = 8 + Math.random() * 44;
    g.beginPath();
    g.arc(x, y, 3 + Math.random() * 2, 0, Math.PI * 2);
    g.fill();
  }
  crowd = new THREE.CanvasTexture(c);
  crowd.colorSpace = THREE.SRGBColorSpace;
  crowd.wrapS = THREE.RepeatWrapping;
  crowd.repeat.set(6, 1);
  return crowd;
}

function StaticPerson({ look, pos, label, talk }: { look: Look; pos: [number, number, number]; label?: string; talk?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  useFrame(() => {
    if (!g.current) return;
    g.current.rotation.y = Math.atan2(player.pos.x - pos[0], player.pos.z - pos[2]);
    anim.current.talk = !!talk && !!useUI.getState().dialog;
  });
  return (
    <group ref={g} position={pos}>
      <Humanoid look={look} anim={anim} />
      {label && (
        <mesh position={[0, look.height + 0.45, 0]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshBasicMaterial map={textTex(label, { bg: '#ff7a1a', fg: '#fff', w: 256, h: 64 })} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function Keeper({ ball, lvl }: { ball: ReturnType<typeof makeBall>; lvl: Level }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const x = useRef(0);
  const dive = useRef(0);
  const saveP = lvl === 'A1' ? 0.25 : lvl === 'A2' ? 0.4 : 0.55;
  const decided = useRef<number>(0);
  useFrame((_, dt) => {
    const target = THREE.MathUtils.clamp(ball.pos.x * 0.6, -3, 3);
    const nx = x.current + THREE.MathUtils.clamp(target - x.current, -dt * 4, dt * 4);
    anim.current.speed = Math.abs(nx - x.current) / Math.max(dt, 0.001);
    x.current = nx;
    // save attempt
    if (ball.vel.z < -6 && ball.pos.z < -L + 4 && ball.pos.z > -L && decided.current !== ball.lastKick) {
      decided.current = ball.lastKick;
      if (Math.abs(ball.pos.x - x.current) < 2.2 && ball.pos.y < 2.2 && Math.random() < saveP) {
        ball.vel.set(ball.vel.x * 0.3 + (Math.random() - 0.5) * 6, 3, Math.abs(ball.vel.z) * 0.4);
        dive.current = 0.6;
        sfx('kick');
        useUI.getState().toast({ es: '¡Paradón del portero!', hy: 'Դարպասապահի հիանալի փրկություն։' }, 'info');
      }
    }
    dive.current = Math.max(0, dive.current - dt);
    if (g.current) {
      g.current.position.set(x.current, 0, -L + 0.8);
      g.current.rotation.z = dive.current > 0 ? Math.sign(ball.pos.x - x.current || 1) * -0.9 : 0;
    }
  });
  return (
    <group ref={g}>
      <Humanoid look={{ ...CHARACTERS.portero.look }} anim={anim} />
    </group>
  );
}

function Rival({ ball, ctl }: { ball: ReturnType<typeof makeBall>; ctl: { owner: string } }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const pos = useRef(new THREE.Vector3(10, 0, -16));
  const look = useMemo<Look>(() => ({ ...CHARACTERS.portero.look, top: '#2e6fd8', socks: '#2e6fd8', topStyle: 'jersey', jerseyName: 'HUGO', jerseyNum: '9' }), []);
  useFrame((_, dt) => {
    const p = pos.current;
    if (ctl.owner === 'rival') {
      // carry the ball towards a target: for "defend" run towards our goal and shoot
      const goingToGoal = ball.pos.z > 0;
      const target = goingToGoal ? new THREE.Vector3(ball.pos.x * 0.6, 0, L) : new THREE.Vector3(Math.sin(performance.now() / 1500) * 14, 0, -12);
      const toBall = ball.pos.clone().sub(p).setY(0);
      if (toBall.length() > 0.8) {
        p.addScaledVector(toBall.normalize(), dt * 6);
      } else {
        const dir = target.clone().sub(ball.pos).setY(0).normalize();
        ball.vel.set(dir.x * 3.4, 0, dir.z * 3.4);
        ball.lastTouch = 'npc';
        p.set(ball.pos.x - dir.x * 0.6, 0, ball.pos.z - dir.z * 0.6);
        if (goingToGoal && ball.pos.z > L - 16) {
          ball.vel.set(dir.x * 13, 0.8, dir.z * 13);
          ctl.owner = 'none';
          sfx('kick');
        }
      }
      anim.current.speed = 5;
    } else {
      const home = new THREE.Vector3(18, 0, -22);
      const d = home.clone().sub(p);
      if (d.length() > 0.5) p.addScaledVector(d.normalize(), dt * 3);
      anim.current.speed = d.length() > 0.5 ? 3 : 0;
    }
    if (g.current) {
      g.current.position.copy(p);
      g.current.rotation.y = Math.atan2(ball.pos.x - p.x, ball.pos.z - p.z);
    }
  });
  return (
    <group ref={g}>
      <Humanoid look={look} anim={anim} />
    </group>
  );
}

function Defender({ pos, ball, ctl, active }: { pos: [number, number]; ball: ReturnType<typeof makeBall>; ctl: { owner: string }; active: () => boolean }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const p = useRef(new THREE.Vector3(pos[0], 0, pos[1]));
  const look = useMemo<Look>(() => ({ ...CHARACTERS.companero.look, top: '#1b2233', socks: '#1b2233', jerseyName: 'DEF', jerseyNum: String(2 + Math.round(Math.abs(pos[0]))) }), []);
  useFrame((_, dt) => {
    const cur = p.current;
    const on = active();
    // defenders shuffle sideways and try to steal when the ball comes close
    const tx = pos[0] + Math.sin(performance.now() / 700 + pos[1]) * (on ? 2.2 : 0.5);
    const target = new THREE.Vector3(tx, 0, pos[1]);
    if (on && ball.pos.distanceTo(cur) < 2.4 && ball.pos.z > pos[1] - 0.5) target.set(ball.pos.x, 0, ball.pos.z);
    const d = target.sub(cur);
    const sp = on ? 2.6 : 1.5;
    if (d.length() > 0.05) cur.addScaledVector(d.normalize(), Math.min(d.length(), dt * sp));
    anim.current.speed = on ? sp : 0.6;
    if (on && ball.pos.distanceTo(new THREE.Vector3(cur.x, R, cur.z)) < 0.55 && Math.hypot(ball.pos.x - player.pos.x, ball.pos.z - player.pos.z) > 0.7) {
      ctl.owner = 'rival';
      ball.vel.set((Math.random() - 0.5) * 6, 0, 6);
    }
    if (g.current) {
      g.current.position.copy(cur);
      g.current.rotation.y = Math.atan2(player.pos.x - cur.x, player.pos.z - cur.z);
    }
  });
  return (
    <group ref={g}>
      <Humanoid look={look} anim={anim} />
    </group>
  );
}

function TrainingResult({ s, mode }: { s: Sess; mode: string }) {
  const go = useUI((x) => x.go);
  const time = (performance.now() - s.started) / 1000;
  const acc = Math.round((s.ok / Math.max(1, s.ok + s.fail)) * 100);
  const rec = useProgress((x) => x.records[`entreno-${mode}-puntos`]);
  return (
    <div className="modal-back">
      <div className="modal">
        <div className="result-title">{mode === 'competicion' ? (s.points > s.rival ? '¡Has ganado a Hugo!' : 'Hugo ha ganado… ¡revancha!') : '¡Entrenamiento terminado!'}</div>
        <div className="result-grid">
          <div><b>{s.points}</b><span>Puntos</span></div>
          <div><b>{s.ok}/{s.ok + s.fail}</b><span>Órdenes</span></div>
          <div><b>{acc}%</b><span>Comprensión</span></div>
          <div><b>{s.goals}</b><span>Goles</span></div>
          <div><b>{fmt(time)}</b><span>Tiempo</span></div>
          <div><b>{rec ?? s.points}</b><span>Récord</span></div>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => go('training', { mode, k: Date.now() })}>Otra vez</button>
          <button className="btn" onClick={() => go('training', { mode: mode === 'entrenamiento' ? 'contrarreloj' : mode === 'contrarreloj' ? 'competicion' : 'entrenamiento', k: Date.now() })}>
            Modo: {mode === 'entrenamiento' ? 'Contrarreloj' : mode === 'contrarreloj' ? 'Competición' : 'Entrenamiento'}
          </button>
          <button className="btn ghost" onClick={() => go('city', { spawn: 'estadio' })}>Volver a la ciudad</button>
        </div>
      </div>
    </div>
  );
}
