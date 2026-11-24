import type { T } from '../core/types';

export interface TW { t: T; diff: 1 | 2 | 3 }
const w = (diff: 1 | 2 | 3, es: string, hy: string): TW => ({ diff, t: { es, hy } });

export const TRABALENGUAS: TW[] = [
  w(1, 'Pablito clavó un clavito. ¿Qué clavito clavó Pablito?', 'Պաբլիտոն մի մեխիկ խփեց։ Ո՞ր մեխիկը խփեց Պաբլիտոն։'),
  w(1, 'Tres tristes tigres tragaban trigo en un trigal.', 'Երեք տխուր վագրեր ցորեն էին կուլ տալիս ցորենի դաշտում։'),
  w(1, 'Mi mamá me mima mucho.', 'Մայրիկս ինձ շատ է փայփայում։'),
  w(1, 'Pepe pecas pica papas con un pico.', 'Պեպե Պեկասը կարտոֆիլ է կտրատում բահով։'),
  w(1, 'Como poco coco como, poco coco compro.', 'Քանի որ քիչ կոկոս եմ ուտում, քիչ կոկոս եմ գնում։'),
  w(1, 'El perro de Rosa y Roque no tiene rabo.', 'Ռոզայի և Ռոկեի շունը պոչ չունի։'),
  w(1, 'Rápido ruedan los carros cargados de azúcar del ferrocarril.', 'Արագ են գլորվում երկաթուղու շաքարով բեռնված սայլերը։'),
  w(1, 'Toto toma té, Tita toma mate.', 'Տոտոն թեյ է խմում, Տիտան՝ մատե։'),
  w(1, 'Una tortuga muy tozuda tomaba té con tostadas.', 'Մի շատ համառ կրիա թեյ էր խմում տոստերով։'),
  w(1, 'Paco Peco, chico rico, insultaba como un loco a su tío Federico.', 'Պակո Պեկոն՝ հարուստ տղան, խենթի պես վիրավորում էր իր Ֆեդերիկո քեռուն։'),
  w(2, 'Erre con erre cigarro, erre con erre barril, rápido corren los carros del ferrocarril.', 'Էռե՝ էռեի հետ՝ սիգար, էռե՝ էռեի հետ՝ տակառ, արագ են վազում երկաթուղու վագոնները։'),
  w(2, 'El cielo está enladrillado, ¿quién lo desenladrillará? El desenladrillador que lo desenladrille buen desenladrillador será.', 'Երկինքը աղյուսապատված է, ո՞վ այն կապաղյուսազերծի։ Այն ապաղյուսազերծողը, որ այն կապաղյուսազերծի, լավ ապաղյուսազերծող կլինի։'),
  w(2, 'Compré pocas copas, pocas copas compré, y como compré pocas copas, pocas copas pagaré.', 'Քիչ բաժակ գնեցի, քիչ բաժակ գնեցի, և քանի որ քիչ բաժակ գնեցի, քիչ բաժակի համար կվճարեմ։'),
  w(2, 'Cuando cuentes cuentos, cuenta cuántos cuentos cuentas.', 'Երբ հեքիաթներ պատմես, հաշվիր, թե քանի հեքիաթ ես պատմում։'),
  w(2, 'Pancha plancha con cuatro planchas. ¿Con cuántas planchas plancha Pancha?', 'Պանչան արդուկում է չորս արդուկով։ Քանի՞ արդուկով է արդուկում Պանչան։'),
  w(2, 'Juan junta juncos junto a la zanja.', 'Խուանը եղեգներ է հավաքում առվի մոտ։'),
  w(2, 'Si el caracol tuviera cara como tiene el caracol, fuera cara, fuera col, fuera caracol con cara.', 'Եթե խխունջը դեմք ունենար, ինչպես ունի խխունջը, կլիներ դեմք, կլիներ կաղամբ, կլիներ դեմքով խխունջ։'),
  w(2, 'Treinta y tres tramos de troncos trozaron tres tristes trozadores de troncos.', 'Երեսուներեք հատված գերան կտրեցին գերան կտրող երեք տխուր փայտահատներ։'),
  w(2, 'Un tigre, dos tigres, tres tigres trigaban en un trigal.', 'Մեկ վագր, երկու վագր, երեք վագր ցորեն էին քաղում ցորենի դաշտում։'),
  w(2, 'Bota la bota, Botín, que la bota bota bien.', 'Նետիր կոշիկը, Բոտին, քանի որ կոշիկը լավ է ցատկոտում։'),
  w(2, 'El portero para, el portero no para; si el portero no para, el portero no es portero.', 'Դարպասապահը կանգնեցնում է, դարպասապահը չի կանգնեցնում․ եթե դարպասապահը չի կանգնեցնում, նա դարպասապահ չէ։'),
  w(3, 'Me han dicho que has dicho un dicho que han dicho que he dicho yo. El que lo ha dicho mintió.', 'Ինձ ասել են, որ դու մի ասացվածք ես ասել, որը ասել են, թե ես եմ ասել։ Ով դա ասել է, ստել է։'),
  w(3, 'Hay chicas chachareras que chacharean con chicos chacharones.', 'Կան շատախոս աղջիկներ, որ շատախոսում են շատախոս տղաների հետ։'),
  w(3, 'Parra tenía una perra, Guerra tenía una parra. La perra de Parra subió a la parra de Guerra.', 'Պառան մի շուն ուներ, Գեռան մի որթատունկ ուներ։ Պառայի շունը բարձրացավ Գեռայի որթատունկի վրա։'),
  w(3, 'Pedro Pérez Pita, pintor portugués, pinta paisajes por poca plata para pasar por París.', 'Պեդրո Պերես Պիտան՝ պորտուգալացի նկարիչը, քիչ փողով բնանկարներ է նկարում, որ Փարիզով անցնի։'),
  w(3, 'El hipopótamo Hipo está con hipo. ¿Quién le quita el hipo al hipopótamo Hipo?', 'Հիպո գետաձին զկռտում է։ Ո՞վ կհանի Հիպո գետաձիու զկռտոցը։'),
  w(3, 'Si yo como como como y tú comes como comes, ¿cómo comes como como si yo como como como?', 'Եթե ես ուտում եմ այնպես, ինչպես ուտում եմ, և դու ուտում ես այնպես, ինչպես ուտում ես, ինչպե՞ս ես ուտում ինձ նման, եթե ես ուտում եմ այնպես, ինչպես ուտում եմ։'),
  w(3, 'Cuando Juan Juárez juega al fútbol, juega con un jugador que juega mejor que Juan Juárez.', 'Երբ Խուան Խուարեսը ֆուտբոլ է խաղում, խաղում է մի խաղացողի հետ, որը Խուան Խուարեսից լավ է խաղում։'),
  w(3, 'Regatea, Razmik, regatea; el que regatea rápido, rápido gana la carrera.', 'Դրիբլինգ արա, Ռազմիկ, դրիբլինգ արա․ ով արագ է դրիբլինգ անում, արագ է հաղթում մրցավազքը։'),
  w(3, 'Se dice que el siete es el número de quien sabe siempre a quién se la pasa.', 'Ասում են, որ յոթը նրա համարն է, ով միշտ գիտի, թե ում փոխանցել գնդակը։'),
  w(3, 'Gallo, galleta, gallina, gallinero; al gallo galán le gusta el gallinero.', 'Աքաղաղ, թխվածքաբլիթ, հավ, հավանոց․ գեղեցիկ աքաղաղը սիրում է հավանոցը։'),
  w(3, 'Busco al vasco bizco brusco, y aunque lo busco no lo hallo; ¿dónde está el vasco bizco brusco?', 'Փնտրում եմ շլդիկ, կոպիտ բասկին, և չնայած փնտրում եմ՝ չեմ գտնում․ որտե՞ղ է շլդիկ, կոպիտ բասկը։'),
];
