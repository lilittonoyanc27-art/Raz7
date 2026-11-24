# RAZMIK 7 — MISIÓN CAMPEÓN

Juego 3D de aventura para aprender español (con traducción al armenio), hecho para Razmik, 12 años, número 7.

**Stack:** React 18 + TypeScript + Vite + Three.js + React Three Fiber + Zustand. Todo el contenido 3D (personajes, coches, edificios, estadio…) se genera por código: no hay modelos ni recursos externos que puedan fallar al cargar.

## Arrancar

```bash
npm install
npm run dev      # desarrollo
npm run build    # producción en dist/
```

Se puede publicar tal cual en **Vercel** (`vercel.json`) o **Netlify** (`netlify.toml`).

## Controles

| Acción | Ordenador | Móvil / tableta |
|---|---|---|
| Moverse | WASD / flechas | Joystick izquierdo |
| Correr | Shift | Botón «Correr» (o joystick al máximo) |
| Saltar | Espacio | Botón «Saltar» |
| Hablar / usar | E | Botón «Acción» |
| Chutar | F | Botón del balón |
| Cámara | Arrastrar con el ratón, rueda = zoom | Arrastrar con el dedo, pellizcar = zoom |

Cualquier texto en español con subrayado punteado se puede tocar para ver la traducción al armenio, escucharlo o escucharlo más despacio.

## Contenido

- **Ciudad de Campeones** (mundo abierto): casa, escuela, supermercado, restaurante, tienda deportiva, plaza de competiciones, centro de entrenamiento, parque, estadio, aeropuerto y zona secreta. Tráfico con semáforos, pasos de peatones, autobuses, peatones que te hablan, llamadas del entrenador, minimapa y navegador.
- **Misión: Llegar al estadio**: rutas aleatorias (a pie o en autobús), comprobación de cruces seguros, autobuses equivocados, paradas, retrasos.
- **Desafío del entrenador**: órdenes habladas con balón con física, conos, vallas, portero, compañero, defensas. Modos entrenamiento, contrarreloj y competición.
- **La gran carrera**: 6 pistas con puentes, estrellas, llaves, plataformas móviles, trampolín y túneles.
- **Detective Razmik**: 5 casos en un club de dos pisos.
- **La ruleta de las palabras**, **Memory Champions** (7 modos), **El laberinto secreto**, **Supervivencia lingüística**.
- **Simuladores**: tienda deportiva (con compras reales de equipamiento), supermercado, restaurante, aeropuerto y autobús del equipo.
- **Batalla de conocimientos** (torneo), **Habla como un campeón** (elegir, escribir o hablar), **Reto de trabalenguas** (32).
- Progreso: XP, niveles, monedas, copas, medallas, récords, retos diarios, niveles A1/A2/B1 con ajuste automático, modo profesor vs. alumno e informe descargable para el profesor.

## Voz

- Voz: Web Speech API (`speechSynthesis`), prefiere voces `es-ES`.
- Micrófono: `SpeechRecognition` (Chrome, Edge, Safari). Si no está disponible, se responde por escrito y los trabalenguas solo miden el tiempo (no se inventan notas).

## Publicar

**Vercel:** sube la carpeta a un repositorio de GitHub → en vercel.com «Add New Project» → importa el repositorio. Framework: Vite (se detecta solo; `vercel.json` ya incluido). Build: `npm run build`, salida: `dist`.

**Netlify:** «Add new site» → importa el repositorio (`netlify.toml` incluido) o arrastra la carpeta `dist/` tras `npm run build`.

**GitHub:**
```bash
git init && git add -A && git commit -m "RAZMIK 7"
git remote add origin https://github.com/USUARIO/REPO.git
git push -u origin main
```

Requisitos: Node.js 18 o superior.

## Nota sobre gráficos

Todos los personajes, vehículos, edificios, texturas e ilustraciones se generan por código (Three.js + canvas + SVG), por eso el proyecto no contiene archivos de modelos 3D ni imágenes aparte: no hay nada que pueda fallar al cargar.
