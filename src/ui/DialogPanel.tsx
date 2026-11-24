import { useEffect, useRef, useState } from 'react';
import { useProgress, useUI, type DialogOption } from '../core/store';
import { repeatLast, sfx, speak } from '../core/audio';
import { Es, openTranslation } from './Es';
import { Icon } from './Icon';
import { evaluateFree, type Feedback } from '../core/evaluate';
import { listenOnce, recognitionAvailable } from '../core/speech';
import type { T } from '../core/types';
import { shuffle } from '../core/random';

const WRONG_REPLIES: T[] = [
  { es: 'Mmm… no exactamente. Escucha otra vez.', hy: 'Մմմ… ոչ այնքան։ Նորից լսիր։' },
  { es: 'Casi. Inténtalo de nuevo.', hy: 'Գրեթե։ Նորից փորձիր։' },
  { es: 'No, no es eso. ¡Tú puedes!', hy: 'Ոչ, դա չէ։ Դու կարող ես։' },
];

export function DialogPanel() {
  const d = useUI((s) => s.dialog);
  const [phase, setPhase] = useState<'lines' | 'answer' | 'reply'>('lines');
  const [reply, setReply] = useState<T | null>(null);
  const [disabled, setDisabled] = useState<Set<number>>(new Set());
  const [opts, setOpts] = useState<DialogOption[]>([]);
  const [mode, setMode] = useState<'choose' | 'write' | 'speak'>('choose');
  const [text, setText] = useState('');
  const [fb, setFb] = useState<Feedback | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const wrongCount = useRef(0);
  const result = useRef<{ ok: boolean | null; picked?: DialogOption }>({ ok: null });
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!d) return;
    setPhase('lines');
    setReply(null);
    setDisabled(new Set());
    setOpts(d.options ? shuffle(d.options) : []);
    setMode(d.options ? 'choose' : d.free ? 'write' : 'choose');
    setText('');
    setFb(null);
    setInterim('');
    wrongCount.current = 0;
    result.current = { ok: null };
  }, [d?.id]);

  const line = d?.lines[d.index];
  useEffect(() => {
    if (!d || !line || phase !== 'lines' || d.noAutoSpeak) return;
    speak(line.t.es, { pitch: line.pitch ?? (line.speaker === 'Razmik' ? 1.3 : d.pitch) });
  }, [d?.id, d?.index, phase]);

  if (!d || !line) return null;
  const last = d.index >= d.lines.length - 1;
  const needsAnswer = !!(d.options?.length || d.free);

  const finish = () => {
    const cb = d.onClose;
    useUI.getState().closeDialog();
    useProgress.getState().addDialog();
    cb?.(result.current);
  };

  const next = () => {
    sfx('click');
    if (!last) useUI.getState().setDialogIndex(d.index + 1);
    else if (needsAnswer) setPhase('answer');
    else finish();
  };

  const pick = (o: DialogOption, i: number) => {
    const p = useProgress.getState();
    if (o.ok === false) {
      sfx('wrong');
      wrongCount.current++;
      p.answer(d.lines[d.lines.length - 1].t, false, d.cat ?? 'dialogo', d.listening);
      const r = o.reply ?? WRONG_REPLIES[wrongCount.current % WRONG_REPLIES.length];
      speak(r.es, { pitch: d.pitch });
      setReply(r);
      setDisabled(new Set([...disabled, i]));
      return;
    }
    if (o.ok === true) {
      sfx('ok');
      p.answer(o.t, wrongCount.current === 0, d.cat ?? 'dialogo', d.listening);
      if (wrongCount.current === 0) p.addXP(10);
    } else sfx('click');
    result.current = { ok: o.ok ?? null, picked: o };
    o.onPick?.();
    if (o.reply) {
      setReply(o.reply);
      setPhase('reply');
      speak(o.reply.es, { pitch: d.pitch });
    } else finish();
  };

  const submitFree = (ans: string) => {
    if (!d.free || !ans.trim()) return;
    const f = evaluateFree(ans, d.free.accept, d.free.minWords ?? 2);
    setFb(f);
    const p = useProgress.getState();
    p.answer(d.lines[d.lines.length - 1].t, f.ok, d.cat ?? 'conversacion');
    p.addWritten({ q: d.lines[d.lines.length - 1].t.es, a: ans, ok: f.ok, date: Date.now(), mode: d.cat ?? 'conversacion' });
    p.dailyProgress('speak');
    if (f.ok) {
      sfx('ok');
      p.addXP(15);
      result.current = { ok: true };
      const r: T = { es: '¡Muy bien dicho! Te entiendo perfectamente.', hy: 'Շատ լավ ասացիր։ Քեզ հիանալի հասկանում եմ։' };
      speak(r.es, { pitch: d.pitch });
      setReply(r);
    } else {
      sfx('wrong');
      result.current = { ok: false };
      const r: T = { es: 'Te entiendo un poco. Mira cómo se puede decir:', hy: 'Քեզ մի քիչ հասկանում եմ։ Տես, թե ինչպես կարելի է ասել․' };
      speak(r.es, { pitch: d.pitch });
      setReply(r);
    }
  };

  const startMic = () => {
    setListening(true);
    setInterim('');
    const l = listenOnce((t) => setInterim(t));
    stopRef.current = l.stop;
    l.promise
      .then((r) => {
        setText(r.text);
        setListening(false);
        submitFree(r.text);
      })
      .catch(() => {
        setListening(false);
        setInterim('');
        useUI.getState().toast({ es: 'No te he oído bien. Puedes escribir la respuesta.', hy: 'Քեզ լավ չլսեցի։ Կարող ես գրել պատասխանը։' }, 'bad');
      });
  };

  return (
    <div className="dialog-wrap" onClick={(e) => e.stopPropagation()}>
      <div className="dialog">
        <div className="dialog-head">
          <span className={'speaker ' + (line.speaker === 'Razmik' ? 'me' : '')}>{line.speaker || d.speaker}</span>
          {d.role && line.speaker !== 'Razmik' && <span className="role">{d.role}</span>}
          <span className="grow" />
          <button className="icon-btn" title="Escuchar" onClick={() => speak(line.t.es, { pitch: line.pitch ?? d.pitch })}>
            <Icon name="speaker" />
          </button>
          <button className="icon-btn" title="Repetir" onClick={() => repeatLast()}>
            <Icon name="repeat" />
          </button>
          <button className="icon-btn" title="Escuchar más despacio" onClick={() => speak(line.t.es, { slow: true, pitch: line.pitch ?? d.pitch })}>
            <Icon name="slow" />
          </button>
          <button className="icon-btn" title="Ver traducción" onClick={() => openTranslation(phase === 'reply' && reply ? reply : line.t)}>
            <Icon name="translate" />
          </button>
        </div>

        {phase !== 'reply' && (
          <div className="dialog-line">
            <Es t={line.t} />
          </div>
        )}
        {reply && (
          <div className={'dialog-reply ' + (phase === 'reply' || result.current.ok ? 'good' : 'bad')}>
            <Es t={reply} />
          </div>
        )}

        {phase === 'lines' && (
          <div className="dialog-actions">
            <span className="hint">{d.index + 1}/{d.lines.length}</span>
            <button className="btn primary" onClick={next}>
              {last && needsAnswer ? 'Responder' : last ? 'Entendido' : 'Siguiente'} <Icon name="next" />
            </button>
          </div>
        )}

        {phase === 'answer' && (
          <>
            {d.free && d.options && (
              <div className="tabs">
                <button className={mode === 'choose' ? 'on' : ''} onClick={() => setMode('choose')}>Elegir</button>
                <button className={mode === 'write' ? 'on' : ''} onClick={() => setMode('write')}><Icon name="pen" size={14} /> Escribir</button>
                {recognitionAvailable() && (
                  <button className={mode === 'speak' ? 'on' : ''} onClick={() => setMode('speak')}><Icon name="mic" size={14} /> Hablar</button>
                )}
              </div>
            )}
            {mode === 'choose' && opts.length > 0 && (
              <div className="options">
                {opts.map((o, i) => (
                  <div key={i} className={'option ' + (disabled.has(i) ? 'off' : '')}>
                    <button className="option-main" disabled={disabled.has(i)} onClick={() => pick(o, i)}>
                      {o.t.es}
                    </button>
                    <button className="option-tr" title="Ver traducción" onClick={() => openTranslation(o.t)}>
                      <Icon name="translate" size={16} />
                    </button>
                    <button className="option-tr" title="Escuchar" onClick={() => speak(o.t.es)}>
                      <Icon name="speaker" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {d.free && (mode === 'write' || mode === 'speak' || !opts.length) && !fb && (
              <div className="free">
                {mode === 'speak' ? (
                  <div className="mic-row">
                    <button className={'btn primary ' + (listening ? 'pulse' : '')} onClick={() => (listening ? stopRef.current() : startMic())}>
                      <Icon name="mic" /> {listening ? 'Escuchando… (toca para parar)' : 'Responder con la voz'}
                    </button>
                    <div className="interim">{interim}</div>
                  </div>
                ) : (
                  <form
                    className="write-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitFree(text);
                    }}
                  >
                    <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu respuesta en español…" autoFocus lang="es" />
                    {recognitionAvailable() && (
                      <button type="button" className="icon-btn" title="Micrófono" onClick={() => { setMode('speak'); startMic(); }}>
                        <Icon name="mic" />
                      </button>
                    )}
                    <button className="btn primary" type="submit">Enviar</button>
                  </form>
                )}
              </div>
            )}
            {fb && d.free && (
              <div className="feedback">
                <div className="you">«{text}»</div>
                {fb.tips.map((tp, i) => (
                  <div key={i} className="tip"><Es t={tp} /></div>
                ))}
                <div className="model">
                  <span>Ejemplo:</span> <Es t={d.free.model} />
                  <button className="icon-btn" onClick={() => speak(d.free!.model.es)}><Icon name="speaker" size={16} /></button>
                </div>
                <div className="dialog-actions">
                  {!fb.ok && (
                    <button className="btn ghost" onClick={() => { setFb(null); setReply(null); setText(''); }}>
                      Intentar otra vez
                    </button>
                  )}
                  <button className="btn primary" onClick={finish}>Continuar <Icon name="next" /></button>
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'reply' && (
          <div className="dialog-actions">
            <button className="btn primary" onClick={finish}>Continuar <Icon name="next" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

/** One-shot helper: show a line (non-blocking subtitles) */
export function sayLine(speaker: string, t: T, opts: { role?: string; pitch?: number; focus?: [number, number, number]; onClose?: () => void } = {}) {
  useUI.getState().openDialog({ speaker, role: opts.role, lines: [{ speaker, t }], pitch: opts.pitch, focus: opts.focus, onClose: () => opts.onClose?.() });
}
