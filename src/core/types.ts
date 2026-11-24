export type T = { es: string; hy: string };
export type Level = 'A1' | 'A2' | 'B1';
export const LEVELS: Level[] = ['A1', 'A2', 'B1'];
export type Quality = 'Bajo' | 'Medio' | 'Alto' | 'Ultra';
export type TimeOfDay = 'dia' | 'tarde' | 'noche';

export const t = (es: string, hy: string): T => ({ es, hy });

export function levelIndex(l: Level) {
  return LEVELS.indexOf(l);
}
