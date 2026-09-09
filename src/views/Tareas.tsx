import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Badge, Button, Check, AreaBadge, Select, TextInput, Modal, Field, Empty, Progress } from '../components/ui'
import { Popover } from '../components/Popover'
import { FichaDetalle } from '../components/FichaDetalle'
import { DetailHeader, Prop, Tags, DetailActions } from '../components/detail'
import { diasRestantes, estadoTareaLabel, formatearFecha, hoyISO, tareaEstados } from '../lib/utils'
import type { Tarea, TareaEstado, TareaPrioridad, AreaId, Ficha } from '../lib/types'

const ESTADOS: { id: TareaEstado; color: string }[] = [
  { id: 'por_hacer', color: 'rgb(var(--state-todo))' },
  { id: 'en_progreso', color: 'rgb(var(--state-doing))' },
  { id: 'bloqueado', color: 'rgb(var(--state-blocked))' },
  { id: 'hecho', color: 'rgb(var(--state-done))' },
]

export function Tareas() {
  const db = useApp((s) => s.db)
  const addTarea = useApp((s) => s.addTarea)
  const updateTarea = useApp((s) => s.updateTarea)
  const deleteTarea = useApp((s) => s.deleteTarea)
  const moverTarea = useApp((s) => s.moverTarea)
  const toggleSubtarea = useApp((s) => s.toggleSubtarea)
  const addSubtarea = useApp((s) => s.addSubtarea)
  const crearFicha = useApp((s) => s.crearFicha)
  const toggleFichaMiniTarea = useApp((s) => s.toggleFichaMiniTarea)
  const addFichaMiniTarea = useApp((s) => s.addFichaMiniTarea)
  const [fichaActiva, setFichaActiva] = useState<Ficha | null>(null)
  const viewMode = useApp((s) => s.viewMode)
  const setViewMode = useApp((s) => s.setViewMode)

  const [filtroArea, setFiltroArea] = useState<AreaId | 'todas'>('todas')
  const [filtroRapido, setFiltroRapido] = useState<'todas' | 'mi_dia' | 'bloqueadas' | 'alta' | 'hechas'>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [nuevaAbierta, setNuevaAbierta] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TareaEstado | null>(null)
  const [completandoId, setCompletandoId] = useState<string | null>(null)
  const [nuevaSub, setNuevaSub] = useState('')

  // Popover de detalle
  const [detalleAncla, setDetalleAncla] = useState<HTMLElement | null>(null)
  const [tareaActiva, setTareaActiva] = useState<Tarea | null>(null)

  // Form nueva tarea
  const [fTitulo, setFTitulo] = useState('')
  const [fArea, setFArea] = useState<AreaId>('personal')
  const [fProyecto, setFProyecto] = useState('')
  const [fPrioridad, setFPrioridad] = useState<TareaPrioridad>('media')
  const [fLimite, setFLimite] = useState('')

  const tareas = useMemo(() => {
    return db.tareas.filter((t) => {
      if (filtroArea !== 'todas' && t.area_id !== filtroArea) return false
      if (filtroRapido === 'mi_dia' && !t.mi_dia) return false
      if (filtroRapido === 'bloqueadas' && t.estado !== 'bloqueado') return false
      if (filtroRapido === 'alta' && t.prioridad !== 'alta') return false
      if (filtroRapido === 'hechas' && t.estado !== 'hecho') return false
      if (busqueda && !t.titulo.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    })
  }, [db.tareas, filtroArea, filtroRapido, busqueda])

  const porEstado = (estado: TareaEstado) => tareas.filter((t) => t.estado === estado)

  const abrirDetalle = (t: Tarea, el: HTMLElement) => {
    setTareaActiva(t)
    setDetalleAncla(el)
  }

  const completar = (t: Tarea) => {
    setCompletandoId(t.id)
    setTimeout(() => {
      updateTarea(t.id, { estado: 'hecho', arrastrada: false })
      setCompletandoId(null)
    }, 350)
  }

  const crear = () => {
    if (!fTitulo.trim()) return
    addTarea({
      titulo: fTitulo.trim(),
      area_id: fArea,
      proyecto_id: fProyecto || null,
      estado: 'por_hacer',
      prioridad: fPrioridad,
      destacado: false,
      fecha_limite: fLimite || null,
      notas: '',
      etiquetas: [],
      arrastrada: false,
      mi_dia: false,
      subtareas: [],
      recurrencia: null,
      cerrada_en: null,
    })
    setFTitulo('')
    setFProyecto('')
    setFPrioridad('media')
    setFLimite('')
    setNuevaAbierta(false)
  }

  const estadoColor = (estado: TareaEstado) => ESTADOS.find((e) => e.id === estado)?.color

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // TASK_CORE
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-area-personal" /> {db.tareas.filter((t) => t.estado !== 'hecho').length} abiertas
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">Tareas</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-line">
            {(['lista', 'kanban'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase ${
                  viewMode === m ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Icon name={m === 'lista' ? 'view_list' : 'view_kanban'} className="text-[14px]" />
                {m}
              </button>
            ))}
          </div>
          <Button variant="primary" icono="add_box" onClick={() => setNuevaAbierta(true)}>
            Nueva tarea
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <TextInput placeholder="Buscar tarea..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="sm:max-w-56" />
          <div className="flex flex-wrap gap-1.5">
            {(['todas', ...db.areas.map((a) => a.id)] as (AreaId | 'todas')[]).map((a) => (
              <button
                key={a}
                onClick={() => setFiltroArea(a)}
                className={`border border-line px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
                  filtroArea === a ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {a === 'todas' ? 'Todas' : db.areas.find((x) => x.id === a)?.nombre}
              </button>
            ))}
          </div>
        </div>
        {/* Filtros rápidos guardados */}
        <div className="flex flex-wrap gap-1.5">
          {([
            ['todas', 'Todas', 'apps'],
            ['mi_dia', 'Mi día', 'wb_sunny'],
            ['bloqueadas', 'Bloqueadas', 'block'],
            ['alta', 'Alta prioridad', 'flag'],
            ['hechas', 'Hechas (log)', 'history'],
          ] as const).map(([id, label, icono]) => {
            const cuenta =
              id === 'mi_dia' ? db.tareas.filter((t) => t.mi_dia && t.estado !== 'hecho').length
              : id === 'bloqueadas' ? db.tareas.filter((t) => t.estado === 'bloqueado').length
              : id === 'alta' ? db.tareas.filter((t) => t.prioridad === 'alta' && t.estado !== 'hecho').length
              : id === 'hechas' ? db.tareas.filter((t) => t.estado === 'hecho').length
              : 0
            return (
              <button
                key={id}
                onClick={() => setFiltroRapido(id)}
                className={`flex items-center gap-1.5 border border-line px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
                  filtroRapido === id ? 'bg-accent text-on-accent' : 'text-ink-3 hover:text-ink'
                }`}
              >
                <Icon name={icono} className="text-[13px]" />
                {label}
                {id !== 'todas' && <span className="opacity-70">({cuenta})</span>}
              </button>
            )
          })}
        </div>
        {/* Banner día completo */}
        {filtroRapido === 'mi_dia' &&
          db.tareas.filter((t) => t.mi_dia && t.estado !== 'hecho').length === 0 &&
          db.tareas.some((t) => t.mi_dia) && (
            <div className="theme-card flex items-center gap-2 border-line-strong p-3">
              <Icon name="celebration" className="text-[20px] text-state-done" />
              <span className="font-mono text-[11px] font-bold uppercase text-state-done">
                #DíaCompleto — todas las tareas de hoy hechas
              </span>
            </div>
          )}
      </div>

      {viewMode === 'lista' ? (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-canvas font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  <th className="px-3 py-2.5 w-10"></th>
                  <th className="px-3 py-2.5">Tarea</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Área</th>
                  <th className="px-3 py-2.5">Proyecto</th>
                  <th className="px-3 py-2.5">Prioridad</th>
                  <th className="px-3 py-2.5">Plazo</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tareas.map((t: Tarea) => {
                  const dr = diasRestantes(t.fecha_limite)
                  return (
                    <tr key={t.id} className="group transition-colors hover:bg-surface-2">
                      <td className="px-3 py-2.5 text-center">
                        <Check
                          checked={t.estado === 'hecho'}
                          onChange={() => (t.estado === 'hecho' ? updateTarea(t.id, { estado: 'por_hacer' }) : completar(t))}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={(e) => abrirDetalle(t, e.currentTarget)}
                          className="cursor-pointer text-left"
                          title="Ver detalle"
                        >
                          <span
                            className={`strike-anim font-display text-sm font-bold ${t.estado === 'hecho' ? 'strike-on text-ink-3' : ''} ${
                              completandoId === t.id ? 'text-state-done' : ''
                            } ${t.arrastrada && t.estado !== 'hecho' ? 'text-prio-medium' : ''}`}
                          >
                            {t.titulo}
                            {t.arrastrada && t.estado !== 'hecho' && <span className="ml-1.5 font-mono text-[9px] font-bold uppercase">◄ ayer</span>}
                          </span>
                          {t.destacado && <Icon name="star" className="ml-1.5 inline text-[13px] text-area-univ" />}
                          {t.mi_dia && t.estado !== 'hecho' && (
                            <Icon name="wb_sunny" className="ml-1.5 inline text-[13px] text-area-univ" />
                          )}
                          {t.subtareas.length > 0 && (
                            <span className="ml-1.5 inline font-mono text-[9px] font-bold text-ink-3">
                              [{t.subtareas.filter((s) => s.hecha).length}/{t.subtareas.length}]
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge color={estadoColor(t.estado)}>{estadoTareaLabel[t.estado]}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <AreaBadge area={db.areas.find((a) => a.id === t.area_id)?.color ?? 'area-personal'} nombre={db.areas.find((a) => a.id === t.area_id)?.nombre ?? ''} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-ink-2">
                        {db.proyectos.find((p) => p.id === t.proyecto_id)?.nombre ?? '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge color={`rgb(var(--prio-${t.prioridad}))`}>{t.prioridad}</Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">
                        {dr !== null && dr < 0 && t.estado !== 'hecho' ? (
                          <span className="font-bold text-prio-high">Vencida {Math.abs(dr)}d</span>
                        ) : (
                          <span className="text-ink-2">{formatearFecha(t.fecha_limite)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={(e) => abrirDetalle(t, e.currentTarget)} className="cursor-pointer px-1 text-ink-3 hover:text-ink" title="Detalle">
                            <Icon name="info" className="text-[15px]" />
                          </button>
                          <Select
                            value={t.estado}
                            onChange={(e) => moverTarea(t.id, e.target.value as TareaEstado)}
                            className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                          >
                            {tareaEstados.map((e) => (
                              <option key={e} value={e}>{estadoTareaLabel[e]}</option>
                            ))}
                          </Select>
                          <button onClick={() => deleteTarea(t.id)} className="cursor-pointer px-1 text-ink-3 hover:text-prio-high" title="Eliminar">
                            <Icon name="delete" className="text-[15px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {tareas.length === 0 && <Empty texto="No hay tareas con estos filtros." />}
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ESTADOS.map((col) => {
            const items = porEstado(col.id)
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id) }}
                onDragLeave={() => setOverCol(null)}
                onDrop={() => { if (dragId) moverTarea(dragId, col.id); setDragId(null); setOverCol(null) }}
                className={`theme-card flex min-h-40 flex-col p-3 transition-all ${overCol === col.id ? 'border-line-strong shadow-lift' : ''}`}
              >
                <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2" style={{ backgroundColor: col.color }} />
                    <span className="mono-label text-[10px] font-bold">{estadoTareaLabel[col.id]}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-ink-3">{items.length}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={(e) => abrirDetalle(t, e.currentTarget)}
                      className={`theme-card cursor-pointer p-2.5 transition-all hover:-translate-y-0.5 ${
                        t.arrastrada && t.estado !== 'hecho' ? 'border-prio-medium/60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={`text-[12px] font-semibold leading-snug ${t.estado === 'hecho' ? 'line-through text-ink-3' : ''} ${t.arrastrada && t.estado !== 'hecho' ? 'text-prio-medium' : ''}`}>
                          {t.titulo}
                        </span>
                        {t.destacado && <Icon name="star" className="shrink-0 text-[12px] text-area-univ" />}
                      </div>
                      {t.subtareas.length > 0 && t.estado !== 'hecho' && (
                        <div className="mt-1.5">
                          <div className="mb-0.5 flex justify-between font-mono text-[9px] text-ink-3">
                            <span>subtareas</span>
                            <span className="font-bold">{t.subtareas.filter((s) => s.hecha).length}/{t.subtareas.length}</span>
                          </div>
                          <Progress
                            value={(t.subtareas.filter((s) => s.hecha).length / t.subtareas.length) * 100}
                            className="!h-1"
                          />
                        </div>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge color={`rgb(var(--prio-${t.prioridad}))`}>{t.prioridad}</Badge>
                        {t.fecha_limite && (
                          <span className="font-mono text-[9px] text-ink-3">{formatearFecha(t.fecha_limite)}</span>
                        )}
                      </div>
                      <div className="mt-1.5 font-mono text-[9px] text-ink-3">
                        {db.proyectos.find((p) => p.id === t.proyecto_id)?.nombre ?? 'Sin proyecto'}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="flex flex-1 items-center justify-center border border-dashed border-line-strong p-4 font-mono text-[10px] text-ink-3">
                      Arrastra tareas aquí
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== Popover detalle de tarea ===== */}
      <Popover anchor={detalleAncla} onClose={() => { setDetalleAncla(null); setTareaActiva(null) }}>
        {tareaActiva && (
          <div className="flex flex-col gap-2.5">
            <DetailHeader
              icono="task_alt"
              color={estadoColor(tareaActiva.estado) ?? 'rgb(var(--accent))'}
              titulo={
                <input
                  value={tareaActiva.titulo}
                  onChange={(e) => updateTarea(tareaActiva.id, { titulo: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 font-display text-sm font-black uppercase tracking-tight outline-none"
                />
              }
              sub={`${db.areas.find((a) => a.id === tareaActiva.area_id)?.nombre ?? ''} · ${
                db.proyectos.find((p) => p.id === tareaActiva.proyecto_id)?.nombre ?? 'sin proyecto'
              }`}
              onClose={() => { setDetalleAncla(null); setTareaActiva(null) }}
            />
            <div>
              <Prop label="Estado">
                <Select
                  value={tareaActiva.estado}
                  onChange={(e) => {
                    const nuevo = e.target.value as TareaEstado
                    updateTarea(tareaActiva.id, {
                      estado: nuevo,
                      arrastrada: nuevo === 'hecho' ? false : tareaActiva.arrastrada,
                      cerrada_en: nuevo === 'hecho' ? new Date().toISOString() : tareaActiva.cerrada_en,
                    })
                  }}
                  className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                >
                  {tareaEstados.map((e) => (
                    <option key={e} value={e}>{estadoTareaLabel[e]}</option>
                  ))}
                </Select>
              </Prop>
              <Prop label="Prioridad">
                <Select
                  value={tareaActiva.prioridad}
                  onChange={(e) => updateTarea(tareaActiva.id, { prioridad: e.target.value as TareaPrioridad })}
                  className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </Select>
              </Prop>
              <Prop label="Fecha límite">
                <input
                  type="date"
                  value={tareaActiva.fecha_limite ?? ''}
                  onChange={(e) => updateTarea(tareaActiva.id, { fecha_limite: e.target.value || null, arrastrada: false })}
                  className="border-0 bg-transparent p-0 font-mono text-[11px] outline-none [color-scheme:dark]"
                />
              </Prop>
              {tareaActiva.arrastrada && tareaActiva.estado !== 'hecho' && (
                <Prop label="Origen">
                  <span className="inline-flex items-center gap-1 font-bold text-prio-medium">
                    <Icon name="history" className="text-[12px]" /> Pendiente de ayer (arrastrada)
                  </span>
                </Prop>
              )}
              {tareaActiva.cerrada_en && (
                <Prop label="Cerrada">
                  {new Date(tareaActiva.cerrada_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Prop>
              )}
              <Prop label="Área">
                <Select
                  value={tareaActiva.area_id}
                  onChange={(e) => updateTarea(tareaActiva.id, { area_id: e.target.value as AreaId })}
                  className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                >
                  {db.areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </Select>
              </Prop>
            </div>
            {/* Sub-tareas */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="mono-label text-[9px] text-ink-3">
                  Sub-tareas {tareaActiva.subtareas.length > 0 && `[${tareaActiva.subtareas.filter((s) => s.hecha).length}/${tareaActiva.subtareas.length}]`}
                </span>
                {tareaActiva.subtareas.length > 0 && (
                  <Progress
                    value={(tareaActiva.subtareas.filter((s) => s.hecha).length / tareaActiva.subtareas.length) * 100}
                    className="!h-1 w-20"
                  />
                )}
              </div>
              <div className="space-y-1">
                {(tareaActiva.subtareas ?? []).map((st) => (
                  <div key={st.id} className="flex items-center gap-2">
                    <Check checked={st.hecha} onChange={() => toggleSubtarea(tareaActiva.id, st.id)} />
                    <span className={`text-[11px] font-medium ${st.hecha ? 'strike-anim strike-on text-ink-3' : ''}`}>{st.titulo}</span>
                  </div>
                ))}
                <div className="flex gap-1 pt-0.5">
                  <TextInput
                    value={nuevaSub}
                    onChange={(e) => setNuevaSub(e.target.value)}
                    placeholder="Añadir paso..."
                    className="!py-1 !text-[11px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && nuevaSub.trim()) {
                        addSubtarea(tareaActiva.id, nuevaSub.trim())
                        setNuevaSub('')
                      }
                    }}
                  />
                  <Button
                    variant="soft"
                    size="sm"
                    icono="add"
                    onClick={() => {
                      if (nuevaSub.trim()) {
                        addSubtarea(tareaActiva.id, nuevaSub.trim())
                        setNuevaSub('')
                      }
                    }}
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <span className="mono-label text-[9px] text-ink-3">Notas (auto-guardado)</span>
              <textarea
                value={tareaActiva.notas}
                onChange={(e) => updateTarea(tareaActiva.id, { notas: e.target.value })}
                rows={2}
                placeholder="Contexto, detalles..."
                className="mt-1 w-full resize-none border border-line bg-canvas p-2 font-mono text-[11px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
              />
            </div>
            <Tags
              items={tareaActiva.etiquetas}
              color={estadoColor(tareaActiva.estado) ?? 'rgb(var(--accent))'}
            />
            <DetailActions>
              {(() => {
                const ficha = db.fichas.find((f) => f.tipo === 'tarea' && f.entidad_id === tareaActiva.id)
                if (ficha) {
                  return (
                    <Button variant="ghost" size="sm" icono="description" onClick={() => { setDetalleAncla(null); setTareaActiva(null); setFichaActiva(ficha) }}>
                      Abrir ficha
                    </Button>
                  )
                }
                return (
                  <Button
                    variant="ghost"
                    size="sm"
                    icono="add_task"
                    onClick={() => {
                      const ficha = crearFicha({
                        tipo: 'tarea',
                        entidad_id: tareaActiva.id,
                        titulo: tareaActiva.titulo,
                        subtitulo: `Ficha de Tarea · ${db.areas.find((a) => a.id === tareaActiva.area_id)?.nombre ?? ''}`,
                        area_id: tareaActiva.area_id,
                        estado: estadoTareaLabel[tareaActiva.estado].toUpperCase(),
                        descripcion: tareaActiva.notas,
                      })
                      setDetalleAncla(null)
                      setTareaActiva(null)
                      setFichaActiva(ficha)
                    }}
                  >
                    Crear ficha
                  </Button>
                )
              })()}
              <Button
                variant="ghost"
                size="sm"
                icono="delete"
                onClick={() => { deleteTarea(tareaActiva.id); setDetalleAncla(null); setTareaActiva(null) }}
              >
                Eliminar
              </Button>
              <Button
                variant={tareaActiva.mi_dia ? 'soft' : 'ghost'}
                size="sm"
                icono="wb_sunny"
                onClick={() => updateTarea(tareaActiva.id, { mi_dia: !tareaActiva.mi_dia })}
              >
                {tareaActiva.mi_dia ? 'En Mi día' : 'Añadir a Mi día'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icono="calendar_today"
                onClick={() => updateTarea(tareaActiva.id, { fecha_limite: hoyISO(), arrastrada: false })}
              >
                Mover a hoy
              </Button>
              {tareaActiva.estado !== 'hecho' ? (
                <Button variant="primary" size="sm" icono="done" onClick={() => { completar(tareaActiva); setDetalleAncla(null); setTareaActiva(null) }}>
                  Completar
                </Button>
              ) : (
                <Button variant="soft" size="sm" icono="replay" onClick={() => updateTarea(tareaActiva.id, { estado: 'por_hacer', cerrada_en: null })}>
                  Reabrir
                </Button>
              )}
            </DetailActions>
          </div>
        )}
      </Popover>

      {/* Modal nueva tarea */}
      <Modal open={nuevaAbierta} onClose={() => setNuevaAbierta(false)} title="Nueva tarea">
        <div className="space-y-3">
          <Field label="Título">
            <TextInput value={fTitulo} onChange={(e) => setFTitulo(e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Área">
              <Select value={fArea} onChange={(e) => setFArea(e.target.value as AreaId)}>
                {db.areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Proyecto">
              <Select value={fProyecto} onChange={(e) => setFProyecto(e.target.value)}>
                <option value="">Sin proyecto</option>
                {db.proyectos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prioridad">
              <Select value={fPrioridad} onChange={(e) => setFPrioridad(e.target.value as TareaPrioridad)}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </Select>
            </Field>
            <Field label="Fecha límite">
              <TextInput type="date" value={fLimite} onChange={(e) => setFLimite(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNuevaAbierta(false)}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crear}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Ficha de tarea ===== */}
      {fichaActiva && (
        <FichaDetalle
          ficha={fichaActiva}
          onClose={() => setFichaActiva(null)}
          areaColor="area-personal"
          toggleMini={(secId, miniId) => toggleFichaMiniTarea(fichaActiva.id, secId, miniId)}
          addMini={(secId, titulo) => addFichaMiniTarea(fichaActiva.id, secId, titulo)}
        />
      )}
    </div>
  )
}