import type { ReactNode } from 'react';

// Hand-made flat SVG illustrations (viewBox 0 0 100 100)
const O = '#ff7a1a', N = '#1b2233', W = '#ffffff', G = '#27ae60', Y = '#ffd34d', B = '#2e6fd8', R = '#e14b4b', S = '#d9a77f', BR = '#7a4b2a';
const fig = (pose: ReactNode) => (
  <g stroke={N} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none">
    {pose}
  </g>
);

export const PICS: Record<string, ReactNode> = {
  balon: (
    <g>
      <circle cx="50" cy="50" r="38" fill={W} stroke={N} strokeWidth="4" />
      <polygon points="50,34 64,44 59,60 41,60 36,44" fill={N} />
      <path d="M50 12 L50 34 M64 44 L84 38 M59 60 L70 80 M41 60 L30 80 M36 44 L16 38" stroke={N} strokeWidth="3" />
    </g>
  ),
  porteria: (
    <g>
      <rect x="10" y="25" width="80" height="50" fill="none" stroke={N} strokeWidth="5" />
      {[20, 30, 40, 50, 60, 70, 80].map((x) => <line key={x} x1={x} y1="25" x2={x} y2="75" stroke="#9aa1a9" strokeWidth="1.5" />)}
      {[35, 45, 55, 65].map((y) => <line key={y} x1="10" y1={y} x2="90" y2={y} stroke="#9aa1a9" strokeWidth="1.5" />)}
      <rect x="6" y="75" width="88" height="6" fill={G} />
    </g>
  ),
  silbato: (
    <g>
      <path d="M20 45 h40 a18 18 0 1 1 -10 30 l-30 -15 z" fill="#c0c6ce" stroke={N} strokeWidth="4" />
      <circle cx="65" cy="58" r="6" fill={N} />
      <path d="M20 45 l-8 -12" stroke={O} strokeWidth="5" />
    </g>
  ),
  bota: (
    <g>
      <path d="M25 20 h22 v35 l30 10 a8 8 0 0 1 6 8 v7 h-62 z" fill={O} stroke={N} strokeWidth="4" />
      {[30, 42, 54, 66, 78].map((x) => <rect key={x} x={x - 2} y="80" width="5" height="8" fill={N} />)}
      <path d="M30 32 h12 M30 42 h12" stroke={W} strokeWidth="3" />
    </g>
  ),
  camiseta: (
    <g>
      <path d="M30 15 l-22 15 l10 15 l10 -6 v50 h44 v-50 l10 6 l10 -15 l-22 -15 q-10 10 -20 0 z" fill={O} stroke={N} strokeWidth="4" />
      <text x="50" y="72" fontSize="32" fontWeight="900" textAnchor="middle" fill={W} fontFamily="Arial Black,Arial">7</text>
    </g>
  ),
  copa: (
    <g>
      <path d="M28 14 h44 v18 a22 22 0 0 1 -44 0 z" fill={Y} stroke={N} strokeWidth="4" />
      <path d="M28 20 h-12 a12 12 0 0 0 14 18 M72 20 h12 a12 12 0 0 1 -14 18" fill="none" stroke={N} strokeWidth="4" />
      <rect x="44" y="54" width="12" height="18" fill={Y} stroke={N} strokeWidth="3" />
      <rect x="30" y="72" width="40" height="12" rx="3" fill={BR} stroke={N} strokeWidth="3" />
    </g>
  ),
  perro: (
    <g>
      <ellipse cx="50" cy="62" rx="26" ry="18" fill="#c8873a" stroke={N} strokeWidth="3" />
      <circle cx="30" cy="40" r="16" fill="#c8873a" stroke={N} strokeWidth="3" />
      <ellipse cx="20" cy="32" rx="6" ry="12" fill={BR} />
      <circle cx="26" cy="38" r="3" fill={N} />
      <circle cx="16" cy="45" r="3" fill={N} />
      <path d="M74 55 q12 -10 10 -20" stroke={N} strokeWidth="4" fill="none" />
      {[36, 46, 58, 68].map((x) => <rect key={x} x={x} y="74" width="6" height="14" fill="#c8873a" stroke={N} strokeWidth="2" />)}
    </g>
  ),
  gato: (
    <g>
      <ellipse cx="55" cy="66" rx="24" ry="18" fill="#9aa1a9" stroke={N} strokeWidth="3" />
      <circle cx="40" cy="40" r="16" fill="#9aa1a9" stroke={N} strokeWidth="3" />
      <path d="M28 30 l-2 -16 l12 10 M52 30 l2 -16 l-12 10" fill="#9aa1a9" stroke={N} strokeWidth="3" />
      <circle cx="34" cy="40" r="2.5" fill={N} /><circle cx="46" cy="40" r="2.5" fill={N} />
      <path d="M22 46 h10 M48 46 h10" stroke={N} strokeWidth="1.5" />
      <path d="M79 68 q14 -6 6 -26" stroke={N} strokeWidth="5" fill="none" />
    </g>
  ),
  manzana: (
    <g>
      <path d="M50 30 c-25 -12 -40 15 -30 38 c8 20 22 22 30 16 c8 6 22 4 30 -16 c10 -23 -5 -50 -30 -38 z" fill={R} stroke={N} strokeWidth="3" />
      <path d="M50 30 q2 -12 8 -18" stroke={BR} strokeWidth="4" fill="none" />
      <path d="M54 22 q14 -10 20 2 q-12 6 -20 -2" fill={G} />
    </g>
  ),
  platano: (
    <g>
      <path d="M20 30 q10 50 60 44 q8 -2 4 -8 q-40 4 -52 -38 z" fill={Y} stroke={N} strokeWidth="3" />
      <path d="M20 30 l-4 -6" stroke={BR} strokeWidth="5" />
    </g>
  ),
  autobus: (
    <g>
      <rect x="8" y="24" width="84" height="48" rx="8" fill={O} stroke={N} strokeWidth="3" />
      {[16, 34, 52, 70].map((x) => <rect key={x} x={x} y="32" width="14" height="14" rx="2" fill="#bfe3ff" />)}
      <circle cx="26" cy="74" r="8" fill={N} /><circle cx="74" cy="74" r="8" fill={N} />
      <text x="50" y="64" fontSize="12" fontWeight="900" textAnchor="middle" fill={W} fontFamily="Arial">7</text>
    </g>
  ),
  casa: (
    <g>
      <path d="M14 48 l36 -30 l36 30" fill={R} stroke={N} strokeWidth="3" />
      <rect x="22" y="46" width="56" height="40" fill="#f4f1ea" stroke={N} strokeWidth="3" />
      <rect x="44" y="62" width="12" height="24" fill={BR} />
      <rect x="28" y="54" width="10" height="10" fill="#bfe3ff" /><rect x="62" y="54" width="10" height="10" fill="#bfe3ff" />
    </g>
  ),
  sol: (
    <g>
      <circle cx="50" cy="50" r="20" fill={Y} stroke={O} strokeWidth="3" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={50 + Math.cos(a) * 28} y1={50 + Math.sin(a) * 28} x2={50 + Math.cos(a) * 40} y2={50 + Math.sin(a) * 40} stroke={O} strokeWidth="5" strokeLinecap="round" />;
      })}
    </g>
  ),
  coche: (
    <g>
      <path d="M10 62 v-12 l14 -4 l12 -14 h30 l14 14 l12 4 v12 z" fill={B} stroke={N} strokeWidth="3" />
      <path d="M38 34 h12 v12 h-22 z M54 34 h10 l10 12 h-20 z" fill="#bfe3ff" />
      <circle cx="28" cy="64" r="9" fill={N} /><circle cx="74" cy="64" r="9" fill={N} />
    </g>
  ),
  arbol: (
    <g>
      <rect x="44" y="56" width="12" height="32" fill={BR} />
      <circle cx="50" cy="40" r="26" fill={G} stroke={N} strokeWidth="3" />
      <circle cx="40" cy="36" r="5" fill="#3f9a45" /><circle cx="60" cy="46" r="6" fill="#3f9a45" />
    </g>
  ),
  avion: (
    <g>
      <path d="M10 52 q40 -8 76 -6 q8 2 4 8 q-36 6 -76 4 z" fill={W} stroke={N} strokeWidth="3" />
      <path d="M44 50 l-10 -26 h8 l18 26 M44 54 l-6 22 h8 l14 -22 M16 50 l-6 -14 h6 l8 12" fill="#c0c6ce" stroke={N} strokeWidth="2" />
      {[56, 64, 72].map((x) => <circle key={x} cx={x} cy="50" r="2" fill={B} />)}
    </g>
  ),
  // actions (verbs)
  correr: fig(<>
    <circle cx="58" cy="18" r="8" fill={O} stroke={O} />
    <path d="M56 28 L46 52 M50 34 L66 44 L76 36 M50 34 L36 40 L28 32 M46 52 L60 64 L56 82 M46 52 L32 66 L20 64" stroke={N} />
  </>),
  saltar: fig(<>
    <circle cx="50" cy="16" r="8" fill={O} stroke={O} />
    <path d="M50 26 L50 50 M50 32 L34 20 M50 32 L66 20 M50 50 L38 60 L40 74 M50 50 L62 60 L60 74" stroke={N} />
    <path d="M24 90 h52" stroke={G} />
  </>),
  chutar: fig(<>
    <circle cx="40" cy="16" r="8" fill={O} stroke={O} />
    <path d="M40 26 L42 50 M41 32 L26 42 M41 32 L56 38 M42 50 L36 70 L34 86 M42 50 L62 58 L76 52" stroke={N} />
    <circle cx="84" cy="50" r="8" fill={W} stroke={N} strokeWidth={3} />
  </>),
  beber: fig(<>
    <circle cx="44" cy="18" r="8" fill={O} stroke={O} />
    <path d="M44 28 L44 58 M44 34 L58 30 L56 20 M44 34 L30 44 M44 58 L36 84 M44 58 L54 84" stroke={N} />
    <rect x="52" y="8" width="10" height="16" fill="#8ecae6" stroke={N} strokeWidth={2} />
  </>),
  dormir: fig(<>
    <rect x="10" y="60" width="80" height="12" fill={B} stroke={N} strokeWidth={3} />
    <circle cx="24" cy="52" r="8" fill={O} stroke={O} />
    <path d="M32 54 L80 56" stroke={N} />
    <text x="60" y="34" fontSize="18" fill={N} stroke="none" fontWeight="900">z z</text>
  </>),
  leer: fig(<>
    <circle cx="50" cy="18" r="8" fill={O} stroke={O} />
    <path d="M50 28 L50 60 M50 36 L36 46 M50 36 L64 46 M50 60 L40 86 M50 60 L60 86" stroke={N} />
    <path d="M32 44 L50 50 L68 44 L68 58 L50 64 L32 58 Z" fill={W} stroke={N} strokeWidth={3} />
  </>),
  comer: fig(<>
    <circle cx="44" cy="18" r="8" fill={O} stroke={O} />
    <path d="M44 28 L44 58 M44 36 L56 26 M44 36 L30 46 M44 58 L36 84 M44 58 L54 84" stroke={N} />
    <path d="M60 50 a14 6 0 0 0 28 0 z" fill={Y} stroke={N} strokeWidth={3} />
    <path d="M56 26 L60 14" stroke={N} strokeWidth={3} />
  </>),
  nadar: fig(<>
    <path d="M6 64 q11 -8 22 0 t22 0 t22 0 t22 0" stroke={B} />
    <circle cx="74" cy="48" r="7" fill={O} stroke={O} />
    <path d="M66 52 L30 56 M56 52 L62 34 L76 30 M40 55 L22 46" stroke={N} />
  </>),
};

export function Pic({ id, size = '100%' }: { id: string; size?: number | string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="pic">
      {PICS[id] ?? <circle cx="50" cy="50" r="30" fill="#ccc" />}
    </svg>
  );
}
