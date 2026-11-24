import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Room, Counter, ShelfUnit, Item3D, useInteract, type ItemKind } from './common';
import { StaticNPC } from '../../world/NPCs';
import { CHARACTERS } from '../../data/characters';
import { useProgress, useUI } from '../../core/store';
import { sample, shuffle } from '../../core/random';
import type { T } from '../../core/types';
import { sfx } from '../../core/audio';
import type { TaskLine } from './Tienda';

const T_ = (es: string, hy: string): T => ({ es, hy });
interface Prod { id: ItemKind; art: string; pl: boolean; name: T; plural: T; aisle: string; price: number; unit: T; pos: [number, number, number] }
const AISLES: Record<string, T> = {
  frutas: T_('el pasillo de frutas y verduras', 'մրգերի և բանջարեղենի միջանցքը'),
  lacteos: T_('el pasillo de lácteos', 'կաթնամթերքի միջանցքը'),
  panaderia: T_('la panadería', 'հացաբուլկեղենի բաժինը'),
  bebidas: T_('el pasillo de bebidas', 'խմիչքների միջանցքը'),
  carne: T_('la carnicería y pescadería', 'մսի և ձկան բաժինը'),
};
const PRODUCTS: Prod[] = [
  { id: 'apple', art: 'las', pl: true, name: T_('manzanas', 'խնձոր'), plural: T_('manzanas', 'խնձորներ'), aisle: 'frutas', price: 2, unit: T_('un kilo', 'մեկ կիլոգրամ'), pos: [-7, 0.8, -4] },
  { id: 'banana', art: 'los', pl: true, name: T_('plátanos', 'բանան'), plural: T_('plátanos', 'բանաններ'), aisle: 'frutas', price: 2, unit: T_('un racimo', 'մի ողկույզ'), pos: [-5.6, 0.8, -4] },
  { id: 'orange', art: 'las', pl: true, name: T_('naranjas', 'նարինջ'), plural: T_('naranjas', 'նարինջներ'), aisle: 'frutas', price: 3, unit: T_('un kilo', 'մեկ կիլոգրամ'), pos: [-8.4, 0.8, -4] },
  { id: 'tomato', art: 'los', pl: true, name: T_('tomates', 'լոլիկ'), plural: T_('tomates', 'լոլիկներ'), aisle: 'frutas', price: 2, unit: T_('un kilo', 'մեկ կիլոգրամ'), pos: [-7, 0.15, -4] },
  { id: 'milk', art: 'la', pl: false, name: T_('leche', 'կաթ'), plural: T_('leche', 'կաթ'), aisle: 'lacteos', price: 1, unit: T_('un litro', 'մեկ լիտր'), pos: [-1.4, 0.8, -4] },
  { id: 'yogurt', art: 'los', pl: true, name: T_('yogures', 'յոգուրտ'), plural: T_('yogures', 'յոգուրտներ'), aisle: 'lacteos', price: 2, unit: T_('un paquete', 'մեկ տուփ'), pos: [0, 0.8, -4] },
  { id: 'cheese', art: 'el', pl: false, name: T_('queso', 'պանիր'), plural: T_('queso', 'պանիր'), aisle: 'lacteos', price: 4, unit: T_('un trozo', 'մեկ կտոր'), pos: [1.4, 0.8, -4] },
  { id: 'eggs', art: 'los', pl: true, name: T_('huevos', 'ձու'), plural: T_('huevos', 'ձվեր'), aisle: 'lacteos', price: 3, unit: T_('una docena', 'մեկ դյուժին'), pos: [0, 0.15, -4] },
  { id: 'bread', art: 'el', pl: false, name: T_('pan', 'հաց'), plural: T_('pan', 'հաց'), aisle: 'panaderia', price: 1, unit: T_('una barra', 'մեկ բաթոն'), pos: [7, 0.8, -4] },
  { id: 'cereal', art: 'los', pl: true, name: T_('cereales', 'փաթիլներ'), plural: T_('cereales', 'փաթիլներ'), aisle: 'panaderia', price: 3, unit: T_('una caja', 'մեկ տուփ'), pos: [5.6, 0.8, -4] },
  { id: 'water', art: 'el', pl: false, name: T_('agua', 'ջուր'), plural: T_('agua', 'ջուր'), aisle: 'bebidas', price: 1, unit: T_('una botella', 'մեկ շիշ'), pos: [-7, 0.8, 3] },
  { id: 'juice', art: 'el', pl: false, name: T_('zumo', 'հյութ'), plural: T_('zumo', 'հյութ'), aisle: 'bebidas', price: 2, unit: T_('un cartón', 'մեկ տուփ'), pos: [-5.6, 0.8, 3] },
  { id: 'fish', art: 'el', pl: false, name: T_('pescado', 'ձուկ'), plural: T_('pescado', 'ձուկ'), aisle: 'carne', price: 6, unit: T_('medio kilo', 'կես կիլոգրամ'), pos: [5.6, 0.8, 3] },
  { id: 'chicken', art: 'el', pl: false, name: T_('pollo', 'հավ'), plural: T_('pollo', 'հավ'), aisle: 'carne', price: 5, unit: T_('un kilo', 'մեկ կիլոգրամ'), pos: [7, 0.8, 3] },
  { id: 'rice', art: 'el', pl: false, name: T_('arroz', 'բրինձ'), plural: T_('arroz', 'բրինձ'), aisle: 'panaderia', price: 2, unit: T_('un paquete', 'մեկ տուփ'), pos: [8.4, 0.8, -4] },
];

export function SuperInterior({ setPanel }: { setPanel: (p: { title: T; lines: TaskLine[]; extra?: T }) => void }) {
  const list = useMemo(() => sample(PRODUCTS, useProgress.getState().level === 'A1' ? 3 : 4), []);
  const [got, setGot] = useState<string[]>([]);
  const [paid, setPaid] = useState(false);
  const gotRef = useRef(got);
  gotRef.current = got;
  const elena = CHARACTERS.cajera;
  const ui = useUI.getState;

  useEffect(() => {
    setPanel({
      title: T_('Lista de la compra', 'Գնումների ցուցակ'),
      lines: [...list.map((p) => ({ t: T_(`${cap(p.unit.es)} de ${p.plural.es}`, `${p.unit.hy} ${p.plural.hy}`), done: got.includes(p.id) })), { t: T_('Paga en la caja', 'Վճարիր դրամարկղում'), done: paid }],
      extra: T_('¿No encuentras algo? Pregunta al empleado.', 'Ինչ-որ բան չե՞ս գտնում։ Հարցրու աշխատակցին։'),
    });
  }, [got, paid]);

  const take = (p: Prod) => {
    if (gotRef.current.includes(p.id)) return;
    if (!list.some((x) => x.id === p.id)) {
      sfx('wrong');
      ui().toast(T_(`${cap(p.art)} ${p.plural.es} no ${p.pl ? 'están' : 'está'} en tu lista.`, `${p.plural.hy}-ը քո ցուցակում չկա։`), 'bad');
      useProgress.getState().answer(T_(`${p.plural.es}`, p.plural.hy), false, 'vocabulario');
      return;
    }
    sfx('pickup');
    useProgress.getState().answer(T_(`${p.plural.es}`, p.plural.hy), true, 'vocabulario');
    setGot((g) => [...g, p.id]);
    ui().toast(T_(`Has cogido: ${p.unit.es} de ${p.plural.es}`, `Վերցրիր՝ ${p.unit.hy} ${p.plural.hy}`), 'good');
  };

  const askWhere = useCallback(() => {
    const missing = list.filter((p) => !gotRef.current.includes(p.id));
    if (!missing.length) {
      ui().openDialog({ speaker: 'Pedro', role: 'Empleado', lines: [{ speaker: 'Pedro', t: T_('¡Ya lo tienes todo! La caja está al fondo.', 'Արդեն ամեն ինչ ունես։ Դրամարկղը վերջում է։') }] });
      return;
    }
    ui().openDialog({
      speaker: 'Pedro', role: 'Empleado', pitch: 0.95, focus: [0, 0, 0.5],
      lines: [{ speaker: 'Pedro', t: T_('Hola, ¿qué buscas?', 'Բարև, ի՞նչ ես փնտրում։') }],
      options: missing.map((p) => ({
        t: T_(p.pl ? `¿Dónde están ${p.art} ${p.plural.es}?` : `¿Dónde está ${p.art} ${p.plural.es}?`, `Որտե՞ղ է ${p.plural.hy}-ը։`),
        reply: T_(`${p.pl ? 'Están' : 'Está'} en ${AISLES[p.aisle].es}, ${p.pos[2] < 0 ? 'al fondo' : 'cerca de la entrada'}, ${p.pos[0] < 0 ? 'a la izquierda' : 'a la derecha'}.`, `${AISLES[p.aisle].hy}-ում է, ${p.pos[2] < 0 ? 'խորքում' : 'մուտքի մոտ'}, ${p.pos[0] < 0 ? 'ձախ կողմում' : 'աջ կողմում'}։`),
      })),
      cat: 'supermercado',
      listening: true,
    });
  }, []);

  const pay = useCallback(() => {
    if (gotRef.current.length < list.length) {
      ui().openDialog({ speaker: elena.name, role: elena.role, pitch: elena.pitch, lines: [{ speaker: elena.name, t: T_('Creo que todavía te faltan productos de tu lista.', 'Կարծում եմ՝ ցուցակիցդ դեռ ապրանքներ են պակասում։') }] });
      return;
    }
    const total = list.reduce((a, p) => a + p.price, 0);
    ui().openDialog({
      speaker: elena.name, role: elena.role, pitch: elena.pitch, focus: [6, 0, 6.2],
      lines: [
        { speaker: elena.name, t: T_('¡Buenos días! ¿Necesitas una bolsa?', 'Բարի օր։ Տոպրակ պե՞տք է։') },
        { speaker: 'Razmik', t: T_('Sí, una bolsa, por favor.', 'Այո, մեկ տոպրակ, խնդրում եմ։') },
        { speaker: elena.name, t: T_(`Muy bien. Son ${total} euros en total. La bolsa es gratis.`, `Շատ լավ։ Ընդհանուր ${total} եվրո է։ Տոպրակն անվճար է։`) },
        { speaker: elena.name, t: T_('¿Cuánto tienes que pagar?', 'Որքա՞ն պետք է վճարես։') },
      ],
      options: shuffle([total, total + 2, total + 5, Math.max(1, total - 3)]).map((n) => ({ t: T_(`${n} euros.`, `${n} եվրո։`), ok: n === total, reply: n === total ? T_('¡Perfecto! Aquí tienes el tique. ¡Que tengas un buen día!', 'Կատարյալ է։ Ահա կտրոնը։ Լավ օր ունենաս։') : undefined })),
      cat: 'comprension_auditiva',
      listening: true,
      onClose: (r) => {
        if (!r.ok) return;
        setPaid(true);
        useProgress.getState().completeMission('sim-super', 90, 25);
        ui().toast(T_('¡Compra terminada! +90 XP', 'Գնումներն ավարտված են։ +90 XP'), 'gold');
        sfx('win');
      },
    });
  }, []);
  useInteract('super-ask', [0, 0, 0.5], T_('Preguntar al empleado', 'Հարցնել աշխատակցին'), askWhere, undefined, 2.6);
  useInteract('super-pay', [6, 0, 7], T_('Pagar en la caja', 'Վճարել դրամարկղում'), pay, undefined, 2.4);

  return (
    <group>
      <Room w={22} d={18} floor="tile" wall="#f4f1ea" accent="#27ae60" sign="SUPERMERCADO · MERCAFRESCO" />
      <ShelfUnit pos={[-7, 0, -4.4]} w={4.5} label="FRUTAS Y VERDURAS" color="#d8f3dc" />
      <ShelfUnit pos={[0, 0, -4.4]} w={4.5} label="LÁCTEOS" color="#e9f5ff" />
      <ShelfUnit pos={[7, 0, -4.4]} w={4.5} label="PANADERÍA" color="#fff1d6" />
      <ShelfUnit pos={[-6.3, 0, 2.6]} w={3.5} label="BEBIDAS" color="#e0f0ff" />
      <ShelfUnit pos={[6.3, 0, 2.6]} w={3.5} label="CARNE Y PESCADO" color="#ffe5e5" />
      {PRODUCTS.map((p) => (
        <ProductSpot key={p.id} p={p} onTake={() => take(p)} />
      ))}
      <Counter pos={[6, 0, 6.3]} w={3.4} label="CAJA" color="#27ae60" />
      <StaticNPC id="elena" name={elena.name} role={elena.role} look={elena.look} pos={[6, 0, 5.1]} yaw={Math.PI} pitch={elena.pitch} onTalk={pay} label={T_('Pagar a Elena', 'Վճարել Էլենային')} />
      <StaticNPC id="pedro" name="Pedro" role="Empleado" look={{ ...CHARACTERS.vendedor.look, top: '#27ae60', hairStyle: 'short', hair: '#6b4423', skin: '#f1c9a5' }} pos={[0, 0, 0]} yaw={Math.PI} pitch={0.95} onTalk={askWhere} label={T_('Preguntar a Pedro', 'Հարցնել Պեդրոյին')} />
      {/* trolleys */}
      {[-9, -8.2].map((x) => (
        <group key={x} position={[x, 0, 7.5]}>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.6, 0.5, 0.9]} />
            <meshStandardMaterial color="#c0c6ce" metalness={0.8} roughness={0.3} wireframe />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ProductSpot({ p, onTake }: { p: Prod; onTake: () => void }) {
  useInteract('prod-' + p.id, [p.pos[0], 0, p.pos[2] + (p.pos[2] < 0 ? 0.9 : -0.9)], T_(`Coger ${p.plural.es}`, `Վերցնել ${p.plural.hy}`), onTake, undefined, 1.0);
  return (
    <group position={[p.pos[0], p.pos[1] + 0.03, p.pos[2] < 0 ? -4.4 : 2.6]}>
      <Item3D kind={p.id} />
    </group>
  );
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
