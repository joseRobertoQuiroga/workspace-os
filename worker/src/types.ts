export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  API_TOKEN?: string
  CORS_ALLOW_ORIGIN?: string
  APP_VERSION?: string
}

export interface FichaSeccionRow {
  id: string
  titulo: string
  icono: string
  contenido: string[]
  mini_tareas: { id: string; titulo: string; hecha: boolean }[]
  subpaginas?: SubpaginaRow[]
}

export interface SubpaginaRow {
  id: string
  titulo: string
  contenido: string
  icono: string
  mini_tareas: { id: string; titulo: string; hecha: boolean }[]
  mapas: MapaRow[]
  tablas?: { id: string; titulo: string; cols: string[]; filas: string[][]; columna_principal?: number; color?: string; ancho?: string }[]
}

export interface MapaRow {
  id: string
  tipo: 'mental' | 'flujo' | 'datos' | 'dominio' | 'concepto' | 'esquema'
  titulo: string
  nodos: { id: string; titulo: string; sub?: string; x: number; y: number; color?: string }[]
  conexiones: { origen: string; destino: string; etiqueta?: string }[]
}

export interface FichaRow {
  id: string
  titulo: string
  subtitulo: string
  tipo: 'proyecto' | 'tarea' | 'cliente' | 'nota' | 'documento'
  entidad_id: string
  area_id: string
  estado: string
  estado_color: string
  propiedades: { id?: string; etiqueta: string; valor: string; icono: string; color?: string }[]
  secciones: FichaSeccionRow[]
  mapas?: MapaRow[]
}

/** Snapshot completo del estado (lo que la app local guarda en localStorage) */
export interface DbSnapshot {
  areas: Record<string, unknown>[]
  plantillas: Record<string, unknown>[]
  proyectos: Record<string, unknown>[]
  tareas: Record<string, unknown>[]
  notas: Record<string, unknown>[]
  clientes: Record<string, unknown>[]
  ideas: Record<string, unknown>[]
  eventos: Record<string, unknown>[]
  materias: Record<string, unknown>[]
  asistencias: Record<string, unknown>[]
  pomodoroLog: Record<string, unknown>[]
  fichas: FichaRow[]
}