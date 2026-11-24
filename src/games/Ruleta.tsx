import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GameCanvas } from '../three/Stage';
import { Humanoid, newAnim } from '../three/Humanoid';
import { CHARACTERS } from '../data/characters';
import { CATEGORIES, RIDDLES, type Riddle } from '../data/ruleta';
import { useProgress, useUI } from '../core/store';
import { levelIndex, type T } from '../core/types';
import { pick, shuffle } from '../core/random';
import { playMusic, sfx, speak } from '../core/audio';
import { Es, openTranslation } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { StatsBar, TopLeft, usePlayTime } from '../ui/HUD';
import { norm } from '../core/evaluate';

const T_ = (es: string, hy: string): T => ({ es, hy });
type Seg = { label: string; value: number; kind: 'pts' | 'quiebra' | 'pierde' | 'x2' | 'extra'; color: string };
const SEGS: Seg[] = [
  { label: '100', value: 100, kind: 'pts', color: '#ff7a1a' },
  { label: '500', value: 500, kind: 'pts', color: '#2e6fd8' },
  { label: 'QUIEBRA', value: 0, kind: 'quiebra', color: '#111111' },
  { label: '200', value: 200, kind: 'pts', color: '#27ae60' },
  { label: '800', value: 800, kind: 'pts', color: '#9b51e0' },
  { label: 'x2', value: 0, kind: 'x2', color: '#ffd34d' },
  { label: '300', value: 300, kind: 'pts', color: '#e14b4b' },
  { label: 'PIERDE TURNO', value: 0, kind: 'pierde', color: '#f4f4f4' },
  { label: '400', value: 400, kind: 'pts', color: '#56ccf2' },
  { label: '1000', value: 1000, kind: 'pts', color: '#ff4fd8' },
  { label: '+1 LETRA', value: 0, kind: 'extra', color: '#39d353' },
  { label: '600', value: 600, kind: 'pts', color: '#f2994a' },
];
const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONS = 'BCDFGHJLMNÑPQRSTVXYZ'.split('');
const baseLetter = (ch: string) => norm(ch).toUpperCase().replace('N', ch === 'Ñ' ? 'Ñ' : 'N');

interface PlayerS { name: string; score: number; total: number; ai: boolean }

export function Ruleta() {
  usePlayTime();
  const lvl = useProgress((s) => s.level);
  const params = useUI((s) => s.params);
  const vsTeacher = params.mode === 'profesor';
  const pool = useMemo(() => shuffle(RIDDLES.filter((r) => levelIndex(r.lvl) <= levelIndex(lvl))), []);
  const [round, setRound] = useState(0);
  const [riddle, setRiddle] = useState<Riddle>(pool[0]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<PlayerS[]>(() => vsTeacher ? [{ name: 'Razmik', score: 0, total: 0, ai: false }, { name: 'Profesor', score: 0, total: 0, ai: false }] : [{ name: 'Razmik', score: 0, total: 0, ai: false }, { name: 'Leo', score: 0, total: 0, ai: true }, { name: 'Sofía', score: 0, total: 0, ai: true }]);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<'spin' | 'spinning' | 'letter' | 'solve' | 'roundEnd' | 'bonus' | 'end'>('spin');
  const [seg, setSeg] = useState<Seg | null>(null);
  const [mult, setMult] = useState(1);
  const [msg, setMsg] = useState<T>(T_('¡Bienvenidos a La ruleta de las palabras!', 'Բարի գալուստ «Բառերի ռուլետկա»։'));
  const [guess, setGuess] = useState('');
  const wheelRot = useRef({ angle: 0, target: 0, spinning: false, onStop: null as null | ((i: number) => void) });
  const [bonus, setBonus] = useState<{ riddle: Riddle; picks: string[]; time: number; solved: boolean | null } | null>(null);
  const ROUNDS = 3;
  const host = CHARACTERS.presentador;

  const answer = riddle.answer;
  const letters = answer.split('');
  const isRevealed = (ch: string) => ch === ' ' || revealed.has(baseLetter(ch));
  const remaining = letters.filter((c) => c !== ' ' && !isRevealed(c)).length;

  useEffect(() => {
    playMusic('quiz');
    setTimeout(() => readClue(pool[0]), 600);
  }, []);

  const readClue = (r: Riddle) => {
    const t = T_(`Categoría: ${CATEGORIES[r.cat].es}. ${r.clue.es}`, `Կատեգորիա՝ ${CATEGORIES[r.cat].hy}։ ${r.clue.hy}`);
    setMsg(t);
    speak(t.es, { pitch: host.pitch });
  };

  const say = (t: T) => {
    setMsg(t);
    speak(t.es, { pitch: host.pitch });
  };

  const nextTurn = () => {
    setMult(1);
    setSeg(null);
    setTurn((t) => (t + 1) % players.length);
    setPhase('spin');
  };

  const spin = () => {
    if (phase !== 'spin') return;
    setPhase('spinning');
    sfx('spin');
    const idx = Math.floor(Math.random() * SEGS.length);
    const segAngle = (Math.PI * 2) / SEGS.length;
    const base = wheelRot.current.angle;
    const jitter = (Math.random() - 0.5) * segAngle * 0.6;
    const target = base + Math.PI * 2 * (4 + Math.floor(Math.random() * 2)) + ((((idx * segAngle + jitter - base) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    wheelRot.current.target = target;
    wheelRot.current.spinning = true;
    wheelRot.current.onStop = () => onSegment(SEGS[idx]);
  };

  const onSegment = (s: Seg) => {
    setSeg(s);
    const p = players[turnRef.current];
    if (s.kind === 'quiebra') {
      sfx('lose');
      say(T_(`¡Oh, no! Quiebra. ${p.name} pierde los puntos de esta ronda.`, `Օ՜, ոչ։ Սնանկություն։ ${p.name}-ը կորցնում է այս փուլի միավորները։`));
      setPlayers((ps) => ps.map((x, i) => (i === turnRef.current ? { ...x, score: 0 } : x)));
      setTimeout(nextTurn, 1800);
      return;
    }
    if (s.kind === 'pierde') {
      sfx('wrong');
      say(T_(`Pierde turno. Le toca al siguiente jugador.`, 'Կորցնում է հերթը։ Հերթը հաջորդ խաղացողինն է։'));
      setTimeout(nextTurn, 1600);
      return;
    }
    if (s.kind === 'x2') {
      setMult(2);
      say(T_('¡Doble! Si aciertas, multiplicas tus puntos por dos.', 'Կրկնակի։ Եթե գուշակես, միավորներդ կրկնապատկվում են։'));
    } else if (s.kind === 'extra') {
      say(T_('¡Letra extra! Elige una consonante: vale trescientos puntos.', 'Լրացուցիչ տառ։ Ընտրիր բաղաձայն․ արժե երեք հարյուր միավոր։'));
    } else {
      say(T_(`${s.value} puntos. Elige una consonante.`, `${s.value} միավոր։ Ընտրիր բաղաձայն։`));
    }
    setPhase('letter');
  };

  const turnRef = useRef(turn);
  turnRef.current = turn;
  const playersRef = useRef(players);
  playersRef.current = players;

  const chooseLetter = (L: string) => {
    if (phase !== 'letter' && !(VOWELS.includes(L) && phase === 'spin')) return;
    const isVowel = VOWELS.includes(L);
    const p = playersRef.current[turnRef.current];
    if (isVowel) {
      if (p.score < 100) {
        say(T_('Necesitas cien puntos para comprar una vocal.', 'Ձայնավոր գնելու համար պետք է հարյուր միավոր։'));
        return;
      }
      setPlayers((ps) => ps.map((x, i) => (i === turnRef.current ? { ...x, score: x.score - 100 } : x)));
    }
    if (used.has(L)) return;
    const count = letters.filter((c) => c !== ' ' && baseLetter(c) === L).length;
    setUsed((u) => new Set([...u, L]));
    if (count > 0) {
      sfx('ok');
      setRevealed((r) => new Set([...r, L]));
      const value = isVowel ? 0 : (seg?.kind === 'extra' ? 300 : (seg?.value ?? 0)) * count;
      setPlayers((ps) => ps.map((x, i) => (i === turnRef.current ? { ...x, score: (x.score + value) * (isVowel ? 1 : mult) } : x)));
      say(T_(`¡Sí! Hay ${count === 1 ? 'una' : count} «${L}». ${isVowel ? '' : `+${value * mult} puntos.`} Puedes girar otra vez, comprar una vocal o resolver.`, `Այո։ Կա ${count} «${L}»։ Կարող ես կրկին պտտել, ձայնավոր գնել կամ լուծել։`));
      if (!p.ai) useProgress.getState().answer(riddle.clue, true, 'ruleta');
      setPhase('spin');
      setMult(1);
    } else {
      sfx('wrong');
      say(T_(`No hay ninguna «${L}». Le toca al siguiente.`, `«${L}» տառ չկա։ Հերթը հաջորդինն է։`));
      setTimeout(nextTurn, 1500);
    }
  };

  const solve = (text: string) => {
    const p = playersRef.current[turnRef.current];
    if (norm(text).replace(/\s+/g, '') === norm(answer).replace(/\s+/g, '')) {
      sfx('win');
      setRevealed(new Set(letters.map(baseLetter)));
      const bonusPts = 300 + remaining * 100;
      setPlayers((ps) => ps.map((x, i) => (i === turnRef.current ? { ...x, total: x.total + x.score + bonusPts, score: 0 } : { ...x, score: 0 })));
      say(T_(`¡Correcto! La respuesta es ${answer}. ¡${p.name} gana la ronda!`, `Ճիշտ է։ Պատասխանն է՝ ${answer}։ ${p.name}-ը հաղթում է փուլը։`));
      if (!p.ai) {
        useProgress.getState().answer(riddle.clue, true, 'ruleta');
        useProgress.getState().dailyProgress('ruleta');
        useProgress.getState().addWords([norm(answer)]);
      }
      setPhase('roundEnd');
    } else {
      sfx('wrong');
      if (!p.ai) useProgress.getState().answer(riddle.clue, false, 'ruleta');
      say(T_('¡Respuesta incorrecta! Pasa el turno.', 'Սխալ պատասխան։ Հերթը փոխանցվում է։'));
      setTimeout(nextTurn, 1500);
    }
    setGuess('');
  };

  const nextRound = () => {
    const r = round + 1;
    if (r >= ROUNDS) {
      // superfinal for the best human
      const best = playersRef.current.reduce((a, b) => (b.total > a.total ? b : a));
      if (!best.ai || vsTeacher) {
        const br = pool[ROUNDS] ?? pick(RIDDLES);
        setBonus({ riddle: br, picks: [], time: 20, solved: null });
        setRevealed(new Set(['R', 'S', 'T', 'L', 'N', 'E']));
        setUsed(new Set(['R', 'S', 'T', 'L', 'N', 'E']));
        setRiddle(br);
        setPhase('bonus');
        say(T_(`¡Superfinal! Te damos las letras R, S, T, L, N y E. Elige tres consonantes y una vocal. ${br.clue.es}`, `Սուպերֆինալ։ Տալիս ենք R, S, T, L, N և E տառերը։ Ընտրիր երեք բաղաձայն և մեկ ձայնավոր։ ${br.clue.hy}`));
      } else finish(false);
      return;
    }
    setRound(r);
    const nr = pool[r];
    setRiddle(nr);
    setRevealed(new Set());
    setUsed(new Set());
    setTurn(r % playersRef.current.length);
    setPhase('spin');
    setTimeout(() => readClue(nr), 300);
  };

  const finish = (bonusWin: boolean) => {
    const ps = playersRef.current;
    const me = ps[0];
    const winner = ps.reduce((a, b) => (b.total > a.total ? b : a));
    const p = useProgress.getState();
    const coins = Math.round(me.total / 60) + (bonusWin ? 40 : 0);
    p.completeMission('ruleta', 60 + (winner.name === 'Razmik' ? 60 : 0), coins, winner.name === 'Razmik' && bonusWin);
    p.setRecord('ruleta-puntos', me.total + (bonusWin ? 2000 : 0));
    setPhase('end');
  };

  // AI turns
  useEffect(() => {
    const p = players[turn];
    if (!p?.ai) return;
    if (phase === 'spin') {
      const t = setTimeout(() => {
        const solveNow = remaining <= Math.max(2, Math.floor(letters.length * 0.3)) && Math.random() < 0.75;
        if (solveNow) {
          const correct = Math.random() < 0.8;
          say(T_(`${p.name} quiere resolver…`, `${p.name}-ը ուզում է լուծել…`));
          setTimeout(() => solve(correct ? answer : 'XXXX'), 1400);
        } else spin();
      }, 1400);
      return () => clearTimeout(t);
    }
    if (phase === 'letter') {
      const t = setTimeout(() => {
        const avail = CONS.filter((c) => !used.has(c));
        const inWord = avail.filter((c) => letters.some((ch) => baseLetter(ch) === c));
        const L = inWord.length && Math.random() < 0.55 ? pick(inWord) : pick(avail);
        chooseLetter(L);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [turn, phase, players]);

  // bonus countdown
  useEffect(() => {
    if (phase !== 'bonus' || !bonus || bonus.picks.length < 4 || bonus.solved !== null) return;
    const iv = setInterval(() => {
      setBonus((b) => {
        if (!b) return b;
        if (b.time <= 1) {
          clearInterval(iv);
          say(T_(`¡Tiempo! La respuesta era ${b.riddle.answer}.`, `Ժամանակը սպառվեց։ Պատասխանն էր՝ ${b.riddle.answer}։`));
          setTimeout(() => finish(false), 2500);
          return { ...b, time: 0, solved: false };
        }
        sfx('tick');
        return { ...b, time: b.time - 1 };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, bonus?.picks.length, bonus?.solved]);

  const bonusPick = (L: string) => {
    if (!bonus || bonus.picks.length >= 4) return;
    const isV = VOWELS.includes(L);
    const vCount = bonus.picks.filter((x) => VOWELS.includes(x)).length;
    if ((isV && vCount >= 1) || (!isV && bonus.picks.length - vCount >= 3) || used.has(L)) return;
    const picks = [...bonus.picks, L];
    setBonus({ ...bonus, picks });
    setUsed((u) => new Set([...u, L]));
    if (picks.length === 4) {
      setRevealed((r) => new Set([...r, ...picks]));
      say(T_('¡Tienes veinte segundos! ¿Cuál es la palabra?', 'Ունես քսան վայրկյան։ Ո՞րն է բառը։'));
    }
  };
  const bonusSolve = (text: string) => {
    if (!bonus) return;
    if (norm(text).replace(/\s+/g, '') === norm(bonus.riddle.answer).replace(/\s+/g, '')) {
      sfx('win');
      setRevealed(new Set(bonus.riddle.answer.split('').map(baseLetter)));
      setBonus({ ...bonus, solved: true });
      useProgress.getState().addMedal('Campeón de la ruleta');
      say(T_('¡INCREÍBLE! ¡Has ganado la superfinal!', 'ԱՆՀԱՎԱՏԱԼԻ։ Հաղթեցիր սուպերֆինալում։'));
      setTimeout(() => finish(true), 2500);
    } else {
      sfx('wrong');
      say(T_('No es correcto. ¡Inténtalo otra vez rápido!', 'Ճիշտ չէ։ Արագ նորից փորձիր։'));
    }
    setGuess('');
  };

  const me = players[turn];
  const myTurn = me && !me.ai;
  const options = useMemo(() => {
    // A1 help: choose the answer among 4 words of the same category
    const others = shuffle(RIDDLES.filter((r) => r.answer !== riddle.answer && r.answer.length > 2)).slice(0, 3).map((r) => r.answer);
    return shuffle([riddle.answer, ...others]);
  }, [riddle]);

  return (
    <div className="scene ruleta">
      <div className="ruleta-3d">
        <GameCanvas camFov={40}>
          <RuletaStage wheel={wheelRot} hostTalk={phase !== 'end'} />
        </GameCanvas>
      </div>
      <TopLeft />
      <StatsBar />
      <div className="ruleta-ui">
        <div className="host-msg" onClick={() => openTranslation(msg)}>
          <span className="speaker">{host.name}</span>
          <span>{msg.es}</span>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); speak(msg.es, { pitch: host.pitch }); }}><Icon name="speaker" size={16} /></button>
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); speak(msg.es, { slow: true, pitch: host.pitch }); }}><Icon name="slow" size={16} /></button>
        </div>
        <div className="clue">
          <b>{CATEGORIES[riddle.cat].es}</b> · <Es t={riddle.clue} />
          <span className="round-tag">{phase === 'bonus' || bonus ? 'SUPERFINAL' : `Ronda ${round + 1}/${ROUNDS}`}</span>
        </div>
        <div className="board">
          {letters.map((c, i) => (
            <div key={i} className={'tile ' + (c === ' ' ? 'space' : isRevealed(c) ? 'flip' : 'hidden')}>
              {c === ' ' ? '' : isRevealed(c) ? c : '?'}
            </div>
          ))}
        </div>
        {phase !== 'bonus' && phase !== 'end' && (
          <div className="players">
            {players.map((p, i) => (
              <div key={p.name} className={'player-card ' + (i === turn ? 'turn' : '')}>
                <small>{p.name}{p.ai ? ' · IA' : ''}</small>
                <b>{p.score}</b>
                <small>Total: {p.total}</small>
              </div>
            ))}
          </div>
        )}
        {phase !== 'end' && phase !== 'bonus' && myTurn && (
          <div className="ruleta-actions">
            {phase === 'spin' && (
              <>
                <button className="btn primary" onClick={spin}>Girar la ruleta</button>
                <button className="btn" onClick={() => setPhase('solve')}>Resolver</button>
              </>
            )}
            {phase === 'letter' && <span className="hint">Elige una consonante:</span>}
          </div>
        )}
        {phase !== 'end' && phase !== 'bonus' && myTurn && (phase === 'letter' || phase === 'spin') && (
          <div className="letters">
            {(phase === 'letter' ? CONS : VOWELS).map((L) => (
              <button key={L} className={'letter ' + (VOWELS.includes(L) ? 'vowel' : '')} disabled={used.has(L)} onClick={() => chooseLetter(L)}>
                {L}
              </button>
            ))}
            {phase === 'spin' && <span className="hint">← comprar vocal (100)</span>}
          </div>
        )}
        {phase === 'solve' && myTurn && (
          <div className="solve-box">
            {lvl === 'A1' ? (
              <div className="row">
                {options.map((o) => (
                  <button key={o} className="btn" onClick={() => solve(o)}>{o}</button>
                ))}
              </div>
            ) : (
              <form className="write-row" onSubmit={(e) => { e.preventDefault(); solve(guess); }}>
                <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Escribe la respuesta…" autoFocus />
                <button className="btn primary">Resolver</button>
              </form>
            )}
            <button className="btn ghost small" onClick={() => setPhase('spin')}>Volver</button>
          </div>
        )}
        {phase === 'roundEnd' && (
          <div className="ruleta-actions">
            <button className="btn primary" onClick={nextRound}>{round + 1 >= ROUNDS ? 'Ir a la superfinal' : 'Siguiente ronda'}</button>
          </div>
        )}
        {phase === 'bonus' && bonus && (
          <div className="bonus">
            <div className="big">{bonus.picks.length < 4 ? `Elige: ${3 - bonus.picks.filter((x) => !VOWELS.includes(x)).length} consonantes y ${1 - bonus.picks.filter((x) => VOWELS.includes(x)).length} vocal` : `⏱ ${bonus.time}`}</div>
            {bonus.picks.length < 4 ? (
              <div className="letters">
                {[...CONS, ...VOWELS].map((L) => (
                  <button key={L} className={'letter ' + (VOWELS.includes(L) ? 'vowel' : '')} disabled={used.has(L)} onClick={() => bonusPick(L)}>
                    {L}
                  </button>
                ))}
              </div>
            ) : bonus.solved === null ? (
              <form className="write-row" onSubmit={(e) => { e.preventDefault(); bonusSolve(guess); }}>
                <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="¿Cuál es la palabra?" autoFocus />
                <button className="btn primary">¡Ya lo sé!</button>
              </form>
            ) : null}
          </div>
        )}
        {phase === 'end' && (
          <div className="panel end-panel">
            <div className="result-title">Fin del programa</div>
            <div className="players">
              {players.map((p) => (
                <div key={p.name} className="player-card"><small>{p.name}</small><b>{p.total}</b></div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn primary" onClick={() => useUI.getState().go('ruleta', { mode: params.mode ?? '', k: Date.now() })}>Jugar otra vez</button>
              <button className="btn" onClick={() => useUI.getState().go('ruleta', { mode: vsTeacher ? '' : 'profesor', k: Date.now() })}>{vsTeacher ? 'Contra la IA' : 'Profesor vs. alumno'}</button>
              <button className="btn ghost" onClick={() => useUI.getState().go('city', { spawn: 'plaza' })}>Volver a la plaza</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RuletaStage({ wheel, hostTalk }: { wheel: React.MutableRefObject<{ angle: number; target: number; spinning: boolean; onStop: null | ((i: number) => void) }>; hostTalk: boolean }) {
  const g = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const lastTick = useRef(0);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const x = c.getContext('2d')!;
    const n = SEGS.length;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n;
      const a1 = a0 + (Math.PI * 2) / n;
      x.beginPath();
      x.moveTo(512, 512);
      x.arc(512, 512, 500, a0, a1);
      x.closePath();
      x.fillStyle = SEGS[i].color;
      x.fill();
      x.strokeStyle = '#ffffff';
      x.lineWidth = 6;
      x.stroke();
      x.save();
      x.translate(512, 512);
      x.rotate(a0 + Math.PI / n + Math.PI / 2);
      x.fillStyle = ['#111111', '#2e6fd8', '#9b51e0'].includes(SEGS[i].color) ? '#ffffff' : '#1b2233';
      x.font = `900 ${SEGS[i].label.length > 5 ? 34 : 60}px Rajdhani, Arial`;
      x.textAlign = 'center';
      x.fillText(SEGS[i].label, 0, -340);
      x.restore();
    }
    x.beginPath();
    x.arc(512, 512, 110, 0, Math.PI * 2);
    x.fillStyle = '#1b2233';
    x.fill();
    x.fillStyle = '#ff7a1a';
    x.font = '900 120px Rajdhani, Arial';
    x.textAlign = 'center';
    x.fillText('7', 512, 555);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame(({ camera }, dt) => {
    camera.position.set(0, 4.2, 6.2);
    camera.lookAt(0, 0.6, 0);
    const w = wheel.current;
    if (w.spinning) {
      const d = w.target - w.angle;
      const step = Math.max(0.004, d * Math.min(1, dt * 1.6));
      w.angle += Math.min(d, step);
      const segA = (Math.PI * 2) / SEGS.length;
      if (Math.floor(w.angle / segA) !== lastTick.current) {
        lastTick.current = Math.floor(w.angle / segA);
        sfx('tick');
      }
      if (d < 0.002) {
        w.angle = w.target;
        w.spinning = false;
        const cb = w.onStop;
        w.onStop = null;
        cb?.(0);
      }
    }
    if (g.current) g.current.rotation.y = w.angle;
    anim.current.talk = hostTalk && Math.sin(performance.now() / 300) > -0.2;
  });
  return (
    <>
      <color attach="background" args={['#120a2a']} />
      <ambientLight intensity={0.6} />
      <spotLight position={[0, 8, 3]} angle={0.6} penumbra={0.5} intensity={120} castShadow />
      <pointLight position={[-4, 3, 2]} intensity={20} color="#ff4fd8" />
      <pointLight position={[4, 3, 2]} intensity={20} color="#56ccf2" />
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[12, 48]} />
        <meshStandardMaterial color="#2a1650" metalness={0.6} roughness={0.25} />
      </mesh>
      {[3.5, 5, 6.5].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[r, r + 0.06, 64]} />
          <meshBasicMaterial color={r === 5 ? '#ff4fd8' : '#56ccf2'} />
        </mesh>
      ))}
      {/* wheel */}
      <group position={[0, 0.6, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[2.75, 2.9, 0.4, 64]} />
          <meshStandardMaterial color="#c0c6ce" metalness={0.8} roughness={0.2} />
        </mesh>
        <group ref={g}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[2.6, 64]} />
            <meshStandardMaterial map={tex} roughness={0.4} />
          </mesh>
          {SEGS.map((_, i) => {
            const a = (i / SEGS.length) * Math.PI * 2 + Math.PI / SEGS.length;
            return (
              <mesh key={i} position={[Math.sin(a) * 2.55, 0.1, -Math.cos(a) * 2.55]}>
                <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
                <meshStandardMaterial color="#ffd34d" metalness={1} roughness={0.2} />
              </mesh>
            );
          })}
        </group>
        {/* pointer */}
        <mesh position={[0, 0.25, -2.75]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.18, 0.5, 3]} />
          <meshStandardMaterial color="#ff2d2d" emissive="#ff2d2d" emissiveIntensity={0.6} />
        </mesh>
      </group>
      {/* host */}
      <group position={[3.6, 0, -1.4]} rotation={[0, -0.7, 0]}>
        <Humanoid look={CHARACTERS.presentador.look} anim={anim} />
      </group>
      {/* podiums */}
      {[-3.6, -2.2].map((x, i) => (
        <mesh key={x} position={[x, 0.5, -2.4 + i * 0.6]}>
          <boxGeometry args={[1.1, 1, 0.8]} />
          <meshStandardMaterial color={['#27ae60', '#9b51e0'][i]} emissive={['#27ae60', '#9b51e0'][i]} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </>
  );
}
