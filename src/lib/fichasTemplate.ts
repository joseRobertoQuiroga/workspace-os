import type { Ficha } from './types'
import { crearMapaInicial } from './mapas'

export interface DatosFicha {
  id: string
  titulo: string
  subtitulo: string
  tipo: 'proyecto' | 'tarea' | 'cliente' | 'nota' | 'documento'
  entidad_id: string
  area_id: string
  estado: string
  descripcion?: string
}

const t = (n: number) => `mt-${Date.now().toString(36)}${n}`
const sub = (n: number) => `sub-${Date.now().toString(36)}${n}`

/** Plantilla genérica (sin tipo): detalle + checklist. */
export function fichaGenerica(d: DatosFicha): Ficha {
  return {
    id: d.id,
    titulo: d.titulo,
    subtitulo: d.subtitulo,
    tipo: d.tipo,
    entidad_id: d.entidad_id,
    area_id: d.area_id as Ficha['area_id'],
    estado: d.estado,
    estado_color: d.area_id === 'universidad' ? 'area-univ' : d.area_id === 'freelance' ? 'area-freelance' : d.area_id === 'personal' ? 'area-personal' : 'area-emprende',
    propiedades: [
      { etiqueta: 'Área', valor: d.area_id.charAt(0).toUpperCase() + d.area_id.slice(1), icono: 'category' },
      { etiqueta: 'Estado', valor: d.estado, icono: 'flag' },
    ],
    secciones: [
      { id: 'sec-detalle', titulo: 'Detalle y contexto', icono: 'description', contenido: d.descripcion ? [d.descripcion] : ['Sin descripción — añade contexto desde esta sección.'], mini_tareas: [] },
      { id: 'sec-checklist', titulo: 'Checklist de trabajo', icono: 'checklist', contenido: ['Desglosa el trabajo en pasos tickeables.'], mini_tareas: [] },
    ],
    mapas: [],
  }
}

/** Plantilla SaaS / Producto propio (Emprendimiento). */
export function plantillaSaas(d: DatosFicha): Ficha {
  return {
    ...fichaGenerica(d),
    subtitulo: d.subtitulo || 'Ficha de Producto · SaaS',
    propiedades: [
      { etiqueta: 'Área', valor: 'Emprendimiento', icono: 'lightbulb' },
      { etiqueta: 'Estado', valor: d.estado, icono: 'flag' },
      { etiqueta: 'Repositorio', valor: d.descripcion?.match(/https?:\/\/[^\s]+/)?.[0] ?? '—', icono: 'link' },
    ],
    secciones: [
      {
        id: 'sec-vision',
        titulo: 'Visión y Objetivos',
        icono: 'flag',
        contenido: [d.descripcion ?? 'Objetivo general del producto.'],
        mini_tareas: [
          { id: t(1), titulo: 'Objetivo específico 1', hecha: false },
          { id: t(2), titulo: 'Objetivo específico 2', hecha: false },
          { id: t(3), titulo: 'Objetivo específico 3', hecha: false },
        ],
      },
      {
        id: 'sec-alcance',
        titulo: 'Alcance y no-alcance',
        icono: 'category',
        contenido: ['Incluye: funcionalidades core del MVP.', 'No incluye: todo lo diferido a fases posteriores.'],
        mini_tareas: [],
      },
      {
        id: 'sec-modulos',
        titulo: 'Módulos / Funcionalidades',
        icono: 'widgets',
        contenido: ['Desglosa los módulos del producto con su estado.'],
        mini_tareas: [
          { id: t(4), titulo: 'Módulo core (esencial)', hecha: false },
          { id: t(5), titulo: 'Módulo PMV', hecha: false },
          { id: t(6), titulo: 'Módulo futuro', hecha: false },
        ],
      },
      {
        id: 'sec-roadmap',
        titulo: 'Roadmap / Fases',
        icono: 'flag',
        contenido: ['Fases con entregables y dependencias.'],
        mini_tareas: [
          { id: t(7), titulo: 'Fase 1 — Fundación', hecha: false },
          { id: t(8), titulo: 'Fase 2 — Core', hecha: false },
          { id: t(9), titulo: 'Fase 3 — Lanzamiento', hecha: false },
        ],
      },
      {
        id: 'sec-adr',
        titulo: 'Decisiones (ADR)',
        icono: 'account_tree',
        contenido: ['Registro de decisiones técnicas y de negocio.'],
        mini_tareas: [],
        subpaginas: [
          { id: sub(1), titulo: 'Informe PESTEL', icono: 'public', contenido: '# Informe PESTEL\n\n## Político\n- \n## Económico\n- \n## Social\n- \n## Tecnológico\n- \n## Ambiental\n- \n## Legal\n- ', mini_tareas: [], mapas: [] },
        ],
      },
    ],
    mapas: [
      crearMapaInicial('dominio', `Dominio · ${d.titulo}`),
      crearMapaInicial('datos', `Flujo de datos · ${d.titulo}`),
    ],
  }
}

/** Plantilla Cliente freelance. */
export function plantillaFreelance(d: DatosFicha): Ficha {
  return {
    ...fichaGenerica(d),
    subtitulo: d.subtitulo || 'Ficha de Cliente / Proyecto · Freelance',
    propiedades: [
      { etiqueta: 'Área', valor: 'Freelance', icono: 'business_center' },
      { etiqueta: 'Estado', valor: d.estado, icono: 'flag' },
    ],
    secciones: [
      {
        id: 'sec-alcance-hito',
        titulo: 'Alcance del hito actual',
        icono: 'sync_alt',
        contenido: [d.descripcion ?? 'Descripción del trabajo en curso.'],
        mini_tareas: [
          { id: t(1), titulo: 'Entregable del hito actual', hecha: false },
          { id: t(2), titulo: 'Validación con el cliente', hecha: false },
        ],
      },
      {
        id: 'sec-hitos',
        titulo: 'Entregables / Hitos',
        icono: 'receipt_long',
        contenido: ['Hitos contractuales con estado y monto.'],
        mini_tareas: [
          { id: t(3), titulo: 'Hito 1 — Arquitectura / base', hecha: false },
          { id: t(4), titulo: 'Hito 2 — Funcionalidad core', hecha: false },
          { id: t(5), titulo: 'Hito 3 — Integración y pruebas', hecha: false },
          { id: t(6), titulo: 'Hito 4 — Entrega final', hecha: false },
        ],
      },
      {
        id: 'sec-prox',
        titulo: 'Próximos pasos',
        icono: 'rocket_launch',
        contenido: ['Acuerdos y pendientes.'],
        mini_tareas: [
          { id: t(7), titulo: 'Reunión de avance', hecha: false },
          { id: t(8), titulo: 'Próxima entrega', hecha: false },
        ],
        subpaginas: [
          { id: sub(1), titulo: 'Registro de reuniones', icono: 'groups', contenido: '# Reuniones con el cliente\n\n## Fecha\n- Asistentes:\n- Temas:\n- Acuerdos:\n- Próximos pasos:', mini_tareas: [], mapas: [] },
        ],
      },
    ],
    mapas: [
      crearMapaInicial('dominio', `Dominio · ${d.titulo}`),
      crearMapaInicial('flujo', `Proceso · ${d.titulo}`),
    ],
  }
}

/** Plantilla Universidad (materia). */
export function plantillaUniversidad(d: DatosFicha): Ficha {
  return {
    ...fichaGenerica(d),
    subtitulo: d.subtitulo || 'Ficha de Materia · Universidad',
    propiedades: [
      { etiqueta: 'Área', valor: 'Universidad', icono: 'school' },
      { etiqueta: 'Estado', valor: d.estado, icono: 'flag' },
    ],
    secciones: [
      {
        id: 'sec-objetivos',
        titulo: 'Objetivos del curso / capítulo',
        icono: 'flag',
        contenido: [d.descripcion ?? 'Objetivos de la materia.'],
        mini_tareas: [
          { id: t(1), titulo: 'Objetivo 1', hecha: false },
          { id: t(2), titulo: 'Objetivo 2', hecha: false },
        ],
      },
      {
        id: 'sec-entregables',
        titulo: 'Entregables / Tareas',
        icono: 'assignment',
        contenido: ['Tareas, exámenes y entregas con fecha.'],
        mini_tareas: [
          { id: t(3), titulo: 'Tarea / entrega 1', hecha: false },
          { id: t(4), titulo: 'Parcial', hecha: false },
        ],
      },
      {
        id: 'sec-apuntes',
        titulo: 'Apuntes',
        icono: 'edit_note',
        contenido: ['Subpáginas por tema con contenido extendido.'],
        mini_tareas: [],
      },
    ],
    mapas: [crearMapaInicial('mental', `Mapa mental · ${d.titulo}`)],
  }
}

/** Plantilla Personal / Investigación. */
export function plantillaPersonal(d: DatosFicha): Ficha {
  return {
    ...fichaGenerica(d),
    subtitulo: d.subtitulo || 'Ficha de Recurso / Investigación · Personal',
    propiedades: [
      { etiqueta: 'Área', valor: 'Personal', icono: 'favorite' },
      { etiqueta: 'Estado', valor: d.estado, icono: 'flag' },
    ],
    secciones: [
      {
        id: 'sec-resumen',
        titulo: 'Resumen ejecutivo',
        icono: 'summarize',
        contenido: [d.descripcion ?? 'Idea central.'],
        mini_tareas: [],
      },
      {
        id: 'sec-notas',
        titulo: 'Notas y reflexiones',
        icono: 'edit_note',
        contenido: ['Contenido extendido.'],
        mini_tareas: [],
      },
      {
        id: 'sec-acciones',
        titulo: 'Acciones derivadas',
        icono: 'checklist',
        contenido: ['To-dos de la investigación.'],
        mini_tareas: [
          { id: t(1), titulo: 'Acción 1', hecha: false },
          { id: t(2), titulo: 'Acción 2', hecha: false },
        ],
      },
    ],
    mapas: [crearMapaInicial('concepto', `Mapa conceptual · ${d.titulo}`)],
  }
}

export const PLANTILLAS: Record<string, (d: DatosFicha) => Ficha> = {
  saas: plantillaSaas,
  freelance: plantillaFreelance,
  universidad: plantillaUniversidad,
  personal: plantillaPersonal,
}