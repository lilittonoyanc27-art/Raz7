// Spanish word -> Armenian. Keys are lowercase without accents.
const G: Record<string, string> = {
  hola: 'բարև', adios: 'ցտեսություն', gracias: 'շնորհակալություն', 'por favor': 'խնդրում եմ', si: 'այո', no: 'ոչ',
  razmik: 'Ռազմիկ', entrenador: 'մարզիչ', entrenadora: 'մարզչուհի', entrenamiento: 'մարզում', partido: 'խաղ', equipo: 'թիմ',
  balon: 'գնդակ', pelota: 'գնդակ', gol: 'գոլ', goles: 'գոլեր', porteria: 'դարպաս', portero: 'դարպասապահ', arbitro: 'մրցավար',
  silbato: 'սուլիչ', estadio: 'մարզադաշտ', campo: 'դաշտ', jugador: 'խաղացող', jugadores: 'խաղացողներ', companero: 'ընկեր, թիմակից',
  cono: 'կոն', amarillo: 'դեղին', azul: 'կապույտ', rojo: 'կարմիր', roja: 'կարմիր', verde: 'կանաչ', naranja: 'նարնջագույն',
  blanco: 'սպիտակ', negro: 'սև', negras: 'սև', gris: 'մոխրագույն', dorado: 'ոսկեգույն', morado: 'մանուշակագույն',
  calle: 'փողոց', cruce: 'խաչմերուկ', semaforo: 'լուսացույց', paso: 'անցում', peatones: 'հետիոտներ', parada: 'կանգառ',
  autobus: 'ավտոբուս', coche: 'մեքենա', parque: 'այգի', escuela: 'դպրոց', casa: 'տուն', tienda: 'խանութ', supermercado: 'սուպերմարկետ',
  restaurante: 'ռեստորան', aeropuerto: 'օդանավակայան', plaza: 'հրապարակ', ciudad: 'քաղաք', puente: 'կամուրջ', tunel: 'թունել',
  derecha: 'աջ', izquierda: 'ձախ', recto: 'ուղիղ', sigue: 'շարունակիր', gira: 'թեքվիր', cruza: 'անցիր', espera: 'սպասիր',
  corre: 'վազիր', salta: 'ցատկիր', tira: 'հարվածիր', pasa: 'փոխանցիր', recoge: 'հավաքիր', busca: 'փնտրիր', abre: 'բացիր',
  cierra: 'փակիր', mira: 'նայիր', escucha: 'լսիր', habla: 'խոսիր', ven: 'արի', ve: 'գնա', toma: 'վերցրու', baja: 'իջիր',
  sube: 'բարձրացիր', para: 'կանգնիր', cuidado: 'զգույշ', rapido: 'արագ', despacio: 'դանդաղ', pronto: 'շուտով',
  tarde: 'ուշ', temprano: 'վաղ', hoy: 'այսօր', manana: 'վաղը', ayer: 'երեկ', ahora: 'հիմա', despues: 'հետո', antes: 'առաջ',
  delante: 'առջևում', detras: 'հետևում', debajo: 'տակ', encima: 'վրա', entre: 'միջև', enfrente: 'դիմացը', 'al lado': 'կողքին',
  cerca: 'մոտ', lejos: 'հեռու', dentro: 'ներսում', fuera: 'դրսում', arriba: 'վերևում', abajo: 'ներքևում',
  llave: 'բանալի', puerta: 'դուռ', caja: 'արկղ', cajas: 'արկղեր', mesa: 'սեղան', silla: 'աթոռ', estatua: 'արձան', mapa: 'քարտեզ',
  agua: 'ջուր', comida: 'ուտելիք', fruta: 'միրգ', pan: 'հաց', leche: 'կաթ', huevos: 'ձու', manzana: 'խնձոր', manzanas: 'խնձորներ',
  platano: 'բանան', platanos: 'բանաններ', queso: 'պանիր', pollo: 'հավ', pescado: 'ձուկ', arroz: 'բրինձ', ensalada: 'աղցան',
  zumo: 'հյութ', menu: 'ճաշացանկ', cuenta: 'հաշիվ', camarero: 'մատուցող', mesa_: 'սեղան', postre: 'աղանդեր', sopa: 'ապուր',
  billete: 'տոմս', pasaporte: 'անձնագիր', maleta: 'ճամպրուկ', vuelo: 'թռիչք', puerta_: 'դարպաս', embarque: 'նստեցում',
  avion: 'ինքնաթիռ', mostrador: 'վաճառասեղան', control: 'ստուգում', seguridad: 'անվտանգություն',
  botas: 'բութսեր', camiseta: 'մարզաշապիկ', pantalon: 'շալվար', calcetines: 'գուլպաներ', talla: 'չափս', precio: 'գին',
  cuesta: 'արժե', cuanto: 'որքա՞ն', euros: 'եվրո', dinero: 'փող', pagar: 'վճարել', tarjeta: 'քարտ',
  trofeo: 'գավաթ', copa: 'գավաթ', vestuario: 'հանդերձարան', pista: 'հուշում', pistas: 'հուշումներ', testigo: 'վկա',
  habitacion: 'սենյակ', piso: 'հարկ', segundo: 'երկրորդ', primero: 'առաջին', tercero: 'երրորդ', escalera: 'աստիճան',
  isla: 'կղզի', refugio: 'ապաստարան', madera: 'փայտ', fuego: 'կրակ', playa: 'լողափ', barco: 'նավակ', codigo: 'կոդ',
  estrella: 'աստղ', estrellas: 'աստղեր', moneda: 'մետաղադրամ', monedas: 'մետաղադրամներ', carrera: 'մրցավազք', meta: 'վերջնագիծ',
  ganar: 'հաղթել', perder: 'պարտվել', jugar: 'խաղալ', correr: 'վազել', saltar: 'ցատկել', entrenar: 'մարզվել', ayudar: 'օգնել',
  ayudarme: 'օգնել ինձ', llegar: 'հասնել', tienes: 'ունես', tengo: 'ունեմ', 'tienes que': 'պետք է', puedes: 'կարո՞ղ ես', puedo: 'կարող եմ',
  quiero: 'ուզում եմ', quieres: 'ուզո՞ւմ ես', voy: 'գնում եմ', vas: 'գնում ես', 'vas a': 'պատրաստվում ես', estoy: 'ես … եմ',
  estas: 'դու … ես', soy: 'ես եմ', eres: 'դու ես', es: 'է', esta: 'գտնվում է / է', hay: 'կա', donde: 'որտե՞ղ', adonde: 'ու՞ր',
  que: 'ի՞նչ / որ', quien: 'ո՞վ', cuando: 'ե՞րբ', como: 'ինչպե՞ս', porque: 'որովհետև', 'por que': 'ինչո՞ւ',
  bien: 'լավ', mal: 'վատ', muy: 'շատ', mucho: 'շատ', poco: 'քիչ', grande: 'մեծ', pequeno: 'փոքր', nuevo: 'նոր',
  cansado: 'հոգնած', contento: 'գոհ', feliz: 'երջանիկ', listo: 'պատրաստ', preparado: 'պատրաստ', amigo: 'ընկեր', amiga: 'ընկերուհի',
  profesor: 'ուսուցիչ', profesora: 'ուսուցչուհի', periodista: 'լրագրող', vendedor: 'վաճառող', vendedora: 'վաճառողուհի',
  conductor: 'վարորդ', medico: 'բժիշկ', perro: 'շուն', gato: 'կատու', caballo: 'ձի', pajaro: 'թռչուն', leon: 'առյուծ',
  dia: 'օր', noche: 'գիշեր', semana: 'շաբաթ', hora: 'ժամ', minutos: 'րոպե', tiempo: 'ժամանակ', sueno: 'երազանք',
  siete: 'յոթ', uno: 'մեկ', dos: 'երկու', tres: 'երեք', cuatro: 'չորս', cinco: 'հինգ', seis: 'վեց', ocho: 'ութ', nueve: 'ինը', diez: 'տասը',
  numero: 'համար', proxima: 'հաջորդ', proximo: 'հաջորդ', ultima: 'վերջին', vez: 'անգամ', otra: 'մեկ այլ', todo: 'ամեն ինչ',
  todavia: 'դեռ', ya: 'արդեն', tambien: 'նաև', siempre: 'միշտ', nunca: 'երբեք', juntos: 'միասին', vamos: 'գնացինք',
  date: 'շտապիր', prisa: 'շտապողականություն', empieza: 'սկսվում է', esperando: 'սպասում է', entrenando: 'մարզվելով',
  hacer: 'անել', haces: 'անում ես', hecho: 'արել', ido: 'անցել', ha: 'է (օժանդակ)', has: 'ես (օժանդակ)', visto: 'տեսել',
  obstaculo: 'խոչընդոտ', regatea: 'դրիբլինգ արա', recupera: 'վերադարձրու', defiende: 'պաշտպանիր', marca: 'խփիր',
  toques: 'դիպչես', hasta: 'մինչև', hacia: 'դեպի', por: 'միջով / համար', con: 'հետ', sin: 'առանց', de: '-ից / -ի', en: 'մեջ / վրա',
  calor: 'շոգ', frio: 'ցուրտ', sol: 'արև', lluvia: 'անձրև', viento: 'քամի', torre: 'աշտարակ', camino: 'ճանապարհ', laberinto: 'լաբիրինթոս',
};

export const GLOSSARY = G;

export function normWord(w: string) {
  return w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ ]/g, '');
}

/** Returns glossary hits (word, translation) for a Spanish sentence */
export function glossFor(sentence: string): [string, string][] {
  const raw = sentence.split(/[\s,.;:¿?¡!«»"()]+/).filter(Boolean);
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const w = normWord(raw[i]).replace('ñ', 'n');
    const two = i < raw.length - 1 ? w + ' ' + normWord(raw[i + 1]).replace('ñ', 'n') : '';
    if (two && G[two] && !seen.has(two)) {
      out.push([raw[i] + ' ' + raw[i + 1], G[two]]);
      seen.add(two);
      continue;
    }
    if (G[w] && !seen.has(w)) {
      out.push([raw[i], G[w]]);
      seen.add(w);
    }
  }
  return out;
}
