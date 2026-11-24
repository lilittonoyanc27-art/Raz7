import { create } from 'zustand';
import type { Level, T } from '../../core/types';
import { pick, shuffle } from '../../core/random';
import { BLOCK_C } from '../../world/layout';
import { CHARACTERS, type Character } from '../../data/characters';

export interface Zone { x: number; z: number; r: number }
export interface WrongZone extends Zone { msg: T; speaker: string; redirect?: Step[] }
export interface MOption { t: T; ok?: boolean; reply?: T }

export interface Step {
  kind: 'talk' | 'reach' | 'bus';
  objective: T;
  npc?: { ch: Character; pos: [number, number, number]; yaw: number };
  lines?: T[];
  check?: { q: T; options: MOption[] };
  target?: Zone & { name: T };
  wrong?: WrongZone[];
  bus?: { line: string; getOff: string; stopId: string };
  arriveLine?: T; // said by step npc when you arrive
}

export interface MissionState {
  active: boolean;
  route: string;
  steps: Step[];
  index: number;
  startedAt: number;
  deadline: number;
  violations: number;
  safeCrossings: number;
  errors: number;
  helps: number;
  showNav: number; // until timestamp
  riding: null | { line: string; s: number; stopIdx: number; waiting: number; announced: number };
  finished: null | { time: number; late: boolean; xp: number; coins: number; violations: number; errors: number };
  start: (lvl: Level) => void;
  next: () => void;
  set: (p: Partial<MissionState>) => void;
  insertSteps: (steps: Step[]) => void;
  stop: () => void;
}

const T_ = (es: string, hy: string): T => ({ es, hy });
const by = <X,>(lvl: Level, a: X, b: X, c: X) => (lvl === 'A1' ? a : lvl === 'A2' ? b : c);

export const Z = {
  home: { x: BLOCK_C[0], z: -87.5, r: 4 },
  escuela: { x: BLOCK_C[1], z: -87, r: 7 },
  super: { x: BLOCK_C[2], z: -87, r: 7 },
  tienda: { x: BLOCK_C[2], z: -65, r: 7 },
  stopEscuela: { x: -37.5, z: -66.4, r: 5 },
  plaza: { x: BLOCK_C[1], z: -37.5, r: 18 },
  parque: { x: BLOCK_C[2], z: 37.5, r: 22 },
  entreno: { x: -9.5, z: 37.5, r: 7 },
  estadio: { x: 86.5, z: 37.5, r: 7 },
};

const toStadiumFrom = (lvl: Level, ch: Character, pos: [number, number, number], yaw: number): Step[] => [
  {
    kind: 'talk',
    objective: T_(`Habla con ${ch.name}`, `Խոսիր ${ch.name}-ի հետ`),
    npc: { ch, pos, yaw },
    lines: by(lvl,
      [T_('El estadio está enfrente del parque.', 'Մարզադաշտը այգու դիմաց է։'), T_('Busca el Parque Central y cruza la calle.', 'Գտիր Կենտրոնական այգին և անցիր փողոցը։')],
      [T_('Para llegar al estadio, primero busca el Parque Central.', 'Մարզադաշտ հասնելու համար նախ գտիր Կենտրոնական այգին։'), T_('El estadio está justo enfrente del parque, al otro lado de la calle.', 'Մարզադաշտը հենց այգու դիմաց է՝ փողոցի մյուս կողմում։')],
      [T_('Mira, tendrás que atravesar el Parque Central.', 'Նայիր, պետք է անցնես Կենտրոնական այգով։'), T_('Cuando salgas del parque por el otro lado, verás el estadio enfrente. Cruza por el paso de peatones, ¿eh?', 'Երբ այգուց դուրս գաս մյուս կողմից, դիմացդ կտեսնես մարզադաշտը։ Անցիր հետիոտնային անցումով, լա՞վ։')]),
    check: {
      q: T_('¿Dónde está el estadio?', 'Որտե՞ղ է մարզադաշտը։'),
      options: [
        { t: T_('Enfrente del parque.', 'Այգու դիմաց։'), ok: true, reply: T_('¡Exacto! Venga, date prisa.', 'Ճիշտ է։ Դե, շտապիր։') },
        { t: T_('Detrás de la escuela.', 'Դպրոցի հետևում։'), ok: false },
        { t: T_('Al lado del supermercado.', 'Սուպերմարկետի կողքին։'), ok: false },
      ],
    },
  },
  {
    kind: 'reach',
    objective: T_('Llega al estadio (enfrente del parque)', 'Հասիր մարզադաշտ (այգու դիմաց)'),
    target: { ...Z.estadio, name: T_('Estadio', 'Մարզադաշտ') },
    wrong: [
      { ...Z.entreno, speaker: 'Asistente', msg: T_('Esto es el centro de entrenamiento, pero hoy entrenáis en el estadio. Está enfrente del parque.', 'Սա մարզական կենտրոնն է, բայց այսօր մարզվում եք մարզադաշտում։ Այն այգու դիմաց է։') },
    ],
  },
];

function routeWalk(lvl: Level): Step[] {
  const v = CHARACTERS.vecina;
  const prof = CHARACTERS.profesor;
  const toni = CHARACTERS.vendedor;
  return [
    {
      kind: 'talk',
      objective: T_('Habla con tu vecina Carmen', 'Խոսիր հարևանուհուդ՝ Կարմենի հետ'),
      npc: { ch: v, pos: [BLOCK_C[0] + 1.8, 0.15, -85.2], yaw: 0 },
      lines: by(lvl,
        [T_('¡Hola, Razmik! ¿Vas al estadio?', 'Բարև, Ռազմիկ։ Մարզադաշտ ես գնում։'), T_('Gira a la izquierda y sigue recto hasta la escuela.', 'Թեքվիր ձախ և ուղիղ գնա մինչև դպրոց։')],
        [T_('¡Hola, Razmik! Tu entrenador ha llamado a tu madre.', 'Բարև, Ռազմիկ։ Քո մարզիչը զանգել է մայրիկիդ։'), T_('Sal de casa, gira a la izquierda y sigue recto hasta la escuela. Allí pregunta al profesor Martín.', 'Դուրս արի տնից, թեքվիր ձախ և ուղիղ գնա մինչև դպրոց։ Այնտեղ հարցրու ուսուցիչ Մարտինին։')],
        [T_('Razmik, cariño, el entrenamiento empieza pronto y hoy el autobús va lleno.', 'Ռազմիկ, սիրելիս, մարզումը շուտով սկսվում է, իսկ այսօր ավտոբուսը լեցուն է։'), T_('Te aconsejo que vayas andando: gira a la izquierda y sigue todo recto hasta la escuela. El profesor Martín te indicará el resto.', 'Խորհուրդ եմ տալիս ոտքով գնալ․ թեքվիր ձախ և ուղիղ գնա մինչև դպրոց։ Մնացածը ուսուցիչ Մարտինը կասի։')]),
      check: {
        q: T_('¿Hacia dónde tienes que girar?', 'Դեպի ո՞ւր պետք է թեքվես։'),
        options: [
          { t: T_('A la izquierda.', 'Ձախ։'), ok: true, reply: T_('¡Muy bien! Hasta la escuela.', 'Շատ լավ։ Մինչև դպրոց։') },
          { t: T_('A la derecha.', 'Աջ։'), ok: false },
          { t: T_('Hacia atrás.', 'Ետ։'), ok: false },
        ],
      },
    },
    {
      kind: 'reach',
      objective: T_('Sigue recto hasta la escuela', 'Ուղիղ գնա մինչև դպրոց'),
      target: { ...Z.escuela, name: T_('Escuela', 'Դպրոց') },
      wrong: [{ x: BLOCK_C[0] - 26, z: -84, r: 9, speaker: 'Carmen', msg: T_('¡Razmik, por ahí no! Te he dicho a la izquierda, hacia la escuela.', 'Ռազմիկ, այդ կողմ չէ։ Ասացի՝ ձախ, դեպի դպրոց։') }],
    },
    {
      kind: 'talk',
      objective: T_('Pregunta al profesor Martín', 'Հարցրու ուսուցիչ Մարտինին'),
      npc: { ch: prof, pos: [BLOCK_C[1] + 3, 0.15, -86.5], yaw: 0 },
      lines: by(lvl,
        [T_('Hola, Razmik. Cruza la calle por el paso de peatones.', 'Բարև, Ռազմիկ։ Անցիր փողոցը հետիոտնային անցումով։'), T_('Después ve a la tienda deportiva. Está enfrente del supermercado.', 'Հետո գնա սպորտային խանութ։ Այն սուպերմարկետի դիմաց է։')],
        [T_('¿Al estadio? Primero tienes que cruzar la calle por el paso de peatones.', 'Մարզադաշտ։ Նախ պետք է անցնես փողոցը հետիոտնային անցումով։'), T_('Luego sigue hasta la tienda deportiva, que está enfrente del supermercado. Toni te ayudará.', 'Հետո գնա մինչև սպորտային խանութը, որը սուպերմարկետի դիմաց է։ Տոնին կօգնի քեզ։')],
        [T_('Si quieres llegar a tiempo, no te entretengas.', 'Եթե ուզում ես ժամանակին հասնել, մի՛ շեղվիր։'), T_('Cruza por el paso de peatones cuando el muñeco esté en verde y dirígete a la tienda deportiva, la que está enfrente del supermercado.', 'Անցիր հետիոտնային անցումով, երբ փոքրիկ մարդը կանաչ լինի, և գնա սպորտային խանութ՝ այն, որ սուպերմարկետի դիմաց է։')]),
      check: {
        q: T_('¿Dónde está la tienda deportiva?', 'Որտե՞ղ է սպորտային խանութը։'),
        options: [
          { t: T_('Enfrente del supermercado.', 'Սուպերմարկետի դիմաց։'), ok: true, reply: T_('Correcto. ¡Y cuidado con los coches!', 'Ճիշտ է։ Եվ զգույշ մեքենաներից։') },
          { t: T_('Dentro de la escuela.', 'Դպրոցի ներսում։'), ok: false },
          { t: T_('Detrás de tu casa.', 'Քո տան հետևում։'), ok: false },
        ],
      },
    },
    {
      kind: 'reach',
      objective: T_('Ve a la tienda deportiva (enfrente del supermercado)', 'Գնա սպորտային խանութ (սուպերմարկետի դիմաց)'),
      target: { ...Z.tienda, name: T_('Tienda deportiva', 'Սպորտային խանութ') },
      wrong: [{ ...Z.super, speaker: 'Elena', msg: T_('Esto es el supermercado. La tienda deportiva está enfrente, al otro lado de la calle.', 'Սա սուպերմարկետն է։ Սպորտային խանութը դիմացն է՝ փողոցի մյուս կողմում։') }],
    },
    ...toStadiumFrom(lvl, toni, [BLOCK_C[2] + 3, 0.15, -65.5], Math.PI),
  ];
}

function routeBus(lvl: Level): Step[] {
  const v = CHARACTERS.vecina;
  const stopName = by(lvl, 'Parque Central', 'Parque Central', 'Parque Central');
  return [
    {
      kind: 'talk',
      objective: T_('Habla con tu vecina Carmen', 'Խոսիր հարևանուհուդ՝ Կարմենի հետ'),
      npc: { ch: v, pos: [BLOCK_C[0] + 1.8, 0.15, -85.2], yaw: 0 },
      lines: by(lvl,
        [T_('¡Hola, Razmik! Toma el autobús número siete.', 'Բարև, Ռազմիկ։ Նստիր յոթ համարի ավտոբուսը։'), T_('La parada está enfrente de la escuela.', 'Կանգառը դպրոցի դիմաց է։'), T_(`Baja en la parada ${stopName}.`, `Իջիր «${stopName}» կանգառում։`)],
        [T_('Razmik, el estadio está lejos. Es mejor ir en autobús.', 'Ռազմիկ, մարզադաշտը հեռու է։ Ավելի լավ է ավտոբուսով գնալ։'), T_('Tienes que tomar el número siete. La parada está enfrente de la escuela.', 'Պետք է նստես յոթ համարը։ Կանգառը դպրոցի դիմաց է։'), T_(`Tienes que bajar en la parada del ${stopName}. El estadio está enfrente.`, `Պետք է իջնես ${stopName}-ի կանգառում։ Մարզադաշտը դիմացն է։`)],
        [T_('Hoy no te dará tiempo a ir andando, así que coge el autobús.', 'Այսօր ոտքով չես հասցնի, այնպես որ ավտոբուս նստիր։'), T_('Ojo: no subas al tres ni al doce, porque no van al estadio. Tienes que coger el siete en la parada que hay enfrente de la escuela.', 'Ուշադիր՝ մի՛ նստիր երեքը կամ տասներկուսը, որովհետև դրանք մարզադաշտ չեն գնում։ Պետք է նստես յոթը դպրոցի դիմացի կանգառում։'), T_('Bájate en la segunda parada, la del Parque Central.', 'Իջիր երկրորդ կանգառում՝ Կենտրոնական այգու մոտ։')]),
      check: {
        q: T_('¿Qué autobús tienes que tomar?', 'Ո՞ր ավտոբուսը պետք է նստես։'),
        options: [
          { t: T_('El número siete.', 'Յոթ համարը։'), ok: true, reply: T_('¡Eso es! Y la parada está enfrente de la escuela.', 'Հենց այդպես։ Իսկ կանգառը դպրոցի դիմաց է։') },
          { t: T_('El número tres.', 'Երեք համարը։'), ok: false },
          { t: T_('El número doce.', 'Տասներկու համարը։'), ok: false },
        ],
      },
    },
    {
      kind: 'reach',
      objective: T_('Ve a la parada de autobús (enfrente de la escuela)', 'Գնա ավտոբուսի կանգառ (դպրոցի դիմաց)'),
      target: { ...Z.stopEscuela, name: T_('Parada', 'Կանգառ') },
      wrong: [
        { ...Z.escuela, r: 5, speaker: 'Martín', msg: T_('Esto es la escuela. La parada está enfrente, al otro lado de la calle. Usa el paso de peatones.', 'Սա դպրոցն է։ Կանգառը դիմացն է՝ փողոցի մյուս կողմում։ Օգտվիր հետիոտնային անցումից։') },
        { x: BLOCK_C[0] - 26, z: -84, r: 9, speaker: 'Carmen', msg: T_('¡Por ahí no, Razmik! La escuela está hacia el otro lado.', 'Այդ կողմ չէ, Ռազմիկ։ Դպրոցը մյուս կողմում է։') },
      ],
    },
    {
      kind: 'bus',
      objective: T_('Espera y sube al autobús número 7', 'Սպասիր և նստիր 7 համարի ավտոբուսը'),
      bus: { line: '7', getOff: 'parque', stopId: 'escuela' },
    },
    {
      kind: 'reach',
      objective: T_('Cruza la calle con cuidado y entra en el estadio', 'Զգուշությամբ անցիր փողոցը և մտիր մարզադաշտ'),
      target: { ...Z.estadio, name: T_('Estadio', 'Մարզադաշտ') },
    },
  ];
}

export function redirectFromWrongBus(lvl: Level): Step[] {
  return toStadiumFrom(lvl, CHARACTERS.conductor, [0, 0.15, 0], 0).slice(1);
}

export const ROUTES = { walk: routeWalk, bus: routeBus };

export const useMission = create<MissionState>((set, get) => ({
  active: false,
  route: '',
  steps: [],
  index: 0,
  startedAt: 0,
  deadline: 0,
  violations: 0,
  safeCrossings: 0,
  errors: 0,
  helps: 0,
  showNav: 0,
  riding: null,
  finished: null,
  start: (lvl) => {
    const route = pick(['walk', 'bus'] as const);
    const steps = ROUTES[route](lvl);
    const now = performance.now();
    const budget = (route === 'walk' ? 330 : 300) * (lvl === 'A1' ? 1.25 : lvl === 'A2' ? 1.1 : 1);
    set({ active: true, route, steps, index: 0, startedAt: now, deadline: now + budget * 1000, violations: 0, safeCrossings: 0, errors: 0, helps: 0, riding: null, finished: null, showNav: 0 });
  },
  next: () => set({ index: get().index + 1 }),
  set: (p) => set(p),
  insertSteps: (steps) => {
    const s = get().steps.slice();
    s.splice(get().index + 1, s.length, ...steps);
    set({ steps: s });
  },
  stop: () => set({ active: false, riding: null }),
}));

export const busOrder = () => shuffle(['3', '12', '7']);
