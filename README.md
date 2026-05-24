# Cronolog

Registra y organiza todo lo que consumes año a año: películas, libros, series, juegos, música, anime, manga, cómics, viajes y eventos.

**[cronolog.vercel.app](https://cronolog.vercel.app/)**

## Stack

- **Vue 3.5** + TypeScript + Composition API
- **Vite 6** + vite-plugin-pwa
- **Pinia 3** con persistencia local + sincronización Firebase
- **Firebase** (Auth + Firestore + reglas de seguridad)
- **Tailwind CSS v4**
- **Vitest** + Vue Test Utils
- **ExcelJS** para exportación/importación Excel

## Setup

```bash
git clone https://github.com/ddedorado/cronolog.git
cd cronolog
npm install
cp .env.example .env   # configura las variables VITE_FIREBASE_*
npm run dev
```

## Scripts

| Comando             | Descripción       |
| ------------------- | ----------------- |
| `npm run dev`       | Dev server (Vite) |
| `npm run build`     | Build producción  |
| `npm run preview`   | Preview del build |
| `npm run test`      | Tests (Vitest)    |
| `npm run test:run`  | Tests en modo CI  |

## Funcionalidades

- **Cronolog por año** — Añade años y organiza tu consumo cronológicamente
- **10 categorías** — Películas, Libros, Series TV, Juegos, Música, Anime, Manga, Cómics, Viajes, Eventos
- **Enriquecimiento automático** — Busca portadas y datos desde TMDB, Google Books, RAWG, MusicBrainz, Jikan, ComicVine
- **Vistas** — Grid, compacta, tabla, estadísticas y timeline
- **Búsqueda spotlight** — `Cmd+K` para buscar en toda tu colección
- **Atajos de teclado** — N (nuevo), F (buscar), S (ajustes), 1-9 (categorías), ? (ayuda)
- **Import/Export** — JSON, CSV y Excel (.xlsx) con selección de años
- **Importar desde** — Letterboxd, Goodreads, MyAnimeList
- **PWA** — Instalable, funciona offline
- **Sincronización cloud** — Firestore con reglas por usuario
- **Tema claro/oscuro** + color de acento personalizable
- **Mobile-first** — Swipe actions, pull-to-refresh, FAB, bottom sheets

## Modelo de datos (Import/Export)

Para importar datos en formato **CSV** o **Excel (.xlsx)**, usa estas columnas como cabecera:

| Columna        | Tipo     | Requerido | Descripción                               |
| -------------- | -------- | --------- | ----------------------------------------- |
| `title`        | texto    | ✅        | Título del item                           |
| `category`     | texto    | ✅        | Nombre de la categoría (ej: Películas)    |
| `year`         | número   | ✅        | Año del cronolog (ej: 2026)               |
| `rating`       | número   |           | Puntuación de 0 a 5 (admite decimales)    |
| `releaseYear`  | número   |           | Año de estreno/publicación original       |
| `consumedDate` | texto    |           | Fecha de consumo (YYYY-MM-DD)             |
| `status`       | texto    |           | `completed` \| `in-progress` \| `backlog` |
| `favorite`     | booleano |           | `true` / `false`                          |
| `notes`        | texto    |           | Notas personales                          |
| `tags`         | texto    |           | Etiquetas separadas por coma              |
| `imageUrl`     | texto    |           | URL de la imagen/portada                  |

### Formatos

- **JSON** — Exporta/importa el backup completo (categorías + items + años). Compatible con re-importación directa.
- **CSV** — Tabla plana con las columnas anteriores. Compatible con Google Sheets, Excel, Numbers.
- **XLSX** — Igual que CSV pero en formato Excel nativo con anchos de columna optimizados.

### Ejemplo CSV

```csv
title,category,year,rating,releaseYear,consumedDate,status,favorite,notes,tags,imageUrl
Dune: Part Two,Películas,2026,5,2024,2026-01-15,completed,true,Obra maestra,"sci-fi, denis villeneuve",
El Quijote,Libros,2026,4,1605,,completed,false,Clásico imprescindible,clásico,
```

## Licencia

MIT
