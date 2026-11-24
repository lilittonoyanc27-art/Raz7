import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Room, Counter, useInteract, Plant } from './common';
import { StaticNPC } from '../../world/NPCs';
import { CHARACTERS } from '../../data/characters';
import { useProgress, useUI } from '../../core/store';
import { pick, shuffle } from '../../core/random';
import type { T } from '../../core/types';
import { sfx } from '../../core/audio';
import { addBox, player, teleportPlayer } from '../../three/world';
import type { TaskLine } from './Tienda';
import { textTex } from '../../three/textures';

const T_ = (es: string, hy: string): T => ({ es, hy });
export interface Dish { t: T; price: number; tags: string[] }
export const MENU: Record<'primeros' | 'segundos' | 'bebidas' | 'postres', Dish[]> = {
  primeros: [
    { t: T_('Sopa de verduras', 'Բանջարեղենով ապուր'), price: 5, tags: ['veg'] },
    { t: T_('Ensalada mixta', 'Խառը աղցան'), price: 6, tags: ['veg'] },
    { t: T_('Gazpacho', 'Գասպաչո (սառը լոլիկի ապուր)'), price: 5, tags: ['veg'] },
    { t: T_('Sopa de pescado', 'Ձկան ապուր'), price: 7, tags: ['pescado'] },
  ],
  segundos: [
    { t: T_('Pollo asado con patatas', 'Տապակած հավ կարտոֆիլով'), price: 10, tags: ['pollo'] },
    { t: T_('Pescado a la plancha', 'Գրիլ արված ձուկ'), price: 12, tags: ['pescado'] },
    { t: T_('Arroz con verduras', 'Բրինձ բանջարեղենով'), price: 9, tags: ['veg', 'arroz'] },
    { t: T_('Filete con ensalada', 'Սթեյք աղցանով'), price: 13, tags: ['carne'] },
  ],
  bebidas: [
    { t: T_('Agua', 'Ջուր'), price: 1, tags: ['sin'] },
    { t: T_('Zumo de naranja', 'Նարնջի հյութ'), price: 3, tags: ['zumo'] },
    { t: T_('Limonada', 'Լիմոնադ'), price: 2, tags: ['azucar'] },
  ],
  postres: [
    { t: T_('Flan', 'Ֆլան (կարամելային պուդինգ)'), price: 4, tags: [] },
    { t: T_('Fruta del día', 'Օրվա միրգ'), price: 3, tags: ['fruta'] },
    { t: T_('Helado de chocolate', 'Շոկոլադե պաղպաղակ'), price: 4, tags: [] },
  ],
};

export function RestauranteInterior({ setPanel, openMenu }: { setPanel: (p: { title: T; lines: TaskLine[]; extra?: T }) => void; openMenu: () => void }) {
  const lucia = CHARACTERS.camarera;
  const ui = useUI.getState;
  const lvl = useProgress.getState().level;
  const scenario = useMemo(() => {
    const variants = [
      { card: T_('Cenas con tu entrenador. No puedes comer pescado. Pide primero, segundo y una bebida sin azúcar.', 'Ընթրում ես մարզչիդ հետ։ Չես կարող ձուկ ուտել։ Պատվիրիր առաջին, երկրորդ ճաշ և առանց շաքարի խմիչք։'), people: 2, ban: 'pescado', drink: 'sin', want2: null as string | null },
      { card: T_('Comes con tu amigo Leo. Quieres pollo de segundo y un zumo para beber.', 'Ճաշում ես ընկերոջդ՝ Լեոյի հետ։ Երկրորդ ճաշին ուզում ես հավ, իսկ խմելու՝ հյութ։'), people: 2, ban: '', drink: 'zumo', want2: 'pollo' },
      { card: T_('Comes solo después del entrenamiento. Eres vegetariano hoy: nada de carne ni de pescado.', 'Մարզումից հետո մենակ ես ճաշում։ Այսօր բուսակեր ես․ ոչ միս, ոչ ձուկ։'), people: 1, ban: 'carne', drink: 'any', want2: 'veg' },
    ];
    return pick(lvl === 'A1' ? variants.slice(0, 2) : variants);
  }, []);
  const windowTable = useMemo(() => pick([0, 1, 2]), []);
  const TABLES: [number, number][] = [[-6, -3], [0, -3], [6, -3]];
  const [step, setStep] = useState(0);
  const order = useRef<Dish[]>([]);
  const stepRef = useRef(step);
  stepRef.current = step;

  useMemo(() => {
    TABLES.forEach(([x, z]) => addBox(x, z, 1.6, 1.6, 0.8, 0, 'table'));
  }, []);

  useEffect(() => {
    const lines: TaskLine[] = [
      { t: T_('Habla con la camarera', 'Խոսիր մատուցողուհու հետ'), done: step > 0 },
      { t: T_('Siéntate en la mesa que te diga', 'Նստիր այն սեղանի մոտ, որ կասի'), done: step > 1 },
      { t: T_('Lee la carta y pide la comida', 'Կարդա ճաշացանկը և պատվիրիր ուտելիքը'), done: step > 2 },
      { t: T_('Pide la cuenta y paga', 'Խնդրիր հաշիվը և վճարիր'), done: step > 3 },
    ];
    setPanel({ title: T_('Restaurante «El Gol»', '«Էլ Գոլ» ռեստորան'), lines, extra: scenario.card });
  }, [step]);

  const talk = useCallback(() => {
    const s = stepRef.current;
    if (s === 0) {
      ui().openDialog({
        speaker: lucia.name, role: lucia.role, pitch: lucia.pitch, focus: [2.6, 0, 1.6],
        lines: [{ speaker: lucia.name, t: T_('¡Buenas tardes! Bienvenido. ¿Mesa para cuántas personas?', 'Բարի երեկո։ Բարի գալուստ։ Քանի՞ հոգու համար սեղան։') }],
        options: [
          { t: T_('Para una persona, por favor.', 'Մեկ հոգու համար, խնդրում եմ։'), ok: scenario.people === 1 },
          { t: T_('Para dos personas, por favor.', 'Երկու հոգու համար, խնդրում եմ։'), ok: scenario.people === 2 },
          { t: T_('Para cinco personas.', 'Հինգ հոգու համար։'), ok: false },
        ].map((o) => ({ ...o, reply: o.ok ? T_(`Perfecto. Sentaos en la mesa ${['de la izquierda, junto a la ventana', 'del centro, debajo de la lámpara', 'de la derecha, al lado de la planta'][windowTable]}.`, `Կատարյալ է։ Նստեք ${['ձախ կողմի սեղանի մոտ՝ պատուհանի կողքին', 'կենտրոնի սեղանի մոտ՝ լամպի տակ', 'աջ կողմի սեղանի մոտ՝ բույսի կողքին'][windowTable]}։`) : undefined })),
        cat: 'restaurante',
        listening: true,
        onClose: (r) => { if (r.ok) setStep(1); },
      });
    } else if (s === 2) {
      orderFood();
    } else if (s === 3) {
      bill();
    } else {
      ui().openDialog({ speaker: lucia.name, role: lucia.role, pitch: lucia.pitch, lines: [{ speaker: lucia.name, t: s === 1 ? T_('Siéntate en tu mesa, ahora voy.', 'Նստիր քո սեղանի մոտ, հիմա կգամ։') : T_('¡Gracias por venir! ¡Hasta pronto!', 'Շնորհակալություն, որ եկար։ Մինչ նոր հանդիպում։') }] });
    }
  }, []);

  const sit = (i: number) => {
    if (stepRef.current !== 1) return;
    if (i !== windowTable) {
      sfx('wrong');
      useProgress.getState().answer(T_('Siéntate en la mesa correcta', 'Նստիր ճիշտ սեղանի մոտ'), false, 'restaurante', true);
      ui().openDialog({ speaker: lucia.name, role: lucia.role, pitch: lucia.pitch, lines: [{ speaker: lucia.name, t: T_('Esa mesa está reservada. Escucha otra vez dónde tienes que sentarte.', 'Այդ սեղանն ամրագրված է։ Նորից լսիր, թե որտեղ պետք է նստես։') }] });
      return;
    }
    sfx('ok');
    useProgress.getState().answer(T_('Siéntate en la mesa correcta', 'Նստիր ճիշտ սեղանի մոտ'), true, 'restaurante', true);
    const [x, z] = TABLES[i];
    teleportPlayer(x, 0, z + 1.2, Math.PI);
    player.frozen = true;
    setStep(2);
    setTimeout(() => {
      openMenu();
      setTimeout(() => orderFood(), 400);
    }, 600);
  };
  const sit0 = useCallback(() => sit(0), []);
  const sit1 = useCallback(() => sit(1), []);
  const sit2 = useCallback(() => sit(2), []);
  useInteract('table-0', [TABLES[0][0], 0, TABLES[0][1] + 1.3], T_('Sentarse aquí', 'Նստել այստեղ'), sit0, () => stepRef.current === 1, 1.6);
  useInteract('table-1', [TABLES[1][0], 0, TABLES[1][1] + 1.3], T_('Sentarse aquí', 'Նստել այստեղ'), sit1, () => stepRef.current === 1, 1.6);
  useInteract('table-2', [TABLES[2][0], 0, TABLES[2][1] + 1.3], T_('Sentarse aquí', 'Նստել այստեղ'), sit2, () => stepRef.current === 1, 1.6);

  const fits = (d: Dish, course: 'primeros' | 'segundos' | 'bebidas') => {
    if (scenario.ban === 'pescado' && d.tags.includes('pescado')) return false;
    if (scenario.ban === 'carne' && (d.tags.includes('pescado') || d.tags.includes('carne') || d.tags.includes('pollo'))) return false;
    if (course === 'segundos' && scenario.want2 === 'pollo') return d.tags.includes('pollo');
    if (course === 'segundos' && scenario.want2 === 'veg') return d.tags.includes('veg');
    if (course === 'bebidas' && scenario.drink === 'sin') return d.tags.includes('sin');
    if (course === 'bebidas' && scenario.drink === 'zumo') return d.tags.includes('zumo');
    return true;
  };

  const orderFood = () => {
    const ask = (course: 'primeros' | 'segundos' | 'bebidas', q: T, next: () => void) => {
      ui().openDialog({
        speaker: lucia.name, role: lucia.role, pitch: lucia.pitch, focus: [player.pos.x + 1, 0, player.pos.z - 0.5],
        lines: [{ speaker: lucia.name, t: q }],
        options: MENU[course].map((d) => ({ t: T_(`${course === 'bebidas' ? 'Para beber, ' : ''}${d.t.es.toLowerCase()}, por favor.`.replace(/^./, (c) => c.toUpperCase()), `${d.t.hy}, խնդրում եմ։`), ok: fits(d, course), reply: fits(d, course) ? T_('Muy bien, apuntado.', 'Շատ լավ, գրանցված է։') : T_('Mmm… lee otra vez tu tarjeta. ¿Seguro que puedes tomar eso?', 'Մմմ… նորից կարդա քո քարտը։ Վստա՞հ ես, որ կարող ես դա ուտել։'), onPick: () => { if (fits(d, course)) order.current.push(d); } })),
        cat: 'restaurante',
        onClose: (r) => { if (r.ok) next(); },
      });
    };
    order.current = [];
    ask('primeros', T_('¿Qué vas a tomar de primero?', 'Առաջինին ի՞նչ ես ուտելու։'), () =>
      ask('segundos', T_('¿Y de segundo?', 'Իսկ երկրորդին։'), () =>
        ask('bebidas', T_('¿Y para beber?', 'Իսկ խմելու։'), () => {
          ui().openDialog({
            speaker: lucia.name, role: lucia.role, pitch: lucia.pitch,
            lines: [{ speaker: lucia.name, t: T_('¡Enseguida os lo traigo! ¿Queréis postre después?', 'Հիմա կբերեմ։ Հետո աղանդեր կուզե՞ք։') }],
            options: [
              { t: T_('Sí, un flan, por favor.', 'Այո, մեկ ֆլան, խնդրում եմ։'), onPick: () => order.current.push(MENU.postres[0]) },
              { t: T_('Fruta del día, gracias.', 'Օրվա միրգ, շնորհակալություն։'), onPick: () => order.current.push(MENU.postres[1]) },
              { t: T_('No, gracias. Estamos llenos.', 'Ոչ, շնորհակալություն։ Կուշտ ենք։') },
            ],
            onClose: () => {
              sfx('pickup');
              ui().toast(T_('¡Qué rico! Ahora pide la cuenta.', 'Ինչ համեղ է։ Հիմա խնդրիր հաշիվը։'), 'good');
              setStep(3);
            },
          });
        }),
      ),
    );
  };

  const bill = () => {
    const total = order.current.reduce((a, d) => a + d.price, 0) * scenario.people;
    ui().openDialog({
      speaker: 'Razmik',
      lines: [{ speaker: 'Razmik', t: T_('¿Qué le dices a la camarera?', 'Ի՞նչ ես ասում մատուցողուհուն։') }],
      options: [
        { t: T_('La cuenta, por favor.', 'Հաշիվը, խնդրում եմ։'), ok: true },
        { t: T_('¡Una mesa, por favor!', 'Մեկ սեղան, խնդրում եմ։'), ok: false },
        { t: T_('¿Dónde está el baño?', 'Որտե՞ղ է զուգարանը։'), ok: false, reply: T_('Al fondo a la derecha. Pero… ¿no querías pagar?', 'Խորքում՝ աջ կողմում։ Բայց… չէի՞ր ուզում վճարել։') },
      ],
      cat: 'restaurante',
      onClose: (r) => {
        if (!r.ok) return;
        ui().openDialog({
          speaker: lucia.name, role: lucia.role, pitch: lucia.pitch,
          lines: [{ speaker: lucia.name, t: T_(`Aquí tienes. Son ${total} euros${scenario.people > 1 ? ' por los dos' : ''}.`, `Ահա, վերցրու։ ${total} եվրո է${scenario.people > 1 ? ' երկուսի համար' : ''}։`) }, { speaker: lucia.name, t: T_('¿Cuánto es?', 'Որքա՞ն է։') }],
          options: shuffle([total, total + 3, Math.max(2, total - 4), total + 8]).map((n) => ({ t: T_(`Son ${n} euros.`, `${n} եվրո է։`), ok: n === total })),
          cat: 'comprension_auditiva',
          listening: true,
          onClose: (r2) => {
            if (!r2.ok) return;
            setStep(4);
            player.frozen = false;
            useProgress.getState().completeMission('sim-restaurante', 100, 30);
            ui().toast(T_('¡Comida perfecta! +100 XP', 'Կատարյալ ճաշ։ +100 XP'), 'gold');
            sfx('win');
          },
        });
      },
    });
  };

  return (
    <group>
      <Room w={20} d={14} floor="wood" wall="#f3e1cf" accent="#e14b4b" sign="RESTAURANTE «EL GOL»" />
      {/* windows on the left wall */}
      {[-3, 3].map((z) => (
        <mesh key={z} position={[-9.88, 2, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[3, 1.8]} />
          <meshStandardMaterial color="#9fd3ff" emissive="#9fd3ff" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {TABLES.map(([x, z], i) => (
        <Table key={i} x={x} z={z} lamp={i === 1} />
      ))}
      <Plant pos={[8.6, 0, -3]} />
      <Plant pos={[8.6, 0, 5.5]} />
      <Counter pos={[5, 0, 5]} w={4} label="BAR" color="#7a3b2e" />
      <StaticNPC id="lucia" name={lucia.name} role={lucia.role} look={lucia.look} pos={[2.6, 0, 1.6]} yaw={Math.PI} pitch={lucia.pitch} onTalk={talk} label={T_('Hablar con la camarera', 'Խոսել մատուցողուհու հետ')} />
      {scenario.people > 1 && step >= 2 && (
        <StaticNPC id="companion" name={scenario.card.es.includes('Leo') ? 'Leo' : 'Óscar'} role="Acompañante" look={scenario.card.es.includes('Leo') ? CHARACTERS.leo.look : CHARACTERS.coach.look} pos={[TABLES[windowTable][0], 0, TABLES[windowTable][1] - 1.2]} yaw={0} onTalk={() => ui().openDialog({ speaker: 'Amigo', lines: [{ speaker: 'Amigo', t: T_('¡Qué hambre tengo después del entrenamiento!', 'Ինչքան եմ սոված մարզումից հետո։') }] })} />
      )}
      <mesh position={[-5.5, 2.1, -6.88]}>
        <planeGeometry args={[4, 0.8]} />
        <meshBasicMaterial map={textTex('MENÚ DEL DÍA · 12 €', { bg: '#1b2233', fg: '#ffd34d', w: 1024, h: 205 })} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Table({ x, z, lamp }: { x: number; z: number; lamp?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.06, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.06, 0.2, 0.74, 10]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {[1.2, -1.2].map((dz) => (
        <group key={dz} position={[0, 0, dz]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.5, 0.06, 0.5]} />
            <meshStandardMaterial color="#8a5a3c" />
          </mesh>
          <mesh position={[0, 0.75, dz > 0 ? 0.24 : -0.24]}>
            <boxGeometry args={[0.5, 0.6, 0.05]} />
            <meshStandardMaterial color="#8a5a3c" />
          </mesh>
        </group>
      ))}
      {lamp && (
        <mesh position={[0, 3.3, 0]}>
          <coneGeometry args={[0.45, 0.4, 16, 1, true]} />
          <meshStandardMaterial color="#ffd34d" emissive="#ffb03a" emissiveIntensity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
