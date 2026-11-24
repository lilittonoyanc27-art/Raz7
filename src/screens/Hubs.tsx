import { levelFromXp, useProgress, useUI, type Screen } from '../core/store';
import type { T } from '../core/types';
import { Es } from '../ui/Es';
import { Icon } from '../ui/Icon';
import { STORIES } from '../data/detective';
import { TRACKS } from '../scenes/RaceScene';
import { sfx } from '../core/audio';

interface Item { id: string; title: string; hy: string; desc: T; color: string; go: [Screen, Record<string, string | number | boolean>?]; minLevel?: number; mission?: string; tag?: string }
const T_ = (es: string, hy: string): T => ({ es, hy });

const HUBS: Record<string, { title: string; hy: string; items: Item[] }> = {
  misiones: {
    title: 'Misiones', hy: 'Առաքելություններ',
    items: [
      { id: 'llegar', title: 'Misión: Llegar al estadio', hy: 'Հասնել մարզադաշտ', color: '#ff7a1a', desc: T_('Sal de casa, sigue las indicaciones, cruza con cuidado y coge el autobús correcto.', 'Դուրս արի տնից, հետևիր ցուցումներին, զգուշությամբ անցիր և նստիր ճիշտ ավտոբուսը։'), go: ['city', { mission: 'llegar' }], mission: 'llegar-estadio', tag: 'Ciudad' },
      { id: 'libre', title: 'Aventura libre', hy: 'Ազատ արկած', color: '#56ccf2', desc: T_('Explora la Ciudad de Campeones y habla con la gente.', 'Ուսումնասիրիր Չեմպիոնների քաղաքը և խոսիր մարդկանց հետ։'), go: ['city', { spawn: 'casa' }], tag: 'Mundo abierto' },
      { id: 'entreno', title: 'Desafío del entrenador', hy: 'Մարզչի մարտահրավեր', color: '#27ae60', desc: T_('Escucha las órdenes del entrenador y cúmplelas en el campo.', 'Լսիր մարզչի հրահանգները և կատարիր դաշտում։'), go: ['training', { mode: 'entrenamiento' }], mission: 'desafio-entrenador', tag: 'Fútbol' },
      { id: 'carrera', title: 'La gran carrera', hy: 'Մեծ մրցավազք', color: '#9b51e0', desc: T_('Corre contra tus rivales y entiende las instrucciones para elegir el camino.', 'Վազիր մրցակիցների դեմ և հասկացիր հրահանգները՝ ճանապարհն ընտրելու համար։'), go: ['race'], mission: 'gran-carrera', tag: '6 pistas' },
      { id: 'detective', title: 'Detective Razmik', hy: 'Դետեկտիվ Ռազմիկ', color: '#e14b4b', desc: T_(`Investiga ${STORIES.length} misterios en el club con finales sorprendentes.`, `Հետաքննիր ${STORIES.length} առեղծված ակումբում՝ անսպասելի ավարտներով։`), go: ['detective'], tag: `${STORIES.length} casos` },
      { id: 'maze', title: 'El laberinto secreto', hy: 'Գաղտնի լաբիրինթոս', color: '#ff4fd8', desc: T_('Encuentra llaves, abre puertas y resuelve enigmas para salir.', 'Գտիր բանալիներ, բացիր դռներ և լուծիր հանելուկներ՝ դուրս գալու համար։'), go: ['maze'], minLevel: 2, mission: 'laberinto', tag: 'Zona secreta' },
      { id: 'island', title: 'Supervivencia lingüística', hy: 'Լեզվական գոյատևում', color: '#39d3c3', desc: T_('Sobrevive en una isla siguiendo instrucciones en español.', 'Գոյատևիր կղզում՝ հետևելով իսպաներեն հրահանգներին։'), go: ['island'], minLevel: 2, mission: 'isla', tag: 'Zona secreta' },
    ],
  },
  simuladores: {
    title: 'Simuladores de la vida real', hy: 'Իրական կյանքի սիմուլյատորներ',
    items: [
      { id: 'tienda', title: 'La tienda deportiva', hy: 'Սպորտային խանութ', color: '#2e6fd8', desc: T_('Pregunta tallas, colores y precios. Compra equipamiento con tus monedas.', 'Հարցրու չափսեր, գույներ և գներ։ Գնիր պարագաներ մետաղադրամներով։'), go: ['interior', { id: 'tienda' }], mission: 'sim-tienda' },
      { id: 'super', title: 'El supermercado', hy: 'Սուպերմարկետ', color: '#27ae60', desc: T_('Sigue la lista de la compra, pregunta dónde están los productos y paga.', 'Հետևիր գնումների ցուցակին, հարցրու, թե որտեղ են ապրանքները, և վճարիր։'), go: ['interior', { id: 'super' }], mission: 'sim-super' },
      { id: 'restaurante', title: 'El restaurante', hy: 'Ռեստորան', color: '#e14b4b', desc: T_('Elige mesa, lee la carta, pide la comida y la cuenta.', 'Ընտրիր սեղան, կարդա ճաշացանկը, պատվիրիր ուտելիք և հաշիվը։'), go: ['interior', { id: 'restaurante' }], mission: 'sim-restaurante' },
      { id: 'bus', title: 'El autobús del equipo', hy: 'Թիմի ավտոբուսը', color: '#ff7a1a', desc: T_('Viaja con tu equipo, busca tu asiento y habla con tus compañeros.', 'Ճամփորդիր թիմիդ հետ, գտիր քո նստատեղը և խոսիր թիմակիցներիդ հետ։'), go: ['interior', { id: 'bus' }], mission: 'sim-bus' },
      { id: 'aeropuerto', title: 'El aeropuerto', hy: 'Օդանավակայան', color: '#1d3557', desc: T_('Factura, pasa el control y encuentra tu puerta de embarque. ¡Atento a los avisos!', 'Գրանցվիր, անցիր ստուգումը և գտիր նստեցման դարպասդ։ Ուշադիր եղիր հայտարարություններին։'), go: ['interior', { id: 'aeropuerto' }], minLevel: 2, mission: 'sim-aeropuerto' },
    ],
  },
  competiciones: {
    title: 'Competiciones', hy: 'Մրցումներ',
    items: [
      { id: 'batalla', title: 'Batalla de conocimientos', hy: 'Գիտելիքների ճակատամարտ', color: '#e14b4b', desc: T_('Torneo con cuartos, semifinal y final.', 'Մրցաշար՝ քառորդ եզրափակիչով, կիսաեզրափակիչով և եզրափակիչով։'), go: ['batalla'], tag: 'Competición' },
      { id: 'ruleta', title: 'La ruleta de las palabras', hy: 'Բառերի ռուլետկա', color: '#9b51e0', desc: T_('Gira la ruleta, adivina las palabras y llega a la superfinal.', 'Պտտիր ռուլետկան, գուշակիր բառերը և հասիր սուպերֆինալ։'), go: ['ruleta'], tag: 'Concurso' },
      { id: 'contrarreloj', title: 'Contrarreloj en el campo', hy: 'Ժամանակի դեմ դաշտում', color: '#27ae60', desc: T_('Noventa segundos: cumple todas las órdenes que puedas.', 'Իննսուն վայրկյան․ կատարիր որքան հնարավոր է շատ հրահանգ։'), go: ['training', { mode: 'contrarreloj' }], tag: 'Contrarreloj' },
      { id: 'vs-hugo', title: 'Desafío contra Hugo', hy: 'Մարտահրավեր Հուգոյի դեմ', color: '#2e6fd8', desc: T_('Compite contra un rival virtual en el entrenamiento.', 'Մրցիր վիրտուալ մրցակցի դեմ մարզման ժամանակ։'), go: ['training', { mode: 'competicion' }], tag: 'Competición' },
      ...TRACKS.map((t) => ({ id: 'race-' + t.id, title: 'Carrera: ' + t.name.es, hy: 'Մրցավազք՝ ' + t.name.hy, color: '#f2994a', desc: T_('Bate tu récord personal en esta pista.', 'Գերազանցիր անձնական ռեկորդդ այս ուղում։'), go: ['race', { track: t.id }] as Item['go'], tag: 'Contrarreloj' })),
      { id: 'prof-batalla', title: 'Profesor vs. alumno: preguntas', hy: 'Ուսուցիչ ընդդեմ աշակերտի․ հարցեր', color: '#1b2233', desc: T_('Respondéis por turnos. ¿Quién sabe más?', 'Պատասխանում եք հերթով։ Ո՞վ ավելին գիտի։'), go: ['batalla', { mode: 'profesor' }], tag: 'Profesor vs. alumno' },
      { id: 'prof-ruleta', title: 'Profesor vs. alumno: ruleta', hy: 'Ուսուցիչ ընդդեմ աշակերտի․ ռուլետկա', color: '#1b2233', desc: T_('Jugad a la ruleta los dos, por turnos.', 'Խաղացեք ռուլետկա երկուսով՝ հերթով։'), go: ['ruleta', { mode: 'profesor' }], tag: 'Profesor vs. alumno' },
      { id: 'prof-memory', title: 'Profesor vs. alumno: memoria', hy: 'Ուսուցիչ ընդդեմ աշակերտի․ հիշողություն', color: '#1b2233', desc: T_('¿Quién encuentra más parejas?', 'Ո՞վ ավելի շատ զույգ կգտնի։'), go: ['memory', { mode: 'profesor' }], tag: 'Profesor vs. alumno' },
      { id: 'prof-trab', title: 'Profesor vs. alumno: trabalenguas', hy: 'Ուսուցիչ ընդդեմ աշակերտի․ շուտասելուկներ', color: '#1b2233', desc: T_('¿Quién lo dice más rápido y mejor?', 'Ո՞վ ավելի արագ և լավ կասի։'), go: ['trabalenguas', { mode: 'profesor' }], tag: 'Profesor vs. alumno' },
    ],
  },
  retos: {
    title: 'Retos de español', hy: 'Իսպաներենի մարտահրավերներ',
    items: [
      { id: 'habla', title: 'Habla como un campeón', hy: 'Խոսիր չեմպիոնի պես', color: '#2e6fd8', desc: T_('Conversaciones con 8 personajes: elige, escribe o habla.', 'Զրույցներ 8 կերպարների հետ․ ընտրիր, գրիր կամ խոսիր։'), go: ['habla'] },
      { id: 'trabalenguas', title: 'Reto de trabalenguas', hy: 'Շուտասելուկների մարտահրավեր', color: '#f2994a', desc: T_('Más de 30 trabalenguas con cronómetro y récords.', 'Ավելի քան 30 շուտասելուկ՝ վայրկյանաչափով և ռեկորդներով։'), go: ['trabalenguas'] },
      { id: 'memory', title: 'Memory Champions', hy: 'Memory Champions', color: '#27ae60', desc: T_('Siete modos de memoria con palabras, imágenes y sonidos.', 'Հիշողության յոթ ռեժիմ՝ բառերով, նկարներով և ձայներով։'), go: ['memory'] },
      { id: 'ruleta', title: 'La ruleta de las palabras', hy: 'Բառերի ռուլետկա', color: '#9b51e0', desc: T_('Adivinanzas en diez categorías.', 'Հանելուկներ տասը կատեգորիայում։'), go: ['ruleta'] },
      { id: 'batalla', title: 'Batalla de conocimientos', hy: 'Գիտելիքների ճակատամարտ', color: '#e14b4b', desc: T_('Gramática, vocabulario, escucha y mucho más.', 'Քերականություն, բառապաշար, լսողություն և շատ ավելին։'), go: ['batalla'] },
    ],
  },
};

export default function Hubs({ which }: { which: string }) {
  const hub = HUBS[which] ?? HUBS.misiones;
  const xp = useProgress((s) => s.xp);
  const missions = useProgress((s) => s.missions);
  const daily = useProgress((s) => s.daily);
  const lvl = levelFromXp(xp);
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => useUI.getState().go('menu')}><Icon name="home" /></button>
        <div>
          <h1>{hub.title}</h1>
          <div className="sub">{hub.hy}</div>
        </div>
      </div>
      <div className="wrap">
        {which === 'retos' && (
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="mp-title">Retos diarios · Օրվա մարտահրավերներ</div>
            {daily.tasks.map((t) => (
              <div key={t.id} className={'mp-line ' + (t.done ? 'done' : '')} style={{ margin: '6px 0' }}>
                <Icon name={t.done ? 'check' : 'star'} size={14} /> <Es t={{ es: `${t.es} (${t.progress}/${t.goal}) · +${t.reward}`, hy: t.hy }} />
              </div>
            ))}
          </div>
        )}
        <div className="grid">
          {hub.items.map((it) => {
            const locked = it.minLevel && lvl < it.minLevel;
            const count = it.mission ? missions[it.mission] : undefined;
            return (
              <button
                key={it.id}
                className={'card click ' + (locked ? 'locked' : '')}
                onClick={() => {
                  if (locked) {
                    sfx('wrong');
                    useUI.getState().toast({ es: `Se desbloquea en el nivel ${it.minLevel}.`, hy: `Բացվում է ${it.minLevel}-րդ մակարդակում։` }, 'bad');
                    return;
                  }
                  sfx('click');
                  useUI.getState().go(it.go[0], it.go[1] ?? {});
                }}
              >
                <span className="stripe" style={{ background: it.color }} />
                <h3>{it.title}</h3>
                <p>{it.hy}</p>
                <p><Es t={it.desc} /></p>
                <div className="meta">
                  {it.tag && <span className="pill small">{it.tag}</span>}
                  {locked && <span className="pill small bad">Nivel {it.minLevel}</span>}
                  {count ? <span className="pill small gold">✓ ×{count}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
