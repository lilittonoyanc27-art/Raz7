import { useEffect, useMemo, useRef, useState } from 'react';
import { MEM_MODES, type Face, type MemMode } from '../data/memory';
import { useProgress, useUI } from '../core/store';
import type { T } from '../core/types';
import { sample, shuffle } from '../core/random';
import { playMusic, sfx, speak } from '../core/audio';
import { Es, openTranslation } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { Pic } from '../ui/Pics';
import { StatsBar, TopLeft, fmt, usePlayTime } from '../ui/HUD';

const T_ = (es: string, hy: string): T => ({ es, hy });
interface Card { key: string; pair: string; face: Face; t: T }
type Opp = 'solo' | 'ia' | 'profesor';
const DIFF = [
  { id: 'facil', es: 'Fácil', n: 6, cols: 4 },
  { id: 'medio', es: 'Medio', n: 8, cols: 4 },
  { id: 'dificil', es: 'Difícil', n: 10, cols: 5 },
];

export function Memory() {
  usePlayTime();
  const [mode, setMode] = useState<MemMode | null>(null);
  const [diff, setDiff] = useState(DIFF[0]);
  const [opp, setOpp] = useState<Opp>((useUI.getState().params.mode as Opp) === 'profesor' ? 'profesor' : 'solo');
  useEffect(() => playMusic('quiz'), []);
  if (!mode)
    return (
      <div className="page">
        <div className="page-head">
          <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
          <div>
            <h1>Memory Champions</h1>
            <div className="sub">Encuentra las parejas · Գտիր զույգերը</div>
          </div>
        </div>
        <div className="wrap">
          <div className="row" style={{ marginBottom: 14, alignItems: 'center' }}>
            <div className="seg">
              {DIFF.map((d) => (
                <button key={d.id} className={diff.id === d.id ? 'on' : ''} onClick={() => setDiff(d)}>{d.es} · {d.n}</button>
              ))}
            </div>
            <div className="seg">
              <button className={opp === 'solo' ? 'on' : ''} onClick={() => setOpp('solo')}>Contrarreloj</button>
              <button className={opp === 'ia' ? 'on' : ''} onClick={() => setOpp('ia')}>Contra Leo (IA)</button>
              <button className={opp === 'profesor' ? 'on' : ''} onClick={() => setOpp('profesor')}>Profesor vs. alumno</button>
            </div>
          </div>
          <div className="grid">
            {MEM_MODES.map((m) => {
              const rec = useProgress.getState().records[`memory-${m.id}-${diff.id}`];
              return (
                <button key={m.id} className="card click" onClick={() => setMode(m)}>
                  <span className="stripe" style={{ background: '#27ae60' }} />
                  <h3>{m.title.es}</h3>
                  <p>{m.title.hy}</p>
                  <p><Es t={m.desc} /></p>
                  <div className="meta">{rec ? <span className="pill small gold">Récord: {fmt(rec)}</span> : <span className="pill small">Nuevo</span>}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  return <Board mode={mode} diff={diff} opp={opp} onExit={() => setMode(null)} />;
}

function Board({ mode, diff, opp, onExit }: { mode: MemMode; diff: (typeof DIFF)[number]; opp: Opp; onExit: () => void }) {
  const n = Math.min(diff.n, mode.pairs.length);
  const cards = useMemo<Card[]>(() => {
    const pairs = sample(mode.pairs, n);
    return shuffle(pairs.flatMap((p) => [{ key: p.id + 'a', pair: p.id, face: p.a, t: p.t }, { key: p.id + 'b', pair: p.id, face: p.b, t: p.t }]));
  }, []);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Record<string, number>>({}); // pair -> player index
  const [turn, setTurn] = useState(0);
  const [moves, setMoves] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [start] = useState(performance.now());
  const [now, setNow] = useState(performance.now());
  const [done, setDone] = useState(false);
  const seen = useRef(new Map<number, string>());
  const busy = useRef(false);
  const names = opp === 'ia' ? ['Razmik', 'Leo'] : opp === 'profesor' ? ['Alumno', 'Profesor'] : ['Razmik'];

  useEffect(() => {
    const iv = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(iv);
  }, []);

  const flip = (i: number, byAI = false) => {
    if (busy.current || open.includes(i) || matched[cards[i].pair] !== undefined || done) return;
    if (opp === 'ia' && turn === 1 && !byAI) return;
    sfx('flip');
    const c = cards[i];
    if (c.face.kind === 'audio') speak(c.face.text!);
    else if (c.face.kind === 'es' || (c.face.kind === 'text' && c.face.t)) speak(c.face.text!);
    seen.current.set(i, c.pair);
    const nextOpen = [...open, i];
    setOpen(nextOpen);
    if (nextOpen.length === 2) {
      busy.current = true;
      setMoves((m) => m + 1);
      const [a, b] = nextOpen;
      if (cards[a].pair === cards[b].pair) {
        setTimeout(() => {
          sfx('ok');
          const nm = { ...matched, [cards[a].pair]: turn };
          setMatched(nm);
          setScores((s) => s.map((v, k) => (k === turn ? v + 1 : v)));
          if (turn === 0 || opp === 'profesor') useProgress.getState().answer(cards[a].t, true, 'memoria');
          useProgress.getState().addWords([cards[a].t.es.toLowerCase()]);
          setOpen([]);
          busy.current = false;
          if (Object.keys(nm).length === n) finish(nm);
        }, 550);
      } else {
        setTimeout(() => {
          setOpen([]);
          busy.current = false;
          if (opp !== 'solo') setTurn((t) => 1 - t);
        }, 1100);
      }
    }
  };

  // AI opponent (remembers what it saw with 70% reliability)
  useEffect(() => {
    if (opp !== 'ia' || turn !== 1 || done) return;
    const t = setTimeout(() => {
      const avail = cards.map((_, i) => i).filter((i) => matched[cards[i].pair] === undefined);
      const known = new Map<string, number[]>();
      seen.current.forEach((p, i) => {
        if (matched[p] !== undefined) return;
        known.set(p, [...(known.get(p) ?? []), i]);
      });
      const pairKnown = [...known.values()].find((v) => v.length >= 2);
      let first: number;
      let second: number;
      if (pairKnown && Math.random() < 0.7) [first, second] = pairKnown;
      else {
        first = avail[Math.floor(Math.random() * avail.length)];
        const partner = (known.get(cards[first].pair) ?? []).find((x) => x !== first);
        second = partner !== undefined && Math.random() < 0.7 ? partner : avail.filter((x) => x !== first)[Math.floor(Math.random() * (avail.length - 1))];
      }
      flip(first, true);
      setTimeout(() => flipSecond(second), 700);
    }, 900);
    return () => clearTimeout(t);
  }, [turn, matched, done]);
  const flipRef = useRef(flip);
  flipRef.current = flip;
  const flipSecond = (i: number) => flipRef.current(i, true);

  const finish = (nm: Record<string, number>) => {
    setDone(true);
    const time = (performance.now() - start) / 1000;
    const p = useProgress.getState();
    const mine = Object.values(nm).filter((v) => v === 0).length;
    const won = opp === 'solo' || mine > n / 2;
    p.completeMission('memory-' + mode.id, 40 + n * 5, 10 + n * 2, won && opp === 'ia');
    if (opp === 'solo') p.setRecord(`memory-${mode.id}-${diff.id}`, Math.round(time), true);
    if (won) p.dailyProgress('memory');
    sfx(won ? 'win' : 'lose');
  };

  const time = ((done ? now : performance.now()) - start) / 1000;
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={onExit}><Icon name="close" /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24 }}>{mode.title.es}</h1>
          <div className="sub"><Es t={mode.desc} /></div>
        </div>
        <span className="pill">⏱ {fmt(time)}</span>
        <span className="pill">Movimientos: {moves}</span>
      </div>
      {opp !== 'solo' && (
        <div className="players" style={{ marginBottom: 10 }}>
          {names.map((nm, i) => (
            <div key={nm} className={'player-card ' + (turn === i ? 'turn' : '')}>
              <small>{nm}</small>
              <b>{scores[i]}</b>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="mem-grid" style={{ gridTemplateColumns: `repeat(${diff.cols}, 1fr)` }}>
          {cards.map((c, i) => {
            const isOpen = open.includes(i) || matched[c.pair] !== undefined;
            return (
              <div key={c.key} className={'mcard ' + (isOpen ? 'flipped ' : '') + (matched[c.pair] !== undefined ? 'matched' : '')} onClick={() => (matched[c.pair] !== undefined ? openTranslation(c.t) : flip(i))}>
                <div className="mcard-inner">
                  <div className="mface back" />
                  <div className="mface front">
                    <FaceView f={c.face} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {done && (
        <div className="modal-back">
          <div className="modal">
            <div className="result-title">{opp === 'solo' ? '¡Todas las parejas!' : scores[0] > scores[1] ? `¡Gana ${names[0]}!` : scores[0] === scores[1] ? '¡Empate!' : `Gana ${names[1]}`}</div>
            <div className="result-grid">
              <div><b>{fmt(time)}</b><span>Tiempo</span></div>
              <div><b>{moves}</b><span>Movimientos</span></div>
              {opp !== 'solo' && <div><b>{scores[0]} - {scores[1]}</b><span>Parejas</span></div>}
              <div><b>{Math.round((n / Math.max(n, moves)) * 100)}%</b><span>Precisión</span></div>
            </div>
            <Es t={T_('Toca una carta descubierta para ver la traducción.', 'Հպիր բացված քարտին՝ թարգմանությունը տեսնելու համար։')} />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={onExit}>Otro juego</button>
              <button className="btn ghost" onClick={() => setDone(false)}>Repasar las cartas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FaceView({ f }: { f: Face }) {
  if (f.kind === 'pic') return <div className="pic-wrap"><Pic id={f.pic!} /></div>;
  if (f.kind === 'audio')
    return (
      <div className="audio-face" onClick={(e) => { e.stopPropagation(); speak(f.text!); }}>
        <Icon name="speaker" size={34} color="#ff7a1a" />
        <small>Escuchar</small>
      </div>
    );
  if (f.kind === 'hy') return <span className="hy">{f.text}</span>;
  return <span>{f.text}</span>;
}
