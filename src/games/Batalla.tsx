import { useEffect, useMemo, useRef, useState } from 'react';
import { QUIZ, QUIZ_CATS, type Q } from '../data/quiz';
import { useProgress, useUI } from '../core/store';
import { levelIndex, type T } from '../core/types';
import { shuffle } from '../core/random';
import { playMusic, sfx, speak } from '../core/audio';
import { Es, openTranslation } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { usePlayTime } from '../ui/HUD';

const T_ = (es: string, hy: string): T => ({ es, hy });
const RIVALS = ['Leo', 'Sofía', 'Hugo', 'Dani', 'Noa', 'Marta', 'Pablo'];
const ROUNDS = [T_('Cuartos de final', 'Քառորդ եզրափակիչ'), T_('Semifinal', 'Կիսաեզրափակիչ'), T_('Final', 'Եզրափակիչ')];
const PER_MATCH = 5;

interface PreparedQ { q: Q; opts: { t: T; ok: boolean }[] }
const prep = (q: Q): PreparedQ => ({ q, opts: shuffle(q.options.map((t, i) => ({ t, ok: i === q.answer }))) });

export function Batalla() {
  usePlayTime();
  const params = useUI((s) => s.params);
  const [mode, setMode] = useState<'torneo' | 'profesor' | null>(params.mode === 'profesor' ? 'profesor' : null);
  const [cats, setCats] = useState<string[]>(Object.keys(QUIZ_CATS));
  useEffect(() => playMusic('quiz'), []);
  if (!mode)
    return (
      <div className="page">
        <div className="page-head">
          <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
          <div>
            <h1>Batalla de conocimientos</h1>
            <div className="sub">Գիտելիքների ճակատամարտ · Campeonato con rivales virtuales</div>
          </div>
        </div>
        <div className="wrap">
          <div className="section-title">Categorías</div>
          <div className="row">
            {Object.entries(QUIZ_CATS).map(([k, t]) => (
              <button key={k} className={'btn small ' + (cats.includes(k) ? 'primary' : 'ghost')} onClick={() => setCats((c) => (c.includes(k) ? (c.length > 1 ? c.filter((x) => x !== k) : c) : [...c, k]))}>
                {t.es}
              </button>
            ))}
          </div>
          <div className="grid" style={{ marginTop: 16 }}>
            <button className="card click" onClick={() => setMode('torneo')}>
              <span className="stripe" style={{ background: '#e14b4b' }} />
              <h3>Torneo</h3>
              <p>Cuartos, semifinal y final contra rivales virtuales.</p>
              <p>Քառորդ եզրափակիչ, կիսաեզրափակիչ և եզրափակիչ վիրտուալ մրցակիցների դեմ։</p>
            </button>
            <button className="card click" onClick={() => setMode('profesor')}>
              <span className="stripe" style={{ background: '#2e6fd8' }} />
              <h3>Profesor vs. alumno</h3>
              <p>Respondéis por turnos. Gana quien acierte más.</p>
              <p>Պատասխանում եք հերթով։ Հաղթում է նա, ով ավելի շատ ճիշտ կպատասխանի։</p>
            </button>
          </div>
        </div>
      </div>
    );
  return mode === 'torneo' ? <Tournament cats={cats} /> : <TeacherDuel cats={cats} />;
}

function useQuestionPool(cats: string[]) {
  const lvl = useProgress((s) => s.level);
  return useMemo(() => shuffle(QUIZ.filter((q) => cats.includes(q.cat) && levelIndex(q.lvl) <= levelIndex(lvl))).map(prep), []);
}

function Tournament({ cats }: { cats: string[] }) {
  const pool = useQuestionPool(cats);
  const [round, setRound] = useState(0);
  const rivals = useMemo(() => shuffle(RIVALS), []);
  const [qi, setQi] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [state, setState] = useState<'bracket' | 'play' | 'between' | 'champion' | 'out'>('bracket');
  const cursor = useRef(0);
  const nextQ = () => {
    const q = pool[cursor.current % pool.length];
    cursor.current++;
    return q;
  };
  const [cur, setCur] = useState<PreparedQ>(() => nextQ());
  const rivalAcc = [0.5, 0.62, 0.74][round];
  const lvl = useProgress((s) => s.level);

  const onAnswer = (ok: boolean, time: number) => {
    const p = useProgress.getState();
    p.answer(cur.q.q, ok, cur.q.cat, cur.q.listen);
    const mine = ok ? 100 + Math.round(time * 5) : 0;
    const rv = Math.random() < rivalAcc ? 100 + Math.round(Math.random() * 60) : 0;
    const ns: [number, number] = [scores[0] + mine, scores[1] + rv];
    setScores(ns);
    if (qi + 1 >= PER_MATCH && ns[0] !== ns[1]) {
      setTimeout(() => {
        if (ns[0] > ns[1]) {
          sfx('win');
          if (round === 2) {
            p.completeMission('batalla', 200, 60, true);
            p.addMedal('Campeón de la Batalla');
            p.setRecord('batalla-campeon', (p.records['batalla-campeon'] ?? 0) + 1);
            setState('champion');
          } else setState('between');
        } else {
          sfx('lose');
          p.completeMission('batalla-participacion', 40 + round * 30, 10 + round * 10);
          setState('out');
        }
      }, 300);
    } else {
      setQi(qi + 1);
      setCur(nextQ());
    }
  };

  if (state === 'bracket' || state === 'between')
    return (
      <div className="page">
        <div className="page-head">
          <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
          <h1>{ROUNDS[round + (state === 'between' ? 1 : 0)].es}</h1>
        </div>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <Bracket round={round + (state === 'between' ? 1 : 0)} rivals={rivals} />
          <p style={{ color: '#c8d2e5' }}>
            <Es t={T_(`Tu rival: ${rivals[round + (state === 'between' ? 1 : 0)]}. ${PER_MATCH} preguntas. ¡Responde rápido para ganar más puntos!`, `Քո մրցակիցը՝ ${rivals[round + (state === 'between' ? 1 : 0)]}։ ${PER_MATCH} հարց։ Արագ պատասխանիր՝ ավելի շատ միավոր վաստակելու համար։`)} />
          </p>
          <button
            className="btn primary"
            onClick={() => {
              if (state === 'between') setRound(round + 1);
              setQi(0);
              setScores([0, 0]);
              setCur(nextQ());
              setState('play');
            }}
          >
            ¡A jugar!
          </button>
        </div>
      </div>
    );
  if (state === 'champion' || state === 'out')
    return (
      <div className="page">
        <div className="center-col">
          <div className="modal" style={{ textAlign: 'center' }}>
            <div className="result-title">{state === 'champion' ? '¡CAMPEÓN!' : 'Eliminado…'}</div>
            <Es t={state === 'champion' ? T_('Has ganado la Batalla de conocimientos. ¡Eres un crack!', 'Հաղթեցիր Գիտելիքների ճակատամարտում։ Դու աստղ ես։') : T_(`Has llegado a: ${ROUNDS[round].es}. ¡La próxima vez llegarás más lejos!`, `Հասար՝ ${ROUNDS[round].hy}։ Հաջորդ անգամ ավելի հեռու կգնաս։`)} />
            <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
              <button className="btn primary" onClick={() => useUI.getState().go('batalla', { k: Date.now() })}>Nuevo torneo</button>
              <button className="btn ghost" onClick={() => useUI.getState().go('city', { spawn: 'plaza' })}>Volver a la plaza</button>
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <QuestionView key={cursor.current} pq={cur} lvl={lvl} onAnswer={onAnswer} header={
      <div className="players">
        <div className="player-card turn"><small>Razmik</small><b>{scores[0]}</b></div>
        <div className="player-card"><small>{rivals[round]} · IA</small><b>{scores[1]}</b></div>
        <span className="pill">{ROUNDS[round].es} · {Math.min(qi + 1, PER_MATCH)}/{PER_MATCH}{qi + 1 > PER_MATCH ? ' · ¡Muerte súbita!' : ''}</span>
      </div>
    } />
  );
}

function Bracket({ round, rivals }: { round: number; rivals: string[] }) {
  const qf = [['Razmik', rivals[0]], [rivals[3], rivals[4]], [rivals[5], rivals[6]], [rivals[1], rivals[2]]];
  return (
    <div className="bracket" style={{ margin: '14px 0' }}>
      <div className="rd">
        {qf.map((m, i) => (
          <div key={i} className="m">{m.map((p, k) => <div key={k} className={round > 0 && (p === 'Razmik' || (i === 3 && k === 0) || (i === 1 && k === 0) || (i === 2 && k === 1)) ? 'w' : ''}>{p}</div>)}</div>
        ))}
      </div>
      <div className="rd">
        <div className="m">{round >= 1 ? <><div className={round > 1 ? 'w' : ''}>Razmik</div><div>{rivals[1]}</div></> : '—'}</div>
        <div className="m">{round >= 1 ? <><div>{rivals[3]}</div><div className={round > 1 ? 'w' : ''}>{rivals[2]}</div></> : '—'}</div>
      </div>
      <div className="rd">
        <div className="m">{round >= 2 ? <><div>Razmik</div><div>{rivals[2]}</div></> : '—'}</div>
      </div>
    </div>
  );
}

function TeacherDuel({ cats }: { cats: string[] }) {
  const pool = useQuestionPool(cats);
  const lvl = useProgress((s) => s.level);
  const [i, setI] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const total = 10;
  const who = i % 2;
  if (i >= total)
    return (
      <div className="page">
        <div className="center-col">
          <div className="modal" style={{ textAlign: 'center' }}>
            <div className="result-title">{scores[0] > scores[1] ? '¡Gana el alumno!' : scores[0] < scores[1] ? '¡Gana el profesor!' : '¡Empate!'}</div>
            <div className="players"><div className="player-card"><small>Alumno</small><b>{scores[0]}</b></div><div className="player-card"><small>Profesor</small><b>{scores[1]}</b></div></div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
              <button className="btn primary" onClick={() => useUI.getState().go('batalla', { mode: 'profesor', k: Date.now() })}>Revancha</button>
              <button className="btn ghost" onClick={() => useUI.getState().go('menu')}>Menú</button>
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <QuestionView
      key={i}
      pq={pool[i % pool.length]}
      lvl={lvl}
      onAnswer={(ok) => {
        if (who === 0) useProgress.getState().answer(pool[i % pool.length].q.q, ok, pool[i % pool.length].q.cat, pool[i % pool.length].q.listen);
        setScores((s) => s.map((v, k) => (k === who && ok ? v + 1 : v)));
        setI(i + 1);
        if (i + 1 >= total) useProgress.getState().completeMission('batalla-profesor', 60, 15);
      }}
      header={
        <div className="players">
          <div className={'player-card ' + (who === 0 ? 'turn' : '')}><small>Alumno (Razmik)</small><b>{scores[0]}</b></div>
          <div className={'player-card ' + (who === 1 ? 'turn' : '')}><small>Profesor</small><b>{scores[1]}</b></div>
          <span className="pill">Turno: {who === 0 ? 'Alumno' : 'Profesor'} · {i + 1}/{total}</span>
        </div>
      }
    />
  );
}

function QuestionView({ pq, onAnswer, header, lvl }: { pq: PreparedQ; onAnswer: (ok: boolean, timeLeft: number) => void; header: React.ReactNode; lvl: string }) {
  const limit = lvl === 'A1' ? 25 : lvl === 'A2' ? 20 : 16;
  const [left, setLeft] = useState(limit);
  const [picked, setPicked] = useState<number | null>(null);
  const [showText, setShowText] = useState(!pq.q.listen);
  const done = useRef(false);
  useEffect(() => {
    speak(pq.q.q.es);
    const iv = setInterval(() => setLeft((l) => Math.max(0, l - 0.25)), 250);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (left <= 0 && !done.current) choose(-1);
  }, [left]);
  const choose = (i: number) => {
    if (done.current) return;
    done.current = true;
    setPicked(i);
    const ok = i >= 0 && pq.opts[i].ok;
    sfx(ok ? 'ok' : 'wrong');
    if (!ok) speak(pq.q.explain.es);
    setTimeout(() => onAnswer(ok, left), ok ? 900 : 2600);
  };
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
        <div style={{ flex: 1 }}>{header}</div>
      </div>
      <div className="center-col" style={{ position: 'relative', padding: 0 }}>
        <div className="panel q-card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="pill">{QUIZ_CATS[pq.q.cat].es}</span>
            <span className="pill">{Math.ceil(left)} s</span>
          </div>
          <div className="timebar"><div style={{ width: `${(left / limit) * 100}%` }} /></div>
          {showText ? (
            <div className="q-text"><Es t={pq.q.q} /></div>
          ) : (
            <div className="q-text listen">
              <button className="btn primary" onClick={() => speak(pq.q.q.es)}><Icon name="speaker" /> Escuchar otra vez</button>
              <button className="btn ghost" onClick={() => speak(pq.q.q.es, { slow: true })}><Icon name="slow" /> Despacio</button>
              <button className="btn ghost small" onClick={() => setShowText(true)}>Ver el texto</button>
              <div className="hint">Escucha y elige lo que has oído.</div>
            </div>
          )}
          <div className="q-opts">
            {pq.opts.map((o, i) => (
              <button key={i} className={'q-opt ' + (picked !== null && o.ok ? 'right' : picked === i && !o.ok ? 'wrongp' : '')} onClick={() => choose(i)} disabled={picked !== null}>
                <span className="lt">{'ABCD'[i]}</span>
                <span>{o.t.es}</span>
                <span className="grow" />
                <span className="option-tr" style={{ background: 'transparent' }} onClick={(e) => { e.stopPropagation(); openTranslation(o.t); }}><Icon name="translate" size={16} /></span>
              </button>
            ))}
          </div>
          {picked !== null && !(picked >= 0 && pq.opts[picked].ok) && (
            <div className="feedback" style={{ marginTop: 10 }}>
              <div className="tip"><Es t={pq.q.explain} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
