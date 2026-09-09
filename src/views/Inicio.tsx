import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { EditableText } from '../components/EditableText'
import { Panel, Progress, Badge, Button, Check, AreaBadge } from '../components/ui'
import { diasRestantes, formatearFecha, hoyISO, semanaActualISO } from '../lib/utils'
import { parseCaptura, fechaLegible } from '../lib/nlp'
import type { Tarea, Proyecto } from '../lib/types'

const HUBS = [
  { to: '/proyectos', label: 'Proyectos', icono: 'rocket_launch', sub: 'activos en pipe', color: 'rgb(var(--area-emprende))', n: '01' },
  { to: '/universidad', label: 'Universidad', icono: 'school', sub: 'materias', color: 'rgb(var(--area-univ))', n: '02' },
  { to: '/freelance', label: 'Freelance', icono: 'business_center', sub: 'clientes', color: 'rgb(var(--area-freelance))', n: '03' },
  { to: '/emprendimiento', label: 'Emprendimiento', icono: 'lightbulb', sub: 'ideas', color: 'rgb(var(--area-emprende))', n: '04' },
  { to: '/documentos', label: 'Documentos', icono: 'description', sub: 'ADRs & wiki', color: 'rgb(var(--ink-3))', n: '05' },
]

export function Inicio() {
  const db = useApp((s) => s.db)
  const updateTarea = useApp((s) => s.updateTarea)
  const addTarea = useApp((s) => s.addTarea)
  const addNota = useApp((s) => s.addNota)
  const saludo = useApp((s) => s.saludo)
  const citaTexto = useApp((s) => s.citaTexto)
  const citaAutor = useApp((s) => s.citaAutor)
  const setSaludo = useApp((s) => s.setSaludo)
  const setCita = useApp((s) => s.setCita)
  const [scratch, setScratch] = useState('')
  const [foco, setFoco] = useState<boolean[]>([false, false, false])

  const hoy = hoyISO()
  const semana = semanaActualISO()

  // Tareas de hoy (para la tabla)
  const tareasHoy = db.tareas
    .filter((t) => t.estado !== 'hecho' && t.fecha_limite && t.fecha_limite <= hoy)
    .sort((a, _b) => (a.prioridad === 'alta' ? -1 : 1))

  // Foco de la semana = top 3 reales: prioritarias abiertas con fecha hoy, sino las más recientes
  const focoReal = [...db.tareas]
    .filter((t) => t.estado !== 'hecho')
    .sort((a, b) => {
      const pa = a.prioridad === 'alta' ? 0 : a.prioridad === 'media' ? 1 : 2
      const pb = b.prioridad === 'alta' ? 0 : b.prioridad === 'media' ? 1 : 2
      return pa - pb || (a.fecha_limite ?? '9999').localeCompare(b.fecha_limite ?? '9999')
    })
    .slice(0, 3)

  const proyectosActivos = db.proyectos.filter((p) => p.estado === 'activo')
  const proximos = [...db.eventos].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 4)

  // Stats semanales reales
  const hechasEstaSemana = db.tareas.filter((t) => t.estado === 'hecho' && t.cerrada_en && semanaISODe(t.cerrada_en) === semana).length
  const hechasSemanaPasada = db.tareas.filter((t) => t.estado === 'hecho' && t.cerrada_en && semanaISODe(t.cerrada_en) === semanaAnterior(semana)).length
  const arrastradas = db.tareas.filter((t) => t.estado !== 'hecho' && t.arrastrada).length
  const pctSemana = db.tareas.length ? Math.round((db.tareas.filter((t) => t.estado === 'hecho').length / db.tareas.length) * 100) : 0

  const saludoHora = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  // Nota del día (estilo Obsidian daily note)
  const notaHoy = db.notas.find((n) => n.titulo.includes(hoy))
  const abrirNotaDia = () => {
    if (notaHoy) return
    addNota({
      titulo: `Nota del día · ${hoy}`,
      proyecto_id: null,
      area_id: 'personal',
      plantilla_id: 'tpl-nota-rapida',
      tipo: 'Nota rápida',
      estado: 'borrador',
      contenido_md: `## Foco de hoy\n- ${focoReal.map((t) => t.titulo).join('\n- ') || '—'}\n\n## Log de la sesión\n\n## Pendientes que quedaron`,
      resumen: 'Daily note generada automáticamente',
      etiquetas: ['daily'],
    })
  }

  // Scratchpad NLP
  const parseado = scratch.trim() ? parseCaptura(scratch) : null
  const convertirScratch = () => {
    if (!parseado) return
    addTarea({
      titulo: parseado.titulo,
      area_id: parseado.area ?? 'personal',
      proyecto_id: null,
      estado: 'por_hacer',
      prioridad: parseado.prioridad,
      destacado: false,
      fecha_limite: parseado.fecha,
      notas: scratch,
      etiquetas: parseado.etiquetas,
      arrastrada: false,
      mi_dia: parseado.fecha === hoy || !parseado.fecha,
      subtareas: [],
      recurrencia: parseado.recurrencia,
      cerrada_en: null,
    })
    setScratch('')
  }

  const marcarHecha = (t: Tarea) => updateTarea(t.id, { estado: 'hecho', arrastrada: false, cerrada_en: new Date().toISOString() })

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HERO */}
      <section className="theme-card relative overflow-hidden p-5 sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-area-freelance/5 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 border border-line bg-area-personal/15 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-area-personal">
                <span className="h-2 w-2 bg-area-personal pulse-dot" />
                Sys status: operational
              </span>
              <span className="border border-line bg-canvas px-2 py-1 font-mono text-[10px] text-ink-2">
                UTC-4 · Santa Cruz de la Sierra
              </span>
            </div>
            <h1 className="font-display text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl lg:text-5xl">
              <EditableText value={saludo} onSave={setSaludo} placeholder={saludoHora} />
            </h1>
            <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-2">
              <span className="border border-line bg-surface-2 px-1.5 py-0.5 font-bold">QUOTE</span>
              <span className="italic">
                <EditableText value={citaTexto} onSave={(t) => setCita(t, citaAutor)} placeholder="Escribe tu cita…" />
              </span>
              <span className="font-bold text-area-univ">
                — <EditableText value={citaAutor} onSave={(a) => setCita(citaTexto, a)} placeholder="Autor" />
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 border border-line bg-surface-2 px-4 py-2">
              <Icon name="calendar_today" className="text-[18px] text-area-personal" />
              <span className="font-mono text-xs font-black uppercase tracking-wider">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <Button variant="primary" icono={notaHoy ? 'edit_note' : 'note_add'} onClick={abrirNotaDia}>
              {notaHoy ? 'Abrir nota del día' : 'Nota del día'}
            </Button>
          </div>
        </div>

        {/* Quick hubs */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {HUBS.map((h) => (
            <Link
              key={h.to}
              to={h.to}
              className="theme-card group flex flex-col justify-between p-3 transition-all hover:-translate-y-0.5"
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon name={h.icono} className="text-[22px]" />
                <span className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-black text-ink-3">
                  {h.n}
                </span>
              </div>
              <div>
                <div className="font-display text-sm font-black uppercase tracking-tight">{h.label}</div>
                <div className="font-mono text-[11px] text-ink-3">
                  {h.label === 'Proyectos' && `${db.proyectos.filter((p) => p.estado === 'activo').length} activos`}
                  {h.label === 'Universidad' && `${db.materias.length} materias`}
                  {h.label === 'Freelance' && `${db.clientes.filter((c) => c.estado === 'activo').length} clientes`}
                  {h.label === 'Emprendimiento' && `${db.ideas.filter((i) => i.estado !== 'descartada').length} ideas`}
                  {h.label === 'Documentos' && `${db.notas.length} docs`}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* RESUMEN DE LA MAÑANA */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="theme-card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line" style={{ backgroundColor: 'color-mix(in srgb, rgb(var(--prio-medium)) 16%, transparent)', color: 'rgb(var(--prio-medium))' }}>
            <Icon name="history" className="text-[20px]" />
          </div>
          <div>
            <div className="mono-label text-[9px] text-ink-3">Pendientes de ayer</div>
            <div className="font-mono text-xl font-bold text-prio-medium">{arrastradas}</div>
          </div>
        </div>
        <div className="theme-card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line" style={{ backgroundColor: 'color-mix(in srgb, rgb(var(--state-done)) 16%, transparent)', color: 'rgb(var(--state-done))' }}>
            <Icon name="done_all" className="text-[20px]" />
          </div>
          <div>
            <div className="mono-label text-[9px] text-ink-3">Hechas esta semana</div>
            <div className="font-mono text-xl font-bold text-state-done">
              {hechasEstaSemana}
              <span className="ml-1 text-[11px] font-bold text-ink-3">
                {hechasSemanaPasada === 0 ? '· arranca' : hechasEstaSemana >= hechasSemanaPasada ? `+${hechasEstaSemana - hechasSemanaPasada} vs ant.` : `${hechasEstaSemana - hechasSemanaPasada} vs ant.`}
              </span>
            </div>
          </div>
        </div>
        <div className="theme-card flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-line" style={{ backgroundColor: 'color-mix(in srgb, rgb(var(--area-freelance)) 16%, transparent)', color: 'rgb(var(--area-freelance))' }}>
            <Icon name="bolt" className="text-[20px]" />
          </div>
          <div>
            <div className="mono-label text-[9px] text-ink-3">Foco de hoy</div>
            <div className="font-mono text-xl font-bold">{focoReal.length}</div>
            <div className="font-mono text-[9px] text-ink-3">prioridades abiertas</div>
          </div>
        </div>
      </div>

      {/* ROW 1: Foco + Ritmo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Foco de la semana"
          icono="center_focus_strong"
          className="lg:col-span-2"
          extra={
            <span className="mono-label text-[10px] text-ink-3">
              {foco.filter(Boolean).length}/3 · {Math.round((foco.filter(Boolean).length / 3) * 100)}%
            </span>
          }
        >
          <div className="space-y-2.5">
            {focoReal.map((t, i) => {
              const area = db.areas.find((a) => a.id === t.area_id)
              return (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 border border-line bg-surface-2 p-3 transition-colors ${
                    foco[i] ? 'opacity-60' : ''
                  }`}
                >
                  <Check
                    checked={foco[i]}
                    onChange={() => {
                      if (!foco[i]) marcarHecha(t)
                      else updateTarea(t.id, { estado: 'por_hacer', cerrada_en: null })
                      setFoco((prev) => prev.map((v, j) => (j === i ? !v : v)))
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`font-display text-sm font-bold ${foco[i] ? 'strike-anim strike-on text-ink-3' : ''}`}>
                        {t.titulo}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {area && <AreaBadge area={area.color} nombre={area.nombre} />}
                        {t.prioridad === 'alta' && (
                          <span className="border border-line bg-prio-high/15 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-prio-high">
                            Prioridad
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                      {db.proyectos.find((p) => p.id === t.proyecto_id)?.nombre ?? 'Sin proyecto'}
                      {t.fecha_limite ? ` · ${formatearFecha(t.fecha_limite)}` : ''}
                    </p>
                  </div>
                </div>
              )
            })}
            {focoReal.length === 0 && (
              <p className="py-6 text-center font-mono text-xs text-ink-3">Sin prioridades abiertas — todo al día.</p>
            )}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-bold">
              <span className="uppercase tracking-wider text-ink-2">Progreso semanal</span>
              <span className="text-ink-2">{pctSemana}% ejecutado</span>
            </div>
            <Progress value={pctSemana} />
          </div>
        </Panel>

        <Panel title="Ritmo de entrega" icono="insights" extra={<span className="mono-label text-[10px] text-ink-3">Velocidad</span>}>
          <div className="border border-line bg-canvas p-3">
            <div className="flex h-28 items-end gap-2 pt-2">
              {db.areas.map((a) => {
                const total = db.tareas.filter((t) => t.area_id === a.id).length
                const hechas = db.tareas.filter((t) => t.area_id === a.id && t.estado === 'hecho').length
                const pct = total ? Math.round((hechas / total) * 100) : 0
                return (
                  <div key={a.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className="flex w-full items-center justify-center border border-line bg-canvas pt-1 font-mono text-[9px] font-black"
                      style={{ height: `${Math.max(8, pct)}%`, backgroundColor: `rgb(var(--${a.color}))`, color: '#000' }}
                    >
                      {pct}%
                    </div>
                    <span className="font-mono text-[9px] font-bold uppercase">{a.nombre.slice(0, 4)}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-3 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between border border-line bg-surface-2 p-1.5">
              <span className="text-ink-3">Hechas esta semana</span>
              <span className="font-bold">{hechasEstaSemana}</span>
            </div>
            <div className="flex justify-between border border-line bg-surface-2 p-1.5">
              <span className="text-ink-3">Arrastradas (ayer)</span>
              <span className="font-bold text-prio-medium">{arrastradas}</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* ROW 2: Tareas hoy */}
      <Panel
        title="Tareas — vista hoy"
        icono="check_box"
        extra={<span className="border border-line bg-prio-high/15 px-1.5 py-0.5 font-mono text-[10px] font-black text-prio-high uppercase">{tareasHoy.length} pendientes</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-canvas font-mono text-[10px] uppercase tracking-wider text-ink-3">
                <th className="px-3 py-2.5"></th>
                <th className="px-3 py-2.5">Tarea</th>
                <th className="px-3 py-2.5">Área</th>
                <th className="px-3 py-2.5">Prioridad</th>
                <th className="px-3 py-2.5">Plazo</th>
                <th className="px-3 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tareasHoy.map((t: Tarea) => {
                const dr = diasRestantes(t.fecha_limite)
                return (
                  <tr key={t.id} className="group transition-colors hover:bg-surface-2">
                    <td className="px-3 py-2.5 text-center">
                      <Check checked={false} onChange={() => marcarHecha(t)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-display text-sm font-bold ${t.arrastrada ? 'text-prio-medium' : ''}`}>
                        {t.arrastrada && <span className="mr-1 font-mono text-[10px] font-black uppercase">◄ ayer</span>}
                        {t.titulo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <AreaBadge area={db.areas.find((a) => a.id === t.area_id)?.color ?? 'area-personal'} nombre={db.areas.find((a) => a.id === t.area_id)?.nombre ?? ''} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge color={`rgb(var(--prio-${t.prioridad}))`}>{t.prioridad}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      {dr !== null && dr < 0 ? (
                        <span className="font-bold text-prio-high">Vencida {Math.abs(dr)}d</span>
                      ) : (
                        <span className="text-ink-2">
                          {t.fecha_limite === hoy ? 'Hoy' : formatearFecha(t.fecha_limite)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link to="/tareas">
                        <Button variant="soft" size="sm">Open</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {tareasHoy.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center font-mono text-xs text-ink-3">
                    Sin tareas para hoy — todo al día.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ROW 3: Proyectos + Agenda */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="rocket" className="text-[22px] text-ink-2" />
              <h2 className="mono-label text-[12px] font-bold">Proyectos — vista activos</h2>
              <span className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-2">
                {proyectosActivos.length} en ejecución
              </span>
            </div>
            <Link to="/proyectos" className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase text-ink-2 hover:text-ink">
              Ver tablero completo <Icon name="arrow_forward" className="text-[15px]" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {proyectosActivos.map((p: Proyecto) => {
              const done = db.tareas.filter((t) => t.proyecto_id === p.id && t.estado === 'hecho').length
              const total = db.tareas.filter((t) => t.proyecto_id === p.id).length
              const pct = total ? Math.round((done / total) * 100) : 40
              const color = db.areas.find((a) => a.id === p.area_id)?.color ?? 'area-personal'
              return (
                <Link key={p.id} to="/proyectos" className="theme-card group flex flex-col justify-between overflow-hidden transition-all hover:-translate-y-0.5">
                  <div className="h-1.5 w-full" style={{ backgroundColor: `rgb(var(--${color}))` }} />
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <Badge color={`rgb(var(--${color}))`}>{p.tipo}</Badge>
                      <span className="font-mono text-[11px] font-black text-ink-3">{p.estado}</span>
                    </div>
                    <h3 className="font-display text-base font-black uppercase tracking-tight">{p.nombre}</h3>
                    <p className="line-clamp-2 font-mono text-[11px] text-ink-3">{p.descripcion}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.stack.slice(0, 3).map((s) => (
                        <span key={s} className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink-2">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-line p-4 pt-3">
                    <div className="mb-1 flex justify-between font-mono text-[10px] font-bold">
                      <span className="text-ink-3">Avance</span>
                      <span style={{ color: `rgb(var(--${color}))` }}>{pct}%</span>
                    </div>
                    <Progress value={pct} color={`rgb(var(--${color}))`} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Agenda */}
        <Panel title="Agenda semanal" icono="calendar_month" extra={<span className="mono-label text-[10px] text-ink-3">Próximos días</span>}>
          <div className="vlist space-y-2.5 pr-1">
            {proximos.map((ev) => {
              const fecha = new Date(ev.fecha + 'T00:00:00')
              return (
                <div key={ev.id} className="flex items-start gap-2.5 border border-line bg-surface-2 p-2.5">
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center border border-line bg-canvas leading-none">
                    <span className="font-mono text-[9px] font-black uppercase">
                      {fecha.toLocaleDateString('es-ES', { weekday: 'short' })}
                    </span>
                    <span className="font-display text-xs font-black">{fecha.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-display text-xs font-black uppercase">{ev.titulo}</span>
                    {ev.notas && <p className="truncate font-mono text-[10px] text-ink-3">{ev.notas}</p>}
                  </div>
                </div>
              )
            })}
          </div>
          <Link to="/calendario" className="mt-3 flex items-center justify-between border-t border-line pt-2.5 font-mono text-[10px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-area-personal" /> Gcal: sync
            </span>
            <span className="font-bold text-ink hover:text-ink-2">Abrir agenda →</span>
          </Link>
        </Panel>
      </div>

      {/* Scratchpad con NLP */}
      <Panel
        title="Scratchpad / captura rápida"
        icono="terminal"
        extra={<span className="mono-label text-[10px] text-ink-3">lenguaje natural: mañana · 14:00 · p1 · #tag</span>}
      >
        <div className="border border-line bg-canvas p-3">
          <textarea
            value={scratch}
            onChange={(e) => setScratch(e.target.value)}
            placeholder="// Anotar un pensamiento rápido, comando cURL o snippet temporal... Ej: Entregar informe mañana 14:00 p1 #freelance"
            rows={2}
            className="w-full resize-none bg-transparent font-mono text-xs text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        {parseado && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border border-line bg-surface-2 p-2.5">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              <span className="font-bold text-ink">→ Tarea:</span>
              <span>{parseado.titulo}</span>
              {parseado.fecha && (
                <span className="flex items-center gap-1 text-ink-2">
                  <Icon name="calendar_today" className="text-[12px]" /> {fechaLegible(parseado.fecha)}
                </span>
              )}
              {parseado.hora && <span className="text-ink-2">🕐 {parseado.hora}</span>}
              {parseado.prioridad !== 'media' && (
                <span className={`font-bold ${parseado.prioridad === 'alta' ? 'text-prio-high' : 'text-ink-2'}`}>
                  {parseado.prioridad}
                </span>
              )}
              {parseado.recurrencia && <span className="text-ink-2">↻ {parseado.recurrencia}</span>}
              {parseado.etiquetas.map((e) => (
                <span key={e} className="text-ink-2">#{e}</span>
              ))}
            </div>
            <Button variant="primary" size="sm" icono="add" onClick={convertirScratch}>
              Convertir a tarea
            </Button>
          </div>
        )}
      </Panel>
    </div>
  )
}

function semanaISODe(iso: string): string {
  const d = new Date(iso)
  const dia = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dia + 3)
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  const semana = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${String(semana).padStart(2, '0')}`
}

function semanaAnterior(semana: string): string {
  const [anio, w] = semana.split('-W')
  const n = Number(w)
  if (n === 1) return `${Number(anio) - 1}-W52`
  return `${anio}-W${String(n - 1).padStart(2, '0')}`
}