import { useCallback, useEffect, useMemo, useState } from 'react';
import { Room, Counter, ShelfUnit, Item3D, useInteract, Plant } from './common';
import { StaticNPC } from '../../world/NPCs';
import { CHARACTERS } from '../../data/characters';
import { BOOTS, BALLS, ACCESSORIES } from '../../data/shop';
import { levelFromXp, useProgress, useUI } from '../../core/store';
import { pick, shuffle } from '../../core/random';
import type { T } from '../../core/types';
import { sfx } from '../../core/audio';
import { MissionPanel } from '../../ui/HUD';

const T_ = (es: string, hy: string): T => ({ es, hy });
const SIZES = ['36', '37', '38', '39', '40'];
const SHIRT_SIZES = [{ es: 'S', hy: 'S' }, { es: 'M', hy: 'M' }, { es: 'L', hy: 'L' }];
const COLORS = [
  { es: 'blancos', hy: 'սպիտակ', c: '#f4f4f4' },
  { es: 'negros', hy: 'սև', c: '#151515' },
  { es: 'naranjas', hy: 'նարնջագույն', c: '#ff7a1a' },
  { es: 'azules', hy: 'կապույտ', c: '#2e6fd8' },
];

export interface TaskLine { t: T; done: boolean }

export function TiendaInterior({ setPanel }: { setPanel: (p: { title: T; lines: TaskLine[]; extra?: T }) => void }) {
  const toni = CHARACTERS.vendedor;
  const order = useMemo(() => ({ size: pick(SIZES), sock: pick(COLORS), shirt: pick(SHIRT_SIZES) }), []);
  const [tasks, setTasks] = useState<TaskLine[]>(() => [
    { t: T_(`Pregunta por unas botas de la talla ${order.size}`, `Հարցրու ${order.size} չափսի բութսերի մասին`), done: false },
    { t: T_(`Coge unos calcetines ${order.sock.es}`, `Վերցրու ${order.sock.hy} գուլպաներ`), done: false },
    { t: T_(`Pide una camiseta de la talla ${order.shirt.es}`, `Խնդրիր ${order.shirt.es} չափսի մարզաշապիկ`), done: false },
    { t: T_('Paga en la caja', 'Վճարիր դրամարկղում'), done: false },
  ]);
  const done = (i: number) => {
    setTasks((ts) => ts.map((x, k) => (k === i ? { ...x, done: true } : x)));
    sfx('ok');
  };
  useEffect(() => setPanel({ title: T_('La tienda deportiva', 'Սպորտային խանութ'), lines: tasks, extra: T_('Aquí también puedes comprar equipamiento con tus monedas.', 'Այստեղ կարող ես նաև գնել պարագաներ քո մետաղադրամներով։') }), [tasks]);

  const ui = useUI.getState;
  const talkBoots = useCallback(() => {
    ui().openDialog({
      speaker: toni.name, role: toni.role, pitch: toni.pitch, focus: [-6, 0, -5.5],
      lines: [{ speaker: toni.name, t: T_('¡Hola! Estas son nuestras botas nuevas. ¿Qué talla usas?', 'Բարև։ Սրանք մեր նոր բութսերն են։ Ի՞նչ չափս ես հագնում։') }],
      options: shuffle(SIZES.slice(0, 4).concat(order.size).filter((v, i, a) => a.indexOf(v) === i)).map((sz) => ({
        t: T_(`Uso la talla ${sz}.`, `Հագնում եմ ${sz} չափսը։`),
        ok: sz === order.size,
        reply: sz === order.size ? T_(`Muy bien, talla ${sz}. Aquí las tienes. Pruébatelas.`, `Շատ լավ, ${sz} չափս։ Ահա, փորձիր։`) : T_('Mmm, ¿seguro? Mira tu lista otra vez.', 'Մմմ, վստա՞հ ես։ Նորից նայիր ցուցակիդ։'),
      })),
      cat: 'tienda',
      onClose: (r) => { if (r.ok) done(0); },
    });
  }, []);
  useInteract('tienda-boots', [-6, 0, -5], T_('Mirar las botas', 'Նայել բութսերը'), talkBoots);

  const pickSocks = useCallback(() => {
    ui().openDialog({
      speaker: 'Razmik',
      lines: [{ speaker: 'Razmik', t: T_('¿Qué calcetines cojo?', 'Ո՞ր գուլպաները վերցնեմ։') }],
      options: COLORS.map((c) => ({ t: T_(`Los calcetines ${c.es}.`, `${c.hy} գուլպաները։`), ok: c.es === order.sock.es, reply: c.es === order.sock.es ? T_('¡Perfecto! Los pongo en la cesta.', 'Կատարյալ է։ Դնում եմ զամբյուղի մեջ։') : undefined })),
      cat: 'tienda',
      onClose: (r) => { if (r.ok) done(1); },
    });
  }, []);
  useInteract('tienda-socks', [6, 0, -5], T_('Coger calcetines', 'Վերցնել գուլպաներ'), pickSocks);

  const askShirt = useCallback(() => {
    ui().openDialog({
      speaker: toni.name, role: toni.role, pitch: toni.pitch, focus: [-6, 0, -5.5],
      lines: [
        { speaker: toni.name, t: T_('Las camisetas del equipo están aquí. ¿Qué talla necesitas?', 'Թիմի մարզաշապիկներն այստեղ են։ Ի՞նչ չափս է պետք։') },
      ],
      options: SHIRT_SIZES.map((s) => ({ t: T_(`Necesito la talla ${s.es}, por favor.`, `Ինձ պետք է ${s.es} չափսը, խնդրում եմ։`), ok: s.es === order.shirt.es, reply: s.es === order.shirt.es ? T_('Aquí tienes. Es muy cómoda.', 'Ահա, վերցրու։ Շատ հարմար է։') : T_('Esa talla no es la de tu lista.', 'Այդ չափսը քո ցուցակում չէ։') })),
      cat: 'tienda',
      onClose: (r) => { if (r.ok) done(2); },
    });
  }, []);
  useInteract('tienda-shirts', [6, 0, 2], T_('Mirar las camisetas', 'Նայել մարզաշապիկները'), askShirt);

  const pay = useCallback(() => {
    const ready = tasksRef.current.slice(0, 3).every((x) => x.done);
    if (!ready) {
      ui().openDialog({ speaker: toni.name, role: toni.role, pitch: toni.pitch, lines: [{ speaker: toni.name, t: T_('Todavía te faltan cosas de tu lista. ¡Míralas en el panel!', 'Ցուցակիցդ դեռ բաներ են պակասում։ Նայիր վահանակին։') }] });
      return;
    }
    const prices = { botas: 45, calcetines: 6, camiseta: 25 };
    const total = prices.botas + prices.calcetines + prices.camiseta;
    ui().openDialog({
      speaker: toni.name, role: toni.role, pitch: toni.pitch, focus: [0, 0, -4],
      lines: [
        { speaker: 'Razmik', t: T_('¿Cuánto es todo?', 'Ընդամենը որքա՞ն է։') },
        { speaker: toni.name, t: T_(`Las botas cuestan ${prices.botas} euros, los calcetines ${prices.calcetines} y la camiseta ${prices.camiseta}.`, `Բութսերն արժեն ${prices.botas} եվրո, գուլպաները՝ ${prices.calcetines}, իսկ մարզաշապիկը՝ ${prices.camiseta}։`) },
        { speaker: toni.name, t: T_('¿Cuánto es en total?', 'Ընդհանուր որքա՞ն է։') },
      ],
      options: shuffle([total, total + 10, total - 6, total + 4]).map((n) => ({ t: T_(`Son ${n} euros.`, `${n} եվրո է։`), ok: n === total, reply: n === total ? T_('¡Exacto! ¿Pagas con tarjeta o en efectivo?', 'Ճիշտ է։ Քարտո՞վ ես վճարում, թե՞ կանխիկ։') : undefined })),
      cat: 'matematicas',
      listening: true,
      onClose: (r) => {
        if (!r.ok) return;
        done(3);
        useProgress.getState().completeMission('sim-tienda', 80, 25);
        ui().toast(T_('¡Compra completada! +80 XP', 'Գնումն ավարտված է։ +80 XP'), 'gold');
        sfx('win');
      },
    });
  }, []);
  const tasksRef = useMemo(() => ({ current: tasks }), []);
  tasksRef.current = tasks;
  useInteract('tienda-caja', [0, 0, -4.2], T_('Ir a la caja', 'Գնալ դրամարկղ'), pay);

  // real shop: buy items with coins
  const buyItem = useCallback((slot: 'boots' | 'ballSkin' | 'accessory', id: string) => {
    const list = slot === 'boots' ? BOOTS : slot === 'ballSkin' ? BALLS : ACCESSORIES;
    const it = list.find((x) => x.id === id)!;
    const p = useProgress.getState();
    const owned = p.owned.includes(id);
    const lvl = levelFromXp(p.xp);
    if (it.minLevel && lvl < it.minLevel) {
      ui().toast(T_(`Se desbloquea en el nivel ${it.minLevel}.`, `Բացվում է ${it.minLevel}-րդ մակարդակում։`), 'bad');
      return;
    }
    ui().openDialog({
      speaker: toni.name, role: toni.role, pitch: toni.pitch,
      lines: [{ speaker: toni.name, t: owned ? T_(`Ya tienes: ${it.es}. ¿Te lo pones?`, `Արդեն ունես՝ ${it.hy}։ Կհագնե՞ս։`) : T_(`${it.es}: cuesta ${it.price} monedas. ¿Lo quieres?`, `${it.hy}՝ արժե ${it.price} մետաղադրամ։ Ուզո՞ւմ ես։`) }],
      options: [
        {
          t: owned ? T_('Sí, me lo pongo.', 'Այո, կհագնեմ։') : T_('Sí, me lo llevo.', 'Այո, վերցնում եմ։'),
          onPick: () => {
            if (!owned && !useProgress.getState().buy(id, it.price)) {
              ui().toast(T_('No tienes suficientes monedas.', 'Բավարար մետաղադրամ չունես։'), 'bad');
              sfx('wrong');
              return;
            }
            useProgress.getState().equip(slot, id);
            sfx('coin');
            ui().toast(T_(`¡Nuevo equipamiento: ${it.es}!`, `Նոր պարագա՝ ${it.hy}։`), 'gold');
          },
        },
        { t: T_('No, gracias. Solo estoy mirando.', 'Ոչ, շնորհակալություն։ Պարզապես նայում եմ։') },
      ],
    });
  }, []);

  return (
    <group>
      <Room w={20} d={16} floor="wood" wall="#e8edf5" accent="#2e6fd8" sign="TIENDA DEPORTIVA · CAMPEÓN" />
      <Counter pos={[0, 0, -5]} w={4} label="CAJA" color="#2e6fd8" />
      <StaticNPC id="toni" name={toni.name} role={toni.role} look={toni.look} pos={[0, 0, -6.2]} yaw={0} pitch={toni.pitch} onTalk={talkBoots} label={T_('Hablar con Toni', 'Խոսել Տոնիի հետ')} />
      {/* boots wall */}
      <ShelfUnit pos={[-6, 0, -6.8]} w={5} label="BOTAS" />
      {BOOTS.slice(0, 6).map((b, i) => (
        <group key={b.id} position={[-8.1 + (i % 3) * 2.1, 0.13 + Math.floor(i / 3) * 0.65, -6.8]}>
          <Item3D kind="boots" color={b.color} />
        </group>
      ))}
      {/* socks */}
      <ShelfUnit pos={[6, 0, -6.8]} w={5} label="CALCETINES" />
      {COLORS.map((c, i) => (
        <group key={c.es} position={[4.2 + i * 1.2, 0.78, -6.8]}>
          <Item3D kind="socks" color={c.c} />
        </group>
      ))}
      {/* shirts rack */}
      <group position={[6, 0, 2]}>
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[3, 0.05, 0.05]} />
          <meshStandardMaterial color="#888" metalness={0.8} />
        </mesh>
        {['#ff7a1a', '#ffffff', '#1b2233', '#2e6fd8'].map((c, i) => (
          <group key={c} position={[-1.1 + i * 0.75, 0.9, 0]}>
            <Item3D kind="shirt" color={c} />
          </group>
        ))}
      </group>
      {/* coins shop displays */}
      <ShelfUnit pos={[-9.4, 0, 1]} rot={Math.PI / 2} w={6} label="EQUIPAMIENTO" color="#ffe2c7" />
      {BOOTS.slice(1).map((b, i) => (
        <ShopSpot key={b.id} pos={[-9.3, 0.8, -1.5 + i * 1.1]} kind="boots" color={b.color} onBuy={() => buyItem('boots', b.id)} id={'b-' + b.id} label={T_(`Ver: ${b.es} (${b.price})`, `Տեսնել՝ ${b.hy} (${b.price})`)} />
      ))}
      <ShelfUnit pos={[9.4, 0, 6]} rot={-Math.PI / 2} w={4} label="BALONES" color="#ffe2c7" />
      {BALLS.slice(1).map((b, i) => (
        <ShopSpot key={b.id} pos={[9.3, 0.15 + (i % 2) * 0.65, 4.6 + Math.floor(i / 2) * 1.2]} kind="ball" color={b.color} onBuy={() => buyItem('ballSkin', b.id)} id={'ba-' + b.id} label={T_(`Ver: ${b.es} (${b.price})`, `Տեսնել՝ ${b.hy} (${b.price})`)} />
      ))}
      {ACCESSORIES.slice(1).map((a, i) => (
        <ShopSpot key={a.id} pos={[-2 + i * 2, 1.15, -5]} kind="bag" color={a.color} onBuy={() => buyItem('accessory', a.id)} id={'ac-' + a.id} label={T_(`Ver: ${a.es} (${a.price})`, `Տեսնել՝ ${a.hy} (${a.price})`)} />
      ))}
      <Plant pos={[-8.5, 0, 6.5]} />
      <Plant pos={[8.5, 0, -1]} />
    </group>
  );
}

function ShopSpot({ pos, kind, color, onBuy, id, label }: { pos: [number, number, number]; kind: 'boots' | 'ball' | 'bag'; color: string; onBuy: () => void; id: string; label: T }) {
  useInteract(id, [pos[0] * 0.92, 0, pos[2]], label, onBuy, undefined, 1.2);
  return (
    <group position={pos}>
      <Item3D kind={kind} color={color} />
    </group>
  );
}

export function TaskPanel({ title, lines, extra }: { title: T; lines: TaskLine[]; extra?: T }) {
  return <MissionPanel title={title} lines={lines}>{extra && <div className="mp-hint">{extra.es}</div>}</MissionPanel>;
}
