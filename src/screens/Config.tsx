import { useEffect, useState } from 'react';
import { useProgress, useUI } from '../core/store';
import { Icon } from '../ui/Icon';
import type { Quality, TimeOfDay } from '../core/types';
import { speak, spanishVoices, ttsAvailable } from '../core/audio';
import { recognitionAvailable } from '../core/speech';

export function Config() {
  const st = useProgress((s) => s.settings);
  const set = useProgress((s) => s.setSettings);
  const [confirm, setConfirm] = useState(false);
  const [voices, setVoices] = useState<string[]>([]);
  useEffect(() => {
    const load = () => setVoices(spanishVoices().map((v) => `${v.name} (${v.lang})`));
    load();
    const t = setTimeout(load, 800);
    return () => clearTimeout(t);
  }, []);
  const Range = ({ label, k, min = 0, max = 1, step = 0.05 }: { label: string; k: 'music' | 'sfx' | 'voice' | 'voiceRate' | 'camSensitivity'; min?: number; max?: number; step?: number }) => (
    <div className="field">
      <label>{label}: {Math.round((st[k] as number) * 100)}%</label>
      <input type="range" min={min} max={max} step={step} value={st[k] as number} onChange={(e) => set({ [k]: +e.target.value })} />
    </div>
  );
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
        <div>
          <h1>Configuración</h1>
          <div className="sub">Կարգավորումներ</div>
        </div>
      </div>
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="section-title">Gráficos</div>
        <div className="field">
          <label>Calidad gráfica</label>
          <div className="seg">
            {(['Bajo', 'Medio', 'Alto', 'Ultra'] as Quality[]).map((q) => (
              <button key={q} className={st.quality === q ? 'on' : ''} onClick={() => set({ quality: q })}>{q}</button>
            ))}
          </div>
          <small>Bajo: para móviles antiguos (sin sombras, menos personas y coches). Ultra: para ordenadores potentes.</small>
        </div>
        <div className="field">
          <label>Hora del día en la ciudad</label>
          <div className="seg">
            {([['dia', 'Día'], ['tarde', 'Tarde'], ['noche', 'Noche']] as [TimeOfDay, string][]).map(([v, l]) => (
              <button key={v} className={st.timeOfDay === v ? 'on' : ''} onClick={() => set({ timeOfDay: v })}>{l}</button>
            ))}
          </div>
        </div>
        <Range label="Sensibilidad de la cámara" k="camSensitivity" min={0.3} max={2} step={0.1} />
        <label className="row" style={{ alignItems: 'center', marginBottom: 14 }}>
          <input type="checkbox" checked={st.showNavigator} onChange={(e) => set({ showNavigator: e.target.checked })} />
          <span>Navegador siempre visible en las misiones (más fácil, menos práctica de español)</span>
        </label>
        <div className="section-title">Sonido y voz</div>
        <Range label="Música" k="music" />
        <Range label="Efectos" k="sfx" />
        <Range label="Voz" k="voice" />
        <Range label="Velocidad de la voz" k="voiceRate" min={0.6} max={1.2} />
        <div className="row" style={{ alignItems: 'center' }}>
          <button className="btn" onClick={() => speak('¡Hola, Razmik! Soy tu entrenador. ¿Estás preparado para el entrenamiento de hoy?')}><Icon name="speaker" /> Probar la voz</button>
          <span className="hint">{ttsAvailable() ? (voices.length ? `Voces en español: ${voices.slice(0, 3).join(', ')}` : 'No se ha encontrado una voz en español en este dispositivo: se usará la voz por defecto.') : 'Este navegador no permite voz sintetizada.'}</span>
        </div>
        <p className="hint">Micrófono: {recognitionAvailable() ? 'reconocimiento de voz disponible (es-ES).' : 'no disponible en este navegador; puedes responder escribiendo.'}</p>
        <div className="section-title">Progreso</div>
        <p className="hint">El progreso se guarda automáticamente en este dispositivo.</p>
        {!confirm ? (
          <button className="btn red" onClick={() => setConfirm(true)}>Borrar todo el progreso</button>
        ) : (
          <div className="panel">
            <p><b>¿Seguro? Se borrarán XP, monedas, récords y estadísticas. No se puede deshacer.</b></p>
            <p>Վստա՞հ ես։ Կջնջվեն XP-ն, մետաղադրամները, ռեկորդները և վիճակագրությունը։ Հնարավոր չէ հետ բերել։</p>
            <div className="row">
              <button className="btn red" onClick={() => { useProgress.getState().reset(); setConfirm(false); useUI.getState().toast({ es: 'Progreso borrado.', hy: 'Առաջընթացը ջնջված է։' }, 'info'); }}>Sí, borrar</button>
              <button className="btn ghost" onClick={() => setConfirm(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
