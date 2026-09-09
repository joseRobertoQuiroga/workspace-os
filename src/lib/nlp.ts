import { enDias, hoyISO, proximoDiaSemana } from './utils'
import type { TareaPrioridad, AreaId } from './types'

export interface ParseCaptura {
  titulo: string
  fecha: string | null
  hora: string | null
  prioridad: TareaPrioridad
  etiquetas: string[]
  area: AreaId | null
  recurrencia: 'diaria' | 'semanal' | 'mensual' | null
}

const DIAS_SEMANA: [string, number][] = [
  ['lunes', 1],
  ['martes', 2],
  ['miercoles', 3],
  ['miércoles', 3],
  ['jueves', 4],
  ['viernes', 5],
  ['sabado', 6],
  ['sábado', 6],
  ['domingo', 7],
]

const AREAS: [string, AreaId][] = [
  ['univ', 'universidad'],
  ['universidad', 'universidad'],
  ['clase', 'universidad'],
  ['free', 'freelance'],
  ['freelance', 'freelance'],
  ['cliente', 'freelance'],
  ['empren', 'emprendimiento'],
  ['emprendimiento', 'emprendimiento'],
  ['saas', 'emprendimiento'],
  ['producto', 'emprendimiento'],
  ['personal', 'personal'],
  ['vida', 'personal'],
]

/**
 * Captura en lenguaje natural estilo Todoist/TickTick:
 *   "Entregar informe mañana 14:00 p1 #freelance #cliente"
 *   "Reunión el viernes a las 10:30 #cliente recurrente semanal"
 * Soporta: hoy/mañana/pasado mañana/día de la semana/+Nd/hora HH:MM,
 * p1|p2|p3 para prioridad, #etiquetas, @area, recurrente|recurrencia [diaria|semanal|mensual].
 */
export function parseCaptura(texto: string): ParseCaptura | null {
  const t = texto.trim()
  if (!t) return null

  let rest = t
  const etiquetas: string[] = []
  let area: AreaId | null = null
  let fecha: string | null = null
  let hora: string | null = null
  let prioridad: TareaPrioridad = 'media'
  let recurrencia: 'diaria' | 'semanal' | 'mensual' | null = null

  // Prioridad p1/p2/p3
  rest = rest.replace(/\bp([1-3])\b/i, (_, n) => {
    prioridad = n === '1' ? 'alta' : n === '2' ? 'media' : 'baja'
    return ''
  })

  // Recurrencia
  rest = rest.replace(/\brecurrente\s+(?:\(?diaria\)?|\(?semanal\)?|\(?mensual\)?)?/gi, () => (recurrencia = 'semanal') && '')
  rest = rest.replace(/\brecurrencia\s+(diaria|semanal|mensual)\b/i, (_, r) => {
    recurrencia = r as 'diaria' | 'semanal' | 'mensual'
    return ''
  })
  rest = rest.replace(/\brecurrente\s+diaria\b/i, () => (recurrencia = 'diaria') && '')
  rest = rest.replace(/\brecurrente\s+mensual\b/i, () => (recurrencia = 'mensual') && '')

  // Etiquetas #x y áreas @area
  rest = rest.replace(/#([a-záéíóúñ0-9_-]+)/gi, (_m, tag: string) => {
    etiquetas.push(tag)
    return ''
  })
  rest = rest.replace(/@([a-záéíóúñ]+)/gi, (_m, a: string) => {
    const found = AREAS.find(([k]) => a.toLowerCase().startsWith(k))
    if (found) area = found[1]
    return ''
  })

  // Fechas relativas
  const hoy = hoyISO()
  rest = rest.replace(/pasado mañana|pasado manana/g, () => {
    fecha = enDias(2)
    return ''
  })
  rest = rest.replace(/\bmañana\b|\bmanana\b/g, () => {
    fecha = enDias(1)
    return ''
  })
  rest = rest.replace(/\bhoy\b/g, () => {
    fecha = hoy
    return ''
  })
  rest = rest.replace(/\ben (\d+) (?:días|dias|d)\b|\+\s?(\d+)\s?(?:días|dias|d)\b/g, (_m, a: string, b: string) => {
    fecha = enDias(Number(a ?? b))
    return ''
  })
  // Día de la semana
  for (const [nombre, num] of DIAS_SEMANA) {
    const re = new RegExp(`\\bel?\\s?${nombre}\\b`, 'i')
    if (re.test(rest) && !fecha) {
      rest = rest.replace(re, '')
      fecha = proximoDiaSemana(num)
      break
    }
  }
  // Fecha concreta dd/mm
  rest = rest.replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (_m, d: string, m: string) => {
    const anio = new Date().getFullYear()
    const iso = `${anio}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    fecha = iso >= hoy ? iso : `${anio + 1}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    return ''
  })

  // Hora
  rest = rest.replace(/(?:a las?|a las)\s*(\d{1,2})(?::(\d{2}))?\s*(?:hrs?|hs?)?/gi, (_m, h: string, min?: string) => {
    hora = `${h.padStart(2, '0')}:${(min ?? '00').padStart(2, '0')}`
    return ''
  })
  rest = rest.replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h: string, min: string) => {
    hora = `${h.padStart(2, '0')}:${min}`
    return ''
  })

  // Limpiar espacios duplicados y separadores sobrantes
  let titulo = rest.replace(/\s+/g, ' ').replace(/^[\s,.\-–:]+|[\s,.\-–:]+$/g, '').trim()
  if (!titulo) return null

  return { titulo, fecha, hora, prioridad, etiquetas, area, recurrencia }
}

/** Etiqueta legible de la fecha parseada para mostrar en la captura */
export function fechaLegible(fecha: string | null): string | null {
  if (!fecha) return null
  const hoy = hoyISO()
  if (fecha === hoy) return 'hoy'
  if (fecha === enDias(1)) return 'mañana'
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
}