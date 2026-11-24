import type { T } from '../core/types';

export type Spot =
  | 'vestuario-banco' | 'vestuario-taquilla' | 'oficina-mesa' | 'oficina-cajon' | 'trofeos-vitrina' | 'cafeteria-sofa' | 'cafeteria-barra'
  | 'almacen-cajas' | 'lavanderia-cesta' | 'prensa-mesa' | 'pasillo-tablon' | 'puerta-almacen' | 'puerta-lavanderia' | 'puerta-prensa';

export interface Clue {
  id: string;
  kind: 'talk' | 'object' | 'door' | 'item';
  where: Spot | 'npc';
  npc?: 'dani' | 'marta' | 'cocinera' | 'hugo' | 'entrenador' | 'noa';
  lines: T[];
  question?: { q: T; options: { t: T; ok: boolean }[] };
  requires?: string[];
  label?: T;
}
export interface Story { id: string; title: T; intro: T[]; item: T; clues: Clue[]; ending: T[] }

const t = (es: string, hy: string): T => ({ es, hy });
const o = (es: string, hy: string, ok: boolean) => ({ t: t(es, hy), ok });

export const STORIES: Story[] = [
  {
    id: 'trofeo',
    title: t('El trofeo desaparecido', 'Անհետացած գավաթը'),
    item: t('el trofeo', 'գավաթը'),
    intro: [t('¡Razmik! El trofeo del equipo ha desaparecido de la vitrina. La ceremonia empieza en una hora.', 'Ռազմիկ։ Թիմի գավաթն անհետացել է ցուցափեղկից։ Արարողությունը սկսվում է մեկ ժամից։'), t('Investiga, habla con todos y busca pistas.', 'Հետաքննիր, խոսիր բոլորի հետ և փնտրիր հուշումներ։')],
    clues: [
      { id: 'd1', kind: 'talk', where: 'npc', npc: 'dani', lines: [t('¿Has visto el trofeo? La última vez estaba en el vestuario, encima del banco.', 'Տեսե՞լ ես գավաթը։ Վերջին անգամ հանդերձարանում էր՝ նստարանի վրա։'), t('Lo llevamos allí para hacer fotos después del entrenamiento.', 'Մարզումից հետո այնտեղ տարանք՝ լուսանկարվելու համար։')] },
      { id: 'n1', kind: 'object', where: 'vestuario-banco', requires: ['d1'], label: t('Mirar debajo del banco', 'Նայել նստարանի տակ'), lines: [t('Debajo del banco hay una nota: «Me lo llevo al segundo piso para dejarlo brillante. —M»', 'Նստարանի տակ մի գրություն կա․ «Տանում եմ երկրորդ հարկ, որ փայլեցնեմ։ —Մ»')] },
      { id: 'c1', kind: 'talk', where: 'npc', npc: 'cocinera', requires: ['n1'], lines: [t('¿Una persona con la letra M? Marta, la de la limpieza, ha subido por la escalera hace un rato.', 'Մ տառով մարդ։ Մարտան՝ մաքրուհին, քիչ առաջ աստիճաններով վերև բարձրացավ։'), t('Creo que ha entrado en la lavandería.', 'Կարծում եմ՝ մտավ լվացքատուն։')] },
      { id: 'p1', kind: 'door', where: 'puerta-lavanderia', requires: ['c1'], label: t('Abrir la puerta de la lavandería', 'Բացել լվացքատան դուռը'), lines: [t('La puerta tiene un candado con una adivinanza.', 'Դուռը կողպեք ունի՝ հանելուկով։')], question: { q: t('«Tiene dientes pero no come, abre puertas y no es persona». ¿Qué es?', '«Ատամներ ունի, բայց չի ուտում, դռներ է բացում, բայց մարդ չէ»։ Ի՞նչ է դա։'), options: [o('Una llave', 'Բանալի', true), o('Un perro', 'Շուն', false), o('Un balón', 'Գնդակ', false)] } },
      { id: 'i1', kind: 'item', where: 'lavanderia-cesta', requires: ['p1'], label: t('Mirar al lado de la cesta', 'Նայել զամբյուղի կողքին'), lines: [t('¡Aquí está el trofeo! Está más brillante que nunca.', 'Ահա գավաթը։ Երբեք այսքան չի փայլել։')] },
    ],
    ending: [t('Marta: ¡Ay, Razmik! Quería darle una sorpresa al equipo y dejar el trofeo perfecto para la ceremonia.', 'Մարտա․ Ա՜խ, Ռազմիկ։ Ուզում էի անակնկալ անել թիմին և գավաթը կատարյալ դարձնել արարողության համար։'), t('Perdón por el susto. ¡Vamos a llevarlo juntos a la vitrina!', 'Ներողություն վախեցնելու համար։ Եկ միասին տանենք ցուցափեղկ։')],
  },
  {
    id: 'balon',
    title: t('El balón de la final', 'Եզրափակչի գնդակը'),
    item: t('el balón firmado', 'ստորագրված գնդակը'),
    intro: [t('El balón firmado por todo el equipo no está en la oficina del entrenador.', 'Ամբողջ թիմի ստորագրած գնդակը մարզչի գրասենյակում չէ։'), t('Sin ese balón no podemos empezar la final. ¡Encuéntralo, detective!', 'Առանց այդ գնդակի չենք կարող սկսել եզրափակիչը։ Գտիր այն, դետեկտիվ։')],
    clues: [
      { id: 'e1', kind: 'talk', where: 'npc', npc: 'entrenador', lines: [t('Dejé el balón encima de mi mesa esta mañana. Mira si hay alguna pista en la oficina.', 'Այս առավոտ գնդակը թողեցի իմ սեղանի վրա։ Նայիր՝ գրասենյակում հուշում կա՞։')] },
      { id: 'o1', kind: 'object', where: 'oficina-mesa', requires: ['e1'], label: t('Examinar la mesa', 'Զննել սեղանը'), lines: [t('En la mesa hay huellas pequeñas de barro y un dibujo de un balón con una flecha hacia la escalera.', 'Սեղանին ցեխի փոքր հետքեր կան և գնդակի նկար՝ դեպի աստիճանները ուղղված սլաքով։')] },
      { id: 'h1', kind: 'talk', where: 'npc', npc: 'hugo', requires: ['o1'], lines: [t('¿Huellas pequeñas? Mi hermana Noa ha venido hoy conmigo. Le encanta jugar al fútbol.', 'Փոքր հետքե՞ր։ Քույրս՝ Նոան, այսօր ինձ հետ է եկել։ Նա շատ է սիրում ֆուտբոլ խաղալ։'), t('Creo que la he visto subir al almacén.', 'Կարծում եմ՝ տեսա, որ բարձրացավ պահեստ։')] },
      { id: 'k1', kind: 'object', where: 'oficina-cajon', requires: ['h1'], label: t('Abrir el cajón', 'Բացել դարակը'), lines: [t('En el cajón hay una llave con una etiqueta: «Almacén».', 'Դարակում բանալի կա՝ «Պահեստ» պիտակով։')] },
      { id: 'p2', kind: 'door', where: 'puerta-almacen', requires: ['k1'], label: t('Abrir el almacén', 'Բացել պահեստը'), lines: [t('Usas la llave… pero la puerta pide una contraseña.', 'Օգտագործում ես բանալին… բայց դուռը գաղտնաբառ է պահանջում։')], question: { q: t('Contraseña: «Es la persona que protege la portería».', 'Գաղտնաբառ․ «Այն մարդն է, ով պաշտպանում է դարպասը»։'), options: [o('El portero', 'Դարպասապահը', true), o('El árbitro', 'Մրցավարը', false), o('El entrenador', 'Մարզիչը', false)] } },
      { id: 'i2', kind: 'item', where: 'almacen-cajas', requires: ['p2'], label: t('Mirar detrás de las cajas', 'Նայել արկղերի հետևում'), lines: [t('Detrás de las cajas está Noa… ¡con el balón!', 'Արկղերի հետևում Նոան է… գնդակով։')] },
    ],
    ending: [t('Noa: Lo siento… Solo quería practicar con el balón de los campeones.', 'Նոա․ Ներողություն… Պարզապես ուզում էի մարզվել չեմպիոնների գնդակով։'), t('Razmik invita a Noa a dar el saque de honor en la final. ¡Todos aplauden!', 'Ռազմիկը հրավիրում է Նոային կատարելու եզրափակչի պատվավոր առաջին հարվածը։ Բոլորը ծափահարում են։')],
  },
  {
    id: 'botas',
    title: t('Las botas de Razmik', 'Ռազմիկի բութսերը'),
    item: t('tus botas', 'քո բութսերը'),
    intro: [t('¡Tus botas no están en tu taquilla! El partido empieza pronto.', 'Քո բութսերը պահարանումդ չեն։ Խաղը շուտով սկսվում է։'), t('Pregunta a tus compañeros. Alguien sabe algo…', 'Հարցրու թիմակիցներիդ։ Ինչ-որ մեկը ինչ-որ բան գիտի…')],
    clues: [
      { id: 't3', kind: 'object', where: 'vestuario-taquilla', label: t('Abrir tu taquilla (número 7)', 'Բացել քո պահարանը (7 համար)'), lines: [t('En la taquilla solo hay un papel: «Busca donde hablan los periodistas».', 'Պահարանում միայն մի թուղթ կա․ «Փնտրիր այնտեղ, որտեղ լրագրողներն են խոսում»։')] },
      { id: 'd3', kind: 'talk', where: 'npc', npc: 'dani', requires: ['t3'], lines: [t('¿Los periodistas? Hablan en la sala de prensa, en el segundo piso, al lado de la lavandería.', 'Լրագրողնե՞րը։ Նրանք խոսում են մամուլի սրահում՝ երկրորդ հարկում, լվացքատան կողքին։'), t('Pero no te puedo decir nada más… ¡Es un secreto!', 'Բայց ավելին չեմ կարող ասել… Գաղտնիք է։')] },
      { id: 'p3', kind: 'door', where: 'puerta-prensa', requires: ['d3'], label: t('Entrar en la sala de prensa', 'Մտնել մամուլի սրահ'), lines: [t('En la puerta hay un cartel con una pregunta.', 'Դռան վրա պաստառ կա՝ հարցով։')], question: { q: t('«¿Cuántos jugadores tiene un equipo de fútbol en el campo?»', '«Ֆուտբոլային թիմը դաշտում քանի՞ խաղացող ունի»։'), options: [o('Once', 'Տասնմեկ', true), o('Siete', 'Յոթ', false), o('Cinco', 'Հինգ', false)] } },
      { id: 'i3', kind: 'item', where: 'prensa-mesa', requires: ['p3'], label: t('Mirar encima de la mesa', 'Նայել սեղանի վրա'), lines: [t('Encima de la mesa hay una caja de regalo. Dentro… ¡tus botas, limpias y con cordones nuevos naranjas!', 'Սեղանի վրա նվերի տուփ կա։ Ներսում… քո բութսերն են՝ մաքուր և նոր նարնջագույն քուղերով։')] },
    ],
    ending: [t('Todo el equipo: ¡SORPRESA! Es tu partido número cien con el equipo.', 'Ամբողջ թիմը․ ԱՆԱԿՆԿԱԼ։ Սա թիմի հետ քո հարյուրերորդ խաղն է։'), t('Dani: Queríamos que jugaras con las botas más bonitas. ¡Felicidades, Razmik!', 'Դանի․ Ուզում էինք, որ խաղաս ամենագեղեցիկ բութսերով։ Շնորհավորում ենք, Ռազմիկ։')],
  },
  {
    id: 'camiseta',
    title: t('La camiseta número 7', '7 համարի մարզաշապիկը'),
    item: t('la camiseta número 7', '7 համարի մարզաշապիկը'),
    intro: [t('La camiseta oficial número 7 no está en el vestuario. ¡Sin ella no puedes salir al campo!', 'Պաշտոնական 7 համարի մարզաշապիկը հանդերձարանում չէ։ Առանց դրա չես կարող դաշտ դուրս գալ։')],
    clues: [
      { id: 'm4', kind: 'talk', where: 'npc', npc: 'marta', lines: [t('Ayer lavé todas las camisetas. Las dejé en la lavandería, pero hay una lista en el tablón del pasillo.', 'Երեկ լվացի բոլոր մարզաշապիկները։ Թողեցի լվացքատանը, բայց միջանցքի տախտակին ցուցակ կա։')] },
      { id: 'l4', kind: 'object', where: 'pasillo-tablon', requires: ['m4'], label: t('Leer el tablón', 'Կարդալ տախտակը'), lines: [t('Lista de lavandería: «Cesta azul: camisetas 1 a 6. Cesta naranja: porteros. Cesta verde: camisetas 7 a 11».', 'Լվացքի ցուցակ․ «Կապույտ զամբյուղ՝ 1-6 մարզաշապիկներ։ Նարնջագույն զամբյուղ՝ դարպասապահներ։ Կանաչ զամբյուղ՝ 7-11 մարզաշապիկներ»։')], question: { q: t('¿En qué cesta debería estar tu camiseta?', 'Ո՞ր զամբյուղում պետք է լինի քո մարզաշապիկը։'), options: [o('En la cesta verde', 'Կանաչ զամբյուղում', true), o('En la cesta azul', 'Կապույտ զամբյուղում', false), o('En la cesta naranja', 'Նարնջագույն զամբյուղում', false)] } },
      { id: 'p4', kind: 'door', where: 'puerta-lavanderia', requires: ['l4'], label: t('Abrir la lavandería', 'Բացել լվացքատունը'), lines: [t('Marta te ha dado el código, pero tienes que recordarlo.', 'Մարտան տվել է կոդը, բայց պետք է հիշես այն։')], question: { q: t('El código es el número de tu camiseta multiplicado por dos.', 'Կոդը քո մարզաշապիկի համարն է՝ բազմապատկած երկուսով։'), options: [o('Catorce', 'Տասնչորս', true), o('Nueve', 'Ինը', false), o('Setenta', 'Յոթանասուն', false)] } },
      { id: 'i4', kind: 'item', where: 'lavanderia-cesta', requires: ['p4'], label: t('Buscar en las cestas', 'Փնտրել զամբյուղներում'), lines: [t('La cesta verde está vacía… ¡pero tu camiseta está en la cesta naranja, con las de los porteros!', 'Կանաչ զամբյուղը դատարկ է… բայց քո մարզաշապիկը նարնջագույն զամբյուղում է՝ դարպասապահների մարզաշապիկների հետ։')] },
    ],
    ending: [t('Marta: ¡Uy! Como es naranja, la puse con las de los porteros. ¡Qué despiste!', 'Մարտա․ Վա՜յ։ Քանի որ նարնջագույն է, դրեցի դարպասապահների մարզաշապիկների հետ։ Ինչ ցրվածություն։'), t('Ahora ya puedes salir al campo con tu número 7.', 'Հիմա արդեն կարող ես դաշտ դուրս գալ քո 7 համարով։')],
  },
  {
    id: 'medalla',
    title: t('La medalla de la suerte', 'Հաջողության մեդալը'),
    item: t('la medalla del entrenador', 'մարզչի մեդալը'),
    intro: [t('El entrenador ha perdido su medalla de la suerte. Siempre la lleva a los partidos importantes.', 'Մարզիչը կորցրել է իր հաջողության մեդալը։ Նա միշտ այն տանում է կարևոր խաղերի։')],
    clues: [
      { id: 'e5', kind: 'talk', where: 'npc', npc: 'entrenador', lines: [t('Esta mañana tomé un café en la cafetería. Después fui a la sala de trofeos. No recuerdo nada más…', 'Այս առավոտ սրճարանում սուրճ խմեցի։ Հետո գնացի գավաթների սրահ։ Ուրիշ ոչինչ չեմ հիշում…')] },
      { id: 'v5', kind: 'object', where: 'trofeos-vitrina', requires: ['e5'], label: t('Examinar la vitrina', 'Զննել ցուցափեղկը'), lines: [t('En el suelo, delante de la vitrina, hay pelos de gato.', 'Հատակին՝ ցուցափեղկի առջև, կատվի մազեր կան։')] },
      { id: 'c5', kind: 'talk', where: 'npc', npc: 'cocinera', requires: ['v5'], lines: [t('¿Pelos de gato? Es Pelusa, el gato del club. Le encantan las cosas que brillan.', 'Կատվի մազե՞ր։ Դա Պելուսան է՝ ակումբի կատուն։ Նա շատ է սիրում փայլուն իրեր։'), t('Siempre duerme en el sofá de la cafetería.', 'Նա միշտ քնում է սրճարանի բազմոցին։')], question: { q: t('¿Dónde duerme Pelusa?', 'Որտե՞ղ է քնում Պելուսան։'), options: [o('En el sofá de la cafetería', 'Սրճարանի բազմոցին', true), o('Debajo de la mesa de la oficina', 'Գրասենյակի սեղանի տակ', false), o('En el campo', 'Դաշտում', false)] } },
      { id: 'i5', kind: 'item', where: 'cafeteria-sofa', requires: ['c5'], label: t('Mirar debajo del cojín del sofá', 'Նայել բազմոցի բարձի տակ'), lines: [t('Debajo del cojín, junto a Pelusa dormido, ¡está la medalla!', 'Բարձի տակ՝ քնած Պելուսայի կողքին, մեդալն է։')] },
    ],
    ending: [t('Entrenador: ¡Mi medalla! Gracias, Razmik. Eres un gran detective.', 'Մարզիչ․ Իմ մեդալը։ Շնորհակալություն, Ռազմիկ։ Դու մեծ դետեկտիվ ես։'), t('Y a partir de hoy, Pelusa será la mascota oficial del equipo.', 'Իսկ այսօրվանից Պելուսան կլինի թիմի պաշտոնական թալիսմանը։')],
  },
];
