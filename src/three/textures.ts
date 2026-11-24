import * as THREE from 'three';
import { seeded } from '../core/random';

const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const k = key + (opts.repeat ? opts.repeat.join('x') : '');
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  cache.set(k, tex);
  return tex;
}

export function jerseyBackTex(name = 'RAZMIK', num = '7') {
  return canvasTex('jersey-back2-' + name + num, 512, 512, (g, w) => {
    g.clearRect(0, 0, w, 512);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#1b2233';
    g.lineJoin = 'round';
    g.lineWidth = 9;
    let size = 74;
    g.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    while (g.measureText(name).width > w * 0.62 && size > 30) {
      size -= 2;
      g.font = `900 ${size}px "Arial Black", Arial, sans-serif`;
    }
    g.strokeText(name, w / 2, 150);
    g.fillText(name, w / 2, 150);
    g.font = '900 250px "Arial Black", Arial, sans-serif';
    g.lineWidth = 14;
    g.strokeText(num, w / 2, 400);
    g.fillText(num, w / 2, 400);
  });
}
export function jerseyFrontTex(num = '7') {
  return canvasTex('jersey-front2-' + num, 512, 512, (g, w) => {
    g.clearRect(0, 0, w, 512);
    // mirrored because the front decal's U axis runs right-to-left
    g.translate(w, 0);
    g.scale(-1, 1);
    // crest (left chest from the viewer's right side)
    g.fillStyle = '#1b2233';
    g.beginPath();
    g.moveTo(140, 120); g.lineTo(200, 120); g.lineTo(200, 180); g.quadraticCurveTo(170, 210, 140, 180); g.closePath();
    g.fill();
    g.fillStyle = '#ffd34d';
    g.font = 'bold 44px Arial';
    g.textAlign = 'center';
    g.fillText('R', 170, 172);
    // sponsor stripe
    g.fillStyle = '#ffffff';
    g.font = '900 46px "Arial Black", Arial';
    g.fillText('CAMPEÓN', w / 2, 300);
    g.font = '900 110px "Arial Black", Arial';
    g.strokeStyle = '#1b2233';
    g.lineWidth = 8;
    g.strokeText(num, 352, 200);
    g.fillText(num, 352, 200);
  });
}
export function textTex(text: string, opts: { bg?: string; fg?: string; w?: number; h?: number; font?: string; border?: string } = {}) {
  const w = opts.w ?? 512;
  const h = opts.h ?? 128;
  return canvasTex(`txt-${text}-${opts.bg}-${opts.fg}-${w}-${h}-${opts.font}`, w, h, (g) => {
    g.fillStyle = opts.bg ?? '#1b2233';
    g.fillRect(0, 0, w, h);
    if (opts.border) {
      g.strokeStyle = opts.border;
      g.lineWidth = 10;
      g.strokeRect(5, 5, w - 10, h - 10);
    }
    g.fillStyle = opts.fg ?? '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = Math.floor(h * 0.62);
    g.font = opts.font ?? `800 ${size}px Rajdhani, Arial, sans-serif`;
    if (!opts.font) {
      while (g.measureText(text).width > w * 0.9 && size > 10) {
        size -= 2;
        g.font = `800 ${size}px Rajdhani, Arial, sans-serif`;
      }
    }
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

/** facade with window grid; style seeds layout */
export function facadeTex(style: number, lit = false) {
  return canvasTex(`facade-${style}-${lit}`, 256, 512, (g, w, h) => {
    const r = seeded(style * 97 + 13);
    g.fillStyle = lit ? '#000' : '#f4f1ea';
    g.fillRect(0, 0, w, h);
    if (!lit) {
      // subtle noise
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
        g.fillRect(r() * w, r() * h, 2, 2);
      }
    }
    const cols = 3 + (style % 3);
    const rows = 8;
    const mx = 14, my = 14;
    const cw = (w - mx * 2) / cols;
    const rh = (h - my * 2) / rows;
    for (let y = 0; y < rows; y++) {
      // floor line
      if (!lit) {
        g.fillStyle = 'rgba(0,0,0,0.08)';
        g.fillRect(0, my + y * rh - 2, w, 3);
      }
      for (let x = 0; x < cols; x++) {
        const px = mx + x * cw + cw * 0.15;
        const py = my + y * rh + rh * 0.18;
        const ww = cw * 0.7;
        const wh = rh * 0.62;
        if (lit) {
          if (r() < 0.45) {
            g.fillStyle = r() < 0.5 ? '#ffd890' : '#fff1c4';
            g.fillRect(px, py, ww, wh);
          }
        } else {
          const grd = g.createLinearGradient(px, py, px + ww, py + wh);
          grd.addColorStop(0, '#4a6a90');
          grd.addColorStop(0.5, '#8fb4d8');
          grd.addColorStop(1, '#35506e');
          g.fillStyle = grd;
          g.fillRect(px, py, ww, wh);
          g.fillStyle = 'rgba(255,255,255,0.5)';
          g.fillRect(px - 3, py + wh, ww + 6, 4); // sill
          g.fillStyle = 'rgba(30,40,50,0.6)';
          g.fillRect(px + ww / 2 - 1, py, 2, wh); // mullion
          if (style % 2 === 0 && r() < 0.4) {
            // balcony / plants
            g.fillStyle = r() < 0.5 ? '#3f7d3a' : '#d65b8a';
            g.fillRect(px, py + wh - 8, ww, 8);
          }
        }
      }
    }
  });
}

export function asphaltTex() {
  return canvasTex('asphalt', 256, 256, (g, w, h) => {
    g.fillStyle = '#4a4d55';
    g.fillRect(0, 0, w, h);
    const r = seeded(5);
    for (let i = 0; i < 5000; i++) {
      const c = 60 + r() * 40;
      g.fillStyle = `rgba(${c},${c},${c + 5},0.35)`;
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  }, { repeat: [1, 1] });
}
export function sidewalkTex() {
  return canvasTex('sidewalk', 256, 256, (g, w, h) => {
    g.fillStyle = '#b9614e';
    g.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s / 2)
      for (let x = 0; x < w; x += s) {
        const off = (y / (s / 2)) % 2 ? s / 2 : 0;
        g.fillStyle = `hsl(${8 + Math.random() * 6},${45 + Math.random() * 10}%,${46 + Math.random() * 8}%)`;
        g.fillRect(x + off + 1, y + 1, s - 2, s / 2 - 2);
      }
  });
}
export function plazaTex() {
  return canvasTex('plaza', 256, 256, (g, w, h) => {
    g.fillStyle = '#c9c3b8';
    g.fillRect(0, 0, w, h);
    const s = 64;
    for (let y = 0; y < h; y += s)
      for (let x = 0; x < w; x += s) {
        g.fillStyle = `hsl(35,${8 + Math.random() * 6}%,${72 + Math.random() * 8}%)`;
        g.fillRect(x + 2, y + 2, s - 4, s - 4);
      }
  });
}
export function grassTex() {
  return canvasTex('grass', 256, 256, (g, w, h) => {
    g.fillStyle = '#5f9a3c';
    g.fillRect(0, 0, w, h);
    const r = seeded(9);
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = `hsla(${85 + r() * 30},${40 + r() * 25}%,${28 + r() * 25}%,0.6)`;
      g.fillRect(r() * w, r() * h, 1.5, 3);
    }
  });
}
export function pitchTex() {
  return canvasTex('pitch', 512, 768, (g, w, h) => {
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 2 ? '#3f9a45' : '#47a64d';
      g.fillRect(0, (i * h) / 12, w, h / 12);
    }
    g.strokeStyle = 'rgba(255,255,255,0.92)';
    g.lineWidth = 5;
    const m = 18;
    g.strokeRect(m, m, w - 2 * m, h - 2 * m);
    g.beginPath(); g.moveTo(m, h / 2); g.lineTo(w - m, h / 2); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 62, 0, Math.PI * 2); g.stroke();
    g.strokeRect(w / 2 - 120, m, 240, 110);
    g.strokeRect(w / 2 - 55, m, 110, 40);
    g.strokeRect(w / 2 - 120, h - m - 110, 240, 110);
    g.strokeRect(w / 2 - 55, h - m - 40, 110, 40);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(w / 2, h / 2, 5, 0, Math.PI * 2); g.fill();
  });
}
export function dirtTex() {
  return canvasTex('dirt', 256, 256, (g, w, h) => {
    g.fillStyle = '#c99868';
    g.fillRect(0, 0, w, h);
    const r = seeded(3);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `hsla(${25 + r() * 15},${35 + r() * 20}%,${45 + r() * 25}%,0.5)`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  });
}
export function sandTex() {
  return canvasTex('sand', 256, 256, (g, w, h) => {
    g.fillStyle = '#ecd6a4';
    g.fillRect(0, 0, w, h);
    const r = seeded(4);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `hsla(${38 + r() * 10},${45 + r() * 20}%,${65 + r() * 20}%,0.5)`;
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  });
}
export function woodTex() {
  return canvasTex('wood', 256, 256, (g, w, h) => {
    g.fillStyle = '#b07a45';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = `hsl(28,${40 + Math.random() * 10}%,${42 + Math.random() * 10}%)`;
      g.fillRect(0, y + 1, w, 30);
      g.strokeStyle = 'rgba(60,30,10,0.25)';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(0, y + 5 + i * 7);
        g.bezierCurveTo(w * 0.3, y + 3 + i * 7, w * 0.6, y + 9 + i * 7, w, y + 5 + i * 7);
        g.stroke();
      }
    }
  });
}
export function floorTex(kind: 'tile' | 'wood' | 'carpet' = 'tile') {
  return canvasTex('floor-' + kind, 256, 256, (g, w, h) => {
    if (kind === 'tile') {
      g.fillStyle = '#d9d6d0';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          g.fillStyle = (x + y) % 2 ? '#e8e5df' : '#cfcac2';
          g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
        }
    } else if (kind === 'wood') {
      for (let y = 0; y < 8; y++) {
        g.fillStyle = `hsl(30,${35 + Math.random() * 10}%,${40 + Math.random() * 12}%)`;
        g.fillRect(0, y * 32, w, 31);
      }
    } else {
      g.fillStyle = '#2b3a67';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    }
  });
}
export function busSideTex(line: string, color: string) {
  return canvasTex('bus-' + line + color, 512, 128, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b2a3a';
    for (let i = 0; i < 7; i++) g.fillRect(20 + i * 68, 14, 58, 56);
    g.fillStyle = 'rgba(160,200,255,0.35)';
    for (let i = 0; i < 7; i++) g.fillRect(24 + i * 68, 18, 20, 48);
    g.fillStyle = '#fff';
    g.fillRect(0, 84, w, 10);
    g.font = '800 26px Rajdhani, Arial';
    g.fillStyle = '#fff';
    g.fillText('BUS CIUDAD DE CAMPEONES · LÍNEA ' + line, 20, 120);
  });
}
