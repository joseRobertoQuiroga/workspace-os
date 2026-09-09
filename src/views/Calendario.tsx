import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Badge, Button, Modal, Field, TextInput, Select, Check } from '../components/ui'
import { Popover } from '../components/Popover'
import { DetailHeader, Prop, Tags, Notas, DetailActions } from '../components/detail'
import { hoyISO, enDias } from '../lib/utils'
import type { Evento, EventoTipo, Tarea } from '../lib/types'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const TIPO_COLOR: Record<EventoTipo, string> = {
  personal: 'rgb(var(--area-personal))',
  cita: 'rgb(var(--area-freelance))',
  recordatorio: 'rgb(var(--area-univ))',
}

const TIPO_LABEL: Record<EventoTipo, string> = {
  personal: 'Personal',
  cita: 'Cita',
  recordatorio: 'Recordatorio',
}

export function Calendario() {
  const db = useApp((s) => s.db)
  const addEvento = useApp((s) => s.addEvento)
  const updateEvento = useApp((s) => s.updateEvento)
  const deleteEvento = useApp((s) => s.deleteEvento)
  const updateTarea = useApp((s) => s.updateTarea)
  const addTarea = useApp((s) => s.addTarea)
  const hoy = hoyISO()

  const [fecha, setFecha] = useState(() => new Date())
  const [vista, setVista] = useState<'mes' | 'semana'>('mes')
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [editarEvento, setEditarEvento] = useState<Evento | null>(null)

  // Popovers
  const [eventoAncla, setEventoAncla] = useState<HTMLElement | null>(null)
  const [eventoActivo, setEventoActivo] = useState<Evento | null>(null)
  const [diaAncla, setDiaAncla] = useState<HTMLElement | null>(null)
  const [diaActivo, setDiaActivo] = useState<string | null>(null)
  const [completandoId, setCompletandoId] = useState<string | null>(null)
  const [dragTareaId, setDragTareaId] = useState<string | null>(null)
  const [overDia, setOverDia] = useState<string | null>(null)
  const [fRecurrencia, setFRecurrencia] = useState<'diaria' | 'semanal' | 'mensual' | null>(null)

  // Form nuevo evento
  const [fTitulo, setFTitulo] = useState('')
  const [fDia, setFDia] = useState(hoy)
  const [fTipo, setFTipo] = useState<EventoTipo>('personal')
  const [fNotas, setFNotas] = useState('')
  const [fHora, setFHora] = useState('')
  const [fLugar, setFLugar] = useState('')

  // Form nueva tarea rápida del día
  const [nuevaTareaTxt, setNuevaTareaTxt] = useState('')

  const anio = fecha.getFullYear()
  const mes = fecha.getMonth()
  const primerDia = new Date(anio, mes, 1)
  const offset = (primerDia.getDay() + 6) % 7 // lunes = 0
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()

  // Semana actual (lunes a domingo) que contiene `fecha`
  const inicioSemana = new Date(fecha)
  inicioSemana.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7))
  const semanaDias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana)
    d.setDate(inicioSemana.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  const celdas = useMemo(() => {
    const c: (string | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= diasEnMes; d++) c.push(new Date(anio, mes, d).toISOString().slice(0, 10))
    return c
  }, [anio, mes, offset, diasEnMes])

  const eventosDelDia = (iso: string) => {
    const tareas = db.tareas.filter((t) => t.fecha_limite === iso && t.estado !== 'hecho')
    const proyectos = db.proyectos.filter((p) => p.fecha_limite === iso && p.estado === 'activo')
    const eventos = db.eventos.filter((e) => e.fecha === iso)
    return { tareas, proyectos, eventos }
  }

  const abrirEvento = (e: Evento, el: HTMLElement) => {
    setDiaActivo(null)
    setDiaAncla(null)
    setEventoActivo(e)
    setEventoAncla(el)
  }

  const abrirDia = (iso: string, el: HTMLElement) => {
    setEventoActivo(null)
    setEventoAncla(null)
    setDiaActivo(iso)
    setDiaAncla(el)
    setNuevaTareaTxt('')
  }

  const completarTarea = (t: Tarea) => {
    setCompletandoId(t.id)
    setTimeout(() => {
      updateTarea(t.id, { estado: 'hecho', arrastrada: false })
      setCompletandoId(null)
    }, 350)
  }

  const crear = () => {
    if (!fTitulo.trim()) return
    const payload = {
      titulo: fTitulo.trim(),
      fecha: fDia,
      hora: fHora,
      lugar: fLugar,
      tipo: fTipo,
      etiquetas: [] as string[],
      completado: false,
      recurrencia: fRecurrencia,
      notas: fNotas,
    }
    if (editarEvento) {
      updateEvento(editarEvento.id, payload)
      setEditarEvento(null)
    } else {
      addEvento(payload)
    }
    setFTitulo(''); setFNotas(''); setFHora(''); setFLugar(''); setFRecurrencia(null)
    setNuevoAbierto(false)
  }

  const crearTareaDelDia = () => {
    if (!diaActivo || !nuevaTareaTxt.trim()) return
    addTarea({
      titulo: nuevaTareaTxt.trim(),
      area_id: 'personal',
      proyecto_id: null,
      estado: 'por_hacer',
      prioridad: 'media',
      destacado: false,
      fecha_limite: diaActivo,
      notas: '',
      etiquetas: [],
      arrastrada: false,
      mi_dia: false,
      subtareas: [],
      recurrencia: null,
      cerrada_en: null,
    })
    setNuevaTareaTxt('')
  }

  const listaHoy = eventosDelDia(hoy)

  // Si hoy está vacío, buscar el próximo día con contenido
  const proximo = useMemo(() => {
    if (listaHoy.tareas.length + listaHoy.proyectos.length + listaHoy.eventos.length > 0) return null
    for (let d = 1; d <= 60; d++) {
      const iso = enDias(d)
      const c = eventosDelDia(iso)
      if (c.tareas.length + c.proyectos.length + c.eventos.length > 0) return { iso, ...c }
    }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, hoy])

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // CALENDAR_OS
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-area-personal" /> {db.eventos.length} eventos
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Calendario <span className="text-area-freelance">/</span> Agenda
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-line">
            {(['mes', 'semana'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase ${
                  vista === v ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Icon name={v === 'mes' ? 'calendar_month' : 'view_week'} className="text-[14px]" />
                {v}
              </button>
            ))}
          </div>
          <Button variant="soft" icono="chevron_left" onClick={() => setFecha(vista === 'mes' ? new Date(anio, mes - 1, 1) : new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() - 7))}>
            <span className="sr-only">Anterior</span>
          </Button>
          <Button variant="soft" onClick={() => setFecha(new Date())}>Hoy</Button>
          <Button variant="soft" icono="chevron_right" onClick={() => setFecha(vista === 'mes' ? new Date(anio, mes + 1, 1) : new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 7))}>
            <span className="sr-only">Siguiente</span>
          </Button>
          <span className="mono-label w-32 text-center text-[12px] font-bold">
            {vista === 'mes' ? `${MESES[mes]} ${anio}` : `Sem ${semanaDias[0].slice(8, 10)}–${semanaDias[6].slice(8, 10)} ${MESES[mes]}`}
          </span>
          <Button variant="primary" icono="add" onClick={() => { setEditarEvento(null); setNuevoAbierto(true) }}>
            Evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* Calendario mensual */}
        <Panel className="xl:col-span-3" pad={false}>
          <div className="grid grid-cols-7 border-b border-line bg-canvas text-center">
            {DIAS.map((d, i) => (
              <div key={i} className="py-2 font-mono text-[10px] font-bold uppercase text-ink-3">{d}</div>
            ))}
          </div>
          {vista === 'mes' ? (
          <div className="grid grid-cols-7">
            {celdas.map((iso, i) => {
              if (!iso) return <div key={`v-${i}`} className="min-h-20 border-b border-r border-line bg-canvas/40 p-1.5" />
              const { tareas, proyectos, eventos } = eventosDelDia(iso)
              const esHoy = iso === hoy
              const total = tareas.length + proyectos.length + eventos.length
              const vencidas = tareas.filter((t) => t.arrastrada).length
              return (
                <div
                  key={iso}
                  className={`day-chip min-h-20 cursor-pointer border-b border-r border-line p-1.5 transition-colors hover:bg-surface-2 ${
                    esHoy ? 'bg-surface-2' : ''
                  } ${overDia === iso ? 'border-line-strong shadow-lift' : ''}`}
                  onClick={(e) => abrirDia(iso, e.currentTarget)}
                  onDragOver={(e) => { e.preventDefault(); setOverDia(iso) }}
                  onDragLeave={() => setOverDia(null)}
                  onDrop={() => {
                    if (dragTareaId) {
                      updateTarea(dragTareaId, { fecha_limite: iso, arrastrada: false })
                    }
                    setDragTareaId(null)
                    setOverDia(null)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-5 w-5 items-center justify-center font-mono text-[10px] font-bold ${
                        esHoy ? 'bg-accent text-on-accent' : 'text-ink-2'
                      }`}
                    >
                      {Number(iso.slice(8, 10))}
                    </span>
                    {total > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: vencidas ? 'rgb(var(--prio-medium))' : 'rgb(var(--area-freelance))' }} />
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {tareas.slice(0, 2).map((t) => (
                      <button
                        key={t.id}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragTareaId(t.id) }}
                        onDragEnd={() => setDragTareaId(null)}
                        onClick={(e) => { e.stopPropagation(); completarTarea(t) }}
                        title="Clic: marcar hecha · Arrastrar: mover a otro día"
                        className={`block w-full cursor-pointer truncate border-l-2 px-1 py-0.5 text-left text-[9px] font-medium transition-all hover:translate-x-0.5 ${
                          completandoId === t.id ? 'check-on' : ''
                        }`}
                        style={{
                          borderColor: t.arrastrada ? 'rgb(var(--prio-medium))' : 'rgb(var(--state-doing))',
                          backgroundColor: t.arrastrada
                            ? 'color-mix(in srgb, rgb(var(--prio-medium)) 14%, transparent)'
                            : 'rgb(var(--surface-2))',
                          color: t.arrastrada ? 'rgb(var(--prio-medium))' : undefined,
                        }}
                      >
                        {t.arrastrada && '◄ '}{t.titulo}
                      </button>
                    ))}
                    {proyectos.slice(0, 1).map((p) => (
                      <div key={p.id} className="truncate border-l-2 border-line-strong bg-surface-2 px-1 py-0.5 text-[9px] font-medium" title={p.nombre}>
                        🚀 {p.nombre}
                      </div>
                    ))}
                    {eventos.slice(0, 1).map((e) => (
                      <button
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); abrirEvento(e, ev.currentTarget) }}
                        className="block w-full cursor-pointer truncate border-l-2 px-1 py-0.5 text-left text-[9px] font-medium transition-all hover:translate-x-0.5"
                        style={{
                          borderColor: TIPO_COLOR[e.tipo],
                          backgroundColor: `color-mix(in srgb, ${TIPO_COLOR[e.tipo]} 12%, transparent)`,
                          color: `color-mix(in srgb, ${TIPO_COLOR[e.tipo]} 80%, rgb(var(--ink)))`,
                          textDecoration: e.completado ? 'line-through' : 'none',
                          opacity: e.completado ? 0.55 : 1,
                        }}
                      >
                        {e.recurrencia && <span className="mr-0.5">↻</span>}{e.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          ) : (
          <div className="grid grid-cols-7">
            {semanaDias.map((iso) => {
              const { tareas, proyectos, eventos } = eventosDelDia(iso)
              const esHoy = iso === hoy
              const total = tareas.length + proyectos.length + eventos.length
              const vencidas = tareas.filter((t) => t.arrastrada).length
              return (
                <div
                  key={iso}
                  className={`day-chip min-h-[300px] cursor-pointer border-b border-r border-line p-1.5 transition-colors hover:bg-surface-2 ${
                    esHoy ? 'bg-surface-2' : ''
                  } ${overDia === iso ? 'border-line-strong shadow-lift' : ''}`}
                  onClick={(e) => abrirDia(iso, e.currentTarget)}
                  onDragOver={(e) => { e.preventDefault(); setOverDia(iso) }}
                  onDragLeave={() => setOverDia(null)}
                  onDrop={() => {
                    if (dragTareaId) updateTarea(dragTareaId, { fecha_limite: iso, arrastrada: false })
                    setDragTareaId(null)
                    setOverDia(null)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-5 w-5 items-center justify-center font-mono text-[10px] font-bold ${
                        esHoy ? 'bg-accent text-on-accent' : 'text-ink-2'
                      }`}
                    >
                      {Number(iso.slice(8, 10))}
                    </span>
                    {total > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: vencidas ? 'rgb(var(--prio-medium))' : 'rgb(var(--area-freelance))' }} />
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {tareas.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        draggable
                        onDragStart={() => setDragTareaId(t.id)}
                        onDragEnd={() => setDragTareaId(null)}
                        onClick={(e) => { e.stopPropagation(); completarTarea(t) }}
                        title="Clic: marcar hecha · Arrastrar: mover"
                        className="block w-full cursor-pointer truncate border-l-2 px-1 py-0.5 text-left text-[9px] font-medium transition-all hover:translate-x-0.5"
                        style={{
                          borderColor: t.arrastrada ? 'rgb(var(--prio-medium))' : 'rgb(var(--state-doing))',
                          backgroundColor: 'rgb(var(--surface-2))',
                          color: t.arrastrada ? 'rgb(var(--prio-medium))' : undefined,
                        }}
                      >
                        {t.arrastrada && '◄ '}{t.titulo}
                      </button>
                    ))}
                    {proyectos.slice(0, 1).map((p) => (
                      <div key={p.id} className="truncate border-l-2 border-line-strong bg-surface-2 px-1 py-0.5 text-[9px] font-medium">🚀 {p.nombre}</div>
                    ))}
                    {eventos.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); abrirEvento(e, ev.currentTarget) }}
                        className="block w-full cursor-pointer truncate border-l-2 px-1 py-0.5 text-left text-[9px] font-medium"
                        style={{
                          borderColor: TIPO_COLOR[e.tipo],
                          backgroundColor: `color-mix(in srgb, ${TIPO_COLOR[e.tipo]} 12%, transparent)`,
                          color: `color-mix(in srgb, ${TIPO_COLOR[e.tipo]} 80%, rgb(var(--ink)))`,
                        }}
                      >
                        {e.recurrencia && <span className="mr-0.5">↻</span>}{e.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </Panel>

        {/* Lista de hoy */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="today" className="text-[20px] text-ink-2" />
              <h2 className="mono-label text-[12px] font-bold">Hoy</h2>
            </div>
            <span className="font-mono text-[10px] text-ink-3">{formatearHoy()}</span>
          </div>
          <div className="space-y-2.5">
            {listaHoy.tareas.map((t) => (
              <div key={t.id} className="theme-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge color={t.arrastrada ? 'rgb(var(--prio-medium))' : 'rgb(var(--state-doing))'}>
                    {t.arrastrada ? 'Pendiente de ayer' : 'Tarea'}
                  </Badge>
                  <Badge color={`rgb(var(--prio-${t.prioridad}))`}>{t.prioridad}</Badge>
                </div>
                <p className={`mt-1.5 text-[12px] font-semibold leading-snug ${t.arrastrada ? 'text-prio-medium' : ''}`}>{t.titulo}</p>
                <div className="mt-2 flex justify-end">
                  <Button variant="soft" size="sm" icono="done" onClick={() => completarTarea(t)}>
                    Hecho
                  </Button>
                </div>
              </div>
            ))}
            {listaHoy.proyectos.map((p) => (
              <div key={p.id} className="theme-card p-3">
                <Badge color="rgb(var(--area-emprende))">Proyecto</Badge>
                <p className="mt-1.5 text-[12px] font-semibold leading-snug">{p.nombre}</p>
              </div>
            ))}
            {listaHoy.eventos.map((e) => (
              <div key={e.id} className="theme-card p-3" style={{ borderColor: TIPO_COLOR[e.tipo] }}>
                <Badge color={TIPO_COLOR[e.tipo]}>{e.completado ? 'Hecho' : TIPO_LABEL[e.tipo]}</Badge>
                <p className={`mt-1.5 text-[12px] font-semibold leading-snug ${e.completado ? 'line-through text-ink-3' : ''}`}>{e.titulo}</p>
                {e.notas && <p className="mt-0.5 font-mono text-[10px] text-ink-3">{e.notas}</p>}
              </div>
            ))}
            {listaHoy.tareas.length + listaHoy.proyectos.length + listaHoy.eventos.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Icon name="event_available" className="text-[30px] text-ink-3" />
                <p className="font-mono text-xs text-ink-3">Nada agendado para hoy.</p>
              </div>
            )}
          </div>

          {/* Próximo día con contenido */}
          {proximo && (
            <div className="space-y-3 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="event_upcoming" className="text-[20px] text-ink-2" />
                  <h2 className="mono-label text-[12px] font-bold">Próximo</h2>
                </div>
                <span className="font-mono text-[10px] text-ink-3">
                  {new Date(proximo.iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="space-y-2.5">
                {proximo.tareas.slice(0, 3).map((t) => (
                  <div key={t.id} className="theme-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge color={t.arrastrada ? 'rgb(var(--prio-medium))' : 'rgb(var(--state-doing))'}>
                        {t.arrastrada ? 'Pendiente de ayer' : 'Tarea'}
                      </Badge>
                      <Badge color={`rgb(var(--prio-${t.prioridad}))`}>{t.prioridad}</Badge>
                    </div>
                    <p className={`mt-1.5 text-[12px] font-semibold leading-snug ${t.arrastrada ? 'text-prio-medium' : ''}`}>{t.titulo}</p>
                  </div>
                ))}
                {proximo.proyectos.slice(0, 1).map((p) => (
                  <div key={p.id} className="theme-card p-3">
                    <Badge color="rgb(var(--area-emprende))">Proyecto</Badge>
                    <p className="mt-1.5 text-[12px] font-semibold leading-snug">{p.nombre}</p>
                  </div>
                ))}
                {proximo.eventos.slice(0, 2).map((e) => (
                  <div key={e.id} className="theme-card p-3" style={{ borderColor: TIPO_COLOR[e.tipo] }}>
                    <Badge color={TIPO_COLOR[e.tipo]}>{TIPO_LABEL[e.tipo]}</Badge>
                    <p className="mt-1.5 text-[12px] font-semibold leading-snug">{e.titulo}</p>
                    {e.notas && <p className="mt-0.5 font-mono text-[10px] text-ink-3">{e.notas}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Popover: detalle de evento ===== */}
      <Popover anchor={eventoAncla} onClose={() => { setEventoAncla(null); setEventoActivo(null) }}>
        {eventoActivo && (
          <div className="flex flex-col gap-2.5">
            <DetailHeader
              icono={eventoActivo.tipo === 'recordatorio' ? 'notifications' : eventoActivo.tipo === 'cita' ? 'handshake' : 'celebration'}
              color={TIPO_COLOR[eventoActivo.tipo]}
              titulo={eventoActivo.titulo}
              sub={`${formatearFechaEsp(eventoActivo.fecha)}${eventoActivo.hora ? ' · ' + eventoActivo.hora : ''}`}
              onClose={() => { setEventoAncla(null); setEventoActivo(null) }}
            />
            <div>
              <Prop label="Tipo">
                <Badge color={TIPO_COLOR[eventoActivo.tipo]}>{TIPO_LABEL[eventoActivo.tipo]}</Badge>
              </Prop>
              {eventoActivo.recurrencia && (
                <Prop label="Repite">
                  <span className="inline-flex items-center gap-1"><Icon name="autorenew" className="text-[12px]" />{eventoActivo.recurrencia}</span>
                </Prop>
              )}
              {eventoActivo.hora && <Prop label="Hora">{eventoActivo.hora}</Prop>}
              {eventoActivo.lugar && (
                <Prop label="Lugar">
                  <span className="inline-flex items-center gap-1"><Icon name="location_on" className="text-[13px]" />{eventoActivo.lugar}</span>
                </Prop>
              )}
              <Prop label="Estado">
                <button
                  onClick={() => updateEvento(eventoActivo.id, { completado: !eventoActivo.completado })}
                  className={`inline-flex cursor-pointer items-center gap-1.5 border border-line px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    eventoActivo.completado ? 'bg-state-done/15 text-state-done' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {eventoActivo.completado ? <Icon name="check_circle" className="text-[12px]" /> : <Icon name="radio_button_unchecked" className="text-[12px]" />}
                  {eventoActivo.completado ? 'Completado' : 'Pendiente'}
                </button>
              </Prop>
            </div>
            <Notas>{eventoActivo.notas}</Notas>
            <Tags items={eventoActivo.etiquetas} color={TIPO_COLOR[eventoActivo.tipo]} />
            <DetailActions>
              <Button
                variant="ghost"
                size="sm"
                icono="delete"
                onClick={() => { deleteEvento(eventoActivo.id); setEventoAncla(null); setEventoActivo(null) }}
              >
                Eliminar
              </Button>
              <Button
                variant="primary"
                size="sm"
                icono="edit"
                onClick={() => {
                  setEditarEvento(eventoActivo)
                  setFTitulo(eventoActivo.titulo)
                  setFDia(eventoActivo.fecha)
                  setFHora(eventoActivo.hora)
                  setFLugar(eventoActivo.lugar)
                  setFTipo(eventoActivo.tipo)
                  setFNotas(eventoActivo.notas)
                  setFRecurrencia(eventoActivo.recurrencia ?? null)
                  setEventoAncla(null)
                  setEventoActivo(null)
                  setNuevoAbierto(true)
                }}
              >
                Editar
              </Button>
            </DetailActions>
          </div>
        )}
      </Popover>

      {/* ===== Popover: detalle del día ===== */}
      <Popover anchor={diaAncla} onClose={() => { setDiaAncla(null); setDiaActivo(null) }}>
        {diaActivo && (
          <div className="flex flex-col gap-2.5">
            <DetailHeader
              icono="calendar_today"
              color="rgb(var(--accent))"
              titulo={formatearFechaEsp(diaActivo)}
              sub={diaActivo === hoy ? 'HOY' : undefined}
              onClose={() => { setDiaAncla(null); setDiaActivo(null) }}
            />
            {/* Captura rápida de tarea para este día */}
            <div className="flex gap-1.5">
              <TextInput
                value={nuevaTareaTxt}
                onChange={(e) => setNuevaTareaTxt(e.target.value)}
                placeholder="Añadir tarea para este día..."
                onKeyDown={(e) => e.key === 'Enter' && crearTareaDelDia()}
              />
              <Button variant="primary" size="sm" icono="add" onClick={crearTareaDelDia}>OK</Button>
            </div>

            {(() => {
              const { tareas, proyectos, eventos } = eventosDelDia(diaActivo)
              return (
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {tareas.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 border border-line bg-surface-2 p-2">
                      <div className="min-w-0">
                        <span className={`block truncate text-[11px] font-semibold ${t.arrastrada ? 'text-prio-medium' : ''}`}>
                          {t.arrastrada && '◄ '}{t.titulo}
                        </span>
                        <span className="font-mono text-[9px] text-ink-3">{t.arrastrada ? 'pendiente de ayer' : 'tarea'}</span>
                      </div>
                      <Check checked={false} onChange={() => completarTarea(t)} />
                    </div>
                  ))}
                  {proyectos.map((p) => (
                    <div key={p.id} className="border border-line bg-surface-2 p-2 text-[11px] font-semibold">🚀 {p.nombre}</div>
                  ))}
                  {eventos.map((e) => (
                    <div
                      key={e.id}
                      className="flex cursor-pointer items-center justify-between gap-2 border border-line bg-surface-2 p-2 transition-colors hover:bg-surface-3"
                      onClick={(ev) => {
                        setDiaAncla(null)
                        setDiaActivo(null)
                        abrirEvento(e, ev.currentTarget)
                      }}
                    >
                      <span className="truncate text-[11px] font-semibold">{e.titulo}</span>
                      <Badge color={TIPO_COLOR[e.tipo]}>{TIPO_LABEL[e.tipo]}</Badge>
                    </div>
                  ))}
                  {tareas.length + proyectos.length + eventos.length === 0 && (
                    <p className="py-4 text-center font-mono text-[11px] text-ink-3">Día libre — sin pendientes.</p>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </Popover>

      {/* Modal nuevo/editar evento */}
      <Modal open={nuevoAbierto} onClose={() => { setNuevoAbierto(false); setEditarEvento(null) }} title={editarEvento ? 'Editar evento' : 'Nuevo evento'}>
        <div className="space-y-3">
          <Field label="Título"><TextInput value={fTitulo} onChange={(e) => setFTitulo(e.target.value)} placeholder="¿Qué evento es?" autoFocus /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Fecha"><TextInput type="date" value={fDia} onChange={(e) => setFDia(e.target.value)} /></Field>
            <Field label="Hora"><TextInput type="time" value={fHora} onChange={(e) => setFHora(e.target.value)} /></Field>
<Field label="Tipo">
                <Select value={fTipo} onChange={(e) => setFTipo(e.target.value as EventoTipo)}>
                  <option value="personal">Personal</option>
                  <option value="cita">Cita</option>
                  <option value="recordatorio">Recordatorio</option>
                </Select>
              </Field>
              <Field label="Repetir">
                <Select
                  value={fRecurrencia ?? 'nunca'}
                  onChange={(e) => setFRecurrencia(e.target.value === 'nunca' ? null : e.target.value as 'diaria' | 'semanal' | 'mensual')}
                >
                  <option value="nunca">Nunca</option>
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </Select>
              </Field>
              <Field label="Lugar"><TextInput value={fLugar} onChange={(e) => setFLugar(e.target.value)} placeholder="Aula, oficina..." /></Field>
          </div>
          <Field label="Notas"><TextInput value={fNotas} onChange={(e) => setFNotas(e.target.value)} placeholder="Contexto, detalles..." /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setNuevoAbierto(false); setEditarEvento(null) }}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crear}>{editarEvento ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function formatearFechaEsp(iso: string) {
  const f = new Date(iso + 'T00:00:00')
  return f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatearHoy() {
  return new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}