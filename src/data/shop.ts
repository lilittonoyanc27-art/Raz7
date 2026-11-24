export interface ShopItem { id: string; es: string; hy: string; price: number; color: string; color2?: string; minLevel?: number }

export const BOOTS: ShopItem[] = [
  { id: 'negras', es: 'Botas negras clásicas', hy: 'Դասական սև բութսեր', price: 0, color: '#151515' },
  { id: 'blancas', es: 'Botas blancas relámpago', hy: 'Սպիտակ «կայծակ» բութսեր', price: 60, color: '#f4f4f4' },
  { id: 'naranjas', es: 'Botas naranjas de campeón', hy: 'Չեմպիոնի նարնջագույն բութսեր', price: 90, color: '#ff7a1a' },
  { id: 'azules', es: 'Botas azules turbo', hy: 'Կապույտ «տուրբո» բութսեր', price: 120, color: '#2e6fd8' },
  { id: 'doradas', es: 'Botas doradas de leyenda', hy: 'Լեգենդի ոսկեգույն բութսեր', price: 300, color: '#e8b931', minLevel: 4 },
  { id: 'verdes', es: 'Botas verdes neón', hy: 'Կանաչ նեոնային բութսեր', price: 150, color: '#39d353' },
];
export const BALLS: ShopItem[] = [
  { id: 'clasico', es: 'Balón clásico', hy: 'Դասական գնդակ', price: 0, color: '#ffffff', color2: '#1b2233' },
  { id: 'naranja', es: 'Balón naranja 7', hy: 'Նարնջագույն գնդակ 7', price: 50, color: '#ff7a1a', color2: '#ffffff' },
  { id: 'estrella', es: 'Balón estrella', hy: 'Աստղային գնդակ', price: 80, color: '#ffd34d', color2: '#1b2233' },
  { id: 'nocturno', es: 'Balón nocturno', hy: 'Գիշերային գնդակ', price: 110, color: '#1b2233', color2: '#56ccf2' },
  { id: 'fuego', es: 'Balón de fuego', hy: 'Կրակե գնդակ', price: 160, color: '#e14b4b', color2: '#ffd34d' },
  { id: 'galaxia', es: 'Balón galaxia', hy: 'Գալակտիկա գնդակ', price: 250, color: '#6c3fd1', color2: '#f2f2f2', minLevel: 3 },
];
export const ACCESSORIES: ShopItem[] = [
  { id: 'ninguno', es: 'Sin accesorio', hy: 'Առանց աքսեսուարի', price: 0, color: '#888' },
  { id: 'muñequera', es: 'Muñequera naranja', hy: 'Նարնջագույն դաստակակալ', price: 40, color: '#ff7a1a' },
  { id: 'brazalete', es: 'Brazalete de capitán', hy: 'Ավագի թևկապ', price: 200, color: '#ffd34d', minLevel: 3 },
];
