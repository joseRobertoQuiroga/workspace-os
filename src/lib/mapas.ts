import type { Mapa, MapaNodo, MapaTipo } from './types'

export interface TipoMapaInfo {
  id: MapaTipo
  nombre: string
  objetivo: string
  icono: string
}

export const TIPOS_MAPA: TipoMapaInfo[] = [
  { id: 'dominio', nombre: 'Mapa de dominio', objetivo: 'Funcionalidades esenciales (núcleo) vs no-esenciales (periferia/futuras). Alcance claro de un vistazo.', icono: 'domain' },
  { id: 'datos', nombre: 'Flujo de datos', objetivo: 'Cómo viaja la información: entrada → proceso → salida → almacenamiento, con etiquetas.', icono: 'data_object' },
  { id: 'flujo', nombre: 'Diagrama de proceso', objetivo: 'Pasos secuenciales de un caso de uso clave (proceso de trabajo).', icono: 'account_tree' },
  { id: 'esquema', nombre: 'Arquitectura / esquema', objetivo: 'Cajas por componente o capa y cómo se conectan.', icono: 'dns' },
  { id: 'mental', nombre: 'Mapa mental', objetivo: 'Tema central con ramas: ideas, conceptos y relaciones.', icono: 'psychology' },
  { id: 'concepto', nombre: 'Mapa conceptual', objetivo: 'Conceptos del dominio y sus relaciones (jerga, negocio).', icono: 'hub' },
]

export const TIPO_LABEL: Record<MapaTipo, string> = {
  dominio: 'Mapa de dominio',
  datos: 'Flujo de datos',
  flujo: 'Diagrama de proceso',
  esquema: 'Arquitectura / esquema',
  mental: 'Mapa mental',
  concepto: 'Mapa conceptual',
}

let _n = 0
export const nodoId = () => `n${Date.now().toString(36)}${(_n++).toString(36)}`

/** Genera un mapa nuevo precargado según el tipo (estándar objetivo). */
export function crearMapaInicial(tipo: MapaTipo, titulo: string): Mapa {
  const base: Mapa = { id: `mapa-${Date.now().toString(36)}`, tipo, titulo, nodos: [], conexiones: [] }
  const n = nodoId

  switch (tipo) {
    case 'dominio': {
      const core = { id: n(), titulo: 'Núcleo', sub: 'funcionalidades esenciales', x: 600, y: 260, color: 'rgb(var(--state-done))' }
      const noCore = { id: n(), titulo: 'No esencial', sub: 'periferia / diferido', x: 880, y: 260, color: 'rgb(var(--state-todo))' }
      const futuro = { id: n(), titulo: 'Futuro', sub: 'ideas posteriores', x: 880, y: 420, color: 'rgb(var(--area-univ))' }
      return { ...base, nodos: [core, noCore, futuro], conexiones: [{ origen: core.id, destino: noCore.id, etiqueta: 'no crítico' }, { origen: core.id, destino: futuro.id, etiqueta: 'después' }] }
    }
    case 'datos': {
      const a = { id: n(), titulo: 'Entrada', sub: 'fuentes / inputs', x: 120, y: 260, color: 'rgb(var(--area-freelance))' }
      const b = { id: n(), titulo: 'Proceso', sub: 'lógica principal', x: 380, y: 260, color: 'rgb(var(--accent))' }
      const c = { id: n(), titulo: 'Salida', sub: 'respuestas / outputs', x: 640, y: 260, color: 'rgb(var(--area-personal))' }
      const d = { id: n(), titulo: 'Almacenamiento', sub: 'persistencia', x: 900, y: 260, color: 'rgb(var(--state-done))' }
      return { ...base, nodos: [a, b, c, d], conexiones: [{ origen: a.id, destino: b.id }, { origen: b.id, destino: c.id }, { origen: b.id, destino: d.id }] }
    }
    case 'flujo': {
      const nodos: MapaNodo[] = ['Paso 1', 'Paso 2', 'Paso 3', 'Decisión', 'Fin'].map((t, i) => ({ id: n(), titulo: t, sub: i === 3 ? 'sí / no' : '', x: 160 + i * 230, y: 260, color: 'rgb(var(--area-freelance))' }))
      return { ...base, nodos, conexiones: nodos.slice(0, -1).map((nd, i) => ({ origen: nd.id, destino: nodos[i + 1].id })) }
    }
    case 'esquema': {
      const capa1 = { id: n(), titulo: 'Capa 1', sub: 'entrada / UI', x: 300, y: 140, color: 'rgb(var(--accent))' }
      const capa2 = { id: n(), titulo: 'Capa 2', sub: 'negocio / API', x: 300, y: 300, color: 'rgb(var(--area-freelance))' }
      const capa3 = { id: n(), titulo: 'Capa 3', sub: 'datos', x: 300, y: 460, color: 'rgb(var(--state-done))' }
      return { ...base, nodos: [capa1, capa2, capa3], conexiones: [{ origen: capa1.id, destino: capa2.id }, { origen: capa2.id, destino: capa3.id }] }
    }
    case 'mental': {
      const centro = { id: n(), titulo: 'Tema central', x: 600, y: 260, color: 'rgb(var(--accent))' }
      const ramas = ['Rama 1', 'Rama 2', 'Rama 3'].map((t, i) => {
        const ang = (i / 3) * Math.PI * 2
        return { id: n(), titulo: t, x: 600 + Math.cos(ang) * 260, y: 260 + Math.sin(ang) * 150, color: 'rgb(var(--area-univ))' }
      })
      return { ...base, nodos: [centro, ...ramas], conexiones: ramas.map((r) => ({ origen: centro.id, destino: r.id })) }
    }
    case 'concepto':
    default: {
      const nodos: MapaNodo[] = ['Concepto A', 'Concepto B', 'Concepto C'].map((t, i) => ({ id: n(), titulo: t, x: 250 + i * 300, y: 200 + (i % 2) * 160, color: 'rgb(var(--area-emprende))' }))
      return { ...base, nodos, conexiones: [{ origen: nodos[0].id, destino: nodos[1].id, etiqueta: 'relaciona' }, { origen: nodos[1].id, destino: nodos[2].id }] }
    }
  }
}