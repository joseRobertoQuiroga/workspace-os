import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import type { Env } from './types'
import { leerSnapshot, escribirSnapshot, listarFilas, insertarFila, actualizarFila } from './db'

/**
 * Servidor MCP de WorkSpace OS (según prompt-app-notas-propia.md §9).
 * Un agente de IA puede leer, crear y actualizar la misma base (D1) que la app.
 */

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** JSON-RPC text result */
function ok(text: string) {
  return { content: [{ text, type: 'text' as const }] }
}

function fmtJson(v: unknown): string {
  return JSON.stringify(v, null, 2)
}

export function crearMcpServer(env: Env): McpServer {
  const server = new McpServer({
    name: 'workspace-os',
    version: '0.1.0',
    description: 'Base de datos personal de WorkSpace OS: tareas, proyectos, notas, eventos, ideas, clientes, materias, unidades, temas y fichas (Cloudflare D1).',
  })

  // ===================== TAREAS =====================
  server.registerTool(
    'listar_tareas',
    {
      description: 'Lista tareas con filtros opcionales (proyecto, estado, vencidas).',
      inputSchema: {
        proyecto_id: z.string().optional().describe('Filtrar por proyecto'),
        estado: z.string().optional().describe('por_hacer | en_progreso | bloqueado | hecho'),
        vencidas: z.boolean().optional().describe('Solo vencidas sin hacer'),
      },
    },
    async ({ proyecto_id, estado, vencidas }) => {
      const snap = await leerSnapshot(env)
      let t = snap.tareas as unknown as Record<string, any>[]
      if (proyecto_id) t = t.filter((x) => x.proyecto_id === proyecto_id)
      if (estado) t = t.filter((x) => x.estado === estado)
      if (vencidas) t = t.filter((x) => x.estado !== 'hecho' && x.fecha_limite && x.fecha_limite < hoyISO())
      const resumen = t.map((x) => `${x.titulo} [${x.estado}] (${x.prioridad})${x.fecha_limite ? ' · ' + x.fecha_limite : ''}`)
      return ok(`Tareas: ${t.length}\n` + (resumen.join('\n') || '—'))
    }
  )

  server.registerTool(
    'crear_tarea',
    {
      description: 'Crea una tarea nueva.',
      inputSchema: {
        titulo: z.string().describe('Título de la tarea'),
        area_id: z.string().describe('universidad | freelance | emprendimiento | personal'),
        proyecto_id: z.string().optional(),
        unidad_id: z.string().optional().describe('Si es de universidad, unidad a la que pertenece'),
        tema_id: z.string().optional().describe('Tema asociado (opcional)'),
        prioridad: z.enum(['alta', 'media', 'baja']).optional(),
        fecha_limite: z.string().optional().describe('YYYY-MM-DD'),
        estado: z.string().optional(),
        notas: z.string().optional(),
        etiquetas: z.array(z.string()).optional(),
        recurrencia: z.enum(['diaria', 'semanal', 'mensual']).nullable().optional(),
      },
    },
    async (args) => {
      const snap = await leerSnapshot(env)
      const tarea = {
        id: uid(),
        titulo: args.titulo,
        area_id: args.area_id,
        proyecto_id: args.proyecto_id ?? null,
        unidad_id: args.unidad_id ?? null,
        tema_id: args.tema_id ?? null,
        estado: args.estado ?? 'por_hacer',
        prioridad: args.prioridad ?? 'media',
        destacado: false,
        fecha_limite: args.fecha_limite ?? null,
        notas: args.notas ?? '',
        etiquetas: args.etiquetas ?? [],
        arrastrada: false,
        mi_dia: false,
        subtareas: [],
        recurrencia: args.recurrencia ?? null,
        cerrada_en: null,
        creado_en: new Date().toISOString(),
      }
      snap.tareas = [tarea as unknown as Record<string, unknown>, ...snap.tareas]
      await escribirSnapshot(env, snap)
      return ok(`Tarea creada: "${tarea.titulo}" (${tarea.id})`)
    }
  )

  server.registerTool(
    'actualizar_tarea',
    {
      description: 'Actualiza una tarea existente (campos parciales).',
      inputSchema: {
        id: z.string().describe('ID de la tarea'),
        cambios: z.record(z.string(), z.unknown()).describe('Campos a cambiar: estado, prioridad, titulo, fecha_limite, notas, destacado, mi_dia…'),
      },
    },
    async ({ id, cambios }) => {
      const snap = await leerSnapshot(env)
      const idx = snap.tareas.findIndex((t) => t.id === id)
      if (idx === -1) return ok(`Tarea no encontrada: ${id}`)
      snap.tareas[idx] = { ...snap.tareas[idx], ...cambios }
      await escribirSnapshot(env, snap)
      return ok(`Tarea actualizada: ${id}`)
    }
  )

  // ===================== PROYECTOS =====================
  server.registerTool(
    'listar_proyectos',
    {
      description: 'Lista proyectos con filtros opcionales por área y estado.',
      inputSchema: {
        area: z.string().optional().describe('universidad | freelance | emprendimiento | personal'),
        estado: z.string().optional().describe('idea | activo | pausado | completado | archivado'),
      },
    },
    async ({ area, estado }) => {
      const snap = await leerSnapshot(env)
      let p = snap.proyectos as unknown as Record<string, any>[]
      if (area) p = p.filter((x) => x.area_id === area)
      if (estado) p = p.filter((x) => x.estado === estado)
      return ok(`Proyectos: ${p.length}\n` + p.map((x) => `${x.nombre} [${x.estado}] (${x.area_id})`).join('\n') || '—')
    }
  )

  // ===================== NOTAS / DOCUMENTACIÓN =====================
  server.registerTool(
    'crear_nota',
    {
      description: 'Registra una nota/documento (apunte, resumen, hallazgo, ADR…).',
      inputSchema: {
        titulo: z.string(),
        contenido_md: z.string().describe('Contenido en Markdown'),
        tipo: z.string().optional().describe('Nota rápida | Decisión técnica (ADR) | Apunte de clase | Nota de reunión | Guía'),
        area_id: z.string().optional(),
        etiquetas: z.array(z.string()).optional(),
        proyecto_id: z.string().nullable().optional(),
      },
    },
    async (args) => {
      const snap = await leerSnapshot(env)
      const nota = {
        id: uid(),
        titulo: args.titulo,
        proyecto_id: args.proyecto_id ?? null,
        area_id: args.area_id ?? 'personal',
        plantilla_id: 'tpl-nota-rapida',
        tipo: args.tipo ?? 'Nota rápida',
        estado: 'borrador',
        contenido_md: args.contenido_md,
        resumen: args.contenido_md.slice(0, 120),
        etiquetas: args.etiquetas ?? [],
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      }
      snap.notas = [nota as unknown as Record<string, unknown>, ...snap.notas]
      await escribirSnapshot(env, snap)
      return ok(`Nota creada: "${args.titulo}" (${nota.id})`)
    }
  )

  server.registerTool(
    'buscar_documentacion',
    {
      description: 'Busca texto en notas y proyectos (título, contenido, etiquetas).',
      inputSchema: { query: z.string() },
    },
    async ({ query }) => {
      const snap = await leerSnapshot(env)
      const q = query.toLowerCase()
      const notas = (snap.notas as unknown as Record<string, any>[]).filter(
        (n) =>
          n.titulo.toLowerCase().includes(q) ||
          (n.contenido_md ?? '').toLowerCase().includes(q) ||
          (n.etiquetas ?? []).some((e: string) => e.toLowerCase().includes(q))
      )
      const proyectos = (snap.proyectos as unknown as Record<string, any>[]).filter((p) => p.nombre.toLowerCase().includes(q))
      const lineas = [
        `Notas (${notas.length}):`,
        ...notas.slice(0, 10).map((n) => `• ${n.titulo} [${n.tipo}]`),
        `Proyectos (${proyectos.length}):`,
        ...proyectos.slice(0, 5).map((p) => `• ${p.nombre} [${p.estado}]`),
      ]
      return ok(lineas.join('\n'))
    }
  )

  // ===================== RESUMEN =====================
  server.registerTool(
    'resumir_proyecto',
    {
      description: 'Resume un proyecto: tareas, notas, avance y archivos asociados.',
      inputSchema: { proyecto_id: z.string() },
    },
    async ({ proyecto_id }) => {
      const snap = await leerSnapshot(env)
      const proy = (snap.proyectos as unknown as Record<string, any>[]).find((p) => p.id === proyecto_id)
      if (!proy) return ok(`Proyecto no encontrado: ${proyecto_id}`)
      const tareas = (snap.tareas as unknown as Record<string, any>[]).filter((t) => t.proyecto_id === proyecto_id)
      const notas = (snap.notas as unknown as Record<string, any>[]).filter((n) => n.proyecto_id === proyecto_id)
      const hechas = tareas.filter((t) => t.estado === 'hecho').length
      const pct = tareas.length ? Math.round((hechas / tareas.length) * 100) : 0
      return ok(
        [
          `Proyecto: ${proy.nombre} [${proy.estado}] (${proy.area_id})`,
          `Avance: ${pct}% (${hechas}/${tareas.length} tareas hechas)`,
          `Tareas:`,
          ...tareas.map((t) => `  • ${t.titulo} [${t.estado}]`),
          `Notas: ${notas.length}`,
          ...notas.slice(0, 5).map((n) => `  • ${n.titulo}`),
        ].join('\n')
      )
    }
  )

  server.registerTool(
    'resumen_del_dia',
    {
      description: 'Resumen del día para el agente: tareas de hoy, vencidas, eventos próximos y pendientes de ayer.',
      inputSchema: {},
    },
    async () => {
      const snap = await leerSnapshot(env)
      const hoy = hoyISO()
      const t = snap.tareas as unknown as Record<string, any>[]
      const hoyT = t.filter((x) => x.estado !== 'hecho' && x.fecha_limite === hoy)
      const vencidas = t.filter((x) => x.estado !== 'hecho' && x.fecha_limite && x.fecha_limite < hoy)
      const arrastradas = t.filter((x) => x.arrastrada && x.estado !== 'hecho')
      const eventos = (snap.eventos as unknown as Record<string, any>[]).filter((e) => e.fecha >= hoy).slice(0, 6)
      return ok(
        [
          `📅 Hoy (${hoy}): ${hoyT.length} tareas`,
          ...hoyT.map((x) => `  • ${x.titulo} [${x.prioridad}]`),
          `◄ Pendientes de ayer: ${arrastradas.length}`,
          `⚠ Vencidas: ${vencidas.length}`,
          `Eventos próximos:`,
          ...eventos.map((e) => `  • ${e.fecha} ${e.titulo}`),
        ].join('\n')
      )
    }
  )

  // ===================== EVENTOS =====================
  server.registerTool(
    'listar_eventos',
    {
      description: 'Lista eventos entre fechas (opcional).',
      inputSchema: { desde: z.string().optional(), hasta: z.string().optional() },
    },
    async ({ desde, hasta }) => {
      const snap = await leerSnapshot(env)
      let e = (snap.eventos as unknown as Record<string, any>[]).filter((x) => !desde || x.fecha >= desde)
      if (hasta) e = e.filter((x) => x.fecha <= hasta)
      e.sort((a, b) => a.fecha.localeCompare(b.fecha))
      return ok(`Eventos: ${e.length}\n` + e.map((x) => `${x.fecha} · ${x.titulo} [${x.tipo}]`).join('\n') || '—')
    }
  )

  server.registerTool(
    'crear_evento',
    {
      description: 'Crea un evento de calendario.',
      inputSchema: {
        titulo: z.string(),
        fecha: z.string().describe('YYYY-MM-DD'),
        hora: z.string().optional(),
        lugar: z.string().optional(),
        tipo: z.enum(['personal', 'cita', 'recordatorio']).optional(),
        notas: z.string().optional(),
      },
    },
    async (args) => {
      const snap = await leerSnapshot(env)
      const evento = {
        id: uid(),
        titulo: args.titulo,
        fecha: args.fecha,
        hora: args.hora ?? '',
        lugar: args.lugar ?? '',
        tipo: args.tipo ?? 'personal',
        etiquetas: [],
        completado: false,
        recurrencia: null,
        notas: args.notas ?? '',
      }
      snap.eventos = [evento as unknown as Record<string, unknown>, ...snap.eventos]
      await escribirSnapshot(env, snap)
      return ok(`Evento creado: "${args.titulo}" el ${args.fecha} (${evento.id})`)
    }
  )

  // ===================== IDEAS / CLIENTES / MATERIAS =====================
  server.registerTool(
    'listar_ideas',
    {
      description: 'Lista ideas del backlog de emprendimiento.',
      inputSchema: { estado: z.string().optional() },
    },
    async ({ estado }) => {
      const snap = await leerSnapshot(env)
      let i = snap.ideas as unknown as Record<string, any>[]
      if (estado) i = i.filter((x) => x.estado === estado)
      return ok(`Ideas: ${i.length}\n` + i.map((x) => `${x.titulo} [${x.potencial}] · ${x.estado}`).join('\n') || '—')
    }
  )

  server.registerTool(
    'crear_idea',
    {
      description: 'Registra una idea nueva en el backlog.',
      inputSchema: {
        titulo: z.string(),
        categoria: z.string().optional(),
        potencial: z.enum(['alto', 'medio', 'bajo']).optional(),
        notas: z.string().optional(),
      },
    },
    async (args) => {
      const snap = await leerSnapshot(env)
      const idea = {
        id: uid(),
        titulo: args.titulo,
        categoria: args.categoria ?? 'Plataforma propia',
        potencial: args.potencial ?? 'medio',
        estado: 'explorando',
        proyecto_id: null,
        leida: false,
        notas: args.notas ?? '',
      }
      snap.ideas = [idea as unknown as Record<string, unknown>, ...snap.ideas]
      await escribirSnapshot(env, snap)
      return ok(`Idea creada: "${args.titulo}" (${idea.id})`)
    }
  )

  server.registerTool(
    'listar_clientes',
    {
      description: 'Lista clientes freelance.',
      inputSchema: { estado: z.string().optional() },
    },
    async ({ estado }) => {
      const snap = await leerSnapshot(env)
      let c = snap.clientes as unknown as Record<string, any>[]
      if (estado) c = c.filter((x) => x.estado === estado)
      return ok(`Clientes: ${c.length}\n` + c.map((x) => `${x.nombre} [${x.estado}]`).join('\n') || '—')
    }
  )

  server.registerTool(
    'listar_materias',
    {
      description: 'Lista materias universitarias con sus unidades y temas.',
      inputSchema: {},
    },
    async () => {
      const snap = await leerSnapshot(env)
      const m = snap.materias as unknown as Record<string, any>[]
      return ok(
        `Materias: ${m.length}\n` +
          m.map((x) => {
            const unidades = (x.unidades ?? []) as any[]
            const temas = unidades.reduce((a: number, u: any) => a + ((u.temas ?? []) as any[]).length, 0)
            const horario = (x.bloques ?? []).map((b: any) => `d${b.dia} ${b.inicio}-${b.fin}`).join(' | ') || x.horario || 'sin horario'
            return `${x.nombre} [${x.semestre}] · ${horario} · ${unidades.length} unidades / ${temas} temas`
          }).join('\n')
      )
    }
  )

  // ===================== UNIDADES Y TEMAS (Universidad) =====================
  server.registerTool(
    'crear_unidad',
    {
      description: 'Crea una unidad temática dentro de una materia (puede tener varios temas, uno o ninguno).',
      inputSchema: {
        materia_id: z.string(),
        titulo: z.string().describe('Título de la unidad (ej. "Unidad 3 · Arreglos")'),
        tema: z.string().optional().describe('Tema general de la unidad (opcional)'),
      },
    },
    async ({ materia_id, titulo, tema }) => {
      const snap = await leerSnapshot(env)
      const m = snap.materias.find((x) => x.id === materia_id)
      if (!m) return ok(`Materia no encontrada: ${materia_id}`)
      const unidad = { id: `uni-${uid()}`, titulo, tema: tema ?? '', temas: [], creado_en: hoyISO() }
      m.unidades = (m.unidades ?? []) as any[]
      ;(m.unidades as any[]).push(unidad as any)
      await escribirSnapshot(env, snap)
      return ok(`Unidad creada: "${titulo}" en "${m.nombre}" (${unidad.id})`)
    }
  )

  server.registerTool(
    'actualizar_unidad',
    {
      description: 'Actualiza una unidad temática (campos parciales: titulo, tema).',
      inputSchema: {
        materia_id: z.string(),
        unidad_id: z.string(),
        cambios: z.record(z.string(), z.unknown()).describe('Campos a cambiar: titulo, tema'),
      },
    },
    async ({ materia_id, unidad_id, cambios }) => {
      const snap = await leerSnapshot(env)
      const m = snap.materias.find((x) => x.id === materia_id)
      if (!m) return ok(`Materia no encontrada: ${materia_id}`)
      const u = ((m.unidades ?? []) as any[]).find((x: any) => x.id === unidad_id)
      if (!u) return ok(`Unidad no encontrada: ${unidad_id}`)
      Object.assign(u, cambios)
      await escribirSnapshot(env, snap)
      return ok(`Unidad actualizada: ${unidad_id}`)
    }
  )

  server.registerTool(
    'eliminar_unidad',
    {
      description: 'Elimina una unidad temática (y sus temas).',
      inputSchema: { materia_id: z.string(), unidad_id: z.string() },
    },
    async ({ materia_id, unidad_id }) => {
      const snap = await leerSnapshot(env)
      const m = snap.materias.find((x) => x.id === materia_id)
      if (!m) return ok(`Materia no encontrada: ${materia_id}`)
      m.unidades = ((m.unidades ?? []) as any[]).filter((x: any) => x.id !== unidad_id)
      await escribirSnapshot(env, snap)
      return ok(`Unidad eliminada: ${unidad_id}`)
    }
  )

  server.registerTool(
    'crear_tema',
    {
      description: 'Crea un tema dentro de una unidad (con contexto y sección de apuntes).',
      inputSchema: {
        materia_id: z.string(),
        unidad_id: z.string(),
        titulo: z.string(),
        contexto: z.string().optional().describe('Contexto del tema (una línea)'),
        apuntes: z.string().optional().describe('Apuntes en Markdown'),
      },
    },
    async ({ materia_id, unidad_id, titulo, contexto, apuntes }) => {
      const snap = await leerSnapshot(env)
      const m = snap.materias.find((x) => x.id === materia_id)
      if (!m) return ok(`Materia no encontrada: ${materia_id}`)
      const u = ((m.unidades ?? []) as any[]).find((x: any) => x.id === unidad_id)
      if (!u) return ok(`Unidad no encontrada: ${unidad_id}`)
      const hoy = new Date().toISOString()
      const tema = { id: `tema-${uid()}`, titulo, contexto: contexto ?? '', apuntes: apuntes ?? '', pizarra: [], creado_en: hoy, actualizado_en: hoy }
      u.temas = (u.temas ?? []) as any[]
      ;(u.temas as any[]).push(tema as any)
      await escribirSnapshot(env, snap)
      return ok(`Tema creado: "${titulo}" en "${u.titulo}" (${tema.id})`)
    }
  )

  server.registerTool(
    'actualizar_tema',
    {
      description: 'Actualiza un tema (titulo, contexto, apuntes Markdown, pizarra).',
      inputSchema: {
        materia_id: z.string(),
        unidad_id: z.string(),
        tema_id: z.string(),
        cambios: z.record(z.string(), z.unknown()).describe('Campos a cambiar: titulo, contexto, apuntes, pizarra'),
      },
    },
    async ({ materia_id, unidad_id, tema_id, cambios }) => {
      const snap = await leerSnapshot(env)
      const m = snap.materias.find((x) => x.id === materia_id)
      if (!m) return ok(`Materia no encontrada: ${materia_id}`)
      const u = ((m.unidades ?? []) as any[]).find((x: any) => x.id === unidad_id)
      if (!u) return ok(`Unidad no encontrada: ${unidad_id}`)
      const t = ((u.temas ?? []) as any[]).find((x: any) => x.id === tema_id)
      if (!t) return ok(`Tema no encontrado: ${tema_id}`)
      Object.assign(t, cambios, { actualizado_en: new Date().toISOString() })
      await escribirSnapshot(env, snap)
      return ok(`Tema actualizado: ${tema_id}`)
    }
  )

  server.registerTool(
    'eliminar_tema',
    {
      description: 'Elimina un tema de una unidad.',
      inputSchema: { materia_id: z.string(), unidad_id: z.string(), tema_id: z.string() },
    },
    async ({ materia_id, unidad_id, tema_id }) => {
      const snap = await leerSnapshot(env)
      const m = snap.materias.find((x) => x.id === materia_id)
      if (!m) return ok(`Materia no encontrada: ${materia_id}`)
      const u = ((m.unidades ?? []) as any[]).find((x: any) => x.id === unidad_id)
      if (!u) return ok(`Unidad no encontrada: ${unidad_id}`)
      u.temas = ((u.temas ?? []) as any[]).filter((x: any) => x.id !== tema_id)
      await escribirSnapshot(env, snap)
      return ok(`Tema eliminado: ${tema_id}`)
    }
  )

  server.registerTool(
    'buscar_unidad',
    {
      description: 'Librería: busca unidades y temas con filtro por materia y por fecha de actualización.',
      inputSchema: {
        query: z.string().optional().describe('Texto a buscar (materia, unidad, tema, contexto, apuntes)'),
        materia_id: z.string().optional().describe('Filtrar por materia'),
        desde: z.string().optional().describe('YYYY-MM-DD · solo temas actualizados desde esta fecha'),
        hasta: z.string().optional().describe('YYYY-MM-DD · solo temas actualizados hasta esta fecha'),
      },
    },
    async ({ query, materia_id, desde, hasta }) => {
      const snap = await leerSnapshot(env)
      const q = (query ?? '').toLowerCase()
      const resultados: string[] = []
      let total = 0
      for (const m of snap.materias as unknown as Record<string, any>[]) {
        if (materia_id && m.id !== materia_id) continue
        for (const u of (m.unidades ?? []) as any[]) {
          for (const t of (u.temas ?? []) as any[]) {
            const fecha = (t.actualizado_en ?? t.creado_en ?? '').slice(0, 10)
            if (desde && fecha < desde) continue
            if (hasta && fecha > hasta) continue
            const texto = `${m.nombre} ${u.titulo} ${u.tema ?? ''} ${t.titulo} ${t.contexto ?? ''} ${t.apuntes ?? ''}`.toLowerCase()
            if (q && !texto.includes(q)) continue
            total++
            resultados.push(`• ${t.titulo} › ${u.titulo} › ${m.nombre} [${m.semestre}]${t.pizarra?.length ? ' · PIZARRA' : ''}`)
          }
        }
      }
      return ok(`Resultados: ${total}\n` + resultados.slice(0, 25).join('\n'))
    }
  )

  // ===================== PROPIEDADES Y TABLAS =====================
  server.registerTool(
    'agregar_propiedad_ficha',
    {
      description: 'Añade un bloque de propiedad a una ficha (etiqueta, valor, icono y color).',
      inputSchema: {
        ficha_id: z.string(),
        etiqueta: z.string(),
        valor: z.string(),
        icono: z.string().optional().describe('Nombre del icono (link, star, flag…)'),
        color: z.string().optional().describe('Color CSS, ej. rgb(var(--area-univ))'),
      },
    },
    async ({ ficha_id, etiqueta, valor, icono, color }) => {
      const snap = await leerSnapshot(env)
      const idx = snap.fichas.findIndex((f) => f.id === ficha_id)
      if (idx === -1) return ok(`Ficha no encontrada: ${ficha_id}`)
      snap.fichas[idx].propiedades.push({ id: `prop-${uid()}`, etiqueta, valor, icono: icono ?? 'data_object', color: color ?? '' })
      await escribirSnapshot(env, snap)
      return ok(`Bloque "${etiqueta}" añadido a "${snap.fichas[idx].titulo}"`)
    }
  )

  server.registerTool(
    'actualizar_propiedad_ficha',
    {
      description: 'Actualiza un bloque de propiedad de una ficha (por id o etiqueta).',
      inputSchema: {
        ficha_id: z.string(),
        prop_id: z.string().describe('id o etiqueta del bloque'),
        cambios: z.record(z.string(), z.unknown()).describe('Campos a cambiar: etiqueta, valor, icono, color'),
      },
    },
    async ({ ficha_id, prop_id, cambios }) => {
      const snap = await leerSnapshot(env)
      const idx = snap.fichas.findIndex((f) => f.id === ficha_id)
      if (idx === -1) return ok(`Ficha no encontrada: ${ficha_id}`)
      const ficha = snap.fichas[idx]
      const prop = ficha.propiedades.find((p) => (p as any).id === prop_id || p.etiqueta === prop_id)
      if (!prop) return ok(`Bloque no encontrado: ${prop_id}`)
      Object.assign(prop, cambios)
      await escribirSnapshot(env, snap)
      return ok(`Bloque "${prop.etiqueta}" actualizado`)
    }
  )

  server.registerTool(
    'eliminar_propiedad_ficha',
    {
      description: 'Elimina un bloque de propiedad de una ficha (por id o etiqueta).',
      inputSchema: { ficha_id: z.string(), prop_id: z.string() },
    },
    async ({ ficha_id, prop_id }) => {
      const snap = await leerSnapshot(env)
      const idx = snap.fichas.findIndex((f) => f.id === ficha_id)
      if (idx === -1) return ok(`Ficha no encontrada: ${ficha_id}`)
      snap.fichas[idx].propiedades = snap.fichas[idx].propiedades.filter((p) => (p as any).id !== prop_id && p.etiqueta !== prop_id)
      await escribirSnapshot(env, snap)
      return ok(`Bloque eliminado: ${prop_id}`)
    }
  )

  server.registerTool(
    'crear_tabla',
    {
      description: 'Crea una tabla estructurada en una subpágina (columnas, filas, columna principal, color y tamaño).',
      inputSchema: {
        ficha_id: z.string(),
        seccion_id: z.string().describe('Sección de la ficha donde vive la subpágina'),
        subpagina_id: z.string(),
        titulo: z.string(),
        cols: z.array(z.string()).describe('Nombres de las columnas'),
        filas: z.array(z.array(z.string())).describe('Celdas: cada fila un array del mismo tamaño que cols'),
        columna_principal: z.number().int().optional().describe('Índice de la columna a resaltar como principal'),
        color: z.string().optional(),
        ancho: z.enum(['compacto', 'normal', 'amplio']).optional(),
      },
    },
    async ({ ficha_id, seccion_id, subpagina_id, titulo, cols, filas, columna_principal, color, ancho }) => {
      const snap = await leerSnapshot(env)
      const f = snap.fichas.find((x) => x.id === ficha_id)
      if (!f) return ok(`Ficha no encontrada: ${ficha_id}`)
      const sec = f.secciones.find((s) => s.id === seccion_id)
      if (!sec) return ok(`Sección no encontrada: ${seccion_id}`)
      const sp = (sec.subpaginas ?? []).find((x: any) => x.id === subpagina_id)
      if (!sp) return ok(`Subpágina no encontrada: ${subpagina_id}`)
      sp.tablas = sp.tablas ?? []
      sp.tablas.push({ id: `tabla-${uid()}`, titulo, cols, filas, columna_principal, color: color ?? '', ancho: ancho ?? 'normal' })
      await escribirSnapshot(env, snap)
      return ok(`Tabla "${titulo}" creada en "${sp.titulo}"`)
    }
  )

  server.registerTool(
    'actualizar_tabla',
    {
      description: 'Actualiza una tabla de una subpágina (campos parciales).',
      inputSchema: {
        ficha_id: z.string(),
        seccion_id: z.string(),
        subpagina_id: z.string(),
        tabla_id: z.string(),
        cambios: z.record(z.string(), z.unknown()).describe('Campos a cambiar: titulo, cols, filas, columna_principal, color, ancho'),
      },
    },
    async ({ ficha_id, seccion_id, subpagina_id, tabla_id, cambios }) => {
      const snap = await leerSnapshot(env)
      const f = snap.fichas.find((x) => x.id === ficha_id)
      if (!f) return ok(`Ficha no encontrada: ${ficha_id}`)
      const sec = f.secciones.find((s) => s.id === seccion_id)
      if (!sec) return ok(`Sección no encontrada: ${seccion_id}`)
      const sp = (sec.subpaginas ?? []).find((x: any) => x.id === subpagina_id)
      if (!sp) return ok(`Subpágina no encontrada: ${subpagina_id}`)
      const t = (sp.tablas ?? []).find((x: any) => x.id === tabla_id)
      if (!t) return ok(`Tabla no encontrada: ${tabla_id}`)
      Object.assign(t, cambios)
      await escribirSnapshot(env, snap)
      return ok(`Tabla actualizada: ${tabla_id}`)
    }
  )

  server.registerTool(
    'eliminar_tabla',
    {
      description: 'Elimina una tabla de una subpágina.',
      inputSchema: {
        ficha_id: z.string(),
        seccion_id: z.string(),
        subpagina_id: z.string(),
        tabla_id: z.string(),
      },
    },
    async ({ ficha_id, seccion_id, subpagina_id, tabla_id }) => {
      const snap = await leerSnapshot(env)
      const f = snap.fichas.find((x) => x.id === ficha_id)
      if (!f) return ok(`Ficha no encontrada: ${ficha_id}`)
      const sec = f.secciones.find((s) => s.id === seccion_id)
      if (!sec) return ok(`Sección no encontrada: ${seccion_id}`)
      const sp = (sec.subpaginas ?? []).find((x: any) => x.id === subpagina_id)
      if (!sp) return ok(`Subpágina no encontrada: ${subpagina_id}`)
      sp.tablas = (sp.tablas ?? []).filter((x: any) => x.id !== tabla_id)
      await escribirSnapshot(env, snap)
      return ok(`Tabla eliminada: ${tabla_id}`)
    }
  )

  // ===================== FICHAS =====================
  server.registerTool(
    'listar_fichas',
    {
      description: 'Lista fichas técnicas (fichas maestras) con su avance.',
      inputSchema: { tipo: z.string().optional() },
    },
    async ({ tipo }) => {
      const snap = await leerSnapshot(env)
      let f = snap.fichas
      if (tipo) f = f.filter((x) => x.tipo === tipo)
      const lineas = f.map((x) => {
        const total = x.secciones.reduce((a, s) => a + s.mini_tareas.length, 0)
        const hechas = x.secciones.reduce((a, s) => a + s.mini_tareas.filter((m) => m.hecha).length, 0)
        const pct = total ? Math.round((hechas / total) * 100) : 0
        return `${x.titulo} [${x.tipo}] · ${pct}% (${hechas}/${total})`
      })
      return ok(`Fichas: ${f.length}\n` + lineas.join('\n') || '—')
    }
  )

  server.registerTool(
    'toggle_ficha_mini_tarea',
    {
      description: 'Marca o desmarca una mini-tarea de una sección de ficha.',
      inputSchema: {
        ficha_id: z.string(),
        seccion_id: z.string(),
        mini_id: z.string(),
      },
    },
    async ({ ficha_id, seccion_id, mini_id }) => {
      const snap = await leerSnapshot(env)
      const idx = snap.fichas.findIndex((f) => f.id === ficha_id)
      if (idx === -1) return ok(`Ficha no encontrada: ${ficha_id}`)
      const ficha = snap.fichas[idx]
      const sec = ficha.secciones.find((s) => s.id === seccion_id)
      if (!sec) return ok(`Sección no encontrada: ${seccion_id}`)
      const mini = sec.mini_tareas.find((m) => m.id === mini_id)
      if (!mini) return ok(`Mini-tarea no encontrada: ${mini_id}`)
      mini.hecha = !mini.hecha
      await escribirSnapshot(env, snap)
      return ok(`Mini-tarea "${mini.titulo}" → ${mini.hecha ? 'hecha' : 'pendiente'}`)
    }
  )

  // ===================== POMODORO =====================
  server.registerTool(
    'registrar_pomodoro',
    {
      description: 'Registra una sesión de pomodoro completada en el log del día.',
      inputSchema: { minutos: z.number().describe('Minutos de la sesión de enfoque') },
    },
    async ({ minutos }) => {
      const hoy = hoyISO()
      const snap = await leerSnapshot(env)
      const existente = snap.pomodoroLog.find((l) => l.fecha === hoy)
      if (existente) {
        existente.sesiones = Number(existente.sesiones) + 1
        existente.minutos = Number(existente.minutos) + minutos
      } else {
        snap.pomodoroLog = [{ fecha: hoy, sesiones: 1, minutos }, ...snap.pomodoroLog]
      }
      await escribirSnapshot(env, snap)
      return ok(`Sesión registrada: ${minutos} min el ${hoy}`)
    }
  )

  // ===================== SUBPÁGINAS Y MAPAS =====================
  // Helpers de localización dentro del snapshot de fichas
  const localizarMapa = (snap: ReturnType<typeof leerSnapshot> extends Promise<infer T> ? T : never, mapaId: string) => {
    let encontrado: { mapa: any; fichaId: string; subpaginaId?: string } | null = null
    for (const f of snap.fichas) {
      const enFicha = (f.mapas ?? []).find((m: any) => m.id === mapaId)
      if (enFicha) { encontrado = { mapa: enFicha, fichaId: f.id }; break }
      for (const sec of f.secciones) {
        for (const sp of sec.subpaginas ?? []) {
          const enSub = (sp.mapas ?? []).find((m: any) => m.id === mapaId)
          if (enSub) { encontrado = { mapa: enSub, fichaId: f.id, subpaginaId: sp.id }; break }
        }
        if (encontrado) break
      }
      if (encontrado) break
    }
    return encontrado
  }

  server.registerTool(
    'listar_subpaginas',
    {
      description: 'Lista las subpáginas anidadas de una ficha (con su checklist y mapas).',
      inputSchema: { ficha_id: z.string() },
    },
    async ({ ficha_id }) => {
      const snap = await leerSnapshot(env)
      const f = snap.fichas.find((x) => x.id === ficha_id)
      if (!f) return ok(`Ficha no encontrada: ${ficha_id}`)
      const lineas: string[] = []
      for (const sec of f.secciones) {
        for (const sp of sec.subpaginas ?? []) {
          const hechas = sp.mini_tareas.filter((m: any) => m.hecha).length
          lineas.push(`• [${sec.titulo}] ${sp.titulo} · checklist ${hechas}/${sp.mini_tareas.length} · ${(sp.mapas ?? []).length} mapas`)
        }
      }
      return ok(`Subpáginas de "${f.titulo}": ${lineas.length}\n` + lineas.join('\n') || '—')
    }
  )

  server.registerTool(
    'crear_subpagina',
    {
      description: 'Crea una subpágina anidada en una sección de ficha (documento extendido estilo Notion).',
      inputSchema: {
        ficha_id: z.string(),
        seccion_id: z.string().optional().describe('Si se omite, usa la primera sección de la ficha'),
        titulo: z.string(),
        contenido: z.string().optional().describe('Contenido extendido en Markdown/texto'),
      },
    },
    async ({ ficha_id, seccion_id, titulo, contenido }) => {
      const snap = await leerSnapshot(env)
      const f = snap.fichas.find((x) => x.id === ficha_id)
      if (!f) return ok(`Ficha no encontrada: ${ficha_id}`)
      const sec = f.secciones.find((s) => s.id === seccion_id) ?? f.secciones[0]
      if (!sec) return ok('La ficha no tiene secciones')
      sec.subpaginas = sec.subpaginas ?? []
      sec.subpaginas.push({
        id: uid(),
        titulo,
        contenido: contenido ?? '',
        icono: 'description',
        mini_tareas: [],
        mapas: [],
      })
      await escribirSnapshot(env, snap)
      return ok(`Subpágina creada: "${titulo}" en sección "${sec.titulo}" de "${f.titulo}"`)
    }
  )

  server.registerTool(
    'crear_mapa',
    {
      description: 'Crea un mapa (dominio | datos | flujo | esquema | mental | concepto) en una ficha o en una subpágina, precargado con el esqueleto estándar de nodos del tipo.',
      inputSchema: {
        ficha_id: z.string(),
        tipo: z.enum(['dominio', 'datos', 'flujo', 'esquema', 'mental', 'concepto']),
        titulo: z.string(),
        subpagina_id: z.string().optional().describe('Si se indica, el mapa vive dentro de esa subpágina'),
      },
    },
    async ({ ficha_id, tipo, titulo, subpagina_id }) => {
      const snap = await leerSnapshot(env)
      const f = snap.fichas.find((x) => x.id === ficha_id)
      if (!f) return ok(`Ficha no encontrada: ${ficha_id}`)
      const n = () => `n${uid().slice(0, 8)}`
      const N = (id: string, t: string, s: string, x: number, y: number, color: string) => ({ id, titulo: t, sub: s, x, y, color })
      let nodos: { id: string; titulo: string; sub?: string; x: number; y: number; color?: string }[] = []
      let conexiones: { origen: string; destino: string; etiqueta?: string }[] = []
      switch (tipo) {
        case 'dominio': {
          const core = N(n(), 'Núcleo', 'funcionalidades esenciales', 600, 260, 'rgb(var(--state-done))')
          const noCore = N(n(), 'No esencial', 'periferia / diferido', 880, 260, 'rgb(var(--state-todo))')
          const futuro = N(n(), 'Futuro', 'ideas posteriores', 880, 420, 'rgb(var(--area-univ))')
          nodos = [core, noCore, futuro]
          conexiones = [{ origen: core.id, destino: noCore.id, etiqueta: 'no crítico' }, { origen: core.id, destino: futuro.id, etiqueta: 'después' }]
          break
        }
        case 'datos': {
          const a = N(n(), 'Entrada', 'fuentes / inputs', 120, 260, 'rgb(var(--area-freelance))')
          const b = N(n(), 'Proceso', 'lógica principal', 380, 260, 'rgb(var(--accent))')
          const c = N(n(), 'Salida', 'respuestas / outputs', 640, 260, 'rgb(var(--area-personal))')
          const d = N(n(), 'Almacenamiento', 'persistencia', 900, 260, 'rgb(var(--state-done))')
          nodos = [a, b, c, d]
          conexiones = [{ origen: a.id, destino: b.id }, { origen: b.id, destino: c.id }, { origen: b.id, destino: d.id }]
          break
        }
        case 'flujo': {
          const titulos = ['Paso 1', 'Paso 2', 'Paso 3', 'Decisión', 'Fin']
          nodos = titulos.map((t, i) => N(n(), t, i === 3 ? 'sí / no' : '', 160 + i * 230, 260, 'rgb(var(--area-freelance))'))
          conexiones = nodos.slice(0, -1).map((nd, i) => ({ origen: nd.id, destino: nodos[i + 1].id }))
          break
        }
        case 'esquema': {
          const capa1 = N(n(), 'Capa 1', 'entrada / UI', 300, 140, 'rgb(var(--accent))')
          const capa2 = N(n(), 'Capa 2', 'negocio / API', 300, 300, 'rgb(var(--area-freelance))')
          const capa3 = N(n(), 'Capa 3', 'datos', 300, 460, 'rgb(var(--state-done))')
          nodos = [capa1, capa2, capa3]
          conexiones = [{ origen: capa1.id, destino: capa2.id }, { origen: capa2.id, destino: capa3.id }]
          break
        }
        case 'mental': {
          const centro = N(n(), 'Tema central', '', 600, 260, 'rgb(var(--accent))')
          const ramas = ['Rama 1', 'Rama 2', 'Rama 3'].map((t, i) => {
            const ang = (i / 3) * Math.PI * 2
            return N(n(), t, '', 600 + Math.cos(ang) * 260, 260 + Math.sin(ang) * 150, 'rgb(var(--area-univ))')
          })
          nodos = [centro, ...ramas]
          conexiones = ramas.map((r) => ({ origen: centro.id, destino: r.id }))
          break
        }
        case 'concepto':
        default: {
          nodos = ['Concepto A', 'Concepto B', 'Concepto C'].map((t, i) => N(n(), t, '', 250 + i * 300, 200 + (i % 2) * 160, 'rgb(var(--area-emprende))'))
          conexiones = [{ origen: nodos[0].id, destino: nodos[1].id, etiqueta: 'relaciona' }, { origen: nodos[1].id, destino: nodos[2].id }]
        }
      }
      const mapa = {
        id: `mapa-${uid()}`,
        tipo,
        titulo,
        nodos,
        conexiones,
      }
      if (subpagina_id) {
        for (const sec of f.secciones) {
          const sp = (sec.subpaginas ?? []).find((x) => x.id === subpagina_id)
          if (sp) {
            sp.mapas = sp.mapas ?? []
            sp.mapas.push(mapa as any)
            await escribirSnapshot(env, snap)
            return ok(`Mapa "${titulo}" (${tipo}) creado en la subpágina "${sp.titulo}"`)
          }
        }
        return ok(`Subpágina no encontrada: ${subpagina_id}`)
      }
      f.mapas = f.mapas ?? []
      f.mapas.push(mapa as any)
      await escribirSnapshot(env, snap)
      return ok(`Mapa "${titulo}" (${tipo}) creado en la ficha "${f.titulo}" (${mapa.id})`)
    }
  )

  server.registerTool(
    'agregar_nodo_mapa',
    {
      description: 'Añade un nodo a un mapa existente.',
      inputSchema: {
        mapa_id: z.string(),
        titulo: z.string(),
        sub: z.string().optional().describe('Subtítulo del nodo'),
      },
    },
    async ({ mapa_id, titulo, sub }) => {
      const snap = await leerSnapshot(env)
      const loc = localizarMapa(snap, mapa_id)
      if (!loc) return ok(`Mapa no encontrado: ${mapa_id}`)
      loc.mapa.nodos.push({
        id: `n-${uid()}`,
        titulo,
        sub: sub ?? '',
        x: 300 + Math.random() * 500,
        y: 150 + Math.random() * 250,
        color: 'rgb(var(--area-freelance))',
      })
      await escribirSnapshot(env, snap)
      return ok(`Nodo "${titulo}" añadido al mapa "${loc.mapa.titulo}" (${loc.mapa.nodos.length} nodos)`)
    }
  )

  server.registerTool(
    'conectar_nodos_mapa',
    {
      description: 'Conecta dos nodos de un mapa con una etiqueta opcional.',
      inputSchema: {
        mapa_id: z.string(),
        origen: z.string().describe('ID del nodo origen'),
        destino: z.string().describe('ID del nodo destino'),
        etiqueta: z.string().optional(),
      },
    },
    async ({ mapa_id, origen, destino, etiqueta }) => {
      const snap = await leerSnapshot(env)
      const loc = localizarMapa(snap, mapa_id)
      if (!loc) return ok(`Mapa no encontrado: ${mapa_id}`)
      loc.mapa.conexiones = loc.mapa.conexiones ?? []
      loc.mapa.conexiones.push({ origen, destino, etiqueta: etiqueta ?? '' })
      await escribirSnapshot(env, snap)
      return ok(`Conexión ${origen} → ${destino} añadida (${loc.mapa.conexiones.length} enlaces)`)
    }
  )

  return server
}