# WorkSpace OS — App personal de notas, tareas, proyectos y documentación

App local-first de una sola persona (freelance + universidad + emprendimiento + vida personal), con **4 estilos visuales** intercambiables: **Brutalista**, **Minimalista**, **Creativo** y **Alternativo** — inspirados en los mockups de `stitch_loan_management_dashboard*`.

Stack: Vite + React + TypeScript + Tailwind + Zustand (persistencia en localStorage) + React Router (hash). Sin backend por ahora: la capa de datos está abstraída para conectar Cloudflare Workers + D1 + R2 en la Fase 1 del roadmap (ver `prompt-app-notas-propia.md`).

## Vistas

- **Fichas de detalle (estilo "ficha maestra")** — modal grande (**72% ancho × 86% alto** en web, full screen en móvil, con X/ESC para cerrar) disponible en las 4 secciones, según los mockups `vistas_secciones_web`/`vistas_secciones_movil`:
  - *Emprendimiento* → **Ficha maestra de proyecto** (LeadFlow): propiedades metadata, visión y objetivos, arquitectura hexagonal, matrix de módulos, ADRs y roadmap de lanzamiento.
  - *Universidad* → **Ficha de tarea académica** (Cap. III de tesis): objetivo y alcance, código en Go, benchmarks y checklist de entregables.
  - *Freelance* → **Ficha de cliente/proyecto** (Corp Logística): alcance técnico del hito, ledger financiero de hitos y próximos pasos.
  - *Personal* → **Ficha de recurso/nota de investigación** (Tech Deep Dive): resumen, reflexiones, citas y acciones derivadas.
  - *Documentos* → **Ficha de documento** (ADR-014): contexto, decisión y consecuencias.
  - Cada ficha tiene **mini-tareas tickeables por sección** (añadir/tachar pasos) y una **tabla de avance final** que resume estado (COMPLETA/EN CURSO/PENDIENTE), hechas/total y % por sección, con % global.
  - **Subpáginas anidadas (estilo Notion)**: en cada sección puedes crear subpáginas — documentos extendidos con título, contenido en modo lectura, checklist propio y mapas — para no ahogar la vista principal. Se abren como páginas anidadas reutilizando la misma estética de la ficha.
  - **Mapas visuales**: cada ficha (y cada subpágina) admite mapas de **5 tipos** — *mapa mental*, *diagrama de flujo*, *mapa de dominio*, *mapa conceptual* y *esquema técnico* — con un editor integrado (canvas 1200×600, nodos arrastrables con touch, conexiones SVG con etiquetas, auto-layout por tipo, zoom y desplazamiento). Pensado para flujos de datos, bounded contexts, esquemas de DB y mapas conceptuales (referencia: Excalidraw/Draw.io/Notion).
  - **Crear ficha desde el contexto**: en el detalle de cualquier tarea, proyecto, cliente o documento sin ficha, el botón **"Crear ficha"** genera una ficha nueva (secciones Detalle + Checklist) y la abre al instante.
- **Inicio** — dashboard: resumen de la mañana (pendientes de ayer, hechas esta semana vs. la anterior, foco), hubs por área con datos reales, foco de la semana (top 3 prioridades reales), ritmo de entrega por área, tareas de hoy, proyectos activos con portada de color, agenda semanal, **nota del día** (daily note estilo Obsidian) y **scratchpad con lenguaje natural** (mañana · 14:00 · p1 · #etiqueta → se convierte en tarea estructurada).
- **Tareas** — lista y kanban (drag & drop) con filtros por área, **filtros rápidos** (Mi día, Bloqueadas, Alta prioridad, Hechas/log), banner **#DíaCompleto**, y carta flotante con propiedades editables inline, **sub-tareas con progreso**, recurrencia y fecha de cierre.
- **Proyectos** — tabla, kanban por estado y **línea de tiempo** (mini-Gantt con las fechas existentes y línea de "hoy").
- **Universidad** — **materias agrupadas por semestre con sus horarios asignados** (arriba de todo), **horario semanal visual** y **asistencias en la misma fila (50/50)**: grid días × horas compacto (el bloque sobrepuesto muestra nombre + horario) y asistencias con **4 días que se desplazan con la fecha**; en dos modos: *por materia* (clic cicla Presente → Ausente → Justificado) y *por día* (un clic marca **presente en todas las materias con clase ese día** según el horario).
- **Freelance** — CRM con cartas flotantes editables de cliente y proyecto.
- **Emprendimiento** — proyectos propios e ideas con **detalle en modal grande** (66% ancho × ~70% alto), **archivar ideas** y **sub-tabs Activas / Leídas y archivadas** (historial con restaurar).
- **Personal** — **hábitos diarios con grid-calendario**: 14 días coloreados por % de hábitos hechos (verde 100% · azul 75% · amarillo 50% · rojo <50%, 25% por hábito), marcar un hábito actualiza el color del día; **eventos próximos clicables** (abren el calendario); **ideas radar abribles como página** con "marcar como leída" que las oculta de la lista.
- **Documentos** — wiki/galería con portadas, entrada escalonada, **relacionados por etiqueta/proyecto**, línea de actividad y **lectura en modal grande** (66% ancho × 70% alto con scroll interno y X para cerrar).
- **Calendario** — vista **mes y semana**, cartas flotantes de evento y día, clic en tarea = hecha, **drag & drop de tareas entre días**, **eventos recurrentes** (diaria/semanal/mensual), rollover ámbar "pendiente de ayer" y panel **"Próximo"** cuando hoy no tiene nada agendado (indica hasta qué fecha hay actividad).
- **Pomodoro** — temporizador de enfoque (15/20/25 min) con descanso automático de **1/3 del foco**; durante el descanso dos **minijuegos**: **Asteroids** (nave triangular, física clásica de Atari 1979, asteroides que se parten, dificultad por nivel) y **Laberinto** (generación procedural con algoritmo *recursive backtracker*/DFS, tablero que crece por nivel). Historial de sesiones persistido.
- **Configuración** — selector de estilo, plantillas, áreas, **revisión semanal guiada** (ritual GTD), ajustes del pomodoro y datos.

### Interactividad y micro-animaciones (adaptadas a los 4 estilos)

- **Carta flotante (popover)** anclada al elemento con medición real del alto: aparece **debajo del ancla** (o encima si no cabe), con flecha apuntando al punto de clic, nunca lo cubre, y animación de entrada distinta por tema: brutalista = pop brusco con steps; minimalista = fade limpio; creativo = blur-in con glow; alternativo = slide suave. En móvil se convierte en bottom-sheet.
- **Check animado**: trazo SVG que se dibuja + "pop" al completar (variante por tema).
- **Tachado animado**, badges de "pendiente de ayer" en ámbar, **stagger** en galerías, hover con elevación.
- **Edición inline con auto-guardado** en todas las cartas de detalle.
- **Captura con lenguaje natural** (parser propio): `Entregar informe mañana 14:00 p1 #freelance` → título, fecha, hora, prioridad y etiquetas.
- **Rollover + recurrencias**: vencidas sin hacer pasan al día siguiente (ámbar); las recurrentes (diaria/semanal/mensual) avanzan a su próxima fecha automáticamente.
- **Juegos de descanso**: Asteroids (física vectorial clásica, asteroides que se parten, retardo de disparo y cantidad por nivel) y Laberinto (recursive backtracker con pila, tablero `5+n` por nivel).

## Desarrollo

```bash
npm install
npm run dev       # desarrollo en http://localhost:5173
npm run build     # build de producción en dist/
npm run preview   # previsualizar el build
```

El estilo se cambia desde el selector de la barra superior (persiste en localStorage). En móvil (<768px) la navegación pasa a una barra inferior fija y todo apila a una columna.

## Despliegue (Cloudflare — capa gratuita)

### 1. Frontend (Cloudflare Pages)

```bash
npm run build
npx wrangler pages deploy dist --project-name=workspace-os
```

O conecta el repo en Cloudflare Dashboard → Workers & Pages → Pages (build: `npm run build`, salida: `dist`). El router usa hash, no necesita rewrites.

### 2. Backend + MCP (Cloudflare Workers + D1 + R2) — carpeta `worker/`

El Worker expone **API REST** (`/api/*`) y **servidor MCP** (`/mcp`) sobre la misma base D1, según la arquitectura de `prompt-app-notas-propia.md` (§3, §9):

```bash
cd worker
npm install
npx wrangler login

# Base de datos
npx wrangler d1 create workspace-os-db        # copia database_id a wrangler.toml
npx wrangler d1 execute workspace-os-db --file ./schema.sql

# Bucket de archivos (fase adjuntos)
npx wrangler r2 bucket create workspace-os-files

# Token compartido (API + MCP)
npx wrangler secret put API_TOKEN

# Desplegar
npm run deploy
```

Desarrollo local: `npm run dev` (wrangler dev en :8787) + `npm run db:schema-local`.

### 3. Conectar la app al backend

En **Configuración → Backend Cloudflare**: pega la URL del Worker (`https://workspace-os.<tu-subdominio>.workers.dev`) y el token, luego:
- **Sincronizar desde la nube** — descarga el snapshot de D1 al navegador (los cambios que hizo el agente aparecen al instante).
- **Subir a la nube** — envía tu estado local a D1.

### 4. Conectar un agente IA al MCP

Cualquier cliente MCP (Claude Desktop, IDE, `npx mcp-remote`) con URL `https://workspace-os.<tu-subdominio>.workers.dev/mcp` y el mismo `API_TOKEN`. Herramientas disponibles (17):

`listar_tareas` · `crear_tarea` · `actualizar_tarea` · `listar_proyectos` · `crear_nota` · `buscar_documentacion` · `resumir_proyecto` · `resumen_del_dia` · `listar_eventos` · `crear_evento` · `listar_ideas` · `crear_idea` · `listar_clientes` · `listar_materias` · `listar_fichas` · `toggle_ficha_mini_tarea` · `registrar_pomodoro` · `listar_subpaginas` · `crear_subpagina` · `crear_mapa` · `agregar_nodo_mapa` · `conectar_nodos_mapa`

El agente lee/escribe la **misma** D1 que la app: no hay copia paralela de datos. También puede crear subpáginas y mapas completos dentro de las fichas.

### Límites de la capa gratuita a vigilar

D1: 5 GB + 25 mil millones de lecturas-fila/mes · Workers: 100k solicitudes/día · R2: 10 GB y 1M escrituras/mes. Para uso personal están muy por encima de lo necesario.

## Estructura

```
src/
  lib/        tipos, seed (datos demo), store (zustand + migración v5), utils, nlp (parser lenguaje natural)
  components/ layout (sidebar/topbar/nav móvil), ui (primitivos), Popover (carta flotante anclada),
              FichaDetalle (ficha maestra con mini-tareas + tabla de avance),
              detail (cabeceras de detalle), games/ (Asteroids, Laberinto)
  views/      Inicio, Tareas, Proyectos, Universidad, Freelance, Emprendimiento,
              Personal, Documentos, Calendario, Pomodoro, Configuración
  index.css   tokens por tema (data-theme) — el corazón de los 4 estilos
```

Restaurar datos de demo: **Configuración → Restaurar demo**.