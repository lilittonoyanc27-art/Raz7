import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SceneShell } from '../ui/SceneShell';
import { Player } from '../three/Player';
import { addBox, addInteractable, player, resetWorld, teleportPlayer, world } from '../three/world';
import { StaticNPC } from '../world/NPCs';
import { CHARACTERS } from '../data/characters';
import { useProgress, useUI } from '../core/store';
import type { T } from '../core/types';
import { seeded, shuffle } from '../core/random';
import { playAmbience, playMusic, sfx, speak } from '../core/audio';
import { MissionPanel, Minimap, fmt } from '../ui/HUD';
import { Es, openTranslation } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { sandTex, grassTex, textTex, woodTex } from '../three/textures';
import { Palm, Bush } from '../three/Props';

const T_ = (es: string, hy: string): T => ({ es, hy });
const R = 58;
const ISLET: [number, number, number] = [84, 0, 0];
const NUMS = [
  { n: 1, es: 'uno', hy: 'մեկ' }, { n: 2, es: 'dos', hy: 'երկու' }, { n: 3, es: 'tres', hy: 'երեք' }, { n: 4, es: 'cuatro', hy: 'չորս' }, { n: 5, es: 'cinco', hy: 'հինգ' },
  { n: 6, es: 'seis', hy: 'վեց' }, { n: 7, es: 'siete', hy: 'յոթ' }, { n: 8, es: 'ocho', hy: 'ութ' }, { n: 9, es: 'nueve', hy: 'ինը' },
];

interface Task { id: string; t: T; say: T[] }

export function IslandScene() {
  const code = useMemo(() => shuffle(NUMS).slice(0, 3), []);
  const TASKS: Task[] = useMemo(() => [
    { id: 'agua', t: T_('Busca agua dulce', 'Գտիր քաղցրահամ ջուր'), say: [T_('Primero necesitas agua. El manantial está detrás de las rocas grandes, cerca de la cueva.', 'Նախ ջուր է պետք։ Աղբյուրը մեծ ժայռերի հետևում է՝ քարանձավի մոտ։')] },
    { id: 'comida', t: T_('Recoge tres cocos', 'Հավաքիր երեք կոկոսներ'), say: [T_('Ahora, comida. Recoge tres cocos. Están debajo de las palmeras de la playa.', 'Հիմա՝ ուտելիք։ Հավաքիր երեք կոկոս։ Դրանք լողափի արմավենիների տակ են։')] },
    { id: 'refugio', t: T_('Construye un refugio (4 troncos + hojas)', 'Կառուցիր ապաստարան (4 գերան + տերևներ)'), say: [T_('Va a llover. Construye un refugio: necesitas cuatro troncos y hojas de palmera.', 'Անձրև է գալու։ Կառուցիր ապաստարան․ պետք են չորս գերան և արմավենու տերևներ։'), T_('Los troncos están en el bosque y las hojas, al lado del lago. Luego vuelve a la hoguera.', 'Գերանները անտառում են, իսկ տերևները՝ լճի կողքին։ Հետո վերադարձիր խարույկի մոտ։')] },
    { id: 'mapa', t: T_('Encuentra el mapa en el cofre', 'Գտիր քարտեզը սնդուկում'), say: [T_('Para volver a casa necesitas el mapa. Está dentro de un cofre, al lado de la entrada de la cueva.', 'Տուն վերադառնալու համար քարտեզն է պետք։ Այն սնդուկի մեջ է՝ քարանձավի մուտքի կողքին։')] },
    { id: 'puente', t: T_('Cruza el puente hasta el faro', 'Կամրջով անցիր մինչև փարոս'), say: [T_('El mapa dice que la barca está en la isla pequeña del faro. Cruza el puente de madera.', 'Քարտեզը ասում է, որ նավակը փարոսի փոքր կղզում է։ Անցիր փայտե կամրջով։')] },
    { id: 'codigo', t: T_('Descubre el código secreto (tres piedras)', 'Բացահայտիր գաղտնի կոդը (երեք քար)'), say: [T_('La barca está atada con un candado. El código está escrito en tres piedras: la primera, la segunda y la tercera.', 'Նավակը կողպեքով է կապված։ Կոդը գրված է երեք քարերի վրա․ առաջին, երկրորդ և երրորդ։'), T_('Busca las piedras con números en la isla pequeña.', 'Փոքր կղզում փնտրիր թվերով քարերը։')] },
    { id: 'casa', t: T_('Sube a la barca y vuelve a casa', 'Նստիր նավակը և վերադարձիր տուն'), say: [T_('¡Lo has conseguido! Sube a la barca y vuelve a casa.', 'Հաջողվեց։ Նստիր նավակը և վերադարձիր տուն։')] },
  ], []);
  const [ti, setTi] = useState(0);
  const tiRef = useRef(0);
  tiRef.current = ti;
  const [inv, setInv] = useState({ cocos: 0, troncos: 0, hojas: false, agua: false, mapa: false, piedras: [] as number[], refugio: false });
  const invRef = useRef(inv);
  invRef.current = inv;
  const [taken, setTaken] = useState<string[]>([]);
  const started = useRef(performance.now());
  const [done, setDone] = useState<null | number>(null);
  const ui = useUI.getState;
  const abuelo = CHARACTERS.abuelo;

  const layout = useMemo(() => {
    const r = seeded(17);
    const palms = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 + r() * 0.2;
      return [Math.cos(a) * (R - 8 - r() * 4), Math.sin(a) * (R - 8 - r() * 4)] as [number, number];
    });
    const cocoPalms = shuffle(palms.map((_, i) => i)).slice(0, 4);
    const forest = Array.from({ length: 10 }, (_, i) => [-20 + (i % 5) * 6 + r() * 2, 18 + Math.floor(i / 5) * 7 + r() * 2] as [number, number]);
    const logs = shuffle(forest).slice(0, 5).map(([x, z]) => [x + 1.5, z + 1] as [number, number]);
    return { palms, cocoPalms, forest, logs };
  }, []);

  useMemo(() => {
    resetWorld();
    world.groundAt = (x, z) => {
      if (Math.hypot(x, z) < R) return 0;
      if (Math.hypot(x - ISLET[0], z - ISLET[2]) < 13) return 0;
      if (x > R - 2 && x < ISLET[0] - 11 && Math.abs(z) < 1.6) return 0.3; // bridge
      return -3;
    };
    world.killY = -1.2;
    world.bounds = { minX: -R - 6, maxX: ISLET[0] + 16, minZ: -R - 6, maxZ: R + 6 };
    world.onFall = () => {
      sfx('wrong');
      ui().toast(T_('¡El agua está muy fría! Vuelve a la playa.', 'Ջուրը շատ սառն է։ Վերադարձիր լողափ։'), 'bad');
      const p = player.pos;
      const toCenter = new THREE.Vector3(-p.x, 0, -p.z).normalize();
      const onIslet = p.x > R;
      if (onIslet) teleportPlayer(ISLET[0] - 6, 0, 0, -Math.PI / 2);
      else teleportPlayer(p.x + toCenter.x * 6, 0, p.z + toCenter.z * 6, Math.atan2(toCenter.x, toCenter.z));
    };
    // rocks & cave
    addBox(-30, -20, 10, 6, 6, 0, 'rock');
    addBox(-36, -10, 6, 14, 7, 0, 'rock');
    addBox(-24, -28, 8, 5, 4, 0, 'rock');
    addBox(10, -4, 1.2, 1.2, 1.2, 0, 'fire');
    addBox(ISLET[0] + 4, 4, 3, 3, 9, 0, 'lighthouse');
  }, []);

  useEffect(() => {
    playMusic('calm');
    playAmbience('waves');
    setTimeout(() => talkGuide(), 900);
    return () => playAmbience(null);
  }, []);

  const advance = () => {
    const next = tiRef.current + 1;
    setTi(next);
    sfx('ok');
    useProgress.getState().addXP(20);
    const task = TASKS[next];
    if (task) {
      ui().openDialog({ speaker: abuelo.name, role: abuelo.role, pitch: abuelo.pitch, lines: task.say.map((t) => ({ speaker: abuelo.name, t })) });
    }
  };

  const talkGuide = useCallback(() => {
    const t = TASKS[tiRef.current];
    const lines = tiRef.current === 0 ? [T_('¡Hola, Razmik! Soy Don Andrés. Tu barco ha llegado a esta isla y tienes que volver a casa.', 'Բարև, Ռազմիկ։ Ես Դոն Անդրեսն եմ։ Քո նավը հասել է այս կղզի, և պետք է վերադառնաս տուն։'), T_('Yo te ayudo, pero tienes que entender mis instrucciones en español.', 'Ես կօգնեմ, բայց պետք է հասկանաս իմ հրահանգները իսպաներենով։'), ...t.say] : t.say;
    ui().openDialog({ speaker: abuelo.name, role: abuelo.role, pitch: abuelo.pitch, focus: [6, 0, -2], lines: lines.map((x) => ({ speaker: abuelo.name, t: x })) });
  }, []);

  const take = (id: string, fn: () => void) => {
    setTaken((tk) => (tk.includes(id) ? tk : [...tk, id]));
    sfx('pickup');
    fn();
  };

  // interactables
  useEffect(() => {
    const offs: (() => void)[] = [];
    const add = (id: string, pos: [number, number, number], label: T, fn: () => void, r = 2.2, enabled?: () => boolean) =>
      offs.push(addInteractable({ id, pos: new THREE.Vector3(...pos), radius: r, label, onInteract: fn, enabled }) as unknown as () => void);
    // water spring behind rocks
    add('agua', [-34, 0, -26], T_('Beber agua del manantial', 'Ջուր խմել աղբյուրից'), () => {
      if (tiRef.current !== 0) return ui().toast(T_('Ya tienes agua.', 'Արդեն ջուր ունես։'), 'info');
      take('agua', () => setInv((v) => ({ ...v, agua: true })));
      useProgress.getState().answer(T_('detrás de las rocas', 'ժայռերի հետևում'), true, 'preposiciones', true);
      advance();
    });
    add('agua-mar', [-R + 4, 0, 0], T_('Beber agua del mar', 'Խմել ծովի ջուր'), () => {
      sfx('wrong');
      useProgress.getState().answer(T_('agua dulce', 'քաղցրահամ ջուր'), false, 'vocabulario');
      ui().openDialog({ speaker: abuelo.name, pitch: abuelo.pitch, lines: [{ speaker: abuelo.name, t: T_('¡No! El agua del mar es salada. Necesitas agua dulce del manantial.', 'Ոչ։ Ծովի ջուրն աղի է։ Աղբյուրի քաղցրահամ ջուր է պետք։') }] });
    }, 6);
    // coconuts
    layout.cocoPalms.forEach((pi, k) => {
      const [x, z] = layout.palms[pi];
      add('coco' + k, [x, 0, z], T_('Recoger el coco', 'Վերցնել կոկոսը'), () => {
        if (tiRef.current !== 1) return ui().toast(T_('Todavía no necesitas cocos.', 'Դեռ կոկոսներ պետք չեն։'), 'info');
        if (invRef.current.cocos >= 3) return;
        take('coco' + k, () => setInv((v) => ({ ...v, cocos: v.cocos + 1 })));
        if (invRef.current.cocos + 1 >= 3) setTimeout(advance, 300);
      }, 2.2, () => !takenRef.current.includes('coco' + k));
    });
    // logs & leaves
    layout.logs.forEach(([x, z], k) => {
      add('tronco' + k, [x, 0, z], T_('Coger el tronco', 'Վերցնել գերանը'), () => {
        if (tiRef.current !== 2) return ui().toast(T_('Ahora no necesitas troncos.', 'Հիմա գերաններ պետք չեն։'), 'info');
        if (invRef.current.troncos >= 4) return ui().toast(T_('Ya tienes cuatro troncos.', 'Արդեն չորս գերան ունես։'), 'info');
        take('tronco' + k, () => setInv((v) => ({ ...v, troncos: v.troncos + 1 })));
      }, 2, () => !takenRef.current.includes('tronco' + k));
    });
    add('hojas', [24, 0, 22], T_('Cortar hojas de palmera', 'Կտրել արմավենու տերևներ'), () => {
      if (tiRef.current !== 2) return;
      take('hojas', () => setInv((v) => ({ ...v, hojas: true })));
    }, 3, () => !takenRef.current.includes('hojas'));
    add('construir', [10, 0, -1.5], T_('Construir el refugio junto a la hoguera', 'Կառուցել ապաստարանը խարույկի մոտ'), () => {
      if (tiRef.current !== 2) return;
      const v = invRef.current;
      if (v.troncos < 4 || !v.hojas) {
        ui().openDialog({ speaker: 'Razmik', lines: [{ speaker: 'Razmik', t: T_(`Me faltan cosas: tengo ${v.troncos} troncos de cuatro${v.hojas ? '' : ' y no tengo hojas'}.`, `Ինձ բաներ են պակասում․ ունեմ ${v.troncos} գերան չորսից${v.hojas ? '' : ', և տերևներ չունեմ'}։`) }] });
        return;
      }
      sfx('door');
      setInv((x) => ({ ...x, refugio: true }));
      advance();
    }, 3);
    // chest with map
    add('cofre', [-25, 0, -12], T_('Abrir el cofre', 'Բացել սնդուկը'), () => {
      if (tiRef.current < 3) return ui().toast(T_('El cofre está cerrado. Primero termina las otras tareas.', 'Սնդուկը փակ է։ Նախ ավարտիր մյուս առաջադրանքները։'), 'info');
      if (invRef.current.mapa) return;
      take('mapa', () => setInv((v) => ({ ...v, mapa: true })));
      advance();
    });
    add('cofre-falso', [-12, 0, 30], T_('Abrir el cofre', 'Բացել սնդուկը'), () => {
      sfx('wrong');
      ui().openDialog({ speaker: 'Razmik', lines: [{ speaker: 'Razmik', t: T_('Este cofre está vacío… Don Andrés dijo «al lado de la entrada de la cueva».', 'Այս սնդուկը դատարկ է… Դոն Անդրեսն ասաց՝ «քարանձավի մուտքի կողքին»։') }] });
    });
    // stones
    code.forEach((c, i) => {
      const pos: [number, number, number] = [ISLET[0] - 8 + i * 5, 0, -6 + (i % 2) * 10];
      add('piedra' + i, pos, T_(`Leer la ${['primera', 'segunda', 'tercera'][i]} piedra`, `Կարդալ ${['առաջին', 'երկրորդ', 'երրորդ'][i]} քարը`), () => {
        ui().openDialog({ speaker: 'Piedra', lines: [{ speaker: 'Piedra', t: T_(`${['Primera', 'Segunda', 'Tercera'][i]} piedra: «${c.es.toUpperCase()}»`, `${['Առաջին', 'Երկրորդ', 'Երրորդ'][i]} քար՝ «${c.hy}»`) }] });
        setInv((v) => (v.piedras.includes(i) ? v : { ...v, piedras: [...v.piedras, i] }));
      }, 2);
    });
    add('barca', [ISLET[0] + 10, 0, -8], T_('Abrir el candado de la barca', 'Բացել նավակի կողպեքը'), () => {
      if (tiRef.current < 5) return ui().toast(T_('Primero necesitas el mapa y cruzar el puente.', 'Նախ քարտեզն է պետք և կամրջով անցնել։'), 'info');
      const right = code.map((c) => c.n).join('');
      const opts = shuffle([right, code.map((c) => c.n).reverse().join(''), [code[1], code[0], code[2]].map((c) => c.n).join(''), [code[2], code[0], code[1]].map((c) => c.n).join('')].filter((v, i, a) => a.indexOf(v) === i));
      ui().openDialog({
        speaker: 'Candado', lines: [{ speaker: 'Candado', t: T_('Introduce el código: primera, segunda y tercera piedra.', 'Մուտքագրիր կոդը․ առաջին, երկրորդ և երրորդ քար։') }],
        options: opts.map((o) => ({ t: T_(o.split('').join(' - '), o.split('').join(' - ')), ok: o === right, reply: o === right ? T_('¡Clic! El candado se abre.', 'Չխկ։ Կողպեքը բացվում է։') : T_('El candado no se abre. Lee otra vez las piedras.', 'Կողպեքը չի բացվում։ Նորից կարդա քարերը։') })),
        cat: 'numeros',
        onClose: (r) => {
          if (!r.ok) return;
          setTi(6);
          sfx('unlock');
          setTimeout(() => {
            const time = (performance.now() - started.current) / 1000;
            const p = useProgress.getState();
            p.completeMission('isla', 200, 60, true);
            p.addMedal('Superviviente de la isla');
            p.setRecord('isla-tiempo', Math.round(time), true);
            sfx('win');
            setDone(time);
          }, 600);
        },
      });
    }, 3);
    return () => offs.forEach((f) => f());
  }, []);
  const takenRef = useRef<string[]>([]);
  takenRef.current = taken;

  const onStep = () => {
    if (tiRef.current === 4 && player.pos.x > ISLET[0] - 12) advance();
  };

  const task = TASKS[Math.min(ti, TASKS.length - 1)];
  const drawMap = useCallback((g: CanvasRenderingContext2D, toMap: (x: number, z: number) => [number, number], scale: number) => {
    g.fillStyle = '#2ec4d6';
    g.fillRect(0, 0, 512, 512);
    const [cx, cz] = toMap(0, 0);
    g.fillStyle = '#ecd6a4';
    g.beginPath(); g.arc(cx, cz, R * scale, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5f9a3c';
    g.beginPath(); g.arc(cx, cz, (R - 10) * scale, 0, Math.PI * 2); g.fill();
    const [ix, iz] = toMap(ISLET[0], 0);
    g.fillStyle = '#ecd6a4';
    g.beginPath(); g.arc(ix, iz, 13 * scale, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8a6a48';
    const [bx, bz] = toMap(R - 2, 0);
    g.fillRect(bx, bz - 1.6 * scale, (ISLET[0] - 11 - R + 2) * scale, 3.2 * scale);
    g.fillStyle = '#6b6b6b';
    [[-30, -20], [-36, -10], [-24, -28]].forEach(([x, z]) => { const [mx, mz] = toMap(x, z); g.beginPath(); g.arc(mx, mz, 5 * scale, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#3d8fc4';
    const [lx, lz] = toMap(26, 26);
    g.beginPath(); g.arc(lx, lz, 7 * scale, 0, Math.PI * 2); g.fill();
  }, []);

  return (
    <SceneShell
      tod="dia"
      minimap={<Minimap extent={100} draw={drawMap} viewRadius={70} />}
      overlay={
        <>
          <MissionPanel title={T_('Supervivencia lingüística', 'Լեզվական գոյատևում')} objective={task.t} lines={TASKS.map((t, i) => ({ t: t.t, done: i < ti }))}>
            <div className="mp-row">
              <span className="pill small">🥥 {inv.cocos}/3</span>
              <span className="pill small">🪵 {inv.troncos}/4</span>
              <span className="pill small">{inv.hojas ? '🌿 ✓' : '🌿 —'}</span>
              <span className="pill small">{inv.mapa ? '🗺 ✓' : '🗺 —'}</span>
            </div>
            <div className="mp-row">
              <button className="btn tiny" onClick={() => speak(task.say.map((x) => x.es).join(' '))}><Icon name="speaker" size={14} /> Escuchar</button>
              <button className="btn tiny ghost" onClick={() => openTranslation(task.say[0])}><Icon name="translate" size={14} /></button>
            </div>
          </MissionPanel>
          {done !== null && (
            <div className="modal-back">
              <div className="modal">
                <div className="result-title">¡Vuelves a casa!</div>
                <Es t={T_('Has sobrevivido en la isla entendiendo todas las instrucciones en español.', 'Գոյատևեցիր կղզում՝ հասկանալով բոլոր հրահանգները իսպաներենով։')} />
                <div className="result-grid">
                  <div><b>{fmt(done)}</b><span>Tiempo</span></div>
                  <div><b>+200</b><span>XP</span></div>
                  <div><b>+60</b><span>Monedas</span></div>
                </div>
                <div className="row">
                  <button className="btn primary" onClick={() => useUI.getState().go('island', { k: Date.now() })}>Jugar otra vez</button>
                  <button className="btn ghost" onClick={() => useUI.getState().go('city', { spawn: 'secreta' })}>Volver a la ciudad</button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    >
      <IslandWorld layout={layout} taken={taken} refugio={inv.refugio} code={code} />
      <StaticNPC id="abuelo" name={abuelo.name} role={abuelo.role} look={abuelo.look} pos={[6, 0, -2]} pitch={abuelo.pitch} onTalk={talkGuide} />
      <Player start={[4, 0, 6]} startYaw={Math.PI} onStep={onStep} />
    </SceneShell>
  );
}

function IslandWorld({ layout, taken, refugio, code }: { layout: { palms: [number, number][]; cocoPalms: number[]; forest: [number, number][]; logs: [number, number][] }; taken: string[]; refugio: boolean; code: { es: string }[] }) {
  const sand = useMemo(() => {
    const t = sandTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 20);
    return t;
  }, []);
  const grass = useMemo(() => {
    const t = grassTex().clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(16, 16);
    return t;
  }, []);
  const water = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (water.current) water.current.position.y = -0.45 + Math.sin(performance.now() / 900) * 0.06;
  });
  return (
    <group>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial color="#2ec4d6" roughness={0.05} metalness={0.3} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -1, 0]} receiveShadow>
        <cylinderGeometry args={[R, R + 6, 2, 64]} />
        <meshStandardMaterial map={sand} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[R - 10, 64]} />
        <meshStandardMaterial map={grass} />
      </mesh>
      <mesh position={[ISLET[0], -1, 0]} receiveShadow>
        <cylinderGeometry args={[13, 15, 2, 40]} />
        <meshStandardMaterial map={sand} />
      </mesh>
      {/* bridge */}
      <mesh position={[(R - 2 + ISLET[0] - 11) / 2, 0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLET[0] - 11 - R + 2, 0.3, 3.2]} />
        <meshStandardMaterial map={woodTex()} />
      </mesh>
      {[-1.6, 1.6].map((z) => (
        <mesh key={z} position={[(R - 2 + ISLET[0] - 11) / 2, 0.9, z]}>
          <boxGeometry args={[ISLET[0] - 11 - R + 2, 0.08, 0.08]} />
          <meshStandardMaterial color="#c8a27a" />
        </mesh>
      ))}
      {/* palms with coconuts */}
      {layout.palms.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Palm seed={i + 5} s={0.9 + (i % 3) * 0.1} />
          {layout.cocoPalms.includes(i) && !taken.includes('coco' + layout.cocoPalms.indexOf(i)) && (
            <mesh position={[0.9, 0.25, 0.4]}><sphereGeometry args={[0.25, 12, 10]} /><meshStandardMaterial color="#6b4423" /></mesh>
          )}
        </group>
      ))}
      {/* forest */}
      {layout.forest.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2, 0]} castShadow><cylinderGeometry args={[0.25, 0.35, 4, 8]} /><meshStandardMaterial color="#6b4a2f" /></mesh>
          <mesh position={[0, 4.6, 0]} castShadow><coneGeometry args={[2, 4, 8]} /><meshStandardMaterial color="#2f6b3a" flatShading /></mesh>
        </group>
      ))}
      {layout.logs.map(([x, z], k) => !taken.includes('tronco' + k) && (
        <mesh key={k} position={[x, 0.25, z]} rotation={[0, k, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 1.8, 10]} />
          <meshStandardMaterial color="#8a5a3c" />
        </mesh>
      ))}
      {/* lake + leaves */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[26, 0.04, 26]}><circleGeometry args={[7, 32]} /><meshStandardMaterial color="#3d8fc4" roughness={0.05} metalness={0.4} /></mesh>
      {!taken.includes('hojas') && <group position={[24, 0, 22]}><Bush s={1.4} color="#3f8f4a" /></group>}
      {/* rocks / cave */}
      {[[-30, -20, 10, 6, 6], [-36, -10, 6, 14, 7], [-24, -28, 8, 5, 4]].map(([x, z, w, d, h], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow receiveShadow scale={[w / 2, h / 2, d / 2]}>
          <dodecahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial color="#7d7468" flatShading />
        </mesh>
      ))}
      <mesh position={[-29, 1.6, -16.4]}><circleGeometry args={[1.8, 20]} /><meshBasicMaterial color="#111" /></mesh>
      {/* spring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-34, 0.05, -26]}><circleGeometry args={[2, 24]} /><meshStandardMaterial color="#7fd3ff" emissive="#7fd3ff" emissiveIntensity={0.3} /></mesh>
      {/* chests */}
      {[[-25, -12], [-12, 30]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.2, 0.8, 0.8]} /><meshStandardMaterial map={woodTex()} color="#a0703a" /></mesh>
          <mesh position={[0, 0.85, 0]}><boxGeometry args={[1.25, 0.1, 0.85]} /><meshStandardMaterial color="#ffd34d" metalness={0.8} /></mesh>
        </group>
      ))}
      {/* campfire & shelter */}
      <group position={[10, 0, -4]}>
        <mesh position={[0, 0.2, 0]}><coneGeometry args={[0.7, 0.4, 8]} /><meshStandardMaterial color="#5a4030" /></mesh>
        <mesh position={[0, 0.7, 0]}><coneGeometry args={[0.4, 0.9, 8]} /><meshStandardMaterial color="#ff7a1a" emissive="#ff5a1a" emissiveIntensity={1.5} toneMapped={false} /></mesh>
        <pointLight position={[0, 1.2, 0]} intensity={4} distance={8} color="#ff9a4a" />
        {refugio && (
          <group position={[3.5, 0, 1]}>
            <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 4]} castShadow><boxGeometry args={[0.15, 3.2, 3]} /><meshStandardMaterial color="#3f8f4a" /></mesh>
            <mesh position={[0, 1.2, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow><boxGeometry args={[0.15, 3.2, 3]} /><meshStandardMaterial color="#3f8f4a" /></mesh>
          </group>
        )}
      </group>
      {/* lighthouse */}
      <group position={[ISLET[0] + 4, 0, 4]}>
        <mesh position={[0, 4.5, 0]} castShadow><cylinderGeometry args={[1.3, 1.8, 9, 20]} /><meshStandardMaterial color="#ffffff" /></mesh>
        {[2, 5, 8].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[1.5, 1.6, 0.8, 20]} /><meshStandardMaterial color="#e14b4b" /></mesh>)}
        <mesh position={[0, 9.6, 0]}><sphereGeometry args={[1.1, 16, 12]} /><meshStandardMaterial color="#ffd34d" emissive="#ffd34d" emissiveIntensity={1} /></mesh>
      </group>
      {/* stones with numbers */}
      {code.map((c, i) => (
        <group key={i} position={[ISLET[0] - 8 + i * 5, 0, -6 + (i % 2) * 10]}>
          <mesh position={[0, 0.6, 0]} castShadow><dodecahedronGeometry args={[0.8, 0]} /><meshStandardMaterial color="#9aa1a9" flatShading /></mesh>
          <mesh position={[0, 1.7, 0]}>
            <planeGeometry args={[1.8, 0.5]} />
            <meshBasicMaterial map={textTex(`${i + 1}ª PIEDRA`, { bg: '#1b2233', fg: '#ffd34d', w: 256, h: 70 })} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* boat */}
      <group position={[ISLET[0] + 12, -0.2, -8]} rotation={[0, 0.5, 0]}>
        <mesh castShadow><boxGeometry args={[1.8, 0.7, 4]} /><meshStandardMaterial map={woodTex()} color="#c0583a" /></mesh>
        <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.06, 0.06, 3.5]} /><meshStandardMaterial color="#5a4030" /></mesh>
        <mesh position={[0, 2.2, 0.6]}><planeGeometry args={[0.1, 2]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0.02, 2.2, 0.6]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.6, 2]} /><meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
}
