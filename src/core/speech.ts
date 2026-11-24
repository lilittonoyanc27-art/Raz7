type SR = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSR(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const recognitionAvailable = () => typeof window !== 'undefined' && !!getSR();

export interface RecResult { text: string; alternatives: string[]; confidence: number }

/** Listen once in Spanish. Resolves with the transcript (or rejects with an error code). */
export function listenOnce(onInterim?: (t: string) => void): { promise: Promise<RecResult>; stop: () => void } {
  const C = getSR();
  if (!C) return { promise: Promise.reject(new Error('unsupported')), stop: () => {} };
  const rec = new C();
  rec.lang = 'es-ES';
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  let finalRes: RecResult | null = null;
  let lastInterim = '';
  const promise = new Promise<RecResult>((resolve, reject) => {
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      const alts: string[] = [];
      for (let i = 0; i < r.length; i++) alts.push(r[i].transcript);
      lastInterim = alts[0];
      onInterim?.(alts[0]);
      if (r.isFinal) finalRes = { text: alts[0].trim(), alternatives: alts, confidence: r[0].confidence ?? 0 };
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' && !finalRes) reject(new Error('no-speech'));
      else if (!finalRes) reject(new Error(e.error));
    };
    rec.onend = () => {
      if (finalRes) resolve(finalRes);
      else if (lastInterim) resolve({ text: lastInterim.trim(), alternatives: [lastInterim], confidence: 0 });
      else reject(new Error('no-speech'));
    };
    try {
      rec.start();
    } catch (err) {
      reject(err as Error);
    }
  });
  return { promise, stop: () => { try { rec.stop(); } catch { /* noop */ } } };
}
