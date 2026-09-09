import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Badge, Progress, Button, Modal, Field, TextInput, TextArea, Select, Empty } from '../components/ui'
import { FichaDetalle } from '../components/FichaDetalle'
import { MateriaExplorer } from '../components/MateriaExplorer'
import { Libreria } from '../components/Libreria'
import { diasRestantes, formatearFecha, enDias } from '../lib/utils'
import type { AsistenciaEstado, BloqueHorario, Ficha, TareaPrioridad } from '../lib/types'

const ASISTENCIA_CICLO: (AsistenciaEstado | null)[] = [null, 'presente', 'ausente', 'justificado']
const ASISTENCIA_STYLE: Record<string, { color: string; label: string; icono: string }> = {
  presente: { color: 'rgb(var(--state-done))', label: 'Presente', icono: 'check' },
  ausente: { color: 'rgb(var(--prio-high))', label: 'Ausente', icono: 'close' },
  justificado: { color: 'rgb(var(--area-univ))', label: 'Justificado', icono: 'medical_information' },
}
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const HORAS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

export function Universidad() {
  const db = useApp((s) => s.db)
  const updateTarea = useApp((s) => s.updateTarea)
  const addTarea = useApp((s) => s.addTarea)
  const addNota = useApp((s) => s.addNota)
  const addMateria = useApp((s) => s.addMateria)
  const setAsistencia = useApp((s) => s.setAsistencia)
  const removeAsistencia = useApp((s) => s.removeAsistencia)
  const toggleFichaMiniTarea = useApp((s) => s.toggleFichaMiniTarea)
  const addFichaMiniTarea = useApp((s) => s.addFichaMiniTarea)
  const addUnidad = useApp((s) => s.addUnidad)
  const updateUnidad = useApp((s) => s.updateUnidad)
  const deleteUnidad = useApp((s) => s.deleteUnidad)
  const addTema = useApp((s) => s.addTema)
  const updateTema = useApp((s) => s.updateTema)
  const deleteTema = useApp((s) => s.deleteTema)
  const [fichaActiva, setFichaActiva] = useState<Ficha | null>(null)
  const [materiaExp, setMateriaExp] = useState<string | null>(null)
  const [abrirTema, setAbrirTema] = useState<{ unidadId: string; temaId: string } | null>(null)
  const [nuevaMateria, setNuevaMateria] = useState(false)
  const [fNombre, setFNombre] = useState('')
  const [fDocente, setFDocente] = useState('')
  const [fSemestre, setFSemestre] = useState('VIII')
  const [fCreditos, setFCreditos] = useState(3)
  const [bloques, setBloques] = useState<BloqueHorario[]>([])
  const [bloqueDia, setBloqueDia] = useState(1)
  const [bloqueInicio, setBloqueInicio] = useState('14:00')
  const [bloqueFin, setBloqueFin] = useState('15:30')
  const [materiaAsistencia, setMateriaAsistencia] = useState('mat-sd')
  const [tabAsistencia, setTabAsistencia] = useState<'materia' | 'dia'>('materia')
  const [semestreFiltro, setSemestreFiltro] = useState('todos')

  // Crear tarea (tipo to-do) desde Universidad
  const [nuevaTarea, setNuevaTarea] = useState(false)
  const [fTituloTarea, setFTituloTarea] = useState('')
  const [fMateriaTarea, setFMateriaTarea] = useState('')
  const [fPrioTarea, setFPrioTarea] = useState<TareaPrioridad>('media')
  const [fFechaLimite, setFFechaLimite] = useState('')

  // Crear nota desde Universidad
  const [nuevaNota, setNuevaNota] = useState(false)
  const [fTituloNota, setFTituloNota] = useState('')
  const [fContenidoNota, setFContenidoNota] = useState('')

  const crearTareaUniv = () => {
    if (!fTituloTarea.trim()) return
    addTarea({
      titulo: fTituloTarea.trim(),
      area_id: 'universidad',
      proyecto_id: fMateriaTarea || null,
      estado: 'por_hacer',
      prioridad: fPrioTarea,
      destacado: false,
      fecha_limite: fFechaLimite || null,
      notas: '',
      etiquetas: [],
      arrastrada: false,
      mi_dia: false,
      subtareas: [],
      recurrencia: null,
      cerrada_en: null,
    })
    setFTituloTarea(''); setFFechaLimite(''); setNuevaTarea(false)
  }

  const crearNotaUniv = () => {
    if (!fTituloNota.trim()) return
    addNota({
      titulo: fTituloNota.trim(),
      proyecto_id: null,
      area_id: 'universidad',
      plantilla_id: 'tpl-nota-rapida',
      tipo: 'Apunte de clase',
      estado: 'borrador',
      contenido_md: fContenidoNota,
      resumen: fContenidoNota.slice(0, 120),
      etiquetas: [],
    })
    setFTituloNota(''); setFContenidoNota(''); setNuevaNota(false)
  }

  const tareasUniv = db.tareas.filter((t) => t.area_id === 'universidad')
  const pendientes = tareasUniv.filter((t) => t.estado !== 'hecho')
  const notasUniv = db.notas.filter((n) => n.area_id === 'universidad')
  const hechas = tareasUniv.filter((t) => t.estado === 'hecho').length
  const pct = tareasUniv.length ? Math.round((hechas / tareasUniv.length) * 100) : 0

  const semestres = useMemo(() => [...new Set(db.materias.map((m) => m.semestre))].sort(), [db.materias])
  const materiasFiltradas = db.materias.filter((m) => semestreFiltro === 'todos' || m.semestre === semestreFiltro)
  const porSemestre = useMemo(() => {
    const mapa = new Map<string, typeof db.materias>()
    for (const m of materiasFiltradas) {
      const lista = mapa.get(m.semestre) ?? []
      lista.push(m)
      mapa.set(m.semestre, lista)
    }
    return [...mapa.entries()]
  }, [materiasFiltradas])

  const abrirDesdeLibreria = (materiaId: string, unidadId: string, temaId: string) => {
    const m = db.materias.find((x) => x.id === materiaId)
    if (m) setSemestreFiltro(m.semestre)
    setMateriaExp(materiaId)
    setAbrirTema({ unidadId, temaId })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Asistencias: últimos 4 días (se desplazan con la fecha)
  const diasAsistencia = useMemo(() => Array.from({ length: 4 }, (_, i) => enDias(i - 3)), [])
  const asisMateria = db.asistencias.filter((a) => a.materia_id === materiaAsistencia)
  const marcas = diasAsistencia.map((f) => asisMateria.find((a) => a.fecha === f)?.estado ?? null)
  const marcados = marcas.filter((m) => m !== null)
  const pctAsistencia = marcados.length ? Math.round((marcados.filter((m) => m === 'presente').length / marcados.length) * 100) : 0
  const faltas = marcados.filter((m) => m === 'ausente').length
  let racha = 0
  for (let i = marcas.length - 1; i >= 0; i--) {
    if (marcas[i] === 'presente') racha++
    else if (marcas[i] === 'ausente') break
  }

  const ciclarAsistencia = (fecha: string) => {
    const actual = asisMateria.find((a) => a.fecha === fecha)?.estado ?? null
    const idx = ASISTENCIA_CICLO.indexOf(actual)
    const siguiente = ASISTENCIA_CICLO[(idx + 1) % ASISTENCIA_CICLO.length]
    if (siguiente === null) removeAsistencia(materiaAsistencia, fecha)
    else setAsistencia(materiaAsistencia, fecha, siguiente)
  }

  // Asistencia por día: clic marca presente en TODAS las materias con clase ese día
  const materiasDelDia = (fecha: string) => {
    const numDia = (new Date(fecha + 'T00:00:00').getDay() + 6) % 7 + 1
    return db.materias.filter((m) => (m.bloques ?? []).some((b) => b.dia === numDia))
  }
  const marcarDia = (fecha: string) => {
    const mats = materiasDelDia(fecha)
    if (!mats.length) return
    mats.forEach((m) => setAsistencia(m.id, fecha, 'presente'))
  }

  // Horario semanal: grid días × horas
  const posicionBloque = (b: BloqueHorario) => {
    const ini = Number(b.inicio.slice(0, 2)) * 60 + Number(b.inicio.slice(3, 5))
    const fin = Number(b.fin.slice(0, 2)) * 60 + Number(b.fin.slice(3, 5))
    return { top: ((ini - 480) / 60) * 44, height: Math.max(22, ((fin - ini) / 60) * 44) }
  }

  const agregarBloque = () => {
    if (bloqueFin <= bloqueInicio) return
    setBloques((prev) => [...prev, { dia: bloqueDia, inicio: bloqueInicio, fin: bloqueFin }])
  }
  const quitarBloque = (i: number) => setBloques((prev) => prev.filter((_, j) => j !== i))

  const crear = () => {
    if (!fNombre.trim()) return
    addMateria({
      nombre: fNombre.trim(),
      semestre: fSemestre,
      docente: fDocente || '—',
      horario: bloques.map((b) => `${DIAS_SEMANA[b.dia - 1]} ${b.inicio}`).join(' · ') || '—',
      bloques,
      creditos: fCreditos,
      color: 'area-univ',
      unidades: [],
    })
    setFNombre(''); setFDocente(''); setBloques([])
    setNuevaMateria(false)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero académico */}
      <section className="theme-card relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-area-freelance/5 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
                MODULE_SYS_ACAD_03
              </span>
              <span className="font-mono text-[10px] text-ink-3">FACULTAD DE INGENIERÍA EN CIENCIAS DE LA COMPUTACIÓN</span>
            </div>
            <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Academic Core <span className="text-area-univ">/</span> Sistemas
            </h1>
            <p className="font-mono text-[11px] text-ink-3">INGENIERÍA DE SISTEMAS · SEMESTRE VIII · UAGRM SCZ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icono="sync" onClick={() => setNuevaMateria(true)}>
              Nueva materia
            </Button>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { etiqueta: 'Promedio acumulado', valor: '91.4', sub: '/ 100 · Honores', color: 'rgb(var(--area-personal))', icono: 'trending_up' },
            { etiqueta: 'Créditos de grado', valor: '180', sub: '/ 220 CR · 82%', color: 'rgb(var(--area-freelance))', icono: 'school' },
            { etiqueta: 'Carga activa', valor: String(db.materias.length), sub: 'materias · 26 h/sem', color: 'rgb(var(--ink))', icono: 'view_timeline' },
            { etiqueta: 'Entregas críticas', valor: String(pendientes.length), sub: '/ 7 días', color: 'rgb(var(--prio-high))', icono: 'warning' },
            { etiqueta: 'Próximo parcial', valor: 'SD', sub: 'T-minus ' + (diasRestantes(db.eventos.find((e) => e.titulo.includes('Examen'))?.fecha ?? null) ?? '—') + 'd', color: 'rgb(var(--area-univ))', icono: 'timer' },
          ].map((m) => (
            <div key={m.etiqueta} className="flex flex-col justify-between border border-line bg-surface-2 p-3">
              <div className="flex items-center justify-between">
                <span className="mono-label text-[9px] text-ink-3">{m.etiqueta}</span>
                <Icon name={m.icono} className="text-[15px] text-ink-3" />
              </div>
              <span className="my-1 font-mono text-2xl font-bold" style={{ color: m.color }}>{m.valor}</span>
              <span className="font-mono text-[10px] text-ink-3">{m.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Librería de unidades y temas (búsqueda rápida) ===== */}
      <Libreria db={db} onAbrir={abrirDesdeLibreria} />

      {/* ===== Materias divididas por semestre ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="menu_book" className="text-[20px] text-ink-2" />
          <h2 className="mono-label text-[12px] font-bold">Materias por semestre</h2>
          <span className="font-mono text-[10px] text-ink-3">{db.materias.length} inscritas</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSemestreFiltro('todos')}
            className={`border border-line px-2 py-1 font-mono text-[10px] font-bold uppercase ${semestreFiltro === 'todos' ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink'}`}
          >
            Todos
          </button>
          {semestres.map((s) => (
            <button
              key={s}
              onClick={() => setSemestreFiltro(s)}
              className={`border border-line px-2 py-1 font-mono text-[10px] font-bold uppercase ${semestreFiltro === s ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {porSemestre.map(([semestre, materias]) => (
        <section key={semestre} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-l-2 border-area-univ bg-surface-2 px-3 py-2">
            <Icon name="school" className="text-[16px] text-area-univ" />
            <h3 className="font-display text-sm font-black uppercase tracking-tight">Semestre {semestre}</h3>
            <span className="font-mono text-[10px] text-ink-3">{materias.length} materias</span>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {materias.map((m) => {
              const bloquesMateria = (m.bloques ?? []).map((b) => `${DIAS_SEMANA[b.dia - 1]} ${b.inicio}–${b.fin}`)
              const fichaMateria = db.fichas.find((f) => f.tipo === 'nota' && f.entidad_id === m.id)
              const unidadesM = m.unidades ?? []
              const temasM = unidadesM.reduce((a, u) => a + (u.temas ?? []).length, 0)
              const expandida = materiaExp === m.id
              return (
                <div key={m.id} className="theme-card flex flex-col gap-2 p-4">
                  <button
                    onClick={() => { setMateriaExp(expandida ? null : m.id); if (expandida) setAbrirTema(null) }}
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon name={expandida ? 'expand_more' : 'chevron_right'} className="text-[18px] text-ink-3" />
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-sm font-black uppercase tracking-tight">{m.nombre}</h3>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-ink-3">{m.docente}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-black text-area-univ">{m.semestre}</span>
                      <span className="font-mono text-[9px] text-ink-3">{unidadesM.length}u · {temasM}t</span>
                      {fichaMateria && (
                        <span
                          onClick={(e) => { e.stopPropagation(); setFichaActiva(fichaMateria) }}
                          className="flex cursor-pointer items-center gap-1 border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-area-univ transition-colors hover:border-line-strong"
                          title="Abrir ficha maestra"
                        >
                          <Icon name="description" className="text-[11px]" /> Ficha
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-wrap gap-1">
                    {bloquesMateria.map((b) => (
                      <span key={b} className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-ink-2">◷ {b}</span>
                    ))}
                    {!bloquesMateria.length && <span className="font-mono text-[9px] text-ink-3">{m.horario}</span>}
                  </div>

                  {expandida && (
                    <div className="border-t border-line pt-3">
                      <MateriaExplorer
                        materia={m}
                        db={db}
                        abrirTema={abrirTema}
                        addUnidad={addUnidad}
                        updateUnidad={updateUnidad}
                        deleteUnidad={deleteUnidad}
                        addTema={addTema}
                        updateTema={updateTema}
                        deleteTema={deleteTema}
                        addTarea={addTarea}
                        updateTarea={updateTarea}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      {porSemestre.length === 0 && <Empty icono="menu_book" texto="Sin materias para el filtro seleccionado." />}

      {/* ===== Horario semanal + Asistencias (50/50) ===== */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
      <Panel title="Horario semanal" icono="calendar_view_week" extra={<span className="mono-label text-[10px] text-ink-3">bloques por materia</span>}>
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[44px_repeat(7,1fr)] gap-px border border-line bg-line">
              <div />
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="bg-surface-2 py-1.5 text-center font-mono text-[10px] font-bold uppercase text-ink-2">
                  {d}
                </div>
              ))}
              {HORAS.map((h) => {
                return (
                  <div key={h} className="contents">
                    <div className="flex items-start justify-end border-t border-line bg-canvas pr-1.5 pt-1 font-mono text-[9px] text-ink-3">
                      {h}
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7].map((dia) => {
                      const bloque = db.materias
                        .flatMap((m) => (m.bloques ?? []).map((b) => ({ ...b, materia: m })))
                        .find((b) => b.dia === dia && b.inicio.slice(0, 2) === h.slice(0, 2))
                      return (
                        <div key={dia} className="relative h-[38px] border-t border-line bg-canvas/40">
                          {bloque && (
                            <div
                              className="absolute inset-x-0.5 z-10 cursor-pointer overflow-hidden border border-line px-1 pt-0.5 transition-all hover:brightness-125"
                              style={{
                                top: posicionBloque(bloque).top + 20,
                                height: posicionBloque(bloque).height,
                                backgroundColor: 'color-mix(in srgb, rgb(var(--area-univ)) 22%, transparent)',
                                borderLeft: '2px solid rgb(var(--area-univ))',
                              }}
                              title={`${bloque.materia.nombre} · ${bloque.inicio}–${bloque.fin} — clic para abrir`}
                              onClick={() => {
                                const ficha = db.fichas.find((f) => f.tipo === 'nota' && f.entidad_id === bloque.materia.id)
                                if (ficha) setFichaActiva(ficha)
                              }}
                            >
                              <span className="block truncate font-mono text-[8px] font-bold uppercase leading-tight">{bloque.materia.nombre}</span>
                              <span className="font-mono text-[7px] opacity-80">{bloque.inicio}–{bloque.fin}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Panel>

      {/* ===== Asistencias ===== */}
      <Panel
        title="Asistencias"
        icono="fact_check"
        extra={
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-ink-3">{marcados.length}/4 marcados</span>
            <Progress value={pctAsistencia} color="rgb(var(--state-done))" className="!h-1.5 w-16" />
            <span className="font-bold text-state-done">{pctAsistencia}%</span>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {/* Tabs: por materia / por día */}
          <div className="flex border border-line">
            {(['materia', 'dia'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTabAsistencia(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase ${
                  tabAsistencia === t ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Icon name={t === 'materia' ? 'book' : 'today'} className="text-[14px]" />
                {t === 'materia' ? 'Por materia' : 'Por día (todas las clases)'}
              </button>
            ))}
          </div>

          {tabAsistencia === 'materia' ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {db.materias.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMateriaAsistencia(m.id)}
                    className={`border border-line px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
                      materiaAsistencia === m.id ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {m.nombre.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="flex flex-col border border-line bg-surface-2 p-2.5">
                  <span className="mono-label text-[9px] text-ink-3">Asistencia</span>
                  <span className="font-mono text-xl font-bold text-state-done">{pctAsistencia}%</span>
                </div>
                <div className="flex flex-col border border-line bg-surface-2 p-2.5">
                  <span className="mono-label text-[9px] text-ink-3">Racha</span>
                  <span className="font-mono text-xl font-bold text-area-univ">{racha} días</span>
                </div>
                <div className="flex flex-col border border-line bg-surface-2 p-2.5">
                  <span className="mono-label text-[9px] text-ink-3">Faltas</span>
                  <span className="font-mono text-xl font-bold text-prio-high">{faltas}</span>
                </div>
                <div className="flex flex-col border border-line bg-surface-2 p-2.5">
                  <span className="mono-label text-[9px] text-ink-3">Presente hoy</span>
                  <span className="font-mono text-xl font-bold text-area-freelance">
                    {marcas.filter((m) => m === 'presente').length}/4
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {diasAsistencia.map((fecha, i) => {
                  const estado = marcas[i]
                  const dia = new Date(fecha + 'T00:00:00')
                  const finde = dia.getDay() === 0 || dia.getDay() === 6
                  const style = estado ? ASISTENCIA_STYLE[estado] : null
                  return (
                    <button
                      key={fecha}
                      onClick={() => ciclarAsistencia(fecha)}
                      title={`${dia.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} — ${style?.label ?? 'sin marcar'} (clic para cambiar)`}
                      className={`day-chip flex aspect-square cursor-pointer flex-col items-center justify-center border border-line transition-all ${
                        finde ? 'opacity-45' : ''
                      } ${style ? 'shadow-hard' : 'bg-surface-2 hover:bg-surface-3'}`}
                      style={
                        style
                          ? {
                              backgroundColor: `color-mix(in srgb, ${style.color} 18%, transparent)`,
                              color: style.color,
                              borderColor: `color-mix(in srgb, ${style.color} 55%, rgb(var(--line)))`,
                            }
                          : undefined
                      }
                    >
                      <span className="mono-label text-[9px] font-bold">{dia.toLocaleDateString('es-ES', { day: '2-digit' })}</span>
                      {style && <Icon name={style.icono} className="text-[13px]" />}
                      <span className="hidden font-mono text-[8px] uppercase sm:block">{dia.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    </button>
                  )
                })}
              </div>
              <p className="font-mono text-[9px] text-ink-3">
                Clic en un día: cicla Presente → Ausente → Justificado → sin marca.
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-[10px] text-ink-2">
                Un clic en un día marca <span className="font-bold text-state-done">presente</span> en{' '}
                <span className="font-bold">todas las materias con clase ese día</span> (según el horario semanal).
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {diasAsistencia.map((fecha) => {
                  const dia = new Date(fecha + 'T00:00:00')
                  const mats = materiasDelDia(fecha)
                  const presentes = mats.filter((m) => db.asistencias.some((a) => a.materia_id === m.id && a.fecha === fecha && a.estado === 'presente')).length
                  const finde = dia.getDay() === 0 || dia.getDay() === 6
                  const completo = mats.length > 0 && presentes === mats.length
                  const pctDia = mats.length ? Math.round((presentes / mats.length) * 100) : 0
                  return (
                    <button
                      key={fecha}
                      data-fecha={fecha}
                      onClick={() => marcarDia(fecha)}
                      disabled={!mats.length}
                      title={
                        mats.length
                          ? `${dia.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} · ${mats.length} materias (${presentes}/${mats.length} presentes) — clic marca todas`
                          : 'Sin clases este día'
                      }
                      className={`day-chip flex aspect-square cursor-pointer flex-col items-center justify-center border border-line transition-all ${
                        !mats.length ? 'cursor-not-allowed opacity-30' : 'bg-surface-2 hover:bg-surface-3'
                      } ${finde ? 'opacity-60' : ''}`}
                      style={
                        completo
                          ? { backgroundColor: 'color-mix(in srgb, rgb(var(--state-done)) 20%, transparent)', color: 'rgb(var(--state-done))', borderColor: 'rgb(var(--state-done))' }
                          : pctDia > 0
                            ? { backgroundColor: 'color-mix(in srgb, rgb(var(--area-univ)) 15%, transparent)', color: 'rgb(var(--area-univ))' }
                            : undefined
                      }
                    >
                      <span className="mono-label text-[9px] font-bold">{dia.toLocaleDateString('es-ES', { day: '2-digit' })}</span>
                      {mats.length > 0 && (
                        <span className="font-mono text-[9px] font-bold">
                          {presentes}/{mats.length}
                        </span>
                      )}
                      <span className="hidden font-mono text-[8px] uppercase sm:block">{dia.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Tareas académicas */}
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Tareas — Universidad" icono="assignment_turned_in" extra={
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-3">{pct}% completado</span>
              <Progress value={pct} color="rgb(var(--area-univ))" className="!h-1.5 w-20" />
              <Button variant="primary" size="sm" icono="add_box" onClick={() => setNuevaTarea(true)}>Tarea</Button>
            </div>
          }>
            <div className="vlist space-y-1.5 pr-1">
              {tareasUniv.map((t) => {
                const ficha = db.fichas.find((f) => f.tipo === 'tarea' && f.entidad_id === t.id)
                return (
                  <div key={t.id} className="flex items-center justify-between gap-2 border border-line bg-surface-2 p-2.5">
                    <div className="min-w-0">
                      <div className={`truncate text-[12px] font-semibold ${t.estado === 'hecho' ? 'line-through text-ink-3' : ''}`}>
                        {t.titulo}
                      </div>
                      <div className="font-mono text-[10px] text-ink-3">
                        {t.fecha_limite && `${formatearFecha(t.fecha_limite)} · `}{db.proyectos.find((p) => p.id === t.proyecto_id)?.nombre ?? '—'}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {ficha && (
                        <button
                          onClick={() => setFichaActiva(ficha)}
                          className="cursor-pointer border border-line bg-canvas px-2 py-1 font-mono text-[9px] font-bold uppercase text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                          title="Abrir ficha de la tarea"
                        >
                          Ficha
                        </button>
                      )}
                      <button
                        onClick={() => updateTarea(t.id, { estado: t.estado === 'hecho' ? 'por_hacer' : 'hecho', cerrada_en: t.estado === 'hecho' ? null : new Date().toISOString() })}
                        className={`cursor-pointer border border-line px-2 py-1 font-mono text-[9px] font-black uppercase transition-colors ${
                          t.estado === 'hecho' ? 'bg-area-personal/15 text-area-personal' : 'bg-canvas text-ink-3 hover:text-ink'
                        }`}
                      >
                        {t.estado === 'hecho' ? 'Hecho' : 'Marcar hecho'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {tareasUniv.length === 0 && <Empty texto="Sin tareas académicas." />}
            </div>
          </Panel>
        </div>

        {/* Apuntes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="sticky_note_2" className="text-[20px] text-ink-2" />
              <h2 className="mono-label text-[12px] font-bold">Apuntes</h2>
            </div>
            <Button variant="soft" size="sm" icono="note_add" onClick={() => setNuevaNota(true)}>Nota</Button>
          </div>
          <div className="vlist space-y-3 pr-1">
            {notasUniv.map((n) => (
              <div key={n.id} className="theme-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge color="rgb(var(--area-univ))">{n.tipo}</Badge>
                  <Badge color={n.estado === 'publicado' ? 'rgb(var(--state-done))' : n.estado === 'revisado' ? 'rgb(var(--state-doing))' : 'rgb(var(--state-todo))'}>{n.estado}</Badge>
                </div>
                <h3 className="mt-2 font-display text-sm font-black uppercase tracking-tight">{n.titulo}</h3>
                <p className="mt-1 line-clamp-2 font-mono text-[10px] text-ink-3">{n.resumen || n.contenido_md.slice(0, 90)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {n.etiquetas.map((e) => (
                    <span key={e} className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-ink-2">#{e}</span>
                  ))}
                </div>
              </div>
            ))}
            {notasUniv.length === 0 && <Empty icono="sticky_note_2" texto="Sin apuntes todavía." />}
          </div>
        </div>
      </div>

      {/* Modal nueva materia con bloques de horario */}
      <Modal open={nuevaMateria} onClose={() => setNuevaMateria(false)} title="Nueva materia" ancho="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre"><TextInput value={fNombre} onChange={(e) => setFNombre(e.target.value)} placeholder="Nombre de la materia" autoFocus /></Field>
            <Field label="Docente"><TextInput value={fDocente} onChange={(e) => setFDocente(e.target.value)} /></Field>
            <Field label="Semestre">
              <Select value={fSemestre} onChange={(e) => setFSemestre(e.target.value)}>
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Créditos">
              <Select value={fCreditos} onChange={(e) => setFCreditos(Number(e.target.value))}>
                <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option>
              </Select>
            </Field>
          </div>

          {/* Selector de bloques: días de la semana + hora */}
          <div className="border border-line bg-surface-2 p-3">
            <span className="mono-label text-[10px] text-ink-3">Horario — puede llevarse varias veces por semana</span>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Día">
                <div className="flex gap-1">
{DIAS_SEMANA.map((d, di) => (
                    <button
                      key={d}
                      onClick={() => setBloqueDia(di + 1)}
                      className={`flex-1 border border-line py-1 font-mono text-[10px] font-bold ${bloqueDia === di + 1 ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Inicio"><TextInput type="time" value={bloqueInicio} onChange={(e) => setBloqueInicio(e.target.value)} /></Field>
              <Field label="Fin"><TextInput type="time" value={bloqueFin} onChange={(e) => setBloqueFin(e.target.value)} /></Field>
            </div>
            <Button variant="soft" size="sm" icono="add" className="mt-2" onClick={agregarBloque}>
              Agregar bloque
            </Button>
            {bloques.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bloques.map((b, i) => (
                  <span key={i} className="flex items-center gap-1 border border-line bg-canvas px-2 py-1 font-mono text-[10px] text-ink-2">
                    {DIAS_SEMANA[b.dia - 1]} {b.inicio}–{b.fin}
                    <button onClick={() => quitarBloque(i)} className="cursor-pointer text-prio-high">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNuevaMateria(false)}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crear}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Modal nueva tarea (tipo to-do) ===== */}
      <Modal open={nuevaTarea} onClose={() => setNuevaTarea(false)} title="Nueva tarea · Universidad">
        <div className="space-y-3">
          <Field label="Título">
            <TextInput value={fTituloTarea} onChange={(e) => setFTituloTarea(e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Materia">
              <Select value={fMateriaTarea} onChange={(e) => setFMateriaTarea(e.target.value)}>
                <option value="">Sin materia</option>
                {db.materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prioridad">
              <Select value={fPrioTarea} onChange={(e) => setFPrioTarea(e.target.value as TareaPrioridad)}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>
            <Field label="Fecha límite">
              <TextInput type="date" value={fFechaLimite} onChange={(e) => setFFechaLimite(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNuevaTarea(false)}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crearTareaUniv}>Crear tarea</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Modal nueva nota ===== */}
      <Modal open={nuevaNota} onClose={() => setNuevaNota(false)} title="Nueva nota · Universidad">
        <div className="space-y-3">
          <Field label="Título">
            <TextInput value={fTituloNota} onChange={(e) => setFTituloNota(e.target.value)} placeholder="Título del apunte" autoFocus />
          </Field>
          <Field label="Contenido (Markdown)">
            <TextArea rows={6} value={fContenidoNota} onChange={(e) => setFContenidoNota(e.target.value)} placeholder="Escribe el apunte de clase..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNuevaNota(false)}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crearNotaUniv}>Crear nota</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Ficha de tarea académica (mockup web/móvil) ===== */}
      {fichaActiva && (
        <FichaDetalle
          ficha={fichaActiva}
          onClose={() => setFichaActiva(null)}
          areaColor="area-univ"
          toggleMini={(secId, miniId) => toggleFichaMiniTarea(fichaActiva.id, secId, miniId)}
          addMini={(secId, titulo) => addFichaMiniTarea(fichaActiva.id, secId, titulo)}
          relacionados={
            fichaActiva.tipo === 'nota'
              ? {
                  etiqueta: 'Tareas de la materia',
                  icono: 'assignment',
                  items: db.tareas
                    .filter((t) => t.proyecto_id === fichaActiva.entidad_id)
                    .map((t) => ({
                      texto: t.titulo,
                      sub: t.estado.replace('_', ' '),
                      color: t.estado === 'hecho' ? 'rgb(var(--state-done))' : t.estado === 'bloqueado' ? 'rgb(var(--state-blocked))' : t.estado === 'en_progreso' ? 'rgb(var(--state-doing))' : 'rgb(var(--state-todo))',
                    })),
                }
              : undefined
          }
        />
      )}
    </div>
  )
}