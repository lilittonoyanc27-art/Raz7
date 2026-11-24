import type { T } from '../core/types';

export const ROADS = [-75, 0, 75];
export const ROAD_HALF = 6;
export const SIDEWALK = 3.5;
export const CITY = 150;
export const BLOCK_C = [-115.5, -37.5, 37.5, 115.5];
export const BLOCK_S = [69, 63, 63, 69];
export const blockRange = (i: number): [number, number] => [BLOCK_C[i] - BLOCK_S[i] / 2, BLOCK_C[i] + BLOCK_S[i] / 2];

export function inRoad(x: number, z: number) {
  if (Math.abs(x) > CITY + 30 || Math.abs(z) > CITY + 30) return false;
  for (const r of ROADS) {
    if (Math.abs(z - r) < ROAD_HALF && Math.abs(x) <= CITY + 30) return true;
    if (Math.abs(x - r) < ROAD_HALF && Math.abs(z) <= CITY + 30) return true;
  }
  return false;
}
export const SIDEWALK_Y = 0.15;
export const cityGround = (x: number, z: number) => (inRoad(x, z) ? 0 : SIDEWALK_Y);

// --------------------------- traffic lights
export const LIGHT_CYCLE = 22;
/** returns light state for cars travelling along axis */
export function lightFor(axis: 'x' | 'z', t: number): 'green' | 'yellow' | 'red' {
  const p = t % LIGHT_CYCLE;
  if (axis === 'x') return p < 8.5 ? 'green' : p < 11 ? 'yellow' : 'red';
  return p < 11 ? 'red' : p < 19.5 ? 'green' : p < 22 ? 'yellow' : 'red';
}
/** pedestrians crossing a road that runs along `roadAxis` may walk when those cars are red */
export function pedestrianGreen(roadAxis: 'x' | 'z', t: number) {
  const p = t % LIGHT_CYCLE;
  // a short all-red margin for safety
  if (roadAxis === 'x') return p > 11.5 && p < 21.5;
  return p > 0.5 && p < 10.5;
}

export const CROSS_OFF = 9; // crosswalk center offset from intersection center
export const CROSS_HALF = 2;

export type RoadZone =
  | { kind: 'none' }
  | { kind: 'intersection' }
  | { kind: 'road'; axis: 'x' | 'z'; crosswalk: boolean };

export function roadZone(x: number, z: number): RoadZone {
  for (const rx of ROADS)
    for (const rz of ROADS) {
      if (Math.abs(x - rx) < ROAD_HALF && Math.abs(z - rz) < ROAD_HALF) return { kind: 'intersection' };
    }
  for (const r of ROADS) {
    if (Math.abs(z - r) < ROAD_HALF) {
      // horizontal road (cars move along x)
      const cw = ROADS.some((cx) => Math.abs(Math.abs(x - cx) - CROSS_OFF) < CROSS_HALF);
      return { kind: 'road', axis: 'x', crosswalk: cw };
    }
    if (Math.abs(x - r) < ROAD_HALF) {
      const cw = ROADS.some((cz) => Math.abs(Math.abs(z - cz) - CROSS_OFF) < CROSS_HALF);
      return { kind: 'road', axis: 'z', crosswalk: cw };
    }
  }
  return { kind: 'none' };
}

// --------------------------- places
export type PlaceId =
  | 'casa' | 'escuela' | 'super' | 'restaurante' | 'tienda' | 'plaza' | 'entreno' | 'parque' | 'estadio' | 'aeropuerto' | 'secreta';

export interface Place {
  id: PlaceId;
  name: T;
  block: [number, number];
  door: [number, number]; // world x,z of entrance (on sidewalk)
  doorYaw: number; // yaw facing out of the door
  color: string;
  short: string;
  minLevel?: number;
}

const bc = (i: number) => BLOCK_C[i];

export const PLACES: Place[] = [
  { id: 'casa', name: { es: 'Casa de Razmik', hy: 'Ռազմիկի տունը' }, block: [0, 0], door: [bc(0), -88], doorYaw: 0, color: '#ff7a1a', short: 'CASA' },
  { id: 'escuela', name: { es: 'Escuela', hy: 'Դպրոց' }, block: [1, 0], door: [bc(1), -88], doorYaw: 0, color: '#f2c94c', short: 'ESCUELA' },
  { id: 'super', name: { es: 'Supermercado', hy: 'Սուպերմարկետ' }, block: [2, 0], door: [bc(2), -88], doorYaw: 0, color: '#27ae60', short: 'SÚPER' },
  { id: 'restaurante', name: { es: 'Restaurante «El Gol»', hy: '«Էլ Գոլ» ռեստորան' }, block: [3, 0], door: [bc(3), -88], doorYaw: 0, color: '#e14b4b', short: 'RESTAURANTE' },
  { id: 'plaza', name: { es: 'Plaza de Competiciones', hy: 'Մրցումների հրապարակ' }, block: [1, 1], door: [bc(1), -37.5], doorYaw: 0, color: '#9b51e0', short: 'PLAZA' },
  { id: 'tienda', name: { es: 'Tienda deportiva', hy: 'Սպորտային խանութ' }, block: [2, 1], door: [bc(2), -64], doorYaw: Math.PI, color: '#2e6fd8', short: 'TIENDA' },
  { id: 'entreno', name: { es: 'Centro de Entrenamiento', hy: 'Մարզական կենտրոն' }, block: [1, 2], door: [bc(1) + 28, 37.5], doorYaw: Math.PI / 2, color: '#56ccf2', short: 'ENTRENO' },
  { id: 'parque', name: { es: 'Parque Central', hy: 'Կենտրոնական այգի' }, block: [2, 2], door: [bc(2), 37.5], doorYaw: 0, color: '#3f9a45', short: 'PARQUE' },
  { id: 'estadio', name: { es: 'Estadio de Campeones', hy: 'Չեմպիոնների մարզադաշտ' }, block: [3, 2], door: [86, 37.5], doorYaw: -Math.PI / 2, color: '#ffd34d', short: 'ESTADIO' },
  { id: 'aeropuerto', name: { es: 'Aeropuerto', hy: 'Օդանավակայան' }, block: [0, 3], door: [bc(0), 87], doorYaw: Math.PI, color: '#7aa7d9', short: 'AEROPUERTO', minLevel: 2 },
  { id: 'secreta', name: { es: 'Zona Secreta', hy: 'Գաղտնի գոտի' }, block: [1, 3], door: [bc(1), 87], doorYaw: Math.PI, color: '#ff4fd8', short: 'SECRETA', minLevel: 2 },
];
export const placeById = (id: PlaceId) => PLACES.find((p) => p.id === id)!;

// --------------------------- bus lines
export interface BusStop { id: string; name: T; pos: [number, number]; s: number }
export interface BusLine { line: string; color: string; path: [number, number][]; stops: BusStop[] }

/** polyline helpers */
export function pathLength(path: [number, number][]) {
  let L = 0;
  for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return L;
}
export function pointAt(path: [number, number][], s: number): { x: number; z: number; yaw: number } {
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const [x0, z0] = path[i - 1];
    const [x1, z1] = path[i];
    const L = Math.hypot(x1 - x0, z1 - z0);
    if (acc + L >= s) {
      const k = (s - acc) / L;
      return { x: x0 + (x1 - x0) * k, z: z0 + (z1 - z0) * k, yaw: Math.atan2(x1 - x0, z1 - z0) };
    }
    acc += L;
  }
  const n = path.length;
  return { x: path[n - 1][0], z: path[n - 1][1], yaw: Math.atan2(path[n - 1][0] - path[n - 2][0], path[n - 1][1] - path[n - 2][1]) };
}
function projectS(path: [number, number][], x: number, z: number) {
  let best = 0;
  let bestD = Infinity;
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const [x0, z0] = path[i - 1];
    const [x1, z1] = path[i];
    const L = Math.hypot(x1 - x0, z1 - z0);
    const k = Math.max(0, Math.min(1, ((x - x0) * (x1 - x0) + (z - z0) * (z1 - z0)) / (L * L)));
    const px = x0 + (x1 - x0) * k;
    const pz = z0 + (z1 - z0) * k;
    const d = Math.hypot(px - x, pz - z);
    if (d < bestD) {
      bestD = d;
      best = acc + k * L;
    }
    acc += L;
  }
  return best;
}
function mkLine(line: string, color: string, path: [number, number][], stops: { id: string; name: T; pos: [number, number] }[]): BusLine {
  return { line, color, path, stops: stops.map((s) => ({ ...s, s: projectS(path, s.pos[0], s.pos[1]) })) };
}

export const STOP_NAMES: Record<string, T> = {
  escuela: { es: 'Escuela', hy: 'Դպրոց' },
  tienda: { es: 'Tienda deportiva', hy: 'Սպորտային խանութ' },
  parque: { es: 'Parque Central', hy: 'Կենտրոնական այգի' },
  aeropuerto: { es: 'Aeropuerto', hy: 'Օդանավակայան' },
  plaza: { es: 'Plaza', hy: 'Հրապարակ' },
  secreta: { es: 'Zona Secreta', hy: 'Գաղտնի գոտի' },
  restaurante: { es: 'Restaurante', hy: 'Ռեստորան' },
};

// eastbound lane z=-72 ; southbound lane x=72 ; southbound lane x=-3 ; northbound x=3; westbound z=-78
export const BUS_LINES: BusLine[] = [
  mkLine('7', '#ff7a1a', [[-160, -72], [72, -72], [72, 160]], [
    { id: 'escuela', name: STOP_NAMES.escuela, pos: [-37.5, -72] },
    { id: 'tienda', name: STOP_NAMES.tienda, pos: [37.5, -72] },
    { id: 'parque', name: STOP_NAMES.parque, pos: [72, 37.5] },
    { id: 'aeropuerto', name: { es: 'Final de línea', hy: 'Գծի վերջ' }, pos: [72, 115] },
  ]),
  mkLine('3', '#2e6fd8', [[-160, -72], [-3, -72], [-3, 160]], [
    { id: 'escuela', name: STOP_NAMES.escuela, pos: [-37.5, -72] },
    { id: 'plaza', name: STOP_NAMES.plaza, pos: [-3, -37.5] },
    { id: 'secreta', name: STOP_NAMES.secreta, pos: [-3, 115] },
  ]),
  mkLine('12', '#27ae60', [[-160, -72], [160, -72]], [
    { id: 'escuela', name: STOP_NAMES.escuela, pos: [-37.5, -72] },
    { id: 'tienda', name: STOP_NAMES.tienda, pos: [37.5, -72] },
    { id: 'restaurante', name: STOP_NAMES.restaurante, pos: [115.5, -72] },
  ]),
];
/** where the passenger steps out: sidewalk next to the stop */
export function stopSidewalk(line: BusLine, stop: BusStop): [number, number] {
  const p = pointAt(line.path, stop.s);
  // right side of driving direction
  const rx = Math.cos(p.yaw) * -1;
  const rz = Math.sin(p.yaw);
  // driving dir (sin yaw, cos yaw); right-hand side = (-cos yaw, sin yaw)... choose side that is not road
  const a: [number, number] = [p.x + rx * 6, p.z + rz * 6];
  const b: [number, number] = [p.x - rx * 6, p.z - rz * 6];
  const pick = !inRoad(a[0], a[1]) ? a : b;
  return pick;
}
