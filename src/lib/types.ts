export type AreaId = 'universidad' | 'freelance' | 'emprendimiento' | 'personal'

export type TareaEstado = 'por_hacer' | 'en_progreso' | 'bloqueado' | 'hecho'
export type TareaPrioridad = 'alta' | 'media' | 'baja'

export type ProyectoEstado = 'idea' | 'activo' | 'pausado' | 'completado' | 'archivado'

export type NotaEstado = 'borrador' | 'revisado' | 'publicado'

export type ClienteEstado = 'prospecto' | 'activo' | 'inactivo'

export type EventoTipo = 'personal' | 'cita' | 'recordatorio'

export interface Area {
  id: AreaId
  nombre: string
  icono: string
  color: 'area-univ' | 'area-freelance' | 'area-emprende' | 'area-personal'
}

export interface Plantilla {
  id: string
  nombre: string
  icono: string
  color: string
  area_id: AreaId | null
  es_sistema: boolean
  campos: CampoPlantilla[]
}

export interface CampoPlantilla {
  campo: string
  tipo: 'texto' | 'numero' | 'fecha' | 'select'
  opciones?: string[]
}

export interface Proyecto {
  id: string
  nombre: string
  area_id: AreaId
  tipo: string
  estado: ProyectoEstado
  prioridad: TareaPrioridad
  destacado: boolean
  fecha_inicio: string | null
  fecha_limite: string | null
  stack: string[]
  descripcion: string
  cliente_id?: string | null
  /** Económicos (freelance/cliente): monto del proyecto, tarifa y lo ya facturado/cobrado */
  presupuesto?: number | null
  tarifa_hora?: number | null
  facturado?: number | null
  creado_en: string
}

export type Recurrencia = 'diaria' | 'semanal' | 'mensual' | null

export interface Subtarea {
  id: string
  titulo: string
  hecha: boolean
}

export interface Tarea {
  id: string
  titulo: string
  area_id: AreaId
  proyecto_id: string | null
  unidad_id?: string | null
  tema_id?: string | null
  estado: TareaEstado
  prioridad: TareaPrioridad
  destacado: boolean
  fecha_limite: string | null
  notas: string
  etiquetas: string[]
  arrastrada: boolean
  mi_dia: boolean
  subtareas: Subtarea[]
  recurrencia: Recurrencia
  cerrada_en: string | null
  creado_en: string
}

export interface Nota {
  id: string
  titulo: string
  proyecto_id: string | null
  area_id: AreaId
  plantilla_id: string
  tipo: string
  estado: NotaEstado
  contenido_md: string
  resumen: string
  etiquetas: string[]
  creado_en: string
  actualizado_en: string
}

export interface Cliente {
  id: string
  nombre: string
  contacto: string
  estado: ClienteEstado
  notas: string
}

export type IdeaEstado = 'explorando' | 'validando' | 'descartada' | 'convertida' | 'archivada'

export interface Idea {
  id: string
  titulo: string
  categoria: string
  potencial: 'alto' | 'medio' | 'bajo'
  estado: IdeaEstado
  proyecto_id: string | null
  leida: boolean
  notas: string
}

export interface Evento {
  id: string
  titulo: string
  fecha: string
  hora: string
  lugar: string
  tipo: EventoTipo
  etiquetas: string[]
  completado: boolean
  recurrencia: Recurrencia
  notas: string
}

export interface PomodoroLog {
  fecha: string
  sesiones: number
  minutos: number
}

export interface PomodoroSettings {
  focusMin: number
  breakMin: number | null // null = auto 1/3 del focus
  autoStartBreak: boolean
}

export type AsistenciaEstado = 'presente' | 'ausente' | 'justificado'

export interface Asistencia {
  materia_id: string
  fecha: string
  estado: AsistenciaEstado
}

/** Bloque de horario: día 1=lunes ... 7=domingo */
export interface BloqueHorario {
  dia: number
  inicio: string
  fin: string
}

/** Mini-tarea tickeable dentro de una sección de ficha */
export interface FichaMiniTarea {
  id: string
  titulo: string
  hecha: boolean
}

export type MapaTipo = 'mental' | 'flujo' | 'datos' | 'dominio' | 'concepto' | 'esquema'

export interface MapaNodo {
  id: string
  titulo: string
  sub?: string
  x: number
  y: number
  color?: string
}

export interface MapaConexion {
  origen: string
  destino: string
  etiqueta?: string
}

/** Mapa (mental / flujo / dominio / concepto / esquema) — grafo libre con layout por tipo */
export interface Mapa {
  id: string
  tipo: MapaTipo
  titulo: string
  nodos: MapaNodo[]
  conexiones: MapaConexion[]
}

/** Subpágina anidada dentro de una sección de ficha (estilo Notion) */
export interface Subpagina {
  id: string
  titulo: string
  contenido: string
  icono: string
  mini_tareas: FichaMiniTarea[]
  mapas: Mapa[]
  tablas?: Tabla[]
}

/** Tabla estructurada dentro de una subpágina (o sección): columnas, filas, columna principal y color */
export interface Tabla {
  id: string
  titulo: string
  cols: string[]
  filas: string[][]
  columna_principal?: number
  color?: string
  ancho?: 'compacto' | 'normal' | 'amplio'
}

/** Sección de una ficha: contexto + pasos tickeables + subpáginas */
export interface FichaSeccion {
  id: string
  titulo: string
  icono: string
  contenido: string[]
  mini_tareas: FichaMiniTarea[]
  subpaginas?: Subpagina[]
  oculta?: boolean
}

/** Ficha de detalle (estilo ficha maestra): modal grande con secciones y avance */
export interface Ficha {
  id: string
  titulo: string
  subtitulo: string
  tipo: 'proyecto' | 'tarea' | 'cliente' | 'nota' | 'documento'
  entidad_id: string
  area_id: AreaId
  estado: string
  estado_color: string
  propiedades: { id?: string; etiqueta: string; valor: string; icono: string; color?: string }[]
  secciones: FichaSeccion[]
  mapas?: Mapa[]
}

export interface Materia {
  id: string
  nombre: string
  semestre: string
  docente: string
  horario: string
  bloques: BloqueHorario[]
  creditos: number
  color: string
  unidades: Unidad[]
}

/** Tema dentro de una unidad: contexto + apuntes (Markdown) + pizarra de ejemplo visual */
export interface Tema {
  id: string
  titulo: string
  contexto: string
  apuntes: string
  pizarra: PizarraNodo[]
  creado_en: string
  actualizado_en: string
}

/** Unidad temática de una materia: puede tener varios temas, uno o ninguno */
export interface Unidad {
  id: string
  titulo: string
  tema: string
  temas: Tema[]
  creado_en: string
}

/** Nodo de la pizarra: tarjeta de texto o ejemplo visual colocado en el lienzo */
export interface PizarraNodo {
  id: string
  titulo: string
  texto: string
  color: string
  x: number
  y: number
  ancho: number
  alto: number
  imagen?: string
}

export type ThemeId = 'brutalista' | 'minimalista' | 'creativo' | 'alternativo'

export interface DB {
  areas: Area[]
  plantillas: Plantilla[]
  proyectos: Proyecto[]
  tareas: Tarea[]
  notas: Nota[]
  clientes: Cliente[]
  ideas: Idea[]
  eventos: Evento[]
  materias: Materia[]
  asistencias: Asistencia[]
  pomodoroLog: PomodoroLog[]
  fichas: Ficha[]
}