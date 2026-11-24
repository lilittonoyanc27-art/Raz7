import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useInteract } from './common';
import { StaticNPC } from '../../world/NPCs';
import { CHARACTERS } from '../../data/characters';
import { useProgress, useUI } from '../../core/store';
import type { T } from '../../core/types';
import { sfx } from '../../core/audio';
import { addBox, world } from '../../three/world';
import { textTex } from '../../three/textures';
import { randomLook } from '../../three/Humanoid';
import { seeded } from '../../core/random';
import type { TaskLine } from './Tienda';

const T_ = (es: string, hy: string): T => ({ es, hy });

export function BusInterior({ setPanel }: { setPanel: (p: { title: T; lines: TaskLine[]; extra?: T }) => void }) {
  const ui = useUI.getState;
  const coach = CHARACTERS.coach;
  const dani = CHARACTERS.companero;
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  stepRef.current = step;
  useMemo(() => {
    world.bounds = { minX: -1.3, maxX: 1.3, minZ: -9, maxZ: 9 };
    for (let r = 0; r < 8; r++) {
      const z = -6 + r * 1.6;
      addBox(-1.0, z, 0.9, 0.7, 1.0, 0, 'seat');
      addBox(1.0, z, 0.9, 0.7, 1.0, 0, 'seat');
    }
  }, []);
  useEffect(() => {
    setPanel({
      title: T_('El autobús del equipo', 'Թիմի ավտոբուսը'),
      lines: [
        { t: T_('Saluda al entrenador', 'Բարևիր մարզչին'), done: step > 0 },
        { t: T_('Busca tu asiento: el número 7', 'Գտիր քո նստատեղը՝ 7 համարը'), done: step > 1 },
        { t: T_('Habla con tu compañero Dani', 'Խոսիր թիմակցիդ՝ Դանիի հետ'), done: step > 2 },
        { t: T_('Escucha las instrucciones del entrenador', 'Լսիր մարզչի հրահանգները'), done: step > 3 },
      ],
      extra: T_('Vais al aeropuerto para el torneo internacional.', 'Գնում եք օդանավակայան՝ միջազգային մրցաշարի։'),
    });
  }, [step]);

  const talkCoach = useCallback(() => {
    const s = stepRef.current;
    if (s === 0) {
      ui().openDialog({
        speaker: coach.name, role: coach.role, pitch: coach.pitch, focus: [0, 0, -8],
        lines: [{ speaker: coach.name, t: T_('¡Buenos días, Razmik! ¿Qué tal has dormido?', 'Բարի լույս, Ռազմիկ։ Ինչպե՞ս ես քնել։') }],
        options: [
          { t: T_('Muy bien, gracias. Estoy listo.', 'Շատ լավ, շնորհակալություն։ Պատրաստ եմ։'), ok: true, reply: T_('¡Así me gusta! Tu asiento es el número siete.', 'Այսպես է ինձ դուր գալիս։ Քո նստատեղը յոթ համարն է։') },
          { t: T_('Un poco mal, estoy nervioso.', 'Մի քիչ վատ, լարված եմ։'), ok: true, reply: T_('Es normal. Tranquilo, lo harás genial. Siéntate en el siete.', 'Նորմալ է։ Հանգիստ, հիանալի կանես։ Նստիր յոթ համարում։') },
          { t: T_('Tengo un perro.', 'Շուն ունեմ։'), ok: false },
        ],
        cat: 'conversacion',
        onClose: (r) => { if (r.ok) setStep(1); },
      });
    } else if (s === 3) {
      ui().openDialog({
        speaker: coach.name, role: coach.role, pitch: coach.pitch,
        lines: [
          { speaker: coach.name, t: T_('Atención, equipo. Vamos a llegar al aeropuerto en diez minutos.', 'Ուշադրություն, թիմ։ Տասը րոպեից կհասնենք օդանավակայան։') },
          { speaker: coach.name, t: T_('Preparad los pasaportes y no os olvidéis de las mochilas.', 'Պատրաստեք անձնագրերը և չմոռանաք ուսապարկերը։') },
          { speaker: coach.name, t: T_('Razmik, ¿qué tenéis que preparar?', 'Ռազմիկ, ի՞նչ պետք է պատրաստեք։') },
        ],
        options: [
          { t: T_('Los pasaportes.', 'Անձնագրերը։'), ok: true, reply: T_('¡Exacto! Y las mochilas. ¡Vamos!', 'Ճիշտ է։ Եվ ուսապարկերը։ Գնացինք։') },
          { t: T_('Los bocadillos.', 'Սենդվիչները։'), ok: false },
          { t: T_('Las botas.', 'Բութսերը։'), ok: false },
        ],
        cat: 'comprension_auditiva',
        listening: true,
        onClose: (r) => {
          if (!r.ok) return;
          setStep(4);
          useProgress.getState().completeMission('sim-bus', 80, 20);
          sfx('win');
          ui().openDialog({
            speaker: coach.name, role: coach.role, pitch: coach.pitch,
            lines: [{ speaker: coach.name, t: T_('¡Hemos llegado al aeropuerto! ¿Vamos a facturar?', 'Հասանք օդանավակայան։ Գնա՞նք գրանցվելու։') }],
            options: [
              { t: T_('¡Sí, vamos!', 'Այո, գնացինք։'), onPick: () => setTimeout(() => useUI.getState().go('interior', { id: 'aeropuerto' }), 300) },
              { t: T_('Primero quiero volver a la ciudad.', 'Նախ ուզում եմ վերադառնալ քաղաք։'), onPick: () => setTimeout(() => useUI.getState().go('city', { spawn: 'escuela' }), 300) },
            ],
          });
        },
      });
    } else {
      ui().openDialog({ speaker: coach.name, role: coach.role, pitch: coach.pitch, lines: [{ speaker: coach.name, t: s === 1 ? T_('Busca el asiento número siete.', 'Փնտրիր յոթ համարի նստատեղը։') : T_('Habla un poco con Dani, está nervioso.', 'Մի քիչ խոսիր Դանիի հետ, նա լարված է։') }] });
    }
  }, []);

  const seat = (n: number) => {
    if (stepRef.current !== 1) return;
    if (n !== 7) {
      sfx('wrong');
      ui().toast(T_(`Este es el asiento ${n}. Busca el 7.`, `Սա ${n} նստատեղն է։ Փնտրիր 7-ը։`), 'bad');
      return;
    }
    sfx('ok');
    setStep(2);
    ui().toast(T_('¡Asiento 7! Ahora habla con Dani.', 'Նստատեղ 7։ Հիմա խոսիր Դանիի հետ։'), 'good');
  };
  const seats = Array.from({ length: 16 }, (_, i) => i + 1);
  const seatCbs = seats.map((n) => useCallback(() => seat(n), []));
  seats.forEach((n, i) => {
    const r = Math.floor((n - 1) / 2), left = (n - 1) % 2 === 0;
    useInteract('seat-' + n, [left ? -0.4 : 0.4, 0, -6 + r * 1.6 + 0.6], T_(`Asiento ${n}`, `Նստատեղ ${n}`), seatCbs[i], () => stepRef.current === 1, 0.8);
  });

  const talkDani = useCallback(() => {
    if (stepRef.current < 2) {
      ui().openDialog({ speaker: dani.name, lines: [{ speaker: dani.name, t: T_('¡Hola, Razmik! Primero busca tu asiento.', 'Բարև, Ռազմիկ։ Նախ գտիր քո նստատեղը։') }] });
      return;
    }
    const lvl = useProgress.getState().level;
    ui().openDialog({
      speaker: dani.name, role: dani.role, pitch: dani.pitch,
      lines: [
        { speaker: dani.name, t: T_('Oye, ¿estás nervioso por el torneo?', 'Լսիր, լարվա՞ծ ես մրցաշարի պատճառով։') },
        { speaker: dani.name, t: T_('Yo un poco. ¿Qué vas a hacer si perdemos el primer partido?', 'Ես՝ մի քիչ։ Ի՞նչ ես անելու, եթե առաջին խաղը պարտվենք։') },
      ],
      options: [
        { t: T_('Vamos a seguir luchando juntos.', 'Միասին շարունակելու ենք պայքարել։'), ok: true, reply: T_('¡Tienes razón! Somos un equipo.', 'Ճիշտ ես։ Մենք թիմ ենք։') },
        { t: T_('Voy a entrenar más y no me voy a rendir.', 'Ավելի շատ եմ մարզվելու և չեմ հանձնվելու։'), ok: true, reply: T_('¡Esa es la actitud!', 'Ահա սա է ճիշտ վերաբերմունքը։') },
        { t: T_('Ayer comí pasta.', 'Երեկ մակարոն կերա։'), ok: false },
      ],
      free: lvl !== 'A1' ? { accept: [['vamos a', 'voy a', 'seguir', 'entrenar', 'luchar', 'jugar', 'intentar', 'animar', 'mejorar', 'trabajar']], model: T_('Vamos a seguir luchando y a ganar el siguiente partido.', 'Շարունակելու ենք պայքարել և հաղթել հաջորդ խաղը։'), minWords: 3 } : undefined,
      cat: 'conversacion',
      onClose: (r) => { if (r.ok !== false) setStep(3); },
    });
  }, []);

  return (
    <group>
      <BusShell />
      <StaticNPC id="coach-bus" name={coach.name} role={coach.role} look={coach.look} pos={[0, 0, -8]} yaw={0} pitch={coach.pitch} onTalk={talkCoach} />
      <StaticNPC id="dani-bus" name={dani.name} role={dani.role} look={dani.look} pos={[1.0, 0.05, -6 + 3 * 1.6 + 0.1]} yaw={0} sit pitch={dani.pitch} onTalk={talkDani} />
      <Teammates />
    </group>
  );
}

function BusShell() {
  const road = useRef<THREE.Mesh>(null);
  const roadL = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const m = road.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m?.map) m.map.offset.x += dt * 0.25;
    void roadL;
  });
  const roadTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d')!;
    const sky = g.createLinearGradient(0, 0, 0, 128);
    sky.addColorStop(0, '#7fb3e0');
    sky.addColorStop(1, '#e7c6d0');
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 128);
    const cols = ['#e8a0a0', '#9ec5e8', '#f1d39b', '#c9b6e4', '#a8d5ba', '#e3b08a'];
    let x = 0;
    let k = 0;
    while (x < 512) {
      const w = 40 + ((k * 37) % 50);
      const h = 40 + ((k * 53) % 60);
      g.fillStyle = cols[k % cols.length];
      g.fillRect(x, 100 - h, w - 4, h);
      g.fillStyle = 'rgba(40,60,90,0.5)';
      for (let yy = 100 - h + 6; yy < 96; yy += 12) for (let xx = x + 5; xx < x + w - 10; xx += 10) g.fillRect(xx, yy, 5, 6);
      if (k % 3 === 0) {
        g.fillStyle = '#3f8f4a';
        g.beginPath();
        g.arc(x + w - 2, 88, 12, 0, Math.PI * 2);
        g.fill();
      }
      x += w;
      k++;
    }
    g.fillStyle = '#4a4d55';
    g.fillRect(0, 100, 512, 28);
    g.fillStyle = '#ffffff';
    for (let xx = 0; xx < 512; xx += 40) g.fillRect(xx, 114, 20, 3);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 19]} />
        <meshStandardMaterial color="#3a4256" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.8, 19]} />
        <meshStandardMaterial color="#ff7a1a" />
      </mesh>
      <mesh position={[0, 2.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 19]} />
        <meshStandardMaterial color="#e9ecef" side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.5, 1.15, 0]}>
            <boxGeometry args={[0.1, 2.3, 19]} />
            <meshStandardMaterial color="#ff7a1a" />
          </mesh>
          <mesh ref={s === 1 ? road : (roadL as unknown as React.RefObject<THREE.Mesh>)} position={[s * 1.44, 1.55, 0]} rotation={[0, -s * Math.PI / 2, 0]}>
            <planeGeometry args={[18, 1.0]} />
            <meshBasicMaterial map={roadTex} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 8 }).map((_, r) =>
        [-1, 1].map((s) => {
          const n = r * 2 + (s < 0 ? 1 : 2);
          return (
            <group key={`${r}-${s}`} position={[s * 1.0, 0, -6 + r * 1.6]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[0.8, 0.12, 0.6]} />
                <meshStandardMaterial color="#1b2233" />
              </mesh>
              <mesh position={[0, 0.9, -0.3]}>
                <boxGeometry args={[0.8, 0.9, 0.12]} />
                <meshStandardMaterial color="#1b2233" />
              </mesh>
              <mesh position={[0, 1.42, -0.25]}>
                <planeGeometry args={[0.36, 0.18]} />
                <meshBasicMaterial map={textTex(String(n), { bg: n === 7 ? '#ff7a1a' : '#ffffff', fg: '#1b2233', w: 128, h: 64 })} toneMapped={false} />
              </mesh>
            </group>
          );
        }),
      )}
      <pointLight position={[0, 2, 0]} intensity={12} distance={20} />
      <pointLight position={[0, 2, -6]} intensity={8} distance={14} />
    </group>
  );
}

function Teammates() {
  const looks = useMemo(() => {
    const r = seeded(5);
    return [3, 5, 10, 12, 14].map((n) => ({ n, look: { ...randomLook(r), height: 1.5, topStyle: 'hoodie' as const, top: '#ff7a1a' } }));
  }, []);
  return (
    <>
      {looks.map(({ n, look }) => {
        const r = Math.floor((n - 1) / 2), left = (n - 1) % 2 === 0;
        return (
          <StaticNPC key={n} id={'mate-' + n} name="Compañero" role="Equipo" look={look} pos={[left ? -1.0 : 1.0, 0.05, -6 + r * 1.6 + 0.1]} yaw={0} sit marker={false} onTalk={() => useUI.getState().openDialog({ speaker: 'Compañero', lines: [{ speaker: 'Compañero', t: { es: '¡Vamos a ganar el torneo, Razmik!', hy: 'Մենք հաղթելու ենք մրցաշարը, Ռազմիկ։' } }] })} />
        );
      })}
    </>
  );
}
