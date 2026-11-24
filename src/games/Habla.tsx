import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GameCanvas } from '../three/Stage';
import { Humanoid, newAnim } from '../three/Humanoid';
import { CHARACTERS } from '../data/characters';
import { HABLA, type HChar } from '../data/habla';
import { useProgress, useUI } from '../core/store';
import { levelIndex, type T } from '../core/types';
import { playMusic, sfx } from '../core/audio';
import { DialogPanel } from '../ui/DialogPanel';
import { Es } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { StatsBar, TopLeft, usePlayTime } from '../ui/HUD';
import { recognitionAvailable } from '../core/speech';

const T_ = (es: string, hy: string): T => ({ es, hy });

export function Habla() {
  usePlayTime();
  const [ch, setCh] = useState<HChar | null>(null);
  useEffect(() => playMusic('calm'), []);
  if (!ch)
    return (
      <div className="page">
        <div className="page-head">
          <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
          <div>
            <h1>Habla como un campeón</h1>
            <div className="sub">Խոսիր չեմպիոնի պես · Elige con quién quieres hablar</div>
          </div>
        </div>
        <div className="wrap">
          <div className="panel" style={{ marginBottom: 14 }}>
            <Es t={T_('Puedes responder de tres formas: eligiendo una respuesta, escribiendo o hablando con el micrófono. No hace falta decir la frase exacta: acepto diferentes respuestas correctas.', 'Կարող ես պատասխանել երեք եղանակով՝ ընտրելով պատասխան, գրելով կամ խոսելով միկրոֆոնով։ Պարտադիր չէ ասել ճշգրիտ նախադասությունը․ ընդունում եմ տարբեր ճիշտ պատասխաններ։')} />
            {!recognitionAvailable() && (
              <div className="note" style={{ marginTop: 8 }}>
                <Es t={T_('Tu navegador no permite el reconocimiento de voz. Puedes escribir las respuestas.', 'Քո դիտարկիչը ձայնի ճանաչում չի աջակցում։ Կարող ես գրել պատասխանները։')} />
              </div>
            )}
          </div>
          <div className="grid">
            {HABLA.map((h) => {
              const done = useProgress.getState().missions['habla-' + h.id];
              return (
                <button key={h.id} className="card click" onClick={() => setCh(h)}>
                  <span className="stripe" style={{ background: h.bg }} />
                  <h3>{h.title.es}</h3>
                  <p>{h.title.hy}</p>
                  <p><Es t={h.intro} /></p>
                  <div className="meta">{done ? <span className="pill small gold">Completado ×{done}</span> : <span className="pill small">5 preguntas</span>}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  return <Conversation ch={ch} onExit={() => setCh(null)} />;
}

function Conversation({ ch, onExit }: { ch: HChar; onExit: () => void }) {
  const lvl = useProgress((s) => s.level);
  const qs = useMemo(() => {
    const sorted = ch.questions.slice().sort((a, b) => levelIndex(a.lvl) - levelIndex(b.lvl));
    const allowed = sorted.filter((q) => levelIndex(q.lvl) <= levelIndex(lvl) + 1);
    return allowed.length >= 3 ? allowed : sorted;
  }, []);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const person = CHARACTERS[ch.charId];
  const talking = useRef(true);

  useEffect(() => {
    if (i >= qs.length) {
      const ok = results.filter((r) => r !== false).length;
      useProgress.getState().completeMission('habla-' + ch.id, 50 + ok * 15, 10 + ok * 4, ok === qs.length);
      sfx('win');
      return;
    }
    const q = qs[i];
    const t = setTimeout(() => {
      useUI.getState().openDialog({
        speaker: person.name,
        role: person.role,
        pitch: person.pitch,
        lines: [...(i === 0 ? [{ speaker: person.name, t: ch.intro }] : []), { speaker: person.name, t: q.q }],
        options: q.options.map((o) => ({ ...o, reply: o.ok ? T_('¡Muy bien!', 'Շատ լավ։') : undefined })),
        free: { accept: q.accept, model: q.model, minWords: levelIndex(q.lvl) >= 1 ? 3 : 2 },
        cat: 'conversacion',
        onClose: (r) => {
          setResults((rs) => [...rs, r.ok]);
          setI((x) => x + 1);
        },
      });
    }, 500);
    return () => clearTimeout(t);
  }, [i]);

  return (
    <div className="scene">
      <GameCanvas camFov={35}>
        <Portrait look={person.look} bg={ch.bg} talking={talking} />
      </GameCanvas>
      <TopLeft />
      <StatsBar />
      <div className="game-top" style={{ top: 64 }}>
        <span className="title">{ch.title.es}</span>
        <span className="pill">{Math.min(i + 1, qs.length)}/{qs.length}</span>
      </div>
      <DialogPanel />
      {i >= qs.length && (
        <div className="modal-back">
          <div className="modal">
            <div className="result-title">¡Conversación terminada!</div>
            <div className="result-grid">
              <div><b>{results.filter((r) => r !== false).length}/{qs.length}</b><span>Respuestas buenas</span></div>
            </div>
            <Es t={T_('Puedes ver tus respuestas escritas en el informe para el profesor.', 'Քո գրավոր պատասխանները կարող ես տեսնել ուսուցչի հաշվետվությունում։')} />
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={onExit}>Hablar con otra persona</button>
              <button className="btn ghost" onClick={() => useUI.getState().go('menu')}>Menú</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Portrait({ look, bg, talking }: { look: typeof CHARACTERS.coach.look; bg: string; talking: React.MutableRefObject<boolean> }) {
  const anim = useRef(newAnim());
  const g = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    camera.position.set(0.35, look.height * 0.86, 2.1);
    camera.lookAt(0, look.height * 0.82, 0);
    const d = useUI.getState().dialog;
    anim.current.talk = !!d && talking.current;
    if (g.current) g.current.rotation.y = Math.sin(performance.now() / 2000) * 0.08 + 0.15;
    if (Math.random() < 0.002) anim.current.waveT = 1.2;
  });
  return (
    <>
      <color attach="background" args={[bg]} />
      <hemisphereLight args={['#ffffff', '#444444', 1.2]} />
      <directionalLight position={[2, 3, 3]} intensity={2} />
      <mesh position={[0, 1.5, -2]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color={bg} />
      </mesh>
      <mesh position={[-1.5, 1.6, -1.9]}>
        <circleGeometry args={[1.2, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.12} />
      </mesh>
      <group ref={g}>
        <Humanoid look={look} anim={anim} />
      </group>
    </>
  );
}
