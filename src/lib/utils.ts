import type { DB } from './types'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const hoyISO = () => new Date().toISOString().slice(0, 10)

export const enDias = (dias: number) => {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

export const formatearFecha = (iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) => {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', opts ?? { day: 'numeric', month: 'short' })
}

export const diasRestantes = (iso: string | null) => {
  if (!iso) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fin = new Date(iso + 'T00:00:00')
  return Math.round((fin.getTime() - hoy.getTime()) / 86400000)
}

export const estadoTareaLabel: Record<string, string> = {
  por_hacer: 'Por hacer',
  en_progreso: 'En progreso',
  bloqueado: 'Bloqueado',
  hecho: 'Hecho',
}

export const estadoProyectoLabel: Record<string, string> = {
  idea: 'Idea',
  activo: 'Activo',
  pausado: 'En pausa',
  completado: 'Completado',
  archivado: 'Archivado',
}

export const estadoNotaLabel: Record<string, string> = {
  borrador: 'Borrador',
  revisado: 'Revisado',
  publicado: 'Publicado',
}

export const estadoClienteLabel: Record<string, string> = {
  prospecto: 'Prospecto',
  activo: 'Activo',
  inactivo: 'Inactivo',
}

export const estadoIdeaLabel: Record<string, string> = {
  explorando: 'Explorando',
  validando: 'Validando',
  descartada: 'Descartada',
  convertida: 'Convertida',
  archivada: 'Archivada',
}

export const prioridadLabel: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

export const tareaEstados = ['por_hacer', 'en_progreso', 'bloqueado', 'hecho'] as const
export const proyectoEstados = ['idea', 'activo', 'pausado', 'completado', 'archivado'] as const

export const areaDeProyecto = (db: DB, proyectoId: string | null): string | null => {
  if (!proyectoId) return null
  return db.proyectos.find((p) => p.id === proyectoId)?.area_id ?? null
}

export const nombreProyecto = (db: DB, proyectoId: string | null) =>
  proyectoId ? db.proyectos.find((p) => p.id === proyectoId)?.nombre ?? '—' : '—'

export const avatarColor = (nombre: string) => {
  const colores = ['#FFE600', '#00F0FF', '#00FF66', '#FF007A', '#A855F7', '#FF6B00']
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 997
  return colores[h % colores.length]
}

export const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

/** Avanza una fecha según la recurrencia (para tareas/eventos recurrentes) */
export const avanzaRecurrencia = (iso: string, recurrencia: 'diaria' | 'semanal' | 'mensual'): string => {
  const d = new Date(iso + 'T00:00:00')
  if (recurrencia === 'diaria') d.setDate(d.getDate() + 1)
  if (recurrencia === 'semanal') d.setDate(d.getDate() + 7)
  if (recurrencia === 'mensual') d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

/** Fecha del día de la semana que viene (lunes=1 ... domingo=7) */
export const proximoDiaSemana = (diaSemana: number): string => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const diff = (diaSemana - (hoy.getDay() || 7) + 7) % 7 || 7
  hoy.setDate(hoy.getDate() + diff)
  return hoy.toISOString().slice(0, 10)
}

/** Semana ISO actual (para agrupar stats) */
export const semanaISO = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00')
  const dia = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dia + 3)
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  const semana = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(semana).padStart(2, '0')}`
}

/** Semana actual para comparar (cálculo sobre hoy) */
export const semanaActualISO = (): string => semanaISO(hoyISO())