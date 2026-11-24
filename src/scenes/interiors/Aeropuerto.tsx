import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Room, Counter, Item3D, useInteract, Plant } from './common';
import { StaticNPC } from '../../world/NPCs';
import { CHARACTERS } from '../../data/characters';
import { useProgress, useUI } from '../../core/store';
import { pick, randInt, shuffle } from '../../core/random';
import type { T } from '../../core/types';
import { sfx, speak } from '../../core/audio';
import { addBox } from '../../three/world';
import { useFrame } from '@react-three/fiber';
import type { TaskLine } from './Tienda';
import { textTex } from '../../three/textures';

const T_ = (es: string, hy: string): T => ({ es, hy });
const CITIES = [
  { es: 'Madrid', hy: 'Մադրիդ' }, { es: 'Barcelona', hy: 'Բարսելոնա' }, { es: 'Valencia', hy: 'Վալենսիա' }, { es: 'Sevilla', hy: 'Սևիլյա' }, { es: 'Bilbao', hy: 'Բիլբաո' },
];
const GATES = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

export function AeropuertoInterior({ setPanel }: { setPanel: (p: { title: T; lines: TaskLine[]; extra?: T }) => void }) {
  const ui = useUI.getState;
  const irene = CHARACTERS.azafata;
  const guard = CHARACTERS.guardia;
  const trip = useMemo(() => {
    const dest = pick(CITIES);
    const counter = randInt(1, 5);
    const gates = shuffle(GATES);
    return { dest, flight: `IB ${randInt(1000, 9899)}`, counter, gate1: gates[0], gate2: gates[1], bags: pick([1, 2]), seat: pick(['ventanilla', 'pasillo']) as 'ventanilla' | 'pasillo', time: `${randInt(9, 19)}:${pick(['05', '15', '30', '45'])}` };
  }, []);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  stepRef.current = step;

  useEffect(() => {
    const lines: TaskLine[] = [
      { t: T_(`Ve al mostrador de facturación número ${trip.counter}`, `Գնա ${trip.counter} համարի գրանցման վաճառասեղան`), done: step > 0 },
      { t: T_('Pasa el control de seguridad', 'Անցիր անվտանգության ստուգումը'), done: step > 1 },
      { t: T_('Busca tu puerta de embarque (¡escucha los avisos!)', 'Գտիր նստեցման դարպասդ (լսիր հայտարարությունները)'), done: step > 2 },
      { t: T_('Sube al avión', 'Նստիր ինքնաթիռ'), done: step > 3 },
    ];
    setPanel({ title: T_(`Torneo internacional · Vuelo ${trip.flight} a ${trip.dest.es}`, `Միջազգային մրցաշար · Չվերթ ${trip.flight}՝ դեպի ${trip.dest.hy}`), lines, extra: T_(`Billete: ${trip.flight} · Destino: ${trip.dest.es} · Salida: ${trip.time} · Maletas: ${trip.bags} · Asiento: ${trip.seat}`, `Տոմս՝ ${trip.flight} · Ուղղություն՝ ${trip.dest.hy} · Մեկնում՝ ${trip.time} · Ճամպրուկներ՝ ${trip.bags} · Նստատեղ՝ ${trip.seat === 'ventanilla' ? 'պատուհանի մոտ' : 'միջանցքի մոտ'}`) });
  }, [step]);

  const counters = [1, 2, 3, 4, 5];
  useMemo(() => {
    addBox(0, -2, 3.4, 0.4, 2.6, 0, 'security-left'); // decorative wall pieces around arch
  }, []);

  const checkIn = (n: number) => {
    if (stepRef.current !== 0) return;
    if (n !== trip.counter) {
      sfx('wrong');
      ui().openDialog({ speaker: 'Empleado', lines: [{ speaker: 'Empleado', t: T_(`Lo siento, este es el mostrador ${n}. Su vuelo factura en el mostrador ${trip.counter}.`, `Ներողություն, սա ${n} համարի վաճառասեղանն է։ Ձեր չվերթի գրանցումը ${trip.counter} համարի վաճառասեղանում է։`) }] });
      useProgress.getState().answer(T_(`mostrador número ${trip.counter}`, `${trip.counter} համարի վաճառասեղան`), false, 'numeros');
      return;
    }
    ui().openDialog({
      speaker: irene.name, role: irene.role, pitch: irene.pitch, focus: [counterX(n), 0, -9.8],
      lines: [{ speaker: irene.name, t: T_('Buenos días. ¿Me enseñas tu pasaporte y tu billete, por favor?', 'Բարի օր։ Ցույց կտա՞ս անձնագիրդ և տոմսդ, խնդրում եմ։') }],
      options: [
        { t: T_('Sí, aquí tiene.', 'Այո, ահա։'), ok: true },
        { t: T_('No tengo hambre, gracias.', 'Սոված չեմ, շնորհակալություն։'), ok: false },
        { t: T_('Me llamo pasaporte.', 'Իմ անունը անձնագիր է։'), ok: false },
      ],
      cat: 'aeropuerto',
      onClose: (r) => {
        if (!r.ok) return;
        ui().openDialog({
          speaker: irene.name, role: irene.role, pitch: irene.pitch,
          lines: [{ speaker: irene.name, t: T_('Gracias. ¿Cuántas maletas vas a facturar?', 'Շնորհակալություն։ Քանի՞ ճամպրուկ ես հանձնելու։') }],
          options: [1, 2, 3].map((k) => ({ t: T_(k === 1 ? 'Una maleta.' : k === 2 ? 'Dos maletas.' : 'Tres maletas.', k === 1 ? 'Մեկ ճամպրուկ։' : k === 2 ? 'Երկու ճամպրուկ։' : 'Երեք ճամպրուկ։'), ok: k === trip.bags })),
          cat: 'aeropuerto',
          onClose: (r2) => {
            if (!r2.ok) return;
            ui().openDialog({
              speaker: irene.name, role: irene.role, pitch: irene.pitch,
              lines: [{ speaker: irene.name, t: T_('¿Prefieres ventanilla o pasillo?', 'Նախընտրում ես պատուհանի՞, թե՞ միջանցքի մոտ։') }],
              options: [
                { t: T_('Ventanilla, por favor.', 'Պատուհանի մոտ, խնդրում եմ։'), ok: trip.seat === 'ventanilla' },
                { t: T_('Pasillo, por favor.', 'Միջանցքի մոտ, խնդրում եմ։'), ok: trip.seat === 'pasillo' },
              ],
              cat: 'aeropuerto',
              onClose: (r3) => {
                if (!r3.ok) return;
                ui().openDialog({
                  speaker: irene.name, role: irene.role, pitch: irene.pitch,
                  lines: [
                    { speaker: irene.name, t: T_(`Aquí tienes tu tarjeta de embarque. Tu vuelo sale por la puerta ${trip.gate1} a las ${trip.time}.`, `Ահա քո նստեցման քարտը։ Քո չվերթը մեկնում է ${trip.gate1} դարպասից ժամը ${trip.time}-ին։`) },
                    { speaker: irene.name, t: T_('Ahora pasa el control de seguridad, allí al fondo. ¡Buen viaje!', 'Հիմա անցիր անվտանգության ստուգումը, այնտեղ՝ խորքում։ Բարի ճանապարհ։') },
                  ],
                  onClose: () => {
                    sfx('ok');
                    setStep(1);
                  },
                });
              },
            });
          },
        });
      },
    });
  };
  const ci = counters.map((n) => useCallback(() => checkIn(n), []));
  counters.forEach((n, i) => useInteract('counter-' + n, [counterX(n), 0, -8.6], T_(`Mostrador ${n}`, `Վաճառասեղան ${n}`), ci[i], () => stepRef.current === 0, 1.6));

  const security = useCallback(() => {
    if (stepRef.current !== 1) return;
    ui().openDialog({
      speaker: guard.name, role: guard.role, pitch: guard.pitch, focus: [3, 0, -1],
      lines: [
        { speaker: guard.name, t: T_('Control de seguridad. Pon el móvil, las llaves y la botella de agua en la bandeja.', 'Անվտանգության ստուգում։ Հեռախոսը, բանալիները և ջրի շիշը դիր սկուտեղի մեջ։') },
        { speaker: guard.name, t: T_('¿Qué tienes que poner en la bandeja?', 'Ի՞նչ պետք է դնես սկուտեղի մեջ։') },
      ],
      options: shuffle([
        { t: T_('El móvil, las llaves y la botella.', 'Հեռախոսը, բանալիները և շիշը։'), ok: true, reply: T_('Correcto. Ahora pasa por el arco.', 'Ճիշտ է։ Հիմա անցիր կամարի միջով։') },
        { t: T_('La maleta y el pasaporte.', 'Ճամպրուկը և անձնագիրը։'), ok: false },
        { t: T_('Las botas y el balón.', 'Բութսերը և գնդակը։'), ok: false },
      ]),
      cat: 'comprension_auditiva',
      listening: true,
      onClose: (r) => {
        if (!r.ok) return;
        sfx('ok');
        setStep(2);
        setTimeout(() => {
          const t = T_(`Atención, por favor. El vuelo ${trip.flight} con destino ${trip.dest.es} ya no sale por la puerta ${trip.gate1}. Ahora sale por la puerta ${trip.gate2}.`, `Ուշադրություն։ ${trip.flight} չվերթը դեպի ${trip.dest.hy} այլևս չի մեկնում ${trip.gate1} դարպասից։ Այժմ այն մեկնում է ${trip.gate2} դարպասից։`);
          sfx('phone');
          ui().openDialog({ speaker: 'Megafonía', role: 'Aviso', lines: [{ speaker: 'Megafonía', t }], pitch: 1.05 });
        }, 5000);
      },
    });
  }, []);
  useInteract('security', [3, 0, -0.2], T_('Hablar con seguridad', 'Խոսել անվտանգության աշխատակցի հետ'), security, () => stepRef.current === 1, 2.4);

  const gate = (g: string) => {
    if (stepRef.current !== 2) return;
    if (g !== trip.gate2) {
      sfx('wrong');
      useProgress.getState().answer(T_(`puerta ${trip.gate2}`, `${trip.gate2} դարպաս`), false, 'comprension_auditiva', true);
      ui().openDialog({ speaker: 'Empleada', lines: [{ speaker: 'Empleada', t: g === trip.gate1 ? T_(`¡Uy! Ha habido un cambio de puerta. ¿No has oído el aviso? Escúchalo otra vez.`, 'Վա՜յ։ Դարպասը փոխվել է։ Չե՞ս լսել հայտարարությունը։ Նորից լսիր։') : T_(`Esta es la puerta ${g}. Tu vuelo no sale de aquí.`, `Սա ${g} դարպասն է։ Քո չվերթը այստեղից չի մեկնում։`) }] });
      if (g === trip.gate1) setTimeout(() => speak(`El vuelo ${trip.flight} con destino ${trip.dest.es} sale por la puerta ${trip.gate2}.`), 3500);
      return;
    }
    useProgress.getState().answer(T_(`puerta ${trip.gate2}`, `${trip.gate2} դարպաս`), true, 'comprension_auditiva', true);
    ui().openDialog({
      speaker: irene.name, role: irene.role, pitch: irene.pitch,
      lines: [{ speaker: irene.name, t: T_('¿Me enseñas tu tarjeta de embarque?', 'Ցույց կտա՞ս նստեցման քարտդ։') }],
      options: [{ t: T_('Claro, aquí la tiene.', 'Իհարկե, ահա։'), ok: true, reply: T_(`Gracias. Asiento de ${trip.seat}. ¡Buen viaje y mucha suerte en el torneo!`, 'Շնորհակալություն։ Բարի ճանապարհ և հաջողություն մրցաշարում։') }],
      onClose: () => {
        setStep(4);
        useProgress.getState().completeMission('sim-aeropuerto', 140, 40, true);
        useProgress.getState().addMedal('Viajero internacional');
        ui().toast(T_('¡Has embarcado! +140 XP · ¡Nuevo trofeo!', 'Նստեցիր ինքնաթիռ։ +140 XP · Նոր գավաթ։'), 'gold');
        sfx('win');
      },
    });
  };
  const gi = GATES.map((g) => useCallback(() => gate(g), []));
  GATES.forEach((g, i) => useInteract('gate-' + g, [gateX(i), 0, 7.6], T_(`Puerta ${g}`, `Դարպաս ${g}`), gi[i], () => stepRef.current === 2, 1.8));

  return (
    <group>
      <Room w={36} d={22} h={7} floor="tile" wall="#e4ebf2" accent="#1d3557" sign="AEROPUERTO INTERNACIONAL · SALIDAS" />
      {/* check-in counters */}
      {counters.map((n) => (
        <group key={n}>
          <Counter pos={[counterX(n), 0, -9.4]} w={2.6} label={`MOSTRADOR ${n}`} color="#1d3557" />
          <mesh position={[counterX(n), 3.1, -10.7]}>
            <planeGeometry args={[2.4, 0.8]} />
            <meshBasicMaterial map={textTex(String(n), { bg: '#ffb03a', fg: '#1d3557', w: 256, h: 86 })} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <StaticNPC id="irene" name={irene.name} role={irene.role} look={irene.look} pos={[counterX(trip.counter), 0, -10.4]} yaw={0} pitch={irene.pitch} onTalk={ci[trip.counter - 1]} />
      {/* security arch */}
      <group position={[0, 0, -1]}>
        <mesh position={[-0.9, 1.2, 0]}><boxGeometry args={[0.25, 2.4, 0.5]} /><meshStandardMaterial color="#c0c6ce" metalness={0.6} /></mesh>
        <mesh position={[0.9, 1.2, 0]}><boxGeometry args={[0.25, 2.4, 0.5]} /><meshStandardMaterial color="#c0c6ce" metalness={0.6} /></mesh>
        <mesh position={[0, 2.5, 0]}><boxGeometry args={[2.05, 0.25, 0.5]} /><meshStandardMaterial color="#c0c6ce" metalness={0.6} /></mesh>
        <mesh position={[3.2, 0.5, 0]}><boxGeometry args={[3, 1, 0.8]} /><meshStandardMaterial color="#2b2f36" /></mesh>
        <group position={[2.6, 1.02, 0]}><Item3D kind="phone" /></group>
        <group position={[3.0, 1.02, 0]}><Item3D kind="keys" /></group>
        <group position={[3.5, 1.0, 0]}><Item3D kind="bottle" /></group>
      </group>
      <StaticNPC id="guard" name={guard.name} role={guard.role} look={guard.look} pos={[4.6, 0, -1.6]} yaw={Math.PI} pitch={guard.pitch} onTalk={security} />
      {/* gates */}
      {GATES.map((g, i) => (
        <group key={g} position={[gateX(i), 0, 9]}>
          <mesh position={[0, 3, 1.85]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[3.6, 1]} />
            <meshBasicMaterial map={textTex(`PUERTA ${g}`, { bg: '#1d3557', fg: '#ffd34d', w: 512, h: 142 })} toneMapped={false} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[-1 + k, 0.45, -0.5]}>
              <boxGeometry args={[0.8, 0.9, 0.7]} />
              <meshStandardMaterial color="#56657a" />
            </mesh>
          ))}
        </group>
      ))}
      <DeparturesBoard trip={trip} step={step} />
      <group position={[-14, 0, 2]}><Item3D kind="suitcase" color="#e14b4b" /></group>
      <group position={[-13.4, 0, 2.3]}><Item3D kind="suitcase" /></group>
      <Plant pos={[16, 0, -9]} />
      <Plant pos={[-16, 0, -9]} />
      <Window />
    </group>
  );
}
const counterX = (n: number) => -12 + (n - 1) * 4.2;
const gateX = (i: number) => -15 + i * 6;

function DeparturesBoard({ trip, step }: { trip: { flight: string; dest: { es: string }; gate1: string; gate2: string; time: string }; step: number }) {
  const rows = useMemo(() => {
    const others = CITIES.filter((c) => c.es !== trip.dest.es).slice(0, 3);
    return [
      `${trip.flight}  ${trip.dest.es.toUpperCase().padEnd(10)} ${trip.time}  ${step >= 2 ? trip.gate2 + ' ¡CAMBIO!' : trip.gate1}`,
      ...others.map((c, i) => `UX ${2100 + i * 37}  ${c.es.toUpperCase().padEnd(10)} ${10 + i * 2}:20  ${GATES[(i + 3) % 6]}`),
    ];
  }, [step]);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 360;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0b1020';
    g.fillRect(0, 0, 1024, 360);
    g.fillStyle = '#ffb03a';
    g.font = 'bold 46px monospace';
    g.fillText('SALIDAS · DEPARTURES', 30, 60);
    g.font = 'bold 40px monospace';
    rows.forEach((r, i) => {
      g.fillStyle = i === 0 ? '#ffd34d' : '#e6edf7';
      g.fillText(r, 30, 130 + i * 62);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [rows]);
  return (
    <mesh position={[0, 4.6, -10.85]}>
      <planeGeometry args={[9, 3.2]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Window() {
  const plane = useRef<THREE.Group>(null);
  useFrame(() => {
    if (plane.current) plane.current.position.x = ((performance.now() / 60) % 120) - 60;
  });
  return (
    <group>
      <mesh position={[17.88, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[18, 4]} />
        <meshStandardMaterial color="#a7d3ff" emissive="#a7d3ff" emissiveIntensity={0.6} />
      </mesh>
      <group ref={plane} position={[0, 0, 0]} />
    </group>
  );
}

