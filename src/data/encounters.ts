import type { Level, T } from '../core/types';

export interface Opt { t: T; ok?: boolean; reply?: T }
export interface Encounter { lvl: Level; lines: T[]; options?: Opt[]; free?: { accept: string[][]; model: T; minWords?: number }; cat: string }

const o = (es: string, hy: string, ok?: boolean, reply?: [string, string]): Opt => ({ t: { es, hy }, ok, reply: reply ? { es: reply[0], hy: reply[1] } : undefined });
const l = (es: string, hy: string): T => ({ es, hy });

export const ENCOUNTERS: Encounter[] = [
  // ------------------------------------------------ A1
  {
    lvl: 'A1', cat: 'saludos',
    lines: [l('¡Hola, Razmik! ¿Adónde vas?', 'Բարև, Ռազմիկ։ Ու՞ր ես գնում։')],
    options: [
      o('Voy al estadio.', 'Գնում եմ մարզադաշտ։', true, ['¡Genial! ¡Mucha suerte!', 'Հիանալի է։ Հաջողություն։']),
      o('Voy al parque a jugar.', 'Գնում եմ այգի՝ խաղալու։', true, ['¡Qué bien! Hace un día perfecto.', 'Ինչ լավ է։ Կատարյալ օր է։']),
      o('Tengo doce años.', 'Ես տասներկու տարեկան եմ։', false, ['Eso no es lo que te he preguntado. Te pregunto adónde vas.', 'Ես դա չեմ հարցրել։ Հարցնում եմ՝ ու՞ր ես գնում։']),
    ],
  },
  {
    lvl: 'A1', cat: 'saludos',
    lines: [l('¡Buenos días! ¿Cómo estás?', 'Բարի լույս։ Ինչպե՞ս ես։')],
    options: [
      o('Muy bien, gracias. ¿Y tú?', 'Շատ լավ, շնորհակալություն։ Իսկ դու՞։', true, ['Yo también, gracias.', 'Ես էլ, շնորհակալություն։']),
      o('Estoy un poco cansado.', 'Մի քիչ հոգնած եմ։', true, ['Descansa un poco después del entrenamiento.', 'Մարզումից հետո մի քիչ հանգստացիր։']),
      o('Me llamo Razmik.', 'Իմ անունը Ռազմիկ է։', false),
    ],
  },
  {
    lvl: 'A1', cat: 'futbol',
    lines: [l('¿Estás preparado para el entrenamiento de hoy?', 'Պատրա՞ստ ես այսօրվա մարզմանը։')],
    options: [
      o('¡Sí, estoy preparado!', 'Այո, պատրաստ եմ։', true, ['¡Así me gusta, campeón!', 'Ահա սա ինձ դուր է գալիս, չեմպիոն։']),
      o('Todavía no, necesito mis botas.', 'Դեռ ոչ, ինձ պետք են բութսերս։', true, ['Pues date prisa, ¡búscalas!', 'Ուրեմն շտապիր, գտի՛ր դրանք։']),
      o('Me gusta la pizza.', 'Ես սիրում եմ պիցցա։', false),
    ],
  },
  {
    lvl: 'A1', cat: 'ayuda',
    lines: [l('Perdona, ¿puedes ayudarme? No encuentro mi perro.', 'Ներողություն, կարո՞ղ ես օգնել ինձ։ Չեմ գտնում շանս։'), l('Es pequeño y blanco.', 'Փոքր է ու սպիտակ։')],
    options: [
      o('Sí, claro. Lo busco contigo.', 'Այո, իհարկե։ Քեզ հետ կփնտրեմ։', true, ['¡Muchas gracias! Eres muy amable.', 'Շատ շնորհակալ եմ։ Դու շատ բարի ես։']),
      o('Lo siento, tengo prisa, pero pregunta en el parque.', 'Ներիր, շտապում եմ, բայց հարցրու այգում։', true, ['Vale, gracias por la idea.', 'Լավ, շնորհակալություն գաղափարի համար։']),
      o('Es grande y negro.', 'Մեծ է ու սև։', false, ['No, no. Mi perro es pequeño y blanco.', 'Ոչ, ոչ։ Իմ շունը փոքր է ու սպիտակ։']),
    ],
  },
  {
    lvl: 'A1', cat: 'ciudad',
    lines: [l('Ten cuidado, el semáforo está en rojo.', 'Զգույշ եղիր, լուսացույցը կարմիր է։')],
    options: [
      o('Gracias, espero a que esté en verde.', 'Շնորհակալություն, կսպասեմ, որ կանաչ լինի։', true, ['Muy bien. La seguridad es lo primero.', 'Շատ լավ։ Անվտանգությունն ամենակարևորն է։']),
      o('Cruzo ahora mismo.', 'Հենց հիմա անցնում եմ։', false, ['¡No! Es peligroso. Espera el verde.', 'Ո՛չ։ Վտանգավոր է։ Սպասիր կանաչին։']),
    ],
  },
  {
    lvl: 'A1', cat: 'futbol',
    lines: [l('¡Eh, Razmik! ¿Te apetece jugar conmigo en el parque?', 'Հեյ, Ռազմիկ։ Ուզո՞ւմ ես ինձ հետ խաղալ այգում։')],
    options: [
      o('¡Sí! Después del entrenamiento.', 'Այո։ Մարզումից հետո։', true, ['¡Perfecto! Te espero allí.', 'Կատարյալ է։ Քեզ այնտեղ կսպասեմ։']),
      o('Hoy no puedo, lo siento.', 'Այսօր չեմ կարող, ներիր։', true, ['No pasa nada. ¡Otro día!', 'Ոչինչ։ Մեկ այլ օր։']),
      o('Es azul.', 'Կապույտ է։', false),
    ],
  },
  {
    lvl: 'A1', cat: 'ciudad',
    lines: [l('Hola. ¿Dónde está el supermercado?', 'Բարև։ Որտե՞ղ է սուպերմարկետը։')],
    options: [
      o('Está al lado de la escuela.', 'Դպրոցի կողքին է։', true, ['¡Ah, gracias! Ya lo veo.', 'Ա՜, շնորհակալություն։ Արդեն տեսնում եմ։']),
      o('Son las tres.', 'Ժամը երեքն է։', false, ['No te he preguntado la hora…', 'Ես ժամը չեմ հարցրել…']),
    ],
  },
  {
    lvl: 'A1', cat: 'saludos',
    lines: [l('¡Qué camiseta tan bonita! ¿Cuál es tu número?', 'Ինչ գեղեցիկ մարզաշապիկ է։ Ո՞րն է քո համարը։')],
    options: [
      o('Mi número es el siete.', 'Իմ համարը յոթն է։', true, ['¡El siete! El número de los cracks.', 'Յոթ։ Աստղերի համարը։']),
      o('Es naranja.', 'Նարնջագույն է։', false, ['Sí, es naranja, pero te pregunto el número.', 'Այո, նարնջագույն է, բայց ես համարն եմ հարցնում։']),
    ],
  },
  // ------------------------------------------------ A2
  {
    lvl: 'A2', cat: 'tiempo',
    lines: [l('¿Por qué llegas tarde? El entrenamiento ha empezado hace diez minutos.', 'Ինչո՞ւ ես ուշանում։ Մարզումը տասը րոպե առաջ է սկսվել։')],
    options: [
      o('Perdón, he perdido el autobús.', 'Ներողություն, ավտոբուսից ուշացա։', true, ['Vale, pero la próxima vez sal antes de casa.', 'Լավ, բայց հաջորդ անգամ տնից ավելի շուտ դուրս արի։']),
      o('Lo siento, había mucho tráfico.', 'Ներողություն, շատ խցանում կար։', true, ['Entendido. Cámbiate rápido.', 'Հասկացա։ Արագ փոխվիր։']),
      o('Porque me gusta el fútbol.', 'Որովհետև ֆուտբոլ եմ սիրում։', false),
    ],
  },
  {
    lvl: 'A2', cat: 'planes',
    lines: [l('¿Qué vas a hacer después del partido?', 'Ի՞նչ ես անելու խաղից հետո։')],
    options: [
      o('Voy a cenar con mi familia.', 'Ընտանիքիս հետ ընթրելու եմ։', true, ['¡Qué bien! Que aproveche.', 'Ինչ լավ է։ Բարի ախորժակ։']),
      o('Voy a descansar y hacer los deberes.', 'Հանգստանալու եմ և տնային աշխատանքս անեմ։', true, ['Muy responsable. ¡Bien hecho!', 'Շատ պատասխանատու։ Ապրես։']),
      o('Ayer jugué al tenis.', 'Երեկ թենիս խաղացի։', false, ['Eso fue ayer. Te pregunto por el futuro.', 'Դա երեկ էր։ Ես ապագայի մասին եմ հարցնում։']),
    ],
  },
  {
    lvl: 'A2', cat: 'futbol',
    lines: [l('¿Cuánto tiempo llevas entrenando?', 'Որքա՞ն ժամանակ է, ինչ մարզվում ես։')],
    options: [
      o('Llevo cinco años entrenando.', 'Հինգ տարի է, ինչ մարզվում եմ։', true, ['¡Cinco años! Por eso juegas tan bien.', 'Հինգ տարի։ Դրա համար էլ այդքան լավ ես խաղում։']),
      o('Entreno tres veces por semana.', 'Շաբաթը երեք անգամ եմ մարզվում։', true, ['Ah, y ¿desde cuándo? ¡Seguro que desde pequeño!', 'Ա՜, իսկ որտեղի՞ց։ Վստահ եմ՝ փոքրուց։']),
      o('Mañana a las seis.', 'Վաղը ժամը վեցին։', false),
    ],
  },
  {
    lvl: 'A2', cat: 'ciudad',
    lines: [l('Disculpa, estoy perdido. ¿Cómo llego a la plaza?', 'Ներողություն, մոլորվել եմ։ Ինչպե՞ս հասնեմ հրապարակ։')],
    options: [
      o('Sigue recto y gira a la izquierda en el cruce.', 'Ուղիղ գնա և խաչմերուկում թեքվիր ձախ։', true, ['Recto y a la izquierda. ¡Gracias!', 'Ուղիղ և ձախ։ Շնորհակալություն։']),
      o('La plaza es muy bonita.', 'Հրապարակը շատ գեղեցիկ է։', false, ['Ya, pero ¿cómo llego?', 'Հա, բայց ինչպե՞ս հասնեմ։']),
    ],
  },
  {
    lvl: 'A2', cat: 'rutina',
    lines: [l('¿Qué has hecho hoy?', 'Ի՞նչ ես արել այսօր։')],
    options: [
      o('He ido al colegio y he entrenado.', 'Դպրոց եմ գնացել և մարզվել եմ։', true, ['¡Un día completo!', 'Լեցուն օր։']),
      o('He desayunado y he jugado al fútbol.', 'Նախաճաշել եմ և ֆուտբոլ եմ խաղացել։', true, ['¡Perfecto para un deportista!', 'Կատարյալ է մարզիկի համար։']),
      o('Voy a jugar mañana.', 'Վաղը խաղալու եմ։', false),
    ],
    free: { accept: [['he', 'fui', 'jugue', 'estudie', 'entrene', 'comi']], model: l('Hoy he ido al colegio y después he entrenado.', 'Այսօր դպրոց եմ գնացել, հետո մարզվել եմ։'), minWords: 3 },
  },
  {
    lvl: 'A2', cat: 'ayuda',
    lines: [l('¡Razmik! Se me ha caído la bolsa. ¿Me ayudas a recoger las naranjas?', 'Ռազմիկ։ Տոպրակս ընկավ։ Կօգնե՞ս նարինջները հավաքել։')],
    options: [
      o('¡Claro! Aquí tiene.', 'Իհարկե։ Ահա, վերցրեք։', true, ['¡Qué chico tan amable! Muchas gracias.', 'Ինչ բարի տղա է։ Շատ շնորհակալություն։']),
      o('No, no tengo tiempo.', 'Ոչ, ժամանակ չունեմ։', false, ['Vaya… Bueno, no pasa nada.', 'Վա՜յ… Լավ, ոչինչ։']),
    ],
  },
  {
    lvl: 'A2', cat: 'tiempo',
    lines: [l('Oye, ¿qué hora es? Mi móvil no tiene batería.', 'Լսիր, ժամը քանի՞սն է։ Հեռախոսս լիցք չունի։')],
    options: [
      o('Son las cinco y media.', 'Հինգն անց կես է։', true, ['¡Uy! Llego tarde. ¡Gracias!', 'Վա՜յ։ Ուշանում եմ։ Շնորհակալություն։']),
      o('Hace mucho calor.', 'Շատ շոգ է։', false),
    ],
  },
  // ------------------------------------------------ B1
  {
    lvl: 'B1', cat: 'emociones',
    lines: [l('Te veo un poco serio. ¿Qué haces cuando pierdes un partido?', 'Քեզ մի քիչ լուրջ եմ տեսնում։ Ի՞նչ ես անում, երբ խաղը պարտվում ես։')],
    options: [
      o('Analizo mis errores y sigo entrenando.', 'Վերլուծում եմ սխալներս և շարունակում եմ մարզվել։', true, ['Esa es la mentalidad de un campeón.', 'Սա չեմպիոնի մտածելակերպ է։']),
      o('Hablo con mis compañeros y nos animamos.', 'Խոսում եմ թիմակիցներիս հետ, և իրար ոգևորում ենք։', true, ['El equipo siempre es lo más importante.', 'Թիմը միշտ ամենակարևորն է։']),
      o('Mañana voy a comprar pan.', 'Վաղը հաց եմ գնելու։', false),
    ],
    free: { accept: [['entreno', 'entrenar', 'sigo', 'aprendo', 'hablo', 'pienso', 'analizo', 'descanso', 'mejoro', 'intento', 'animo', 'trabajo']], model: l('Cuando pierdo, pienso en mis errores y entreno más.', 'Երբ պարտվում եմ, մտածում եմ սխալներիս մասին և ավելի շատ եմ մարզվում։'), minWords: 3 },
  },
  {
    lvl: 'B1', cat: 'hipotesis',
    lines: [l('Si pudieras jugar en cualquier equipo del mundo, ¿dónde jugarías?', 'Եթե կարողանայիր խաղալ աշխարհի ցանկացած թիմում, որտե՞ղ կխաղայիր։')],
    options: [
      o('Jugaría en un gran equipo de España.', 'Կխաղայի Իսպանիայի մեծ թիմերից մեկում։', true, ['¡Buen sueño! Trabaja duro y lo conseguirás.', 'Լավ երազանք է։ Աշխատիր, և կհասնես։']),
      o('Jugaría en la selección de mi país.', 'Կխաղայի իմ երկրի հավաքականում։', true, ['¡Qué orgullo sería para tu familia!', 'Ինչ հպարտություն կլիներ ընտանիքիդ համար։']),
      o('Juego cada día.', 'Ամեն օր խաղում եմ։', false, ['Te pregunto qué harías, no qué haces.', 'Ես հարցնում եմ, թե ինչ կանեիր, ոչ թե ինչ ես անում։']),
    ],
  },
  {
    lvl: 'B1', cat: 'ciudad',
    lines: [l('Llevo media hora esperando el autobús y no viene. ¿Sabes si pasa por aquí?', 'Կես ժամ է՝ ավտոբուսին եմ սպասում, ու չի գալիս։ Գիտե՞ս՝ այստեղով անցնում է։')],
    options: [
      o('Creo que la parada está enfrente de la escuela.', 'Կարծում եմ՝ կանգառը դպրոցի դիմաց է։', true, ['¡Ah! Estaba esperando en el sitio equivocado.', 'Ա՜։ Սխալ տեղում էի սպասում։']),
      o('No estoy seguro, pero puede preguntar al conductor.', 'Վստահ չեմ, բայց կարող եք վարորդին հարցնել։', true, ['Buena idea, gracias.', 'Լավ գաղափար է, շնորհակալություն։']),
      o('Me encanta el autobús rojo.', 'Ինձ շատ է դուր գալիս կարմիր ավտոբուսը։', false),
    ],
  },
  {
    lvl: 'B1', cat: 'futbol',
    lines: [l('Soy periodista del diario local. ¿Cómo ayudas a tus compañeros durante un partido?', 'Ես տեղական թերթի լրագրող եմ։ Ինչպե՞ս ես օգնում թիմակիցներիդ խաղի ժամանակ։')],
    options: [
      o('Les doy pases y los animo cuando fallan.', 'Փոխանցումներ եմ տալիս և ոգևորում, երբ սխալվում են։', true, ['Un verdadero jugador de equipo.', 'Իսկական թիմային խաղացող։']),
      o('Corro mucho y defiendo cuando hace falta.', 'Շատ եմ վազում և պաշտպանվում եմ, երբ պետք է։', true, ['Eso es compromiso. ¡Gracias por la entrevista!', 'Սա նվիրվածություն է։ Շնորհակալություն հարցազրույցի համար։']),
      o('Ayer llovió mucho.', 'Երեկ շատ անձրև եկավ։', false),
    ],
    free: { accept: [['pase', 'pases', 'animo', 'ayudo', 'corro', 'defiendo', 'hablo', 'apoyo', 'paso']], model: l('Les paso el balón y los animo siempre.', 'Գնդակը փոխանցում եմ նրանց և միշտ ոգևորում եմ։'), minWords: 3 },
  },
  {
    lvl: 'B1', cat: 'planes',
    lines: [l('Estoy organizando un torneo benéfico el sábado. ¿Te gustaría participar?', 'Շաբաթ օրը բարեգործական մրցաշար եմ կազմակերպում։ Կուզե՞ս մասնակցել։')],
    options: [
      o('Me encantaría. ¿A qué hora empieza?', 'Շատ կուզեի։ Ժամը քանիսի՞ն է սկսվում։', true, ['A las diez en el estadio. ¡Te apunto!', 'Ժամը տասին մարզադաշտում։ Քեզ գրանցում եմ։']),
      o('Lo siento, ese día tengo un partido.', 'Ներեցեք, այդ օրը խաղ ունեմ։', true, ['¡Qué pena! Quizás el próximo.', 'Ափսոս։ Գուցե հաջորդը։']),
      o('Estoy entrenando ahora.', 'Հիմա մարզվում եմ։', false),
    ],
  },
];

export const COACH_CALLS: T[] = [
  l('Razmik, soy el entrenador. Hoy entrenamos a las seis. ¡No llegues tarde!', 'Ռազմիկ, մարզիչն եմ։ Այսօր մարզվում ենք ժամը վեցին։ Չուշանաս։'),
  l('¡Razmik! Pasa por la tienda deportiva, tienen botas nuevas.', 'Ռազմիկ։ Մտիր սպորտային խանութ, նոր բութսեր ունեն։'),
  l('Hay un reto nuevo en la Plaza de Competiciones. ¿Te atreves?', 'Մրցումների հրապարակում նոր մարտահրավեր կա։ Համարձակվո՞ւմ ես։'),
  l('Recuerda: antes de cruzar, mira el semáforo.', 'Հիշիր՝ անցնելուց առաջ նայիր լուսացույցին։'),
  l('Tus amigos te esperan en el parque para la gran carrera.', 'Ընկերներդ քեզ այգում են սպասում մեծ մրցավազքի համար։'),
];
