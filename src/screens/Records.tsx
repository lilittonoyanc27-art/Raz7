import { useProgress, useUI, levelFromXp } from '../core/store';
import { Icon } from '../ui/Icon';
import { fmt } from '../ui/HUD';

const NAMES: [RegExp, (m: RegExpMatchArray) => string, boolean][] = [
  [/^llegar-estadio-tiempo$/, () => 'Llegar al estadio (tiempo, sin peligros)', true],
  [/^entreno-(\w+)-puntos$/, (m) => `Desafío del entrenador · ${m[1]} (puntos)`, false],
  [/^entreno-(\w+)-tiempo$/, (m) => `Desafío del entrenador · ${m[1]} (tiempo)`, true],
  [/^carrera-(\w+)$/, (m) => `La gran carrera · ${m[1]}`, true],
  [/^laberinto-(\w+)$/, (m) => `Laberinto · nivel ${m[1]}`, true],
  [/^isla-tiempo$/, () => 'Supervivencia en la isla', true],
  [/^memory-(\w+)-(\w+)$/, (m) => `Memory · ${m[1]} · ${m[2]}`, true],
  [/^ruleta-puntos$/, () => 'La ruleta (puntos)', false],
  [/^batalla-campeon$/, () => 'Torneos ganados', false],
  [/^trabalenguas-(\d+)$/, (m) => `Trabalenguas nº ${+m[1] + 1}`, true],
  [/^detective-(\w+)-min$/, (m) => `Detective · ${m[1]} (minutos)`, false],
];

export function recordLabel(k: string): { name: string; time: boolean } {
  for (const [re, fn, time] of NAMES) {
    const m = k.match(re);
    if (m) return { name: fn(m), time: time && !k.startsWith('trabalenguas') };
  }
  return { name: k, time: false };
}

export function Records() {
  const s = useProgress();
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
        <div>
          <h1>Mis récords</h1>
          <div className="sub">Իմ ռեկորդները</div>
        </div>
      </div>
      <div className="wrap">
        <div className="result-grid">
          <div><b>{levelFromXp(s.xp)}</b><span>Nivel</span></div>
          <div><b>{s.xp}</b><span>XP</span></div>
          <div><b>{s.coins}</b><span>Monedas</span></div>
          <div><b>{s.cups}</b><span>Copas</span></div>
          <div><b>{s.medals.length}</b><span>Medallas</span></div>
          <div><b>{Object.values(s.missions).reduce((a, b) => a + b, 0)}</b><span>Misiones</span></div>
        </div>
        <div className="section-title">Medallas · Մեդալներ</div>
        <div className="row">
          {s.medals.length ? s.medals.map((m) => <span key={m} className="pill gold"><Icon name="star" size={14} /> {m}</span>) : <span className="hint">Todavía no tienes medallas. ¡A jugar!</span>}
        </div>
        <div className="section-title">Récords personales</div>
        <table className="tbl">
          <tbody>
            {Object.entries(s.records).map(([k, v]) => {
              const l = recordLabel(k);
              return (
                <tr key={k}>
                  <td>{l.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{l.time ? fmt(v) : k.startsWith('trabalenguas') ? `${v} s` : v}</td>
                </tr>
              );
            })}
            {!Object.keys(s.records).length && (
              <tr><td className="hint">Aquí aparecerán tus mejores resultados.</td></tr>
            )}
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn primary" onClick={() => useUI.getState().go('informe')}><Icon name="share" /> Informe para el profesor</button>
        </div>
      </div>
    </div>
  );
}
