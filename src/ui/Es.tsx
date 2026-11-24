import type { CSSProperties, ReactNode } from 'react';
import type { T } from '../core/types';
import { useProgress, useUI } from '../core/store';
import { glossFor, normWord } from '../data/glossary';
import { speak } from '../core/audio';
import { Icon } from './Icon';

/** Spanish text: tap to open the Armenian translation */
export function Es({ t, className, style, children }: { t: T; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <span
      className={'es ' + (className ?? '')}
      style={style}
      role="button"
      tabIndex={0}
      title="Ver traducción · Թարգմանություն"
      onClick={(e) => {
        e.stopPropagation();
        openTranslation(t);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') openTranslation(t);
      }}
    >
      {children ?? t.es}
    </span>
  );
}

export function openTranslation(t: T) {
  useUI.getState().showTranslation(t);
  const words = glossFor(t.es).map(([w]) => normWord(w));
  useProgress.getState().addWords(words);
}

export function TranslationCard() {
  const tr = useUI((s) => s.translation);
  const close = () => useUI.getState().showTranslation(null);
  if (!tr) return null;
  const gl = glossFor(tr.t.es).slice(0, 10);
  return (
    <div className="tr-backdrop" onClick={close}>
      <div className="tr-card" onClick={(e) => e.stopPropagation()}>
        <div className="tr-es">{tr.t.es}</div>
        <div className="tr-hy">{tr.t.hy}</div>
        <div className="tr-actions">
          <button className="btn small" onClick={() => speak(tr.t.es)}>
            <Icon name="speaker" size={16} /> Escuchar
          </button>
          <button className="btn small ghost" onClick={() => speak(tr.t.es, { slow: true })}>
            <Icon name="slow" size={16} /> Más despacio
          </button>
          <button className="btn small ghost" onClick={close}>
            <Icon name="close" size={16} /> Cerrar
          </button>
        </div>
        {gl.length > 0 && (
          <div className="tr-gloss">
            {gl.map(([w, h]) => (
              <span key={w} className="chip" onClick={() => speak(w)}>
                <b>{w}</b> — {h}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
