import type { Look } from '../three/Humanoid';

export interface Character { id: string; name: string; role: string; roleHy: string; look: Look; pitch: number }

const L = (p: Partial<Look>): Look => ({
  skin: '#e0ac85', hair: '#2a1b12', hairStyle: 'short', top: '#2e6fd8', topStyle: 'shirt', bottom: '#2b3a55', bottomStyle: 'pants', shoes: '#1d1d1d', height: 1.78, build: 1, ...p,
});

export const CHARACTERS: Record<string, Character> = {
  coach: { id: 'coach', name: 'Óscar', role: 'Entrenador', roleHy: 'Մարզիչ', pitch: 0.8, look: L({ top: '#1b2233', topStyle: 'jacket', bottom: '#1b2233', hairStyle: 'cap', capColor: '#ff7a1a', skin: '#c98e64', height: 1.82, build: 1.1, shoes: '#f2f2f2' }) },
  vecina: { id: 'vecina', name: 'Carmen', role: 'Vecina', roleHy: 'Հարևանուհի', pitch: 1.2, look: L({ hair: '#8a8a8a', hairStyle: 'bun', top: '#e67ea8', topStyle: 'dress', bottom: '#e67ea8', skin: '#f1c9a5', height: 1.62, shoes: '#7a4b2a' }) },
  profesor: { id: 'profesor', name: 'Martín', role: 'Profesor', roleHy: 'Ուսուցիչ', pitch: 0.9, look: L({ top: '#7d5a3c', topStyle: 'jacket', hair: '#3a2416', hairStyle: 'short', height: 1.8, bottom: '#56657a' }) },
  vendedor: { id: 'vendedor', name: 'Toni', role: 'Vendedor', roleHy: 'Վաճառող', pitch: 1.0, look: L({ top: '#2e6fd8', topStyle: 'shirt', hairStyle: 'curly', hair: '#1d140e', skin: '#a86b45', height: 1.76 }) },
  leo: { id: 'leo', name: 'Leo', role: 'Amigo', roleHy: 'Ընկեր', pitch: 1.25, look: L({ top: '#27ae60', topStyle: 'hoodie', bottom: '#1d1d1d', bottomStyle: 'shorts', hairStyle: 'curly', hair: '#6b4423', height: 1.52, shoes: '#f2f2f2', skin: '#f1c9a5' }) },
  sofia: { id: 'sofia', name: 'Sofía', role: 'Compañera de clase', roleHy: 'Դասընկերուհի', pitch: 1.35, look: L({ top: '#9b51e0', topStyle: 'hoodie', hairStyle: 'pony', hair: '#1d140e', height: 1.5, bottom: '#3f5f8a', skin: '#e0ac85' }) },
  periodista: { id: 'periodista', name: 'Ana', role: 'Periodista', roleHy: 'Լրագրող', pitch: 1.15, look: L({ top: '#e14b4b', topStyle: 'jacket', hairStyle: 'long', hair: '#a8743a', height: 1.68, bottom: '#1d1d1d', skin: '#f5d3b8' }) },
  arbitro: { id: 'arbitro', name: 'Ramón', role: 'Árbitro', roleHy: 'Մրցավար', pitch: 0.85, look: L({ top: '#111111', topStyle: 'shirt', bottom: '#111111', bottomStyle: 'shorts', hairStyle: 'bald', height: 1.8, shoes: '#111' }) },
  conductor: { id: 'conductor', name: 'Paco', role: 'Conductor', roleHy: 'Վարորդ', pitch: 0.8, look: L({ top: '#3c4a5c', topStyle: 'shirt', hairStyle: 'cap', capColor: '#3c4a5c', height: 1.75, build: 1.15 }) },
  camarera: { id: 'camarera', name: 'Lucía', role: 'Camarera', roleHy: 'Մատուցողուհի', pitch: 1.2, look: L({ top: '#ffffff', topStyle: 'shirt', bottom: '#1d1d1d', hairStyle: 'bun', hair: '#3a2416', height: 1.66, skin: '#c98e64' }) },
  cajera: { id: 'cajera', name: 'Elena', role: 'Cajera', roleHy: 'Գանձապահ', pitch: 1.15, look: L({ top: '#27ae60', topStyle: 'shirt', hairStyle: 'pony', hair: '#d9b46a', height: 1.64, skin: '#f1c9a5' }) },
  azafata: { id: 'azafata', name: 'Irene', role: 'Empleada del aeropuerto', roleHy: 'Օդանավակայանի աշխատակցուհի', pitch: 1.2, look: L({ top: '#1d3557', topStyle: 'jacket', bottom: '#1d3557', hairStyle: 'bun', hair: '#1d140e', height: 1.7 }) },
  guardia: { id: 'guardia', name: 'Sergio', role: 'Seguridad', roleHy: 'Անվտանգության աշխատակից', pitch: 0.85, look: L({ top: '#2b2f36', topStyle: 'jacket', bottom: '#2b2f36', hairStyle: 'short', height: 1.85, build: 1.15, skin: '#7b4a2e' }) },
  portero: { id: 'portero', name: 'Hugo', role: 'Portero del equipo', roleHy: 'Թիմի դարպասապահ', pitch: 1.2, look: L({ top: '#39d353', topStyle: 'shirt', bottom: '#1d1d1d', bottomStyle: 'shorts', hairStyle: 'short', height: 1.58, shoes: '#f2f2f2', skin: '#c98e64', socks: '#39d353' }) },
  companero: { id: 'companero', name: 'Dani', role: 'Compañero de equipo', roleHy: 'Թիմակից', pitch: 1.25, look: L({ top: '#ff7a1a', topStyle: 'jersey', jerseyName: 'DANI', jerseyNum: '10', bottom: '#ff7a1a', bottomStyle: 'shorts', hairStyle: 'curly', hair: '#1d140e', height: 1.55, socks: '#ff7a1a', skin: '#a86b45' }) },
  presentador: { id: 'presentador', name: 'Javier', role: 'Presentador', roleHy: 'Հաղորդավար', pitch: 0.95, look: L({ top: '#6c3fd1', topStyle: 'jacket', hairStyle: 'short', hair: '#222', height: 1.8 }) },
  abuelo: { id: 'abuelo', name: 'Don Andrés', role: 'Guardián de la isla', roleHy: 'Կղզու պահապան', pitch: 0.75, look: L({ top: '#c2b59b', topStyle: 'shirt', hairStyle: 'bald', hair: '#ddd', bottom: '#6b4f3a', height: 1.7, skin: '#c98e64' }) },
};
