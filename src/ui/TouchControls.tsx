import { useEffect, useRef, useState } from 'react';
import { input } from '../three/input';
import { Icon } from './Icon';

export const isTouch = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export function TouchControls({ kick = false, jump = true, action = true }: { kick?: boolean; jump?: boolean; action?: boolean }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pid = useRef<number | null>(null);
  const [run, setRun] = useState(false);

  useEffect(() => () => {
    input.joy = { x: 0, y: 0, active: false };
    input.run = false;
  }, []);

  const move = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    const mx = cx - (r.left + r.width / 2);
    const my = cy - (r.top + r.height / 2);
    const max = r.width / 2;
    const len = Math.hypot(mx, my);
    const k = len > max ? max / len : 1;
    setKnob({ x: mx * k, y: my * k });
    input.joy = { x: (mx * k) / max, y: -(my * k) / max, active: true };
  };

  if (!isTouch()) return null;
  return (
    <div className="touch">
      <div
        ref={base}
        className="joy"
        onPointerDown={(e) => {
          pid.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          move(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (pid.current === e.pointerId) move(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          pid.current = null;
          setKnob({ x: 0, y: 0 });
          input.joy = { x: 0, y: 0, active: false };
        }}
        onPointerCancel={() => {
          pid.current = null;
          setKnob({ x: 0, y: 0 });
          input.joy = { x: 0, y: 0, active: false };
        }}
      >
        <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div className="tbtns">
        <button className={'tbtn ' + (run ? 'on' : '')} onPointerDown={() => { const v = !run; setRun(v); input.run = v; }}>
          <Icon name="run" size={26} />
          <small>Correr</small>
        </button>
        {jump && (
          <button className="tbtn" onPointerDown={() => (input.jumpQueued = true)}>
            <Icon name="jump" size={26} />
            <small>Saltar</small>
          </button>
        )}
        {kick && (
          <button className="tbtn big" onPointerDown={() => (input.kickQueued = true)}>
            <Icon name="ball" size={30} />
            <small>Chutar</small>
          </button>
        )}
        {action && (
          <button className="tbtn act" onPointerDown={() => (input.actionQueued = true)}>
            <Icon name="hand" size={26} />
            <small>Acción</small>
          </button>
        )}
      </div>
    </div>
  );
}
