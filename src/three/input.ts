// Global input state shared by keyboard, touch joystick and on-screen buttons.
export const input = {
  keys: new Set<string>(),
  joy: { x: 0, y: 0, active: false },
  run: false,
  jumpQueued: false,
  actionQueued: false,
  kickQueued: false,
  camYaw: 0,
  camPitch: 0.32,
  camDist: 7,
  dragging: false,
  enabled: true,
};

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

export function installKeyboard() {
  const down = (e: KeyboardEvent) => {
    if (isTyping()) return;
    const k = e.key.toLowerCase();
    input.keys.add(k);
    if (k === ' ') {
      input.jumpQueued = true;
      e.preventDefault();
    }
    if (k === 'e' || k === 'enter') input.actionQueued = true;
    if (k === 'f' || k === 'k') input.kickQueued = true;
    if (k.startsWith('arrow')) e.preventDefault();
  };
  const up = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase());
  const blur = () => input.keys.clear();
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  };
}

/** Returns move vector in camera space: x = right, y = forward */
export function moveVector() {
  let x = 0;
  let y = 0;
  if (!input.enabled) return { x, y, run: false };
  const k = input.keys;
  if (k.has('w') || k.has('arrowup') || k.has('ц')) y += 1;
  if (k.has('s') || k.has('arrowdown') || k.has('ы')) y -= 1;
  if (k.has('a') || k.has('arrowleft') || k.has('ф')) x -= 1;
  if (k.has('d') || k.has('arrowright') || k.has('в')) x += 1;
  if (input.joy.active) {
    x += input.joy.x;
    y += input.joy.y;
  }
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  const run = k.has('shift') || input.run || (input.joy.active && Math.hypot(input.joy.x, input.joy.y) > 0.92);
  return { x, y, run };
}

export function consume(flag: 'jumpQueued' | 'actionQueued' | 'kickQueued') {
  const v = input[flag];
  input[flag] = false;
  return v;
}
