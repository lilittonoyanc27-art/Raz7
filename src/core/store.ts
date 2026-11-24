import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Level, Quality, T, TimeOfDay } from './types';
import { hashStr, seeded, todayKey } from './random';

export interface WrittenAnswer { q: string; a: string; ok: boolean; date: number; mode: string }
export interface DailyTask { id: string; es: string; hy: string; goal: number; progress: number; done: boolean; reward: number; kind: string }

export interface Settings {
  quality: Quality;
  music: number;
  sfx: number;
  voice: number;
  voiceRate: number;
  timeOfDay: TimeOfDay;
  camSensitivity: number;
  autoLevel: boolean;
  showNavigator: boolean;
}

export interface ProgressState {
  xp: number;
  coins: number;
  cups: number;
  medals: string[];
  level: Level;
  streak: number;
  ballSkin: string;
  boots: string;
  accessory: string;
  owned: string[];
  records: Record<string, number>;
  missions: Record<string, number>;
  secrets: string[];
  daily: { date: string; tasks: DailyTask[] };
  stats: {
    timePlayed: number;
    correct: number;
    wrong: number;
    listenCorrect: number;
    listenTotal: number;
    dialogs: number;
    cats: Record<string, { c: number; w: number }>;
    hard: Record<string, { es: string; hy: string; n: number }>;
    words: string[];
    written: WrittenAnswer[];
    sessions: number;
    firstPlay: number;
  };
  settings: Settings;
  // actions
  addXP: (n: number) => void;
  addCoins: (n: number) => boolean;
  answer: (item: T | null, ok: boolean, cat: string, listening?: boolean) => void;
  addWords: (words: string[]) => void;
  setRecord: (key: string, value: number, lowerIsBetter?: boolean) => boolean;
  completeMission: (id: string, xp: number, coins: number, cup?: boolean) => void;
  addMedal: (m: string) => void;
  addWritten: (w: WrittenAnswer) => void;
  addDialog: () => void;
  tick: (sec: number) => void;
  setSettings: (s: Partial<Settings>) => void;
  setLevel: (l: Level) => void;
  buy: (id: string, price: number) => boolean;
  equip: (slot: 'ballSkin' | 'boots' | 'accessory', id: string) => void;
  dailyProgress: (kind: string, n?: number) => void;
  ensureDaily: () => void;
  unlockSecret: (id: string) => void;
  reset: () => void;
}

const DAILY_POOL: Omit<DailyTask, 'progress' | 'done'>[] = [
  { id: 'd1', kind: 'mission', es: 'Completa 1 misión', hy: 'Ավարտիր 1 առաքելություն', goal: 1, reward: 40 },
  { id: 'd2', kind: 'correct', es: 'Responde bien 15 veces', hy: 'Ճիշտ պատասխանիր 15 անգամ', goal: 15, reward: 30 },
  { id: 'd3', kind: 'dialog', es: 'Habla con 5 personas en la ciudad', hy: 'Խոսիր քաղաքում 5 մարդու հետ', goal: 5, reward: 30 },
  { id: 'd4', kind: 'goal', es: 'Marca 3 goles en el entrenamiento', hy: 'Մարզման ժամանակ խփիր 3 գոլ', goal: 3, reward: 35 },
  { id: 'd5', kind: 'race', es: 'Termina una carrera', hy: 'Ավարտիր մեկ մրցավազք', goal: 1, reward: 35 },
  { id: 'd6', kind: 'trabalenguas', es: 'Practica 3 trabalenguas', hy: 'Վարժվիր 3 շուտասելուկով', goal: 3, reward: 25 },
  { id: 'd7', kind: 'memory', es: 'Gana una partida de memoria', hy: 'Հաղթիր մեկ հիշողության խաղում', goal: 1, reward: 25 },
  { id: 'd8', kind: 'listen', es: 'Escucha y entiende 8 frases', hy: 'Լսիր և հասկացիր 8 նախադասություն', goal: 8, reward: 30 },
  { id: 'd9', kind: 'ruleta', es: 'Adivina 2 palabras en la ruleta', hy: 'Գուշակիր 2 բառ ռուլետկայում', goal: 2, reward: 30 },
  { id: 'd10', kind: 'speak', es: 'Responde 4 preguntas con tus palabras', hy: 'Պատասխանիր 4 հարցի քո բառերով', goal: 4, reward: 35 },
];

function makeDaily(): { date: string; tasks: DailyTask[] } {
  const date = todayKey();
  const r = seeded(hashStr(date));
  const pool = DAILY_POOL.slice();
  const tasks: DailyTask[] = [];
  while (tasks.length < 3) {
    const i = Math.floor(r() * pool.length);
    tasks.push({ ...pool.splice(i, 1)[0], progress: 0, done: false });
  }
  return { date, tasks };
}

const defaultSettings: Settings = {
  quality: 'Medio',
  music: 0.35,
  sfx: 0.7,
  voice: 1,
  voiceRate: 0.95,
  timeOfDay: 'tarde',
  camSensitivity: 1,
  autoLevel: true,
  showNavigator: false,
};

const initial = () => ({
  xp: 0,
  coins: 50,
  cups: 0,
  medals: [] as string[],
  level: 'A1' as Level,
  streak: 0,
  ballSkin: 'clasico',
  boots: 'negras',
  accessory: 'ninguno',
  owned: ['clasico', 'negras', 'ninguno'],
  records: {} as Record<string, number>,
  missions: {} as Record<string, number>,
  secrets: [] as string[],
  daily: makeDaily(),
  stats: {
    timePlayed: 0,
    correct: 0,
    wrong: 0,
    listenCorrect: 0,
    listenTotal: 0,
    dialogs: 0,
    cats: {},
    hard: {},
    words: [],
    written: [],
    sessions: 0,
    firstPlay: Date.now(),
  },
  settings: defaultSettings,
});

export const levelFromXp = (xp: number) => Math.floor(xp / 300) + 1;
export const xpInLevel = (xp: number) => xp % 300;

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial(),
      addXP: (n) => {
        const before = levelFromXp(get().xp);
        set({ xp: get().xp + n });
        const after = levelFromXp(get().xp);
        if (after > before) {
          useUI.getState().toast({ es: `¡Nivel ${after}!`, hy: `Մակարդակ ${after}!` }, 'level');
        }
      },
      addCoins: (n) => {
        if (get().coins + n < 0) return false;
        set({ coins: get().coins + n });
        return true;
      },
      answer: (item, ok, cat, listening) => {
        const s = { ...get().stats };
        s.cats = { ...s.cats };
        const c = s.cats[cat] ?? { c: 0, w: 0 };
        s.cats[cat] = ok ? { ...c, c: c.c + 1 } : { ...c, w: c.w + 1 };
        if (ok) s.correct++;
        else s.wrong++;
        if (listening) {
          s.listenTotal++;
          if (ok) s.listenCorrect++;
        }
        if (!ok && item) {
          s.hard = { ...s.hard };
          const k = item.es.slice(0, 80);
          s.hard[k] = { es: item.es, hy: item.hy, n: (s.hard[k]?.n ?? 0) + 1 };
        }
        let streak = ok ? get().streak + 1 : 0;
        let level = get().level;
        if (get().settings.autoLevel && streak >= 25 && level !== 'B1') {
          level = level === 'A1' ? 'A2' : 'B1';
          streak = 0;
          useUI.getState().toast({ es: `¡Subes al nivel ${level}! Lo estás haciendo genial.`, hy: `Անցնում ես ${level} մակարդակ։ Հիանալի ես աշխատում։` }, 'level');
        }
        set({ stats: s, streak, level });
        if (ok) get().dailyProgress('correct');
        if (ok && listening) get().dailyProgress('listen');
      },
      addWords: (words) => {
        const set1 = new Set(get().stats.words);
        let changed = false;
        words.forEach((w) => {
          if (!set1.has(w)) {
            set1.add(w);
            changed = true;
          }
        });
        if (changed) set({ stats: { ...get().stats, words: Array.from(set1) } });
      },
      setRecord: (key, value, lower) => {
        const cur = get().records[key];
        const better = cur === undefined || (lower ? value < cur : value > cur);
        if (better) set({ records: { ...get().records, [key]: value } });
        return better;
      },
      completeMission: (id, xp, coins, cup) => {
        set({
          missions: { ...get().missions, [id]: (get().missions[id] ?? 0) + 1 },
          cups: get().cups + (cup ? 1 : 0),
        });
        get().addXP(xp);
        get().addCoins(coins);
        get().dailyProgress('mission');
      },
      addMedal: (m) => {
        if (!get().medals.includes(m)) set({ medals: [...get().medals, m] });
      },
      addWritten: (w) => set({ stats: { ...get().stats, written: [w, ...get().stats.written].slice(0, 200) } }),
      addDialog: () => {
        set({ stats: { ...get().stats, dialogs: get().stats.dialogs + 1 } });
        get().dailyProgress('dialog');
      },
      tick: (sec) => set({ stats: { ...get().stats, timePlayed: get().stats.timePlayed + sec } }),
      setSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      setLevel: (l) => set({ level: l, streak: 0 }),
      buy: (id, price) => {
        if (get().owned.includes(id)) return true;
        if (get().coins < price) return false;
        set({ coins: get().coins - price, owned: [...get().owned, id] });
        return true;
      },
      equip: (slot, id) => set({ [slot]: id } as Partial<ProgressState>),
      dailyProgress: (kind, n = 1) => {
        get().ensureDaily();
        const d = get().daily;
        let reward = 0;
        const tasks = d.tasks.map((tk) => {
          if (tk.kind !== kind || tk.done) return tk;
          const progress = Math.min(tk.goal, tk.progress + n);
          const done = progress >= tk.goal;
          if (done) reward += tk.reward;
          return { ...tk, progress, done };
        });
        set({ daily: { ...d, tasks } });
        if (reward) {
          set({ coins: get().coins + reward, xp: get().xp + reward });
          useUI.getState().toast({ es: `¡Reto diario completado! +${reward} monedas`, hy: `Օրվա մարտահրավերը կատարված է։ +${reward} մետաղադրամ` }, 'gold');
        }
      },
      ensureDaily: () => {
        if (get().daily.date !== todayKey()) set({ daily: makeDaily() });
      },
      unlockSecret: (id) => {
        if (!get().secrets.includes(id)) set({ secrets: [...get().secrets, id] });
      },
      reset: () => set({ ...initial() }),
    }),
    { name: 'razmik7-progress-v1', version: 1 },
  ),
);

// ---------------- transient UI state ----------------
export type ToastKind = 'info' | 'good' | 'bad' | 'gold' | 'level';
export interface Toast { id: number; t: T; kind: ToastKind }

export interface DialogOption {
  t: T;
  ok?: boolean;
  reply?: T;
  onPick?: () => void;
}
export interface DialogLine {
  speaker: string;
  t: T;
  pitch?: number;
}
export interface DialogState {
  id: number;
  speaker: string;
  role?: string;
  lines: DialogLine[];
  index: number;
  options?: DialogOption[];
  /** free answer: accepted keyword groups */
  free?: { accept: string[][]; model: T; minWords?: number };
  focus?: [number, number, number];
  cat?: string;
  listening?: boolean;
  onClose?: (result: { ok: boolean | null; picked?: DialogOption }) => void;
  pitch?: number;
  noAutoSpeak?: boolean;
}

export type Screen =
  | 'menu' | 'city' | 'interior' | 'training' | 'race' | 'detective' | 'maze' | 'island'
  | 'ruleta' | 'memory' | 'batalla' | 'habla' | 'trabalenguas'
  | 'misiones' | 'simuladores' | 'competiciones' | 'retos' | 'records' | 'perfil' | 'config' | 'informe';

interface UIState {
  screen: Screen;
  params: Record<string, string | number | boolean>;
  toasts: Toast[];
  dialog: DialogState | null;
  translation: { t: T } | null;
  paused: boolean;
  go: (s: Screen, params?: Record<string, string | number | boolean>) => void;
  toast: (t: T, kind?: ToastKind) => void;
  openDialog: (d: Omit<DialogState, 'id' | 'index'>) => void;
  closeDialog: () => void;
  setDialogIndex: (i: number) => void;
  showTranslation: (t: T | null) => void;
  setPaused: (p: boolean) => void;
}

let tid = 1;
export const useUI = create<UIState>()((set, get) => ({
  screen: 'menu',
  params: {},
  toasts: [],
  dialog: null,
  translation: null,
  paused: false,
  go: (screen, params = {}) => set({ screen, params, dialog: null, translation: null, paused: false }),
  toast: (t, kind = 'info') => {
    const id = tid++;
    set({ toasts: [...get().toasts.slice(-3), { id, t, kind }] });
    setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== id) }), 4200);
  },
  openDialog: (d) => set({ dialog: { ...d, id: tid++, index: 0 } }),
  closeDialog: () => set({ dialog: null }),
  setDialogIndex: (i) => {
    const d = get().dialog;
    if (d) set({ dialog: { ...d, index: i } });
  },
  showTranslation: (t) => set({ translation: t ? { t } : null }),
  setPaused: (p) => set({ paused: p }),
}));
