import { useEffect, useMemo, useRef, useState } from 'react';
import { TRABALENGUAS, type TW } from '../data/trabalenguas';
import { useProgress, useUI } from '../core/store';
import type { T } from '../core/types';
import { playMusic, sfx, speak } from '../core/audio';
import { listenOnce, recognitionAvailable } from '../core/speech';
import { similarity, words } from '../core/evaluate';
import { Es, openTranslation } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { fmt, usePlayTime } from '../ui/HUD';

const T_ = (es: string, hy: string): T => ({ es, hy });
const DIFFS = [
  { d: 1, es: 'Fácil', hy: 'Հեշտ' },
  { d: 2, es: 'Medio', hy: 'Միջին' },
  { d: 3, es: 'Difícil', hy: 'Դժվար' },
] as const;

export function Trabalenguas() {
  usePlayTime();
  const params = useUI((s) => s.params);
  const [diff, setDiff] = useState<1 | 2 | 3>(1);
  const [sel, setSel] = useState<number | null>(null);
  const [duel, setDuel] = useState(params.mode === 'profesor');
  useEffect(() => playMusic('calm'), []);
  const list = TRABALENGUAS.map((t, i) => ({ t, i })).filter((x) => x.t.diff === diff);
  if (sel !== null) return <Practice tw={TRABALENGUAS[sel]} idx={sel} duel={duel} onBack={() => setSel(null)} onNext={() => setSel((s) => { const l = TRABALENGUAS.map((t, i) => ({ t, i })).filter((x) => x.t.diff === TRABALENGUAS[s!].diff); const k = l.findIndex((x) => x.i === s); return l[(k + 1) % l.length].i; })} />;
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
        <div>
          <h1>Reto de trabalenguas</h1>
          <div className="sub">Շուտասելուկների մարտահրավեր · {TRABALENGUAS.length} trabalenguas</div>
        </div>
      </div>
      <div className="wrap">
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="seg">
            {DIFFS.map((d) => (
              <button key={d.d} className={diff === d.d ? 'on' : ''} onClick={() => setDiff(d.d)}>{d.es} · {d.hy}</button>
            ))}
          </div>
          <div className="seg">
            <button className={!duel ? 'on' : ''} onClick={() => setDuel(false)}>Solo</button>
            <button className={duel ? 'on' : ''} onClick={() => setDuel(true)}>Contra el profesor</button>
          </div>
        </div>
        {!recognitionAvailable() && (
          <div className="panel note" style={{ marginBottom: 12 }}>
            <Es t={T_('Tu navegador no tiene reconocimiento de voz: se medirá solo el tiempo, sin nota de pronunciación.', 'Քո դիտարկիչը ձայնի ճանաչում չունի․ կչափվի միայն ժամանակը՝ առանց արտասանության գնահատականի։')} />
          </div>
        )}
        <div className="grid">
          {list.map(({ t, i }) => {
            const rec = useProgress.getState().records['trabalenguas-' + i];
            return (
              <button key={i} className="card click" onClick={() => setSel(i)}>
                <span className="stripe" style={{ background: ['#27ae60', '#f2994a', '#e14b4b'][t.diff - 1] }} />
                <p style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{t.t.es}</p>
                <div className="meta">{rec ? <span className="pill small gold">Récord: {rec.toFixed(1)} s</span> : <span className="pill small">Sin récord</span>}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Attempt { who: string; time: number; score: number | null; heard?: string }

function Practice({ tw, idx, duel, onBack, onNext }: { tw: TW; idx: number; duel: boolean; onBack: () => void; onNext: () => void }) {
  const [state, setState] = useState<'idle' | 'running' | 'listening'>('idle');
  const [t0, setT0] = useState(0);
  const [now, setNow] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [turn, setTurn] = useState(0);
  const [interim, setInterim] = useState('');
  const stopRef = useRef<() => void>(() => {});
  const hasRec = recognitionAvailable();
  const who = duel ? (turn % 2 === 0 ? 'Razmik' : 'Profesor') : 'Razmik';
  const wc = useMemo(() => words(tw.t.es).length, [tw]);

  useEffect(() => {
    if (state === 'idle') return;
    const iv = setInterval(() => setNow(performance.now()), 50);
    return () => clearInterval(iv);
  }, [state]);

  const start = () => {
    sfx('tick');
    const t = performance.now();
    setT0(t);
    setNow(t);
    setInterim('');
    if (hasRec) {
      setState('listening');
      const l = listenOnce((x) => setInterim(x));
      stopRef.current = l.stop;
      l.promise
        .then((r) => finish(r.text))
        .catch(() => {
          setState('idle');
          useUI.getState().toast(T_('No te he oído. Acerca el micrófono e inténtalo otra vez.', 'Քեզ չլսեցի։ Մոտեցրու միկրոֆոնը և նորից փորձիր։'), 'bad');
        });
    } else setState('running');
  };

  const finish = (heard?: string) => {
    const time = (performance.now() - t0) / 1000;
    setState('idle');
    const score = heard !== undefined ? Math.round(similarity(tw.t.es, heard) * 100) : null;
    const a: Attempt = { who, time, score, heard };
    setAttempts((x) => [a, ...x].slice(0, 12));
    const p = useProgress.getState();
    if (who === 'Razmik') {
      p.dailyProgress('trabalenguas');
      if (score !== null) {
        p.answer(tw.t, score >= 75, 'pronunciacion');
        if (score >= 75 && p.setRecord('trabalenguas-' + idx, Math.round(time * 10) / 10, true)) {
          sfx('win');
          useUI.getState().toast(T_('¡Nuevo récord!', 'Նոր ռեկորդ։'), 'gold');
        } else sfx(score >= 75 ? 'ok' : 'wrong');
        if (score >= 75) p.addXP(10 + tw.diff * 5);
      } else {
        p.addXP(5);
        sfx('ok');
      }
    }
    if (duel) setTurn((t) => t + 1);
  };

  const elapsed = state !== 'idle' ? (now - t0) / 1000 : 0;
  const speedTarget = (wc / [2.2, 2.8, 3.4][tw.diff - 1]).toFixed(1);
  const lastR = attempts.find((a) => a.who === 'Razmik');
  const lastP = attempts.find((a) => a.who === 'Profesor');

  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={onBack}><Icon name="close" /></button>
        <h1 style={{ fontSize: 24, flex: 1 }}>Trabalenguas</h1>
        {duel && <span className="pill gold">Turno: {who}</span>}
      </div>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="panel" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.45, textAlign: 'center' }}>
          <Es t={tw.t} />
        </div>
        <div className="row" style={{ justifyContent: 'center', margin: '12px 0' }}>
          <button className="btn" onClick={() => speak(tw.t.es)}><Icon name="speaker" /> Escuchar</button>
          <button className="btn ghost" onClick={() => speak(tw.t.es, { slow: true })}><Icon name="slow" /> Más despacio</button>
          <button className="btn ghost" onClick={() => openTranslation(tw.t)}><Icon name="translate" /> Traducción</button>
        </div>
        <div style={{ textAlign: 'center', margin: '18px 0' }}>
          <div style={{ fontFamily: 'var(--head)', fontSize: 64, fontWeight: 800 }}>{elapsed.toFixed(1)} s</div>
          <div className="hint">Objetivo de velocidad: menos de {speedTarget} s</div>
          {state === 'listening' && <div className="interim">{interim || 'Escuchando…'}</div>}
          <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
            {state === 'idle' && <button className="btn primary" onClick={start}><Icon name={hasRec ? 'mic' : 'bolt'} /> {hasRec ? '¡Empezar y hablar!' : 'Empezar cronómetro'}</button>}
            {state === 'running' && <button className="btn red" onClick={() => finish()}>Parar</button>}
            {state === 'listening' && <button className="btn red" onClick={() => stopRef.current()}>He terminado</button>}
            <button className="btn ghost" onClick={onNext}>Siguiente</button>
          </div>
        </div>
        {duel && (lastR || lastP) && (
          <div className="players" style={{ marginBottom: 12 }}>
            <div className="player-card"><small>Razmik</small><b>{lastR ? lastR.time.toFixed(1) + ' s' : '—'}</b><small>{lastR?.score != null ? lastR.score + '%' : ''}</small></div>
            <div className="player-card"><small>Profesor</small><b>{lastP ? lastP.time.toFixed(1) + ' s' : '—'}</b><small>{lastP?.score != null ? lastP.score + '%' : ''}</small></div>
          </div>
        )}
        {attempts.length > 0 && (
          <table className="tbl">
            <thead>
              <tr><th>Quién</th><th>Tiempo</th><th>Pronunciación</th><th>Lo que he oído</th></tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={i}>
                  <td>{a.who}</td>
                  <td>{a.time.toFixed(1)} s</td>
                  <td>{a.score === null ? <span className="hint">sin reconocimiento</span> : <b style={{ color: a.score >= 75 ? '#2fbf71' : '#ffd34d' }}>{a.score}%</b>}</td>
                  <td style={{ color: '#a9b4c9' }}>{a.heard ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {useProgress.getState().records['trabalenguas-' + idx] && <p className="hint">Tu récord: {fmt(useProgress.getState().records['trabalenguas-' + idx])} ({useProgress.getState().records['trabalenguas-' + idx]} s)</p>}
      </div>
    </div>
  );
}
