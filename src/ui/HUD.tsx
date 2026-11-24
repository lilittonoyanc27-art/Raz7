import { useEffect, useRef, type ReactNode } from 'react';
import { levelFromXp, useProgress, useUI, xpInLevel } from '../core/store';
import { player, useNearby } from '../three/world';
import { Es } from './Es';
import { Icon } from './Icon';
import { input } from '../three/input';
import { isTouch } from './TouchControls';
import type { T } from '../core/types';
import { playMusic, playAmbience, stopSpeech } from '../core/audio';

export function StatsBar() {
  const xp = useProgress((s) => s.xp);
  const coins = useProgress((s) => s.coins);
  const cups = useProgress((s) => s.cups);
  const lvl = useProgress((s) => s.level);
  return (
    <div className="stats">
      <div className="lvl">
        <div className="lvl-num">{levelFromXp(xp)}</div>
        <div className="lvl-bar">
          <div style={{ width: `${(xpInLevel(xp) / 300) * 100}%` }} />
        </div>
        <span className="xp">{xp} XP</span>
      </div>
      <div className="pill gold"><Icon name="coin" size={16} /> {coins}</div>
      <div className="pill"><Icon name="cup" size={16} /> {cups}</div>
      <div className="pill es-lvl">{lvl}</div>
    </div>
  );
}

export function TopLeft({ children }: { children?: ReactNode }) {
  return (
    <div className="topleft">
      <button
        className="icon-btn menu-btn"
        title="Menú"
        onClick={() => {
          stopSpeech();
          playAmbience(null);
          playMusic('menu');
          useUI.getState().go('menu');
        }}
      >
        <Icon name="home" />
      </button>
      {children}
    </div>
  );
}

export function MissionPanel({ title, objective, timer, lines, children }: { title: T; objective?: T; timer?: number | null; lines?: { t: T; done?: boolean }[]; children?: ReactNode }) {
  return (
    <div className="mission-panel">
      <div className="mp-title"><Es t={title} /></div>
      {objective && (
        <div className="mp-obj">
          <span className="dot" /> <Es t={objective} />
        </div>
      )}
      {timer !== undefined && timer !== null && (
        <div className={'mp-timer ' + (timer < 10 ? 'warn' : '')}>
          {timer < 0 ? '-' : ''}
          {fmt(Math.abs(timer))}
        </div>
      )}
      {lines && (
        <div className="mp-lines">
          {lines.map((l, i) => (
            <div key={i} className={'mp-line ' + (l.done ? 'done' : '')}>
              <Icon name={l.done ? 'check' : 'star'} size={14} /> <Es t={l.t} />
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function InteractPrompt() {
  const near = useNearby((s) => s.near);
  const dialog = useUI((s) => s.dialog);
  if (!near || dialog) return null;
  return (
    <button className="prompt" onClick={() => (input.actionQueued = true)}>
      <span className="key">{isTouch() ? <Icon name="hand" size={16} /> : 'E'}</span>
      <Es t={near.label} />
    </button>
  );
}

export interface MapMarker { x: number; z: number; label?: string; color: string; size?: number; pulse?: boolean }

/** Generic minimap rendered on a 2D canvas, rotated so that up = camera forward */
export function Minimap({ extent, draw, markers, size = 170, rotate = true, viewRadius = 75 }: { extent: number; viewRadius?: number; draw: (g: CanvasRenderingContext2D, toMap: (x: number, z: number) => [number, number], scale: number) => void; markers?: () => MapMarker[]; size?: number; rotate?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bg = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const W = 512;
    const c = document.createElement('canvas');
    c.width = c.height = W;
    const g = c.getContext('2d')!;
    const scale = W / (extent * 2);
    draw(g, (x, z) => [(x + extent) * scale, (z + extent) * scale], scale);
    bg.current = c;
  }, [extent]);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 66) return;
      last = t;
      const cv = ref.current;
      if (!cv || !bg.current) return;
      const g = cv.getContext('2d')!;
      const S = cv.width;
      g.clearRect(0, 0, S, S);
      g.save();
      g.beginPath();
      g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = '#1b2233';
      g.fillRect(0, 0, S, S);
      const W = bg.current.width;
      const scale = W / (extent * 2);
      g.translate(S / 2, S / 2);
      const rot = rotate ? input.camYaw : 0;
      g.rotate(rot);
      const k = S / 2 / (viewRadius * scale);
      g.scale(k, k);
      const px = (player.pos.x + extent) * scale;
      const pz = (player.pos.z + extent) * scale;
      g.translate(-px, -pz);
      g.drawImage(bg.current, 0, 0);
      (markers?.() ?? []).forEach((m) => {
        const mx = (m.x + extent) * scale;
        const mz = (m.z + extent) * scale;
        g.fillStyle = m.color;
        g.beginPath();
        const r = (m.size ?? 5) * (m.pulse ? 1 + Math.sin(t / 200) * 0.25 : 1);
        g.arc(mx, mz, r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#fff';
        g.lineWidth = 1.2;
        g.stroke();
      });
      g.restore();
      // player arrow (always pointing up relative to camera when rotating)
      g.save();
      g.translate(S / 2, S / 2);
      g.rotate(rotate ? -(player.yaw - input.camYaw) + Math.PI : -player.yaw + Math.PI);
      g.fillStyle = '#ff7a1a';
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -9);
      g.lineTo(7, 8);
      g.lineTo(0, 4);
      g.lineTo(-7, 8);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
      // N marker
      g.save();
      g.translate(S / 2, S / 2);
      g.rotate(rotate ? input.camYaw : 0);
      g.fillStyle = '#ffb03a';
      g.font = 'bold 12px Rajdhani, Arial';
      g.textAlign = 'center';
      g.fillText('N', 0, -S / 2 + 14);
      g.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [markers, extent, rotate, viewRadius]);
  return <canvas ref={ref} className="minimap" width={size * 2} height={size * 2} style={{ width: size, height: size }} />;
}

/** Helper that tracks seconds of play time */
export function usePlayTime() {
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === 'visible') useProgress.getState().tick(5);
    }, 5000);
    return () => clearInterval(iv);
  }, []);
}
