import type { Env, DbSnapshot, FichaRow } from './types'

const j = <T>(s: string | null, fallback: T): T => {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

const n = (v: unknown): number => (v ? Number(v) : 0)
const bool = (v: unknown): boolean => v === 1 || v === true

/** Convierte una fila de D1 en el objeto que usa la app */
function filaTarea(r: Record<string, unknown>) {
  return {
    id: r.id,
    titulo: r.titulo,
    area_id: r.area_id,
    proyecto_id: r.proyecto_id,
    estado: r.estado,
    prioridad: r.prioridad,
    destacado: bool(r.destacado),
    fecha_limite: r.fecha_limite,
    notas: r.notas ?? '',
    etiquetas: j<string[]>(r.etiquetas_json as string, []),
    arrastrada: bool(r.arrastrada),
    mi_dia: bool(r.mi_dia),
    subtareas: j(r.subtareas_json as string, []),
    recurrencia: r.recurrencia,
    cerrada_en: r.cerrada_en,
    creado_en: r.creado_en,
  }
}

function filaProyecto(r: Record<string, unknown>) {
  return {
    id: r.id,
    nombre: r.nombre,
    area_id: r.area_id,
    tipo: r.tipo,
    estado: r.estado,
    prioridad: r.prioridad,
    destacado: bool(r.destacado),
    fecha_inicio: r.fecha_inicio,
    fecha_limite: r.fecha_limite,
    stack: j<string[]>(r.stack_json as string, []),
    descripcion: r.descripcion ?? '',
    cliente_id: r.cliente_id,
    creado_en: r.creado_en,
  }
}

function filaNota(r: Record<string, unknown>) {
  return {
    id: r.id,
    titulo: r.titulo,
    proyecto_id: r.proyecto_id,
    area_id: r.area_id,
    plantilla_id: r.plantilla_id,
    tipo: r.tipo,
    estado: r.estado,
    contenido_md: r.contenido_md ?? '',
    resumen: r.resumen ?? '',
    etiquetas: j<string[]>(r.etiquetas_json as string, []),
    creado_en: r.creado_en,
    actualizado_en: r.actualizado_en,
  }
}

function filaIdea(r: Record<string, unknown>) {
  return {
    id: r.id,
    titulo: r.titulo,
    categoria: r.categoria,
    potencial: r.potencial,
    estado: r.estado,
    proyecto_id: r.proyecto_id,
    leida: bool(r.leida),
    notas: r.notas ?? '',
  }
}

function filaEvento(r: Record<string, unknown>) {
  return {
    id: r.id,
    titulo: r.titulo,
    fecha: r.fecha,
    hora: r.hora ?? '',
    lugar: r.lugar ?? '',
    tipo: r.tipo,
    etiquetas: j<string[]>(r.etiquetas_json as string, []),
    completado: bool(r.completado),
    recurrencia: r.recurrencia,
    notas: r.notas ?? '',
  }
}

function filaMateria(r: Record<string, unknown>) {
  return {
    id: r.id,
    nombre: r.nombre,
    semestre: r.semestre,
    docente: r.docente,
    horario: r.horario ?? '',
    bloques: j(r.bloques_json as string, []),
    unidades: j(r.unidades_json as string, []),
    creditos: n(r.creditos),
    color: r.color,
  }
}

function filaFicha(r: Record<string, unknown>): FichaRow {
  return {
    id: r.id as string,
    titulo: r.titulo as string,
    subtitulo: (r.subtitulo as string) ?? '',
    tipo: r.tipo as FichaRow['tipo'],
    entidad_id: (r.entidad_id as string) ?? '',
    area_id: (r.area_id as string) ?? 'personal',
    estado: (r.estado as string) ?? '',
    estado_color: (r.estado_color as string) ?? 'area-emprende',
    propiedades: j(r.propiedades_json as string, []),
    secciones: j(r.secciones_json as string, []),
    mapas: j(r.mapas_json as string, []),
  }
}

/** templates: D1 guarda schema_json; la app espera el campo "campos" */
function filaTemplate(r: Record<string, unknown>) {
  return {
    id: r.id,
    nombre: r.nombre,
    icono: r.icono,
    color: r.color,
    area_id: r.area_id,
    es_sistema: bool(r.es_sistema),
    campos: j<unknown>(r.schema_json as string, []),
  }
}

export async function leerSnapshot(env: Env): Promise<DbSnapshot> {
  const [areas, plantillas, proyectos, tareas, notas, clientes, ideas, eventos, materias, asistencias, pomodoroLog, fichas] =
    await Promise.all([
      env.DB.prepare('SELECT * FROM areas').all(),
      env.DB.prepare('SELECT * FROM templates').all(),
      env.DB.prepare('SELECT * FROM proyectos ORDER BY creado_en DESC').all(),
      env.DB.prepare('SELECT * FROM tareas ORDER BY creado_en DESC').all(),
      env.DB.prepare('SELECT * FROM notas ORDER BY actualizado_en DESC').all(),
      env.DB.prepare('SELECT * FROM clientes').all(),
      env.DB.prepare('SELECT * FROM ideas').all(),
      env.DB.prepare('SELECT * FROM eventos ORDER BY fecha').all(),
      env.DB.prepare('SELECT * FROM materias').all(),
      env.DB.prepare('SELECT * FROM asistencias').all(),
      env.DB.prepare('SELECT * FROM pomodoro_log ORDER BY fecha DESC').all(),
      env.DB.prepare('SELECT * FROM fichas').all(),
    ])

  return {
    areas: areas.results.map((r) => ({ id: r.id, nombre: r.nombre, icono: r.icono, color: r.color })) as unknown as Record<string, unknown>[],
    plantillas: plantillas.results.map(filaTemplate) as unknown as Record<string, unknown>[],
    proyectos: proyectos.results.map(filaProyecto) as unknown as Record<string, unknown>[],
    tareas: tareas.results.map(filaTarea) as unknown as Record<string, unknown>[],
    notas: notas.results.map(filaNota) as unknown as Record<string, unknown>[],
    clientes: clientes.results as Record<string, unknown>[],
    ideas: ideas.results.map(filaIdea) as unknown as Record<string, unknown>[],
    eventos: eventos.results.map(filaEvento) as unknown as Record<string, unknown>[],
    materias: materias.results.map(filaMateria) as unknown as Record<string, unknown>[],
    asistencias: asistencias.results as Record<string, unknown>[],
    pomodoroLog: pomodoroLog.results as Record<string, unknown>[],
    fichas: fichas.results.map(filaFicha),
  }
}

/** Reemplaza TODO el contenido (sincronización full — app de un solo usuario) */
export async function escribirSnapshot(env: Env, snap: DbSnapshot): Promise<void> {
  const tabla = (t: string, filas: Record<string, unknown>[], cols: string[]) => {
    const ins = (f: Record<string, unknown>) =>
      env.DB.prepare(
        `INSERT OR REPLACE INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
      ).bind(...cols.map((c) => (f[c] === undefined ? null : JSON.stringify(f[c]) === undefined ? null : typeof f[c] === 'object' ? JSON.stringify(f[c]) : f[c])))
    return filas.map(ins)
  }

  const templates = (snap.plantillas ?? []).map((t) => ({
    ...t,
    es_sistema: t.es_sistema ? 1 : 0,
    schema_json: JSON.stringify(t.campos ?? []),
  }))
  const tareas = snap.tareas.map((t) => ({
    ...t,
    destacado: t.destacado ? 1 : 0,
    arrastrada: t.arrastrada ? 1 : 0,
    mi_dia: t.mi_dia ? 1 : 0,
    etiquetas_json: JSON.stringify(t.etiquetas ?? []),
    subtareas_json: JSON.stringify(t.subtareas ?? []),
  }))
  const proyectos = snap.proyectos.map((p) => ({ ...p, destacado: p.destacado ? 1 : 0, stack_json: JSON.stringify(p.stack ?? []) }))
  const notas = snap.notas.map((n) => ({ ...n, etiquetas_json: JSON.stringify(n.etiquetas ?? []) }))
  const ideas = snap.ideas.map((i) => ({ ...i, leida: i.leida ? 1 : 0 }))
  const eventos = snap.eventos.map((e) => ({ ...e, completado: e.completado ? 1 : 0, etiquetas_json: JSON.stringify(e.etiquetas ?? []) }))
  const materias = snap.materias.map((m) => ({ ...m, bloques_json: JSON.stringify(m.bloques ?? []), unidades_json: JSON.stringify(m.unidades ?? []) }))
  const fichas = snap.fichas.map((f) => ({
    ...f,
    propiedades_json: JSON.stringify(f.propiedades ?? []),
    secciones_json: JSON.stringify(f.secciones ?? []),
    mapas_json: JSON.stringify(f.mapas ?? []),
  }))

  const batch: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM areas'),
    env.DB.prepare('DELETE FROM templates'),
    env.DB.prepare('DELETE FROM proyectos'),
    env.DB.prepare('DELETE FROM tareas'),
    env.DB.prepare('DELETE FROM notas'),
    env.DB.prepare('DELETE FROM clientes'),
    env.DB.prepare('DELETE FROM ideas'),
    env.DB.prepare('DELETE FROM eventos'),
    env.DB.prepare('DELETE FROM materias'),
    env.DB.prepare('DELETE FROM asistencias'),
    env.DB.prepare('DELETE FROM pomodoro_log'),
    env.DB.prepare('DELETE FROM fichas'),
    ...tabla('areas', snap.areas ?? [], ['id', 'nombre', 'icono', 'color']),
    ...tabla('templates', snap.plantillas ?? [], ['id', 'nombre', 'icono', 'color', 'area_id', 'es_sistema', 'schema_json']),
    ...tabla('proyectos', proyectos, ['id', 'nombre', 'area_id', 'tipo', 'estado', 'prioridad', 'destacado', 'fecha_inicio', 'fecha_limite', 'stack_json', 'descripcion', 'cliente_id', 'campos_json', 'creado_en']),
    ...tabla('tareas', tareas, ['id', 'titulo', 'area_id', 'proyecto_id', 'estado', 'prioridad', 'destacado', 'fecha_limite', 'notas', 'etiquetas_json', 'arrastrada', 'mi_dia', 'subtareas_json', 'recurrencia', 'cerrada_en', 'creado_en']),
    ...tabla('notas', notas, ['id', 'titulo', 'proyecto_id', 'area_id', 'plantilla_id', 'tipo', 'estado', 'contenido_md', 'resumen', 'etiquetas_json', 'creado_en', 'actualizado_en']),
    ...tabla('clientes', snap.clientes ?? [], ['id', 'nombre', 'contacto', 'estado', 'notas']),
    ...tabla('ideas', ideas, ['id', 'titulo', 'categoria', 'potencial', 'estado', 'proyecto_id', 'leida', 'notas']),
    ...tabla('eventos', eventos, ['id', 'titulo', 'fecha', 'hora', 'lugar', 'tipo', 'etiquetas_json', 'completado', 'recurrencia', 'notas']),
    ...tabla('materias', materias, ['id', 'nombre', 'semestre', 'docente', 'horario', 'bloques_json', 'unidades_json', 'creditos', 'color']),
    ...tabla('asistencias', snap.asistencias ?? [], ['materia_id', 'fecha', 'estado']),
    ...tabla('pomodoro_log', snap.pomodoroLog ?? [], ['fecha', 'sesiones', 'minutos']),
    ...tabla('fichas', fichas, ['id', 'titulo', 'subtitulo', 'tipo', 'entidad_id', 'area_id', 'estado', 'estado_color', 'propiedades_json', 'secciones_json', 'mapas_json']),
  ]

  // D1 limita batch() a 100 statements por llamada → partimos en chunks
  const CHUNK = 90
  for (let i = 0; i < batch.length; i += CHUNK) {
    await env.DB.batch(batch.slice(i, i + CHUNK))
  }
}

/** CRUD genérico para una tabla simple (áreas, clientes, ideas, materias…) */
export async function listarFilas(env: Env, tabla: string, orden = 'id'): Promise<Record<string, unknown>[]> {
  const r = await env.DB.prepare(`SELECT * FROM ${tabla} ORDER BY ${orden}`).all()
  return r.results as Record<string, unknown>[]
}

export async function insertarFila(env: Env, tabla: string, fila: Record<string, unknown>): Promise<void> {
  const cols = Object.keys(fila)
  await env.DB.prepare(
    `INSERT INTO ${tabla} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).bind(...cols.map((c) => JSON.stringify(fila[c]) === undefined ? null : typeof fila[c] === 'object' ? JSON.stringify(fila[c]) : fila[c]))
    .run()
}

export async function actualizarFila(env: Env, tabla: string, id: string, cambios: Record<string, unknown>): Promise<void> {
  const cols = Object.keys(cambios)
  if (!cols.length) return
  await env.DB.prepare(
    `UPDATE ${tabla} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`
  ).bind(...cols.map((c) => typeof cambios[c] === 'object' && cambios[c] !== null ? JSON.stringify(cambios[c]) : cambios[c]), id).run()
}

export async function eliminarFila(env: Env, tabla: string, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM ${tabla} WHERE id = ?`).bind(id).run()
}