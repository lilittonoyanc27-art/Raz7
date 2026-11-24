import { useProgress, useUI, levelFromXp } from '../core/store';
import { Icon } from '../ui/Icon';
import { recordLabel } from './Records';
import { fmt } from '../ui/HUD';

const MISSION_NAMES: Record<string, string> = {
  'llegar-estadio': 'Misión: Llegar al estadio', 'desafio-entrenador': 'Desafío del entrenador', 'gran-carrera': 'La gran carrera', laberinto: 'El laberinto secreto', isla: 'Supervivencia lingüística',
  ruleta: 'La ruleta de las palabras', batalla: 'Batalla (campeón)', 'batalla-participacion': 'Batalla (participación)', 'batalla-profesor': 'Batalla profesor vs. alumno',
  'sim-tienda': 'Simulador: tienda deportiva', 'sim-super': 'Simulador: supermercado', 'sim-restaurante': 'Simulador: restaurante', 'sim-aeropuerto': 'Simulador: aeropuerto', 'sim-bus': 'Simulador: autobús del equipo',
};
const CAT_NAMES: Record<string, string> = {
  dialogo: 'Diálogos', conversacion: 'Conversación', instrucciones: 'Instrucciones', comprension_auditiva: 'Comprensión auditiva', vocabulario: 'Vocabulario', gramatica: 'Gramática', preposiciones: 'Preposiciones',
  numeros: 'Números', matematicas: 'Matemáticas', ruleta: 'Ruleta', memoria: 'Memoria', pronunciacion: 'Pronunciación', detective: 'Detective', tienda: 'Tienda', supermercado: 'Supermercado', restaurante: 'Restaurante', aeropuerto: 'Aeropuerto',
  futbol: 'Fútbol', logica: 'Lógica', geografia: 'Geografía', lexico: 'Léxico', general: 'Cultura general', adivinanzas: 'Adivinanzas', escucha: 'Escucha', saludos: 'Saludos', ciudad: 'Ciudad', ayuda: 'Ayudar', tiempo: 'Hora y tiempo', planes: 'Planes', rutina: 'Rutina', emociones: 'Emociones', hipotesis: 'Hipótesis',
};
const missionName = (k: string) => MISSION_NAMES[k] ?? (k.startsWith('detective-') ? 'Detective: ' + k.slice(10) : k.startsWith('memory-') ? 'Memory: ' + k.slice(7) : k.startsWith('habla-') ? 'Habla: ' + k.slice(6) : k);

function buildReport() {
  const s = useProgress.getState();
  const st = s.stats;
  const acc = st.correct + st.wrong ? Math.round((st.correct / (st.correct + st.wrong)) * 100) : 0;
  const listen = st.listenTotal ? Math.round((st.listenCorrect / st.listenTotal) * 100) : 0;
  const hard = Object.values(st.hard).sort((a, b) => b.n - a.n).slice(0, 20);
  const cats = Object.entries(st.cats).sort((a, b) => b[1].c + b[1].w - (a[1].c + a[1].w));
  return { s, st, acc, listen, hard, cats };
}

function escapeHtml(x: string) {
  return x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function reportHtml() {
  const { s, st, acc, listen, hard, cats } = buildReport();
  const date = new Date().toLocaleDateString('es-ES');
  const rows = (arr: string[][]) => arr.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe de Razmik · ${date}</title>
<style>body{font-family:Arial,'Noto Sans Armenian',sans-serif;max-width:860px;margin:24px auto;color:#1b2233;padding:0 16px}h1{color:#ff7a1a}h2{border-bottom:2px solid #ff7a1a;padding-bottom:4px}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #ddd;padding:6px;text-align:left;font-size:14px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.k{background:#f5f6fa;border-radius:8px;padding:10px}.k b{font-size:22px;display:block}</style></head><body>
<h1>RAZMIK 7 — MISIÓN CAMPEÓN</h1><p>Informe para el profesor · ${date}</p>
<div class="grid"><div class="k"><b>${fmt(st.timePlayed)}</b>Tiempo de juego (min:s)</div><div class="k"><b>${levelFromXp(s.xp)}</b>Nivel (XP ${s.xp})</div><div class="k"><b>${s.level}</b>Nivel de español</div><div class="k"><b>${acc}%</b>Respuestas correctas</div>
<div class="k"><b>${st.correct} / ${st.wrong}</b>Correctas / incorrectas</div><div class="k"><b>${listen}%</b>Comprensión auditiva (${st.listenCorrect}/${st.listenTotal})</div><div class="k"><b>${st.words.length}</b>Palabras trabajadas</div><div class="k"><b>${st.dialogs}</b>Diálogos completados</div></div>
<h2>Misiones completadas</h2><table>${rows(Object.entries(s.missions).map(([k, v]) => [missionName(k), String(v)]))}</table>
<h2>Resultados por área</h2><table><tr><th>Área</th><th>Correctas</th><th>Incorrectas</th><th>%</th></tr>${rows(cats.map(([k, v]) => [CAT_NAMES[k] ?? k, String(v.c), String(v.w), `${Math.round((v.c / Math.max(1, v.c + v.w)) * 100)}%`]))}</table>
<h2>Expresiones difíciles</h2><table><tr><th>Español</th><th>Armenio</th><th>Errores</th></tr>${rows(hard.map((h) => [h.es, h.hy, String(h.n)]))}</table>
<h2>Respuestas escritas o habladas</h2><table><tr><th>Pregunta</th><th>Respuesta</th><th>¿Comprensible?</th></tr>${rows(st.written.slice(0, 60).map((w) => [w.q, w.a, w.ok ? 'Sí' : 'Mejorable']))}</table>
<h2>Récords personales</h2><table>${rows(Object.entries(s.records).map(([k, v]) => [recordLabel(k).name, String(v)]))}</table>
<h2>Medallas</h2><p>${escapeHtml(s.medals.join(' · ') || '—')}</p>
<h2>Palabras trabajadas</h2><p>${escapeHtml(st.words.slice(0, 300).join(', '))}</p>
</body></html>`;
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function summaryText() {
  const { s, st, acc, listen, hard } = buildReport();
  return `RAZMIK 7 — Informe (${new Date().toLocaleDateString('es-ES')})
Tiempo de juego: ${fmt(st.timePlayed)} · Nivel ${levelFromXp(s.xp)} · Español ${s.level}
Respuestas correctas: ${acc}% (${st.correct}/${st.correct + st.wrong})
Comprensión auditiva: ${listen}%
Misiones: ${Object.values(s.missions).reduce((a, b) => a + b, 0)} · Diálogos: ${st.dialogs} · Palabras: ${st.words.length}
Expresiones difíciles: ${hard.slice(0, 5).map((h) => h.es).join(' | ')}`;
}

export function Informe() {
  const { s, st, acc, listen, hard, cats } = buildReport();
  useProgress();
  const share = async () => {
    const text = summaryText();
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; files?: File[] }) => Promise<void>; canShare?: (d: { files?: File[] }) => boolean };
    try {
      const file = new File([reportHtml()], 'informe-razmik.html', { type: 'text/html' });
      if (nav.share && nav.canShare?.({ files: [file] })) await nav.share({ title: 'Informe de Razmik', text, files: [file] });
      else if (nav.share) await nav.share({ title: 'Informe de Razmik', text });
      else {
        await navigator.clipboard.writeText(text);
        useUI.getState().toast({ es: 'Resumen copiado. Puedes pegarlo en un mensaje al profesor.', hy: 'Ամփոփումը պատճենված է։ Կարող ես տեղադրել ուսուցչին ուղղված հաղորդագրության մեջ։' }, 'good');
      }
    } catch {
      /* user cancelled */
    }
  };
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
        <div>
          <h1>Informe para el profesor</h1>
          <div className="sub">Հաշվետվություն ուսուցչի համար</div>
        </div>
      </div>
      <div className="wrap">
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn primary" onClick={() => download(`informe-razmik-${new Date().toISOString().slice(0, 10)}.html`, reportHtml(), 'text/html')}><Icon name="download" /> Descargar informe (HTML)</button>
          <button className="btn" onClick={() => download('progreso-razmik.json', JSON.stringify({ ...s, settings: undefined }, null, 2), 'application/json')}><Icon name="download" /> Datos (JSON)</button>
          <button className="btn" onClick={share}><Icon name="share" /> Compartir con el profesor</button>
        </div>
        <div className="result-grid">
          <div><b>{fmt(st.timePlayed)}</b><span>Tiempo de juego</span></div>
          <div><b>{Object.values(s.missions).reduce((a, b) => a + b, 0)}</b><span>Misiones completadas</span></div>
          <div><b>{st.words.length}</b><span>Palabras trabajadas</span></div>
          <div><b>{acc}%</b><span>Correctas ({st.correct}/{st.correct + st.wrong})</span></div>
          <div><b>{listen}%</b><span>Comprensión auditiva</span></div>
          <div><b>{st.dialogs}</b><span>Diálogos completados</span></div>
          <div><b>{st.written.length}</b><span>Respuestas libres</span></div>
          <div><b>{st.sessions}</b><span>Sesiones</span></div>
        </div>
        <div className="section-title">Misiones completadas</div>
        <table className="tbl"><tbody>
          {Object.entries(s.missions).map(([k, v]) => <tr key={k}><td>{missionName(k)}</td><td>×{v}</td></tr>)}
          {!Object.keys(s.missions).length && <tr><td className="hint">Todavía no hay misiones.</td></tr>}
        </tbody></table>
        <div className="section-title">Resultados por área</div>
        <table className="tbl">
          <thead><tr><th>Área</th><th>Correctas</th><th>Incorrectas</th><th>Precisión</th></tr></thead>
          <tbody>
            {cats.map(([k, v]) => (
              <tr key={k}><td>{CAT_NAMES[k] ?? k}</td><td>{v.c}</td><td>{v.w}</td><td><div className="bar" style={{ width: 120 }}><div style={{ width: `${(v.c / Math.max(1, v.c + v.w)) * 100}%` }} /></div></td></tr>
            ))}
          </tbody>
        </table>
        <div className="section-title">Expresiones difíciles</div>
        <table className="tbl">
          <thead><tr><th>Español</th><th>Հայերեն</th><th>Errores</th></tr></thead>
          <tbody>
            {hard.map((h) => <tr key={h.es}><td>{h.es}</td><td style={{ fontFamily: 'Noto Sans Armenian' }}>{h.hy}</td><td>{h.n}</td></tr>)}
            {!hard.length && <tr><td className="hint">Sin errores registrados todavía.</td></tr>}
          </tbody>
        </table>
        <div className="section-title">Respuestas escritas y habladas</div>
        <table className="tbl">
          <thead><tr><th>Pregunta</th><th>Respuesta de Razmik</th><th></th></tr></thead>
          <tbody>
            {st.written.slice(0, 40).map((w, i) => <tr key={i}><td>{w.q}</td><td>{w.a}</td><td>{w.ok ? '✓' : '△'}</td></tr>)}
            {!st.written.length && <tr><td className="hint">Aquí aparecerán las respuestas libres.</td></tr>}
          </tbody>
        </table>
        <div className="section-title">Récords personales</div>
        <table className="tbl"><tbody>
          {Object.entries(s.records).map(([k, v]) => <tr key={k}><td>{recordLabel(k).name}</td><td>{v}</td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
