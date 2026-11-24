import type { T } from '../core/types';

export type FaceKind = 'es' | 'hy' | 'pic' | 'audio' | 'text';
export interface Face { kind: FaceKind; text?: string; pic?: string; t?: T }
export interface Pair { id: string; a: Face; b: Face; t: T }
export interface MemMode { id: string; title: T; desc: T; pairs: Pair[] }

const t = (es: string, hy: string): T => ({ es, hy });
const P = (id: string, es: string, hy: string, pic: string) => ({ id, es, hy, pic });
const NOUNS = [
  P('balon', 'el balón', 'գնդակ', 'balon'), P('porteria', 'la portería', 'դարպաս', 'porteria'), P('silbato', 'el silbato', 'սուլիչ', 'silbato'), P('bota', 'la bota', 'բութս', 'bota'),
  P('camiseta', 'la camiseta', 'մարզաշապիկ', 'camiseta'), P('copa', 'la copa', 'գավաթ', 'copa'), P('perro', 'el perro', 'շուն', 'perro'), P('gato', 'el gato', 'կատու', 'gato'),
  P('manzana', 'la manzana', 'խնձոր', 'manzana'), P('platano', 'el plátano', 'բանան', 'platano'), P('autobus', 'el autobús', 'ավտոբուս', 'autobus'), P('casa', 'la casa', 'տուն', 'casa'),
  P('sol', 'el sol', 'արև', 'sol'), P('coche', 'el coche', 'մեքենա', 'coche'), P('arbol', 'el árbol', 'ծառ', 'arbol'), P('avion', 'el avión', 'ինքնաթիռ', 'avion'),
];
const VERBS = [
  P('correr', 'correr', 'վազել', 'correr'), P('saltar', 'saltar', 'ցատկել', 'saltar'), P('chutar', 'chutar', 'հարվածել (գնդակին)', 'chutar'), P('beber', 'beber', 'խմել', 'beber'),
  P('dormir', 'dormir', 'քնել', 'dormir'), P('leer', 'leer', 'կարդալ', 'leer'), P('comer', 'comer', 'ուտել', 'comer'), P('nadar', 'nadar', 'լողալ', 'nadar'),
];
const QA: [string, string, string, string][] = [
  ['¿Cómo te llamas?', 'Me llamo Razmik.', 'Ինչպե՞ս է քո անունը։', 'Իմ անունը Ռազմիկ է։'],
  ['¿Cuántos años tienes?', 'Tengo doce años.', 'Քանի՞ տարեկան ես։', 'Տասներկու տարեկան եմ։'],
  ['¿De dónde eres?', 'Soy de Armenia.', 'Որտեղի՞ց ես։', 'Հայաստանից եմ։'],
  ['¿Qué deporte practicas?', 'Juego al fútbol.', 'Ի՞նչ սպորտով ես զբաղվում։', 'Ֆուտբոլ եմ խաղում։'],
  ['¿Dónde está el estadio?', 'Enfrente del parque.', 'Որտե՞ղ է մարզադաշտը։', 'Այգու դիմաց։'],
  ['¿Qué hora es?', 'Son las cinco.', 'Ժամը քանի՞սն է։', 'Ժամը հինգն է։'],
  ['¿Cuánto cuesta el balón?', 'Cuesta veinte euros.', 'Որքա՞ն արժե գնդակը։', 'Արժե քսան եվրո։'],
  ['¿Qué vas a hacer mañana?', 'Voy a entrenar.', 'Ի՞նչ ես անելու վաղը։', 'Մարզվելու եմ։'],
  ['¿Por qué estás cansado?', 'Porque he corrido mucho.', 'Ինչո՞ւ ես հոգնած։', 'Որովհետև շատ եմ վազել։'],
  ['¿Cuál es tu número?', 'El siete.', 'Ո՞րն է քո համարը։', 'Յոթը։'],
];
const SENT: [string, string, string, string][] = [
  ['Antes del partido,', 'me pongo las botas.', 'Խաղից առաջ', 'հագնում եմ բութսերս։'],
  ['Si llueve,', 'entrenamos en el gimnasio.', 'Եթե անձրև գա,', 'կմարզվենք մարզադահլիճում։'],
  ['El portero', 'para todos los balones.', 'Դարպասապահը', 'կանգնեցնում է բոլոր գնդակները։'],
  ['Cuando marco un gol,', 'lo celebro con el equipo.', 'Երբ գոլ եմ խփում,', 'այն նշում եմ թիմի հետ։'],
  ['Para cruzar la calle,', 'espero el semáforo verde.', 'Փողոցն անցնելու համար', 'սպասում եմ կանաչ լուսացույցին։'],
  ['Mi entrenador dice que', 'tengo que correr más rápido.', 'Մարզիչս ասում է, որ', 'պետք է ավելի արագ վազեմ։'],
  ['Después del entrenamiento,', 'me ducho y descanso.', 'Մարզումից հետո', 'լողանում եմ և հանգստանում։'],
  ['Llevo cinco años', 'jugando al fútbol.', 'Հինգ տարի է', 'ֆուտբոլ եմ խաղում։'],
  ['Mañana vamos a', 'viajar a Madrid.', 'Վաղը', 'մեկնելու ենք Մադրիդ։'],
  ['El árbitro', 'enseña la tarjeta amarilla.', 'Մրցավարը', 'ցույց է տալիս դեղին քարտը։'],
];
const TERMS: [string, string, string, string][] = [
  ['el córner', 'Saque desde la esquina del campo.', 'անկյունային', 'Հարված դաշտի անկյունից։'],
  ['el penalti', 'Tiro desde once metros contra el portero.', 'տասնմեկմետրանոց', 'Հարված տասնմեկ մետրից դարպասապահի դեմ։'],
  ['el fuera de juego', 'Posición ilegal de un atacante.', 'խաղից դուրս', 'Հարձակվողի անթույլատրելի դիրք։'],
  ['el defensa', 'Jugador que protege su portería.', 'պաշտպան', 'Խաղացող, որը պաշտպանում է իր դարպասը։'],
  ['el delantero', 'Jugador que intenta marcar goles.', 'հարձակվող', 'Խաղացող, որը փորձում է գոլ խփել։'],
  ['el descanso', 'Pausa entre las dos partes.', 'ընդմիջում', 'Դադար երկու խաղակեսերի միջև։'],
  ['la tarjeta roja', 'Expulsión del partido.', 'կարմիր քարտ', 'Հեռացում խաղից։'],
  ['el empate', 'Mismo resultado para los dos equipos.', 'ոչ-ոքի', 'Նույն արդյունքը երկու թիմերի համար։'],
  ['el saque de banda', 'Se saca con las manos desde la línea lateral.', 'աուտ', 'Կատարվում է ձեռքերով կողային գծից։'],
  ['la prórroga', 'Tiempo extra cuando hay empate.', 'լրացուցիչ ժամանակ', 'Լրացուցիչ ժամանակ, երբ ոչ-ոքի է։'],
];

export const MEM_MODES: MemMode[] = [
  { id: 'imagen', title: t('Palabra e imagen', 'Բառ և նկար'), desc: t('Une cada palabra con su dibujo.', 'Միացրու յուրաքանչյուր բառ իր նկարի հետ։'), pairs: NOUNS.map((n) => ({ id: n.id, t: t(n.es, n.hy), a: { kind: 'es', text: n.es }, b: { kind: 'pic', pic: n.pic } })) },
  { id: 'armenio', title: t('Español y armenio', 'Իսպաներեն և հայերեն'), desc: t('Une la palabra española con su traducción.', 'Միացրու իսպաներեն բառը իր թարգմանության հետ։'), pairs: [...NOUNS, ...VERBS].map((n) => ({ id: n.id, t: t(n.es, n.hy), a: { kind: 'es', text: n.es }, b: { kind: 'hy', text: n.hy } })) },
  { id: 'verbos', title: t('Verbo y acción', 'Բայ և գործողություն'), desc: t('Une cada verbo con la acción.', 'Միացրու յուրաքանչյուր բայ գործողության հետ։'), pairs: VERBS.map((n) => ({ id: n.id, t: t(n.es, n.hy), a: { kind: 'es', text: n.es }, b: { kind: 'pic', pic: n.pic } })) },
  { id: 'preguntas', title: t('Pregunta y respuesta', 'Հարց և պատասխան'), desc: t('Une cada pregunta con su respuesta.', 'Միացրու յուրաքանչյուր հարց իր պատասխանի հետ։'), pairs: QA.map(([q, a, qh, ah], i) => ({ id: 'qa' + i, t: t(`${q} — ${a}`, `${qh} — ${ah}`), a: { kind: 'text', text: q, t: t(q, qh) }, b: { kind: 'text', text: a, t: t(a, ah) } })) },
  { id: 'frases', title: t('Principio y final', 'Սկիզբ և վերջ'), desc: t('Une el principio y el final de cada frase.', 'Միացրու յուրաքանչյուր նախադասության սկիզբը և վերջը։'), pairs: SENT.map(([a, b, ah, bh], i) => ({ id: 's' + i, t: t(`${a} ${b}`, `${ah} ${bh}`), a: { kind: 'text', text: a, t: t(a, ah) }, b: { kind: 'text', text: b, t: t(b, bh) } })) },
  { id: 'audio', title: t('Escucha e imagen', 'Լսիր և նկար'), desc: t('Escucha la palabra y busca su dibujo.', 'Լսիր բառը և գտիր դրա նկարը։'), pairs: [...NOUNS, ...VERBS].map((n) => ({ id: n.id, t: t(n.es, n.hy), a: { kind: 'audio', text: n.es }, b: { kind: 'pic', pic: n.pic } })) },
  { id: 'terminos', title: t('Términos de fútbol', 'Ֆուտբոլային տերմիններ'), desc: t('Une cada término con su definición.', 'Միացրու յուրաքանչյուր տերմին իր սահմանման հետ։'), pairs: TERMS.map(([a, b, ah, bh], i) => ({ id: 'tm' + i, t: t(`${a}: ${b}`, `${ah}՝ ${bh}`), a: { kind: 'text', text: a, t: t(a, ah) }, b: { kind: 'text', text: b, t: t(b, bh) } })) },
];
