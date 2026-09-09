import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Badge, Button, Progress, AreaBadge, Select, TextInput, Modal, Field, TextArea, Empty } from '../components/ui'
import { FichaDetalle } from '../components/FichaDetalle'
import { diasRestantes, estadoProyectoLabel, formatearFecha, proyectoEstados } from '../lib/utils'
import type { Proyecto, ProyectoEstado, AreaId, TareaPrioridad, Ficha } from '../lib/types'

const ESTADOS: { id: ProyectoEstado; color: string }[] = [
  { id: 'idea', color: 'rgb(var(--state-todo))' },
  { id: 'activo', color: 'rgb(var(--state-doing))' },
  { id: 'pausado', color: 'rgb(var(--area-univ))' },
  { id: 'completado', color: 'rgb(var(--state-done))' },
  { id: 'archivado', color: 'rgb(var(--ink-3))' },
]

export function Proyectos() {
  const db = useApp((s) => s.db)
  const addProyecto = useApp((s) => s.addProyecto)
  const updateProyecto = useApp((s) => s.updateProyecto)
  const crearFicha = useApp((s) => s.crearFicha)
  const toggleFichaMiniTarea = useApp((s) => s.toggleFichaMiniTarea)
  const addFichaMiniTarea = useApp((s) => s.addFichaMiniTarea)
  const [fichaActiva, setFichaActiva] = useState<Ficha | null>(null)
  const viewMode = useApp((s) => s.viewMode)
  const setViewMode = useApp((s) => s.setViewMode)
  const [modo, setModo] = useState<'lista' | 'kanban' | 'timeline'>(viewMode)

  const [filtroEstado, setFiltroEstado] = useState<ProyectoEstado | 'todos'>('todos')
  const [filtroArea, setFiltroArea] = useState<AreaId | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<Proyecto | null>(null)
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<ProyectoEstado | null>(null)

  // Form nuevo proyecto
  const [fNombre, setFNombre] = useState('')
  const [fArea, setFArea] = useState<AreaId>('emprendimiento')
  const [fTipo, setFTipo] = useState('Producto propio')
  const [fDesc, setFDesc] = useState('')
  const [fPrioridad, setFPrioridad] = useState<TareaPrioridad>('media')
  const [fLimite, setFLimite] = useState('')
  const [fStack, setFStack] = useState('')

  const proyectos = useMemo(
    () =>
      db.proyectos.filter((p) => {
        if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
        if (filtroArea !== 'todos' && p.area_id !== filtroArea) return false
        if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
        return true
      }),
    [db.proyectos, filtroEstado, filtroArea, busqueda]
  )

  const pctAvance = (p: Proyecto) => {
    const tareas = db.tareas.filter((t) => t.proyecto_id === p.id)
    if (!tareas.length) return p.estado === 'completado' ? 100 : 0
    return Math.round((tareas.filter((t) => t.estado === 'hecho').length / tareas.length) * 100)
  }

  const crear = () => {
    if (!fNombre.trim()) return
    const id = `proy-${Date.now().toString(36)}`
    addProyecto({
      id,
      nombre: fNombre.trim(),
      area_id: fArea,
      tipo: fTipo,
      estado: 'idea',
      prioridad: fPrioridad,
      destacado: false,
      fecha_inicio: null,
      fecha_limite: fLimite || null,
      stack: fStack.split(',').map((s) => s.trim()).filter(Boolean),
      descripcion: fDesc,
    })
    // Genera la ficha estándar según el tipo del proyecto
    const plantilla =
      fTipo.includes('Producto propio') || fTipo.includes('Investigación') ? 'saas'
      : fTipo.includes('Cliente freelance') ? 'freelance'
      : fTipo.includes('Universidad') ? 'universidad'
      : 'personal'
    crearFicha({
      tipo: 'proyecto',
      entidad_id: id,
      titulo: fNombre.trim(),
      subtitulo: `Ficha de Proyecto · ${fTipo}`,
      area_id: fArea,
      estado: 'IDEA',
      descripcion: fDesc,
    }, plantilla)
    setFNombre(''); setFDesc(''); setFLimite(''); setFStack('')
    setNuevoAbierto(false)
  }

  const tareasDelProyecto = (id: string) => db.tareas.filter((t) => t.proyecto_id === id)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // ROADMAP_CORE
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-area-emprende" /> {db.proyectos.filter((p) => p.estado === 'activo').length} activos
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">Proyectos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-line">
            {(['lista', 'kanban', 'timeline'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModo(m)
                  setViewMode(m === 'timeline' ? viewMode : m)
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase ${
                  modo === m ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Icon name={m === 'lista' ? 'view_list' : m === 'kanban' ? 'view_kanban' : 'view_timeline'} className="text-[14px]" />
                {m}
              </button>
            ))}
          </div>
          <Button variant="primary" icono="add_box" onClick={() => setNuevoAbierto(true)}>
            Nuevo proyecto
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TextInput placeholder="Buscar proyecto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="sm:max-w-56" />
        <div className="flex flex-wrap gap-1.5">
          {(['todos', ...proyectoEstados] as (ProyectoEstado | 'todos')[]).map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={`border border-line px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
                filtroEstado === e ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink'
              }`}
            >
              {e === 'todos' ? 'Todos' : estadoProyectoLabel[e]}
            </button>
          ))}
        </div>
        {/* Filtro por área: evita mezclar freelance y emprendimiento */}
        <div className="flex flex-wrap gap-1.5">
          {(['todos', 'emprendimiento', 'freelance', 'universidad', 'personal'] as (AreaId | 'todos')[]).map((a) => (
            <button
              key={a}
              onClick={() => setFiltroArea(a)}
              className={`border border-line px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
                filtroArea === a ? 'bg-area-emprende/15 text-ink' : 'text-ink-3 hover:text-ink'
              }`}
            >
              {a === 'todos' ? 'Todas las áreas' : db.areas.find((x) => x.id === a)?.nombre ?? a}
            </button>
          ))}
        </div>
      </div>

      {modo === 'lista' ? (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-canvas font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  <th className="px-3 py-2.5">Proyecto</th>
                  <th className="px-3 py-2.5">Área</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Prioridad</th>
                  <th className="px-3 py-2.5">Avance</th>
                  <th className="px-3 py-2.5">Límite</th>
                  <th className="px-3 py-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {proyectos.map((p) => {
                  const color = db.areas.find((a) => a.id === p.area_id)?.color ?? 'area-personal'
                  return (
                    <tr key={p.id} className="cursor-pointer transition-colors hover:bg-surface-2" onClick={() => setAbierto(p)}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Icon name={p.estado === 'completado' ? 'rocket_launch' : 'construction'} className={`text-[17px] ${p.estado === 'completado' ? 'text-area-personal' : ''}`} />
                          <div>
                            <div className="font-display text-sm font-bold">
                              {p.nombre} {p.destacado && <Icon name="star" className="inline text-[12px] text-area-univ" />}
                            </div>
                            <div className="font-mono text-[10px] text-ink-3">{p.tipo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <AreaBadge area={color} nombre={db.areas.find((a) => a.id === p.area_id)?.nombre ?? ''} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge color={ESTADOS.find((e) => e.id === p.estado)?.color}>{estadoProyectoLabel[p.estado]}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge color={`rgb(var(--prio-${p.prioridad}))`}>{p.prioridad}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Progress value={pctAvance(p)} color={`rgb(var(--${color}))`} className="!h-1.5 w-24" />
                          <span className="font-mono text-[10px] font-bold" style={{ color: `rgb(var(--${color}))` }}>
                            {pctAvance(p)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-ink-2">{formatearFecha(p.fecha_limite)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="soft" size="sm">Open</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {proyectos.length === 0 && <Empty icono="rocket_launch" texto="No hay proyectos con estos filtros." />}
          </div>
        </Panel>
      ) : modo === 'timeline' ? (
        /* ===== Vista timeline (mini-Gantt) ===== */
        <Panel title="Línea de tiempo" icono="view_timeline" extra={<span className="mono-label text-[10px] text-ink-3">últimos 60 días · inicio → límite</span>}>
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {/* Eje de semanas */}
              <div className="mb-1 flex">
                <div className="w-52 shrink-0" />
                <div className="flex flex-1">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="flex-1 border-l border-line px-1 font-mono text-[9px] text-ink-3">
                      S-{8 - i}
                    </div>
                  ))}
                </div>
              </div>
              {proyectos.map((p) => {
                const color = db.areas.find((a) => a.id === p.area_id)?.color ?? 'area-personal'
                const inicio = p.fecha_inicio ? new Date(p.fecha_inicio + 'T00:00:00') : null
                const fin = p.fecha_limite ? new Date(p.fecha_limite + 'T00:00:00') : null
                const hoyT = new Date()
                hoyT.setHours(0, 0, 0, 0)
                const base = new Date(hoyT)
                base.setDate(base.getDate() - 60)
                const dias = 60
                const xInicio = inicio && inicio >= base ? Math.max(0, Math.min(1, (inicio.getTime() - base.getTime()) / 86400000 / dias)) : 0
                const xFin = fin && fin >= base ? Math.max(0, Math.min(1, (fin.getTime() - base.getTime()) / 86400000 / dias)) : inicio ? Math.max(xInicio, 0.25) : 0.25
                const anchoBarra = Math.max(4, (xFin - xInicio) * 100)
                const xHoy = Math.max(0, Math.min(1, (hoyT.getTime() - base.getTime()) / 86400000 / dias)) * 100
                return (
                  <div key={p.id} className="flex items-center gap-2 border-t border-line py-2">
                    <div className="w-52 shrink-0">
                      <button onClick={() => setAbierto(p)} className="block cursor-pointer text-left">
                        <span className="block truncate font-display text-[12px] font-black uppercase tracking-tight">{p.nombre}</span>
                        <span className="font-mono text-[9px] text-ink-3">{p.tipo}</span>
                      </button>
                    </div>
                    <div className="relative flex-1">
                      <div className="h-5 border border-line bg-surface-2">
                        <div
                          className="relative h-full cursor-pointer"
                          style={{
                            marginLeft: `${xInicio * 100}%`,
                            width: `${anchoBarra}%`,
                            backgroundColor: `color-mix(in srgb, rgb(var(--${color})) 30%, transparent)`,
                            borderLeft: `2px solid rgb(var(--${color}))`,
                          }}
                          onClick={() => setAbierto(p)}
                          title={`${p.nombre} · ${p.fecha_inicio ?? '—'} → ${p.fecha_limite ?? '—'}`}
                        >
                          <span className="absolute inset-y-0 left-1 flex items-center font-mono text-[8px] font-bold uppercase" style={{ color: `rgb(var(--${color}))` }}>
                            {pctAvance(p)}%
                          </span>
                        </div>
                      </div>
                      {/* Línea de hoy */}
                      <div className="pointer-events-none absolute inset-y-0 w-px" style={{ left: `${xHoy}%`, backgroundColor: 'rgb(var(--accent))' }} />
                    </div>
                  </div>
                )
              })}
              {proyectos.length === 0 && <Empty icono="view_timeline" texto="No hay proyectos con estos filtros." />}
            </div>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {ESTADOS.map((col) => {
            const items = proyectos.filter((p) => p.estado === col.id)
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id) }}
                onDragLeave={() => setOverCol(null)}
                onDrop={() => { if (dragId) updateProyecto(dragId, { estado: col.id }); setDragId(null); setOverCol(null) }}
                className={`theme-card flex min-h-40 flex-col p-3 transition-all ${overCol === col.id ? 'border-line-strong shadow-lift' : ''}`}
              >
                <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2" style={{ backgroundColor: col.color }} />
                    <span className="mono-label text-[10px] font-bold">{estadoProyectoLabel[col.id]}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-ink-3">{items.length}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {items.map((p) => {
                    const color = db.areas.find((a) => a.id === p.area_id)?.color ?? 'area-personal'
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDragId(p.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => setAbierto(p)}
                        className="theme-card cursor-grab p-2.5 transition-all hover:-translate-y-0.5 active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-display text-[12px] font-bold uppercase leading-snug">{p.nombre}</span>
                        </div>
                        <div className="mt-1 font-mono text-[9px] text-ink-3">{p.tipo}</div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <Progress value={pctAvance(p)} color={`rgb(var(--${color}))`} className="!h-1.5" />
                          <span className="font-mono text-[9px] font-bold" style={{ color: `rgb(var(--${color}))` }}>{pctAvance(p)}%</span>
                        </div>
                      </div>
                    )
                  })}
                  {items.length === 0 && (
                    <div className="flex flex-1 items-center justify-center border border-dashed border-line-strong p-4 font-mono text-[10px] text-ink-3">
                      Arrastra aquí
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal detalle */}
      <Modal open={!!abierto} onClose={() => setAbierto(null)} title={abierto?.nombre ?? ''} ancho="max-w-2xl">
        {abierto && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <AreaBadge area={db.areas.find((a) => a.id === abierto.area_id)?.color ?? 'area-personal'} nombre={db.areas.find((a) => a.id === abierto.area_id)?.nombre ?? ''} />
              <Badge color={ESTADOS.find((e) => e.id === abierto.estado)?.color}>{estadoProyectoLabel[abierto.estado]}</Badge>
              <Badge color={`rgb(var(--prio-${abierto.prioridad}))`}>{abierto.prioridad}</Badge>
              {abierto.destacado && <Badge color="rgb(var(--area-univ))">Destacado</Badge>}
            </div>
            <p className="font-mono text-xs text-ink-2">{abierto.descripcion}</p>
            <div className="flex flex-wrap gap-1.5">
              {abierto.stack.map((s) => (
                <span key={s} className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink-2">{s}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono text-[11px] sm:grid-cols-4">
              <div><span className="block text-ink-3">Inicio</span><span className="font-bold">{formatearFecha(abierto.fecha_inicio)}</span></div>
              <div><span className="block text-ink-3">Límite</span><span className="font-bold">{formatearFecha(abierto.fecha_limite)}</span></div>
              <div><span className="block text-ink-3">Tareas</span><span className="font-bold">{tareasDelProyecto(abierto.id).length}</span></div>
              <div>
                <span className="block text-ink-3">Días restantes</span>
                <span className={`font-bold ${(diasRestantes(abierto.fecha_limite) ?? 99) < 0 ? 'text-prio-high' : ''}`}>
                  {diasRestantes(abierto.fecha_limite) ?? '—'}
                </span>
              </div>
            </div>
            <div>
              <h4 className="mono-label mb-2 text-[10px] font-bold text-ink-3">Tareas asociadas</h4>
              <div className="space-y-1.5">
                {tareasDelProyecto(abierto.id).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 border border-line bg-surface-2 p-2">
                    <span className={`text-[12px] font-medium ${t.estado === 'hecho' ? 'line-through text-ink-3' : ''}`}>{t.titulo}</span>
                    <Badge color={t.estado === 'hecho' ? 'rgb(var(--state-done))' : 'rgb(var(--state-todo))'}>{t.estado.replace('_', ' ')}</Badge>
                  </div>
                ))}
                {tareasDelProyecto(abierto.id).length === 0 && (
                  <p className="font-mono text-[11px] text-ink-3">Sin tareas asociadas.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-3">
              <Select value={abierto.estado} onChange={(e) => updateProyecto(abierto.id, { estado: e.target.value as ProyectoEstado })} className="!w-auto">
                {proyectoEstados.map((e) => <option key={e} value={e}>{estadoProyectoLabel[e]}</option>)}
              </Select>
              {(() => {
                const ficha = db.fichas.find((f) => f.tipo === 'proyecto' && f.entidad_id === abierto.id)
                return ficha ? (
                  <Button variant="primary" icono="description" onClick={() => { setFichaActiva(ficha); setAbierto(null) }}>
                    Abrir ficha
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    icono="add_task"
                    onClick={() => {
                      const ficha = crearFicha({
                        tipo: 'proyecto',
                        entidad_id: abierto.id,
                        titulo: abierto.nombre,
                        subtitulo: `Ficha de Proyecto · ${abierto.tipo}`,
                        area_id: abierto.area_id,
                        estado: estadoProyectoLabel[abierto.estado].toUpperCase(),
                        descripcion: abierto.descripcion,
                      })
                      setFichaActiva(ficha)
                      setAbierto(null)
                    }}
                  >
                    Crear ficha
                  </Button>
                )
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nuevo */}
      <Modal open={nuevoAbierto} onClose={() => setNuevoAbierto(false)} title="Nuevo proyecto">
        <div className="space-y-3">
          <Field label="Nombre"><TextInput value={fNombre} onChange={(e) => setFNombre(e.target.value)} placeholder="Nombre del proyecto" autoFocus /></Field>
          <Field label="Descripción"><TextArea value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="¿Qué se busca lograr?" /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Área">
              <Select value={fArea} onChange={(e) => setFArea(e.target.value as AreaId)}>
                {db.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Tipo">
              <Select value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                <option>Producto propio</option>
                <option>Cliente freelance</option>
                <option>Universidad</option>
                <option>Investigación R&D</option>
              </Select>
            </Field>
            <Field label="Prioridad">
              <Select value={fPrioridad} onChange={(e) => setFPrioridad(e.target.value as TareaPrioridad)}>
                <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
              </Select>
            </Field>
            <Field label="Fecha límite"><TextInput type="date" value={fLimite} onChange={(e) => setFLimite(e.target.value)} /></Field>
          </div>
          <Field label="Stack (separado por comas)">
            <TextInput value={fStack} onChange={(e) => setFStack(e.target.value)} placeholder="FastAPI, Vue 3, Redis" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNuevoAbierto(false)}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crear}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Ficha de proyecto ===== */}
      {fichaActiva && (
        <FichaDetalle
          ficha={fichaActiva}
          onClose={() => setFichaActiva(null)}
          areaColor="area-emprende"
          toggleMini={(secId, miniId) => toggleFichaMiniTarea(fichaActiva.id, secId, miniId)}
          addMini={(secId, titulo) => addFichaMiniTarea(fichaActiva.id, secId, titulo)}
        />
      )}
    </div>
  )
}