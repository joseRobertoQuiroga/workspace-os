import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DB, ThemeId, Tarea, TareaEstado, Proyecto, Nota, Evento, Idea, Cliente, Materia, AsistenciaEstado, Subtarea, Recurrencia, PomodoroSettings, AreaId, Ficha, Mapa, Tema, Unidad, Tabla } from './types'
import { dbVacia, seedDB } from './seed'
import { uid, hoyISO, avanzaRecurrencia } from './utils'
import { fichaGenerica, PLANTILLAS, type DatosFicha } from './fichasTemplate'
import { getBackendConfig, descargarDb, subirDb } from './api'

export type SyncStatus = 'idle' | 'descargando' | 'subiendo' | 'ok' | 'error'

interface AppState {
  db: DB
  theme: ThemeId
  viewMode: 'lista' | 'kanban'
  pomodoro: PomodoroSettings
  syncStatus: SyncStatus
  lastSyncAt: string | null
  lastError: string | null
  saludo: string
  citaTexto: string
  citaAutor: string
  setTheme: (t: ThemeId) => void
  setViewMode: (m: 'lista' | 'kanban') => void
  setPomodoro: (p: Partial<PomodoroSettings>) => void
  setSaludo: (s: string) => void
  setCita: (texto: string, autor: string) => void
  setSyncState: (p: Partial<Pick<AppState, 'syncStatus' | 'lastSyncAt' | 'lastError'>>) => void
  syncDesdeNube: () => Promise<boolean>
  syncANube: () => Promise<boolean>
  registrarSesionPomodoro: (minutos: number) => void
  resetData: () => void
  reemplazarDb: (db: DB) => void
  runRollover: () => void
  toggleFichaMiniTarea: (fichaId: string, seccionId: string, miniId: string) => void
  addFichaMiniTarea: (fichaId: string, seccionId: string, titulo: string) => void
  addFichaPropiedad: (fichaId: string, prop: { etiqueta: string; valor: string; icono: string; color?: string }) => void
  updateFichaPropiedad: (fichaId: string, propId: string, cambios: Partial<{ etiqueta: string; valor: string; icono: string; color?: string }>) => void
  deleteFichaPropiedad: (fichaId: string, propId: string) => void
  deleteSeccion: (fichaId: string, seccionId: string) => void
  toggleSeccionOculta: (fichaId: string, seccionId: string) => void
  crearFicha: (datos: {
    tipo: 'proyecto' | 'tarea' | 'cliente' | 'nota' | 'documento'
    entidad_id: string
    titulo: string
    subtitulo: string
    area_id: AreaId
    estado: string
    descripcion?: string
  }, plantilla?: 'saas' | 'freelance' | 'universidad' | 'personal') => Ficha
  addSubpagina: (fichaId: string, seccionId: string, titulo: string, contenido?: string) => void
  updateSubpagina: (fichaId: string, seccionId: string, subId: string, cambios: Partial<{ titulo: string; contenido: string; icono: string }>) => void
  deleteSubpagina: (fichaId: string, seccionId: string, subId: string) => void
  toggleSubpaginaMini: (fichaId: string, seccionId: string, subId: string, miniId: string) => void
  addSubpaginaMini: (fichaId: string, seccionId: string, subId: string, titulo: string) => void
  addMapa: (fichaId: string, mapa: Mapa, subpaginaId?: string) => void
  updateMapa: (fichaId: string, mapaId: string, cambios: Partial<Mapa>, subpaginaId?: string) => void
  deleteMapa: (fichaId: string, mapaId: string, subpaginaId?: string) => void
  addTarea: (t: Omit<Tarea, 'id' | 'creado_en'>) => void
  updateTarea: (id: string, cambios: Partial<Tarea>) => void
  deleteTarea: (id: string) => void
  moverTarea: (id: string, estado: TareaEstado) => void
  toggleSubtarea: (id: string, subId: string) => void
  addSubtarea: (id: string, titulo: string) => void
  addProyecto: (p: Omit<Proyecto, 'creado_en'>) => void
  updateProyecto: (id: string, cambios: Partial<Proyecto>) => void
  addNota: (n: Omit<Nota, 'id' | 'creado_en' | 'actualizado_en'>) => void
  updateNota: (id: string, cambios: Partial<Nota>) => void
  deleteNota: (id: string) => void
  addEvento: (e: Omit<Evento, 'id'>) => void
  updateEvento: (id: string, cambios: Partial<Evento>) => void
  deleteEvento: (id: string) => void
  setAsistencia: (materia_id: string, fecha: string, estado: AsistenciaEstado) => void
  removeAsistencia: (materia_id: string, fecha: string) => void
  addIdea: (i: Omit<Idea, 'id'>) => void
  updateIdea: (id: string, cambios: Partial<Idea>) => void
  addCliente: (c: Omit<Cliente, 'id'>) => void
  updateCliente: (id: string, cambios: Partial<Cliente>) => void
  addMateria: (m: Omit<Materia, 'id'>) => void
  addUnidad: (materiaId: string, titulo: string, tema: string) => void
  updateUnidad: (materiaId: string, unidadId: string, cambios: Partial<Unidad>) => void
  deleteUnidad: (materiaId: string, unidadId: string) => void
  addTema: (materiaId: string, unidadId: string, titulo: string, contexto: string) => void
  updateTema: (materiaId: string, unidadId: string, temaId: string, cambios: Partial<Tema>) => void
  deleteTema: (materiaId: string, unidadId: string, temaId: string) => void
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      db: dbVacia(),
      theme: 'brutalista',
      viewMode: 'lista',
      pomodoro: { focusMin: 20, breakMin: null, autoStartBreak: true },
      syncStatus: 'idle',
      lastSyncAt: null,
      lastError: null,
      saludo: 'Buenas tardes, Alex / SCZ Core',
      citaTexto: 'La simplicidad es el requisito previo para la confiabilidad.',
      citaAutor: 'Edsger W. Dijkstra',
      setTheme: (theme) => set({ theme }),
      setViewMode: (viewMode) => set({ viewMode }),
      setPomodoro: (p) => set((s) => ({ pomodoro: { ...s.pomodoro, ...p } })),
      setSaludo: (saludo) => set({ saludo }),
      setCita: (citaTexto, citaAutor) => set({ citaTexto, citaAutor }),
      setSyncState: (p) => set(p),
      syncDesdeNube: async () => {
        const cfg = getBackendConfig()
        if (!cfg || !cfg.url) {
          set({ syncStatus: 'error', lastError: 'Sin backend configurado (Configuración → Backend Cloudflare).' })
          return false
        }
        set({ syncStatus: 'descargando' })
        try {
          const nube = await descargarDb(cfg)
          set({ db: nube, syncStatus: 'ok', lastSyncAt: new Date().toISOString(), lastError: null })
          return true
        } catch (e) {
          set({ syncStatus: 'error', lastError: e instanceof Error ? e.message : String(e) })
          return false
        }
      },
      syncANube: async () => {
        const cfg = getBackendConfig()
        if (!cfg || !cfg.url) {
          set({ syncStatus: 'error', lastError: 'Sin backend configurado (Configuración → Backend Cloudflare).' })
          return false
        }
        set({ syncStatus: 'subiendo' })
        try {
          await subirDb(cfg, useApp.getState().db)
          set({ syncStatus: 'ok', lastSyncAt: new Date().toISOString(), lastError: null })
          return true
        } catch (e) {
          set({ syncStatus: 'error', lastError: e instanceof Error ? e.message : String(e) })
          return false
        }
      },
      registrarSesionPomodoro: (minutos) =>
        set((s) => {
          const hoy = hoyISO()
          const log = s.db.pomodoroLog ?? []
          const existente = log.find((l) => l.fecha === hoy)
          const nuevo = existente
            ? log.map((l) => (l.fecha === hoy ? { ...l, sesiones: l.sesiones + 1, minutos: l.minutos + minutos } : l))
            : [...log, { fecha: hoy, sesiones: 1, minutos }]
          return { db: { ...s.db, pomodoroLog: nuevo } }
        }),
      resetData: () => set({ db: seedDB() }),
      reemplazarDb: (db) => set({ db }),

      addSubpagina: (fichaId, seccionId, titulo, contenido = '') =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? {
                    ...f,
                    secciones: f.secciones.map((sec) =>
                      sec.id === seccionId
                        ? {
                            ...sec,
                            subpaginas: [
                              ...(sec.subpaginas ?? []),
                              { id: uid(), titulo, contenido, icono: 'description', mini_tareas: [], mapas: [] },
                            ],
                          }
                        : sec
                    ),
                  }
                : f
            ),
          },
        })),
      updateSubpagina: (fichaId, seccionId, subId, cambios) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? {
                    ...f,
                    secciones: f.secciones.map((sec) =>
                      sec.id === seccionId
                        ? { ...sec, subpaginas: (sec.subpaginas ?? []).map((sp) => (sp.id === subId ? { ...sp, ...cambios } : sp)) }
                        : sec
                    ),
                  }
                : f
            ),
          },
        })),
      deleteSubpagina: (fichaId, seccionId, subId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? {
                    ...f,
                    secciones: f.secciones.map((sec) =>
                      sec.id === seccionId ? { ...sec, subpaginas: (sec.subpaginas ?? []).filter((sp) => sp.id !== subId) } : sec
                    ),
                  }
                : f
            ),
          },
        })),
      toggleSubpaginaMini: (fichaId, seccionId, subId, miniId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? {
                    ...f,
                    secciones: f.secciones.map((sec) =>
                      sec.id === seccionId
                        ? {
                            ...sec,
                            subpaginas: (sec.subpaginas ?? []).map((sp) =>
                              sp.id === subId
                                ? { ...sp, mini_tareas: sp.mini_tareas.map((m) => (m.id === miniId ? { ...m, hecha: !m.hecha } : m)) }
                                : sp
                            ),
                          }
                        : sec
                    ),
                  }
                : f
            ),
          },
        })),
      addSubpaginaMini: (fichaId, seccionId, subId, titulo) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? {
                    ...f,
                    secciones: f.secciones.map((sec) =>
                      sec.id === seccionId
                        ? {
                            ...sec,
                            subpaginas: (sec.subpaginas ?? []).map((sp) =>
                              sp.id === subId ? { ...sp, mini_tareas: [...sp.mini_tareas, { id: uid(), titulo, hecha: false }] } : sp
                            ),
                          }
                        : sec
                    ),
                  }
                : f
            ),
          },
        })),
      addMapa: (fichaId, mapa, subpaginaId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) => {
              if (f.id !== fichaId) return f
              if (subpaginaId) {
                return {
                  ...f,
                  secciones: f.secciones.map((sec) => ({
                    ...sec,
                    subpaginas: (sec.subpaginas ?? []).map((sp) => (sp.id === subpaginaId ? { ...sp, mapas: [...(sp.mapas ?? []), mapa] } : sp)),
                  })),
                }
              }
              return { ...f, mapas: [...(f.mapas ?? []), mapa] }
            }),
          },
        })),
      updateMapa: (fichaId, mapaId, cambios, subpaginaId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) => {
              if (f.id !== fichaId) return f
              const upd = (m: Mapa) => (m.id === mapaId ? { ...m, ...cambios } : m)
              if (subpaginaId) {
                return {
                  ...f,
                  secciones: f.secciones.map((sec) => ({
                    ...sec,
                    subpaginas: (sec.subpaginas ?? []).map((sp) => (sp.id === subpaginaId ? { ...sp, mapas: (sp.mapas ?? []).map(upd) } : sp)),
                  })),
                }
              }
              return { ...f, mapas: (f.mapas ?? []).map(upd) }
            }),
          },
        })),
      deleteMapa: (fichaId, mapaId, subpaginaId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) => {
              if (f.id !== fichaId) return f
              if (subpaginaId) {
                return {
                  ...f,
                  secciones: f.secciones.map((sec) => ({
                    ...sec,
                    subpaginas: (sec.subpaginas ?? []).map((sp) => (sp.id === subpaginaId ? { ...sp, mapas: (sp.mapas ?? []).filter((m) => m.id !== mapaId) } : sp)),
                  })),
                }
              }
              return { ...f, mapas: (f.mapas ?? []).filter((m) => m.id !== mapaId) }
            }),
          },
        })),

      crearFicha: (datos: {
    tipo: 'proyecto' | 'tarea' | 'cliente' | 'nota' | 'documento'
    entidad_id: string
    titulo: string
    subtitulo: string
    area_id: AreaId
    estado: string
    descripcion?: string
  }, plantilla?: 'saas' | 'freelance' | 'universidad' | 'personal') => {
        const id = `ficha-${uid()}`
        const base: DatosFicha = { id, ...datos, area_id: datos.area_id }
        const ficha = (plantilla && PLANTILLAS[plantilla]) ? PLANTILLAS[plantilla](base) : fichaGenerica(base)
        set((s) => ({ db: { ...s.db, fichas: [...(s.db.fichas ?? []), ficha] } }))
        return ficha
      },

      toggleFichaMiniTarea: (fichaId, seccionId, miniId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? {
                    ...f,
                    secciones: f.secciones.map((sec) =>
                      sec.id === seccionId
                        ? { ...sec, mini_tareas: sec.mini_tareas.map((mt) => (mt.id === miniId ? { ...mt, hecha: !mt.hecha } : mt)) }
                        : sec
                    ),
                  }
                : f
            ),
          },
        })),
      addFichaMiniTarea: (fichaId, seccionId, titulo) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? {
                    ...f,
                    secciones: f.secciones.map((sec) =>
                      sec.id === seccionId
                        ? { ...sec, mini_tareas: [...sec.mini_tareas, { id: uid(), titulo, hecha: false }] }
                        : sec
                    ),
                  }
                : f
            ),
          },
        })),
      addFichaPropiedad: (fichaId, prop) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? { ...f, propiedades: [...f.propiedades, { ...prop, id: uid() }] }
                : f
            ),
          },
        })),
      updateFichaPropiedad: (fichaId, propId, cambios) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? { ...f, propiedades: f.propiedades.map((p) => (p.id === propId || p.etiqueta === propId ? { ...p, ...cambios } : p)) }
                : f
            ),
          },
        })),
      deleteFichaPropiedad: (fichaId, propId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? { ...f, propiedades: f.propiedades.filter((p) => p.id !== propId && p.etiqueta !== propId) }
                : f
            ),
          },
        })),
      deleteSeccion: (fichaId, seccionId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId ? { ...f, secciones: f.secciones.filter((sec) => sec.id !== seccionId) } : f
            ),
          },
        })),
      toggleSeccionOculta: (fichaId, seccionId) =>
        set((s) => ({
          db: {
            ...s.db,
            fichas: (s.db.fichas ?? []).map((f) =>
              f.id === fichaId
                ? {
                    ...f,
                    secciones: f.secciones.map((sec) => (sec.id === seccionId ? { ...sec, oculta: !sec.oculta } : sec)),
                  }
                : f
            ),
          },
        })),

      runRollover: () =>
        set((s) => {
          const hoy = hoyISO()
          let tareas = s.db.tareas
          // 1) Recurrencias: las vencidas sin hacer con recurrencia avanzan a la próxima fecha
          tareas = tareas.map((t) => {
            if (t.estado !== 'hecho' && t.fecha_limite && t.fecha_limite < hoy && t.recurrencia) {
              return { ...t, fecha_limite: avanzaRecurrencia(t.fecha_limite, t.recurrencia), arrastrada: false }
            }
            return t
          })
          // 2) Rollover: vencidas sin hacer y sin recurrencia pasan a hoy como "pendiente de ayer"
          tareas = tareas.map((t) => {
            if (t.estado !== 'hecho' && t.fecha_limite && t.fecha_limite < hoy) {
              return { ...t, fecha_limite: hoy, arrastrada: true }
            }
            return t
          })
          // 3) "Mi día" se limpia cada día (el plan diario es del día)
          tareas = tareas.map((t) => (t.mi_dia ? { ...t, mi_dia: false } : t))
          if (JSON.stringify(tareas) === JSON.stringify(s.db.tareas)) return s
          return { db: { ...s.db, tareas } }
        }),

      addTarea: (t) =>
        set((s) => ({ db: { ...s.db, tareas: [{ ...t, id: uid(), creado_en: new Date().toISOString() }, ...s.db.tareas] } })),
      updateTarea: (id, cambios) =>
        set((s) => ({ db: { ...s.db, tareas: s.db.tareas.map((t) => (t.id === id ? { ...t, ...cambios } : t)) } })),
      deleteTarea: (id) =>
        set((s) => ({ db: { ...s.db, tareas: s.db.tareas.filter((t) => t.id !== id) } })),
      moverTarea: (id, estado) =>
        set((s) => ({
          db: {
            ...s.db,
            tareas: s.db.tareas.map((t) =>
              t.id === id
                ? {
                    ...t,
                    estado,
                    arrastrada: estado === 'hecho' ? false : t.arrastrada,
                    cerrada_en: estado === 'hecho' ? new Date().toISOString() : t.cerrada_en,
                  }
                : t
            ),
          },
        })),
      toggleSubtarea: (id, subId) =>
        set((s) => ({
          db: {
            ...s.db,
            tareas: s.db.tareas.map((t) =>
              t.id === id
                ? { ...t, subtareas: (t.subtareas ?? []).map((st) => (st.id === subId ? { ...st, hecha: !st.hecha } : st)) }
                : t
            ),
          },
        })),
      addSubtarea: (id, titulo) =>
        set((s) => ({
          db: {
            ...s.db,
            tareas: s.db.tareas.map((t) =>
              t.id === id ? { ...t, subtareas: [...(t.subtareas ?? []), { id: uid(), titulo, hecha: false }] } : t
            ),
          },
        })),

      addProyecto: (p) =>
        set((s) => ({ db: { ...s.db, proyectos: [{ ...p, id: p.id ?? uid(), creado_en: new Date().toISOString() }, ...s.db.proyectos] } })),
      updateProyecto: (id, cambios) =>
        set((s) => ({ db: { ...s.db, proyectos: s.db.proyectos.map((p) => (p.id === id ? { ...p, ...cambios } : p)) } })),

      addNota: (n) =>
        set((s) => ({
          db: {
            ...s.db,
            notas: [{ ...n, id: uid(), creado_en: new Date().toISOString(), actualizado_en: new Date().toISOString() }, ...s.db.notas],
          },
        })),
      updateNota: (id, cambios) =>
        set((s) => ({
          db: {
            ...s.db,
            notas: s.db.notas.map((n) =>
              n.id === id ? { ...n, ...cambios, actualizado_en: new Date().toISOString() } : n
            ),
          },
        })),
      deleteNota: (id) =>
        set((s) => ({ db: { ...s.db, notas: s.db.notas.filter((n) => n.id !== id) } })),

      addEvento: (e) => set((s) => ({ db: { ...s.db, eventos: [{ ...e, id: uid() }, ...s.db.eventos] } })),
      updateEvento: (id, cambios) =>
        set((s) => ({ db: { ...s.db, eventos: s.db.eventos.map((e) => (e.id === id ? { ...e, ...cambios } : e)) } })),
      deleteEvento: (id) =>
        set((s) => ({ db: { ...s.db, eventos: s.db.eventos.filter((e) => e.id !== id) } })),
      setAsistencia: (materia_id, fecha, estado) =>
        set((s) => {
          const existente = s.db.asistencias.some((a) => a.materia_id === materia_id && a.fecha === fecha)
          const asistencias = existente
            ? s.db.asistencias.map((a) => (a.materia_id === materia_id && a.fecha === fecha ? { ...a, estado } : a))
            : [...s.db.asistencias, { materia_id, fecha, estado }]
          return { db: { ...s.db, asistencias } }
        }),
      removeAsistencia: (materia_id, fecha) =>
        set((s) => ({
          db: { ...s.db, asistencias: s.db.asistencias.filter((a) => !(a.materia_id === materia_id && a.fecha === fecha)) },
        })),
      addIdea: (i) => set((s) => ({ db: { ...s.db, ideas: [{ ...i, id: uid() }, ...s.db.ideas] } })),
      updateIdea: (id, cambios) =>
        set((s) => ({ db: { ...s.db, ideas: s.db.ideas.map((i) => (i.id === id ? { ...i, ...cambios } : i)) } })),
      addCliente: (c) => set((s) => ({ db: { ...s.db, clientes: [{ ...c, id: uid() }, ...s.db.clientes] } })),
      updateCliente: (id, cambios) =>
        set((s) => ({ db: { ...s.db, clientes: s.db.clientes.map((c) => (c.id === id ? { ...c, ...cambios } : c)) } })),
      addMateria: (m) => set((s) => ({ db: { ...s.db, materias: [{ ...m, id: uid() }, ...s.db.materias] } })),
      addUnidad: (materiaId, titulo, tema) =>
        set((s) => ({
          db: {
            ...s.db,
            materias: s.db.materias.map((m) =>
              m.id === materiaId
                ? { ...m, unidades: [...(m.unidades ?? []), { id: uid(), titulo, tema, temas: [], creado_en: hoyISO() }] }
                : m
            ),
          },
        })),
      updateUnidad: (materiaId, unidadId, cambios) =>
        set((s) => ({
          db: {
            ...s.db,
            materias: s.db.materias.map((m) =>
              m.id === materiaId
                ? { ...m, unidades: (m.unidades ?? []).map((u) => (u.id === unidadId ? { ...u, ...cambios } : u)) }
                : m
            ),
          },
        })),
      deleteUnidad: (materiaId, unidadId) =>
        set((s) => ({
          db: {
            ...s.db,
            materias: s.db.materias.map((m) =>
              m.id === materiaId ? { ...m, unidades: (m.unidades ?? []).filter((u) => u.id !== unidadId) } : m
            ),
          },
        })),
      addTema: (materiaId, unidadId, titulo, contexto) =>
        set((s) => ({
          db: {
            ...s.db,
            materias: s.db.materias.map((m) =>
              m.id === materiaId
                ? {
                    ...m,
                    unidades: (m.unidades ?? []).map((u) =>
                      u.id === unidadId
                        ? {
                            ...u,
                            temas: [...u.temas, { id: uid(), titulo, contexto, apuntes: '', pizarra: [], creado_en: hoyISO(), actualizado_en: hoyISO() }],
                          }
                        : u
                    ),
                  }
                : m
            ),
          },
        })),
      updateTema: (materiaId, unidadId, temaId, cambios) =>
        set((s) => ({
          db: {
            ...s.db,
            materias: s.db.materias.map((m) =>
              m.id === materiaId
                ? {
                    ...m,
                    unidades: (m.unidades ?? []).map((u) =>
                      u.id === unidadId
                        ? {
                            ...u,
                            temas: u.temas.map((t) =>
                              t.id === temaId
                                ? { ...t, ...cambios, actualizado_en: cambios.actualizado_en ?? hoyISO() }
                                : t
                            ),
                          }
                        : u
                    ),
                  }
                : m
            ),
          },
        })),
      deleteTema: (materiaId, unidadId, temaId) =>
        set((s) => ({
          db: {
            ...s.db,
            materias: s.db.materias.map((m) =>
              m.id === materiaId
                ? {
                    ...m,
                    unidades: (m.unidades ?? []).map((u) =>
                      u.id === unidadId ? { ...u, temas: u.temas.filter((t) => t.id !== temaId) } : u
                    ),
                  }
                : m
            ),
          },
        })),
    }),
    {
      name: 'workspace-os-v1',
      version: 6,
      migrate: (persisted: unknown) => {
        const p = persisted as Partial<AppState> | null
        if (!p?.db) return { db: dbVacia() }
        const db = p.db as DB
        const fichasPrevias = (db as { fichas?: DB['fichas'] }).fichas ?? []
        const fichas = fichasPrevias.map((f) => ({
          ...f,
          propiedades: f.propiedades.map((pr) => ({ ...pr, id: (pr as { id?: string }).id ?? `prop-${pr.etiqueta}` })),
          secciones: (f.secciones ?? []).map((sec) => ({
            ...sec,
            oculta: (sec as { oculta?: boolean }).oculta ?? false,
            subpaginas: (sec.subpaginas ?? []).map((sp) => ({ ...sp, tablas: (sp as { tablas?: Tabla[] }).tablas ?? [] })),
          })),
        }))
        return {
          ...p,
          saludo: (p as { saludo?: string }).saludo ?? 'Buenas tardes, Alex / SCZ Core',
          citaTexto: (p as { citaTexto?: string }).citaTexto ?? 'La simplicidad es el requisito previo para la confiabilidad.',
          citaAutor: (p as { citaAutor?: string }).citaAutor ?? 'Edsger W. Dijkstra',
          syncStatus: 'idle',
          pomodoro: { focusMin: 20, breakMin: null, autoStartBreak: true },
          db: {
            ...db,
            fichas: fichas.length ? fichas : dbVacia().fichas,
            tareas: (db.tareas ?? []).map((t) => ({
              ...t,
              etiquetas: t.etiquetas ?? [],
              arrastrada: t.arrastrada ?? false,
              mi_dia: (t as { mi_dia?: boolean }).mi_dia ?? false,
              subtareas: (t as { subtareas?: Subtarea[] }).subtareas ?? [],
              recurrencia: ((t as { recurrencia?: Recurrencia }).recurrencia ?? null) as Recurrencia,
              cerrada_en: (t as { cerrada_en?: string | null }).cerrada_en ?? null,
            })),
            eventos: (db.eventos ?? []).map((e) => ({
              ...e,
              hora: e.hora ?? '',
              lugar: e.lugar ?? '',
              etiquetas: e.etiquetas ?? [],
              completado: e.completado ?? false,
              recurrencia: (e as { recurrencia?: Recurrencia }).recurrencia ?? null,
            })),
            asistencias: db.asistencias ?? [],
            pomodoroLog: (db as { pomodoroLog?: DB['pomodoroLog'] }).pomodoroLog ?? [],
            ideas: (db.ideas ?? []).map((i) => ({ ...i, leida: (i as { leida?: boolean }).leida ?? false })),
            materias: (db.materias ?? []).map((m) => ({
              ...m,
              bloques: (m as { bloques?: { dia: number; inicio: string; fin: string }[] }).bloques ?? [],
              unidades: (m as { unidades?: DB['materias'][number]['unidades'] }).unidades ?? [],
            })),
          },
        }
      },
    }
  )
)