import type { T } from './types';

export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:«»"()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(s: string) {
  return norm(s).split(' ').filter(Boolean);
}

/** accept: every group must be satisfied by at least one alternative (prefix-match on words or substring for phrases) */
export function matchesGroups(answer: string, accept: string[][]) {
  const n = ' ' + norm(answer) + ' ';
  return accept.every((group) =>
    group.some((alt) => {
      const a = norm(alt);
      if (a.includes(' ')) return n.includes(' ' + a);
      return n.includes(' ' + a);
    }),
  );
}

export interface Feedback { ok: boolean; tips: T[] }

const COMMON: { re: RegExp; tip: T }[] = [
  { re: /\byo es\b/, tip: { es: 'Se dice «yo soy», no «yo es».', hy: 'Ասվում է «yo soy», ոչ թե «yo es»։' } },
  { re: /\byo esta\b/, tip: { es: 'Se dice «yo estoy», no «yo está».', hy: 'Ասվում է «yo estoy», ոչ թե «yo está»։' } },
  { re: /\byo tiene\b/, tip: { es: 'Se dice «yo tengo».', hy: 'Ասվում է «yo tengo»։' } },
  { re: /\byo va\b/, tip: { es: 'Se dice «yo voy».', hy: 'Ասվում է «yo voy»։' } },
  { re: /\byo hace\b/, tip: { es: 'Se dice «yo hago».', hy: 'Ասվում է «yo hago»։' } },
  { re: /\byo juega\b|\byo jugo\b/, tip: { es: 'Se dice «yo juego».', hy: 'Ասվում է «yo juego»։' } },
  { re: /\bme gusta (los|las) /, tip: { es: 'Con plural se dice «me gustan los/las...».', hy: 'Հոգնակիի դեպքում ասվում է «me gustan los/las...»։' } },
  { re: /\byo gusta\b/, tip: { es: 'Se dice «me gusta», no «yo gusta».', hy: 'Ասվում է «me gusta», ոչ թե «yo gusta»։' } },
  { re: /\btengo (\d+|doce|once|trece) anos?\b/, tip: { es: 'Cuidado: se escribe «años» con ñ.', hy: 'Ուշադրություն՝ գրվում է «años»՝ ñ տառով։' } },
  { re: /\bel futbol\b.*\bes bueno\b/, tip: { es: 'También puedes decir «el fútbol es genial».', hy: 'Կարող ես նաև ասել «el fútbol es genial»։' } },
  { re: /\bmuy mucho\b/, tip: { es: 'Se dice «mucho», no «muy mucho».', hy: 'Ասվում է «mucho», ոչ թե «muy mucho»։' } },
];

export function evaluateFree(answer: string, accept: string[][], minWords = 2): Feedback {
  const n = norm(answer);
  const tips: T[] = [];
  COMMON.forEach((c) => {
    if (c.re.test(n)) tips.push(c.tip);
  });
  const wc = words(answer).length;
  const okContent = matchesGroups(answer, accept);
  if (wc < minWords) {
    tips.push({ es: 'Intenta responder con una frase completa.', hy: 'Փորձիր պատասխանել ամբողջական նախադասությամբ։' });
  }
  // grammar mistakes don't fail the answer, they are gently corrected
  return { ok: okContent && wc >= minWords, tips };
}

/** similarity 0..1 between two phrases (word-level, order-aware) for tongue twisters */
export function similarity(a: string, b: string) {
  const wa = words(a);
  const wb = words(b);
  if (!wa.length || !wb.length) return 0;
  // Levenshtein on words
  const dp: number[][] = Array.from({ length: wa.length + 1 }, (_, i) => [i, ...Array(wb.length).fill(0)]);
  for (let j = 1; j <= wb.length; j++) dp[0][j] = j;
  for (let i = 1; i <= wa.length; i++)
    for (let j = 1; j <= wb.length; j++) {
      const cost = wa[i - 1] === wb[j - 1] ? 0 : charSim(wa[i - 1], wb[j - 1]) > 0.75 ? 0.4 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  return Math.max(0, 1 - dp[wa.length][wb.length] / Math.max(wa.length, wb.length));
}
function charSim(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const d: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[n] / Math.max(m, n);
}
