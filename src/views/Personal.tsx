import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Check, Button } from '../components/ui'
import { Modal } from '../components/ui'
import { DetailHeader, Prop, Tags, Notas, DetailActions } from '../components/detail'
import { FichaDetalle } from '../components/FichaDetalle'
import { formatearFecha, hoyISO, enDias } from '../lib/utils'
import type { Idea, Ficha } from '../lib/types'

/** Color por % de hábitos hechos: 100% verde, >=75% azul, >=50% amarillo, <50% rojo */
function colorDePct(pct: number): { bg: string; fg: string } {
  if (pct >= 100) return { bg: 'rgb(var(--state-done))', fg: '#000' }
  if (pct >= 75) return { bg: 'rgb(var(--state-doing))', fg: '#000' }
  if (pct >= 50) return { bg: 'rgb(var(--area-univ))', fg: '#000' }
  return { bg: 'rgb(var(--prio-high))', fg: '#fff' }
}

export function Personal() {
  const db = useApp((s) => s.db)
  const updateTarea = useApp((s) => s.updateTarea)
  const updateIdea = useApp((s) => s.updateIdea)
  const addNota = useApp((s) => s.addNota)
  const toggleFichaMiniTarea = useApp((s) => s.toggleFichaMiniTarea)
  const addFichaMiniTarea = useApp((s) => s.addFichaMiniTarea)
  const navigate = useNavigate()
  const hoy = hoyISO()

  // Detalle de idea
  const [ideaActiva, setIdeaActiva] = useState<Idea | null>(null)
  const [fichaActiva, setFichaActiva] = useState<Ficha | null>(null)
  const [notaRapida, setNotaRapida] = useState('')

  const habitos = useMemo(() => db.tareas.filter((t) => t.etiquetas.includes('habito')), [db.tareas])
  const tareasPersonales = db.tareas.filter((t) => t.area_id === 'personal' && !t.etiquetas.includes('habito'))

  // Grid de hábitos: últimos 14 días
  const dias = useMemo(() => Array.from({ length: 14 }, (_, i) => enDias(i - 13)), [])
  const pctDia = (fecha: string) => {
    const delDia = habitos.filter((h) => h.fecha_limite === fecha)
    if (!delDia.length) return null
    return Math.round((delDia.filter((h) => h.estado === 'hecho').length / delDia.length) * 100)
  }

  // Racha de días completos (todos los hábitos del día hechos)
  const streak = useMemo(() => {
    let s = 0
    for (let i = 13; i >= 0; i--) {
      const fecha = enDias(i - 13)
      const delDia = habitos.filter((h) => h.fecha_limite === fecha)
      if (!delDia.length) break
      const completo = delDia.every((h) => h.estado === 'hecho')
      if (completo) s++
      else break
    }
    return s
  }, [habitos])

  const pctSemana = useMemo(() => {
    const marcados = dias.slice(-7).map((f) => pctDia(f)).filter((p) => p !== null)
    if (!marcados.length) return 0
    return Math.round(marcados.reduce((a, b) => a + (b ?? 0), 0) / marcados.length)
  }, [dias, habitos]) // eslint-disable-line react-hooks/exhaustive-deps

  const guardarNotaRapida = () => {
    if (!notaRapida.trim()) return
    addNota({
      titulo: `Nota personal · ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
      proyecto_id: null,
      area_id: 'personal',
      plantilla_id: 'tpl-nota-rapida',
      tipo: 'Nota rápida',
      estado: 'borrador',
      contenido_md: notaRapida,
      resumen: notaRapida.slice(0, 100),
      etiquetas: [],
    })
    setNotaRapida('')
  }

  const eventos = [...db.eventos].sort((a, b) => a.fecha.localeCompare(b.fecha)).filter((e) => e.fecha >= hoy).slice(0, 6)

  // Ideas en radar (no leídas)
  const ideasRadar = db.ideas.filter((i) => i.estado !== 'descartada' && i.estado !== 'archivada' && !i.leida)

  const marcarHabito = (hId: string) => {
    const h = habitos.find((x) => x.id === hId)
    if (!h) return
    const hecho = h.estado === 'hecho'
    updateTarea(h.id, {
      estado: hecho ? 'por_hacer' : 'hecho',
      cerrada_en: hecho ? null : new Date().toISOString(),
    })
  }

  const listoHoy = habitos.filter((h) => h.fecha_limite === hoy && h.estado === 'hecho').length
  const totalHoy = habitos.filter((h) => h.fecha_limite === hoy).length

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // LIFE_OS
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-area-personal" /> balance
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Personal <span className="text-area-personal">/</span> Vida
          </h1>
        </div>
      </div>

      {/* ===== Hábitos: grid calendario ===== */}
      <Panel
        title="Hábitos de la semana"
        icono="self_improvement"
        extra={
          <div className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase">
            <span className="flex items-center gap-1" style={{ color: 'rgb(var(--area-univ))' }}>
              <Icon name="local_fire_department" className="text-[14px]" /> Racha {streak} d
            </span>
            <span className="text-ink-3">semana {pctSemana}%</span>
            <span className="text-ink-3">{totalHoy ? `${listoHoy}/${totalHoy} hoy` : `${habitos.length} hábitos`}</span>
          </div>
        }
      >
        {/* Leyenda */}
        <div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase text-ink-3">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-state-done" /> 100%</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-state-doing" /> 75%</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-area-univ" /> 50%</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 bg-prio-high" /> &lt;50%</span>
          <span className="ml-auto">25% por hábito completado</span>
        </div>

        {/* Grid por días (7 columnas · 2 semanas) */}
        <div className="space-y-1.5">
          {[0, 1].map((semanaIdx) => (
            <div key={semanaIdx} className="grid grid-cols-7 gap-1.5">
              {dias.slice(semanaIdx * 7, semanaIdx * 7 + 7).map((fecha) => {
                const pct = pctDia(fecha)
                const color = pct === null ? null : colorDePct(pct)
                const f = new Date(fecha + 'T00:00:00')
                const esHoy = fecha === hoy
                return (
                  <div
                    key={fecha}
                    className={`day-chip flex aspect-square cursor-default flex-col items-center justify-center border border-line p-1 transition-all ${
                      esHoy ? 'border-line-strong shadow-lift' : ''
                    }`}
                    style={color ? { backgroundColor: `color-mix(in srgb, ${color.bg} 85%, transparent)`, color: color.fg } : { backgroundColor: 'rgb(var(--surface-2))' }}
                    title={`${f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} — ${pct ?? 0}% de hábitos`}
                  >
                    <span className="mono-label text-[9px] font-bold">{f.getDate()}</span>
                    <span className="font-mono text-[8px] uppercase opacity-80">{f.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    <span className="font-mono text-[11px] font-black">{pct ?? '·'}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Hábitos de hoy con check */}
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <span className="mono-label text-[10px] text-ink-3">Hábitos de hoy</span>
          {habitos
            .filter((h) => h.fecha_limite === hoy)
            .map((h) => (
              <label key={h.id} className="flex cursor-pointer items-center gap-3 border border-line bg-surface-2 p-3 transition-colors hover:bg-surface-3">
                <Check checked={h.estado === 'hecho'} onChange={() => marcarHabito(h.id)} />
                <span className={`text-[12px] font-semibold ${h.estado === 'hecho' ? 'strike-anim strike-on text-ink-3' : ''}`}>{h.titulo}</span>
                <span className={`ml-auto font-mono text-[9px] uppercase ${h.estado === 'hecho' ? 'text-state-done' : 'text-ink-3'}`}>
                  {h.estado === 'hecho' ? '✓ hecho' : 'pendiente'}
                </span>
              </label>
            ))}
        </div>
      </Panel>

      {/* ===== Captura rápida personal ===== */}
      <Panel
        title="Captura rápida personal"
        icono="edit_note"
        extra={<span className="mono-label text-[10px] text-ink-3">se guarda como nota del día</span>}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            value={notaRapida}
            onChange={(e) => setNotaRapida(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); guardarNotaRapida() } }}
            placeholder="Escribe una idea, reflexión o pendiente personal... (Enter para guardar)"
            rows={2}
            className="flex-1 resize-none border border-line bg-canvas px-3 py-2 font-mono text-[12px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
          />
          <Button variant="primary" icono="save" onClick={guardarNotaRapida}>Guardar</Button>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Eventos próximos (clic → calendario o detalle) */}
        <Panel
          title="Próximos eventos"
          icono="event"
          extra={
            <button onClick={() => navigate('/calendario')} className="cursor-pointer font-mono text-[10px] font-bold text-ink-2 hover:text-ink">
              Ver calendario →
            </button>
          }
        >
          <div className="vlist space-y-2.5 pr-1">
            {eventos.map((e) => {
              const f = new Date(e.fecha + 'T00:00:00')
              return (
                <button
                  key={e.id}
                  onClick={() => navigate('/calendario')}
                  className="flex w-full cursor-pointer items-start gap-2.5 border border-line bg-surface-2 p-2.5 text-left transition-colors hover:bg-surface-3"
                  title="Abrir en calendario"
                >
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center border border-line bg-canvas leading-none">
                    <span className="font-mono text-[9px] font-black uppercase">{f.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    <span className="font-display text-xs font-black">{f.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold">{e.titulo}</span>
                    {e.notas && <span className="block truncate font-mono text-[10px] text-ink-3">{e.notas}</span>}
                  </div>
                </button>
              )
            })}
            {eventos.length === 0 && (
              <p className="py-6 text-center font-mono text-xs text-ink-3">Sin eventos próximos.</p>
            )}
          </div>
        </Panel>

        {/* Tareas personales */}
        <Panel
          title="Pendientes personales"
          icono="task_alt"
          extra={
            <span className="font-mono text-[10px] text-ink-3">{tareasPersonales.filter((t) => t.estado !== 'hecho').length} abiertas</span>
          }
        >
          <div className="vlist space-y-2 pr-1">
            {tareasPersonales.map((t) => (
              <div key={t.id} className="flex items-start gap-2.5 border border-line bg-surface-2 p-2.5">
                <Check
                  checked={t.estado === 'hecho'}
                  onChange={() => updateTarea(t.id, { estado: t.estado === 'hecho' ? 'por_hacer' : 'hecho', cerrada_en: t.estado === 'hecho' ? null : new Date().toISOString() })}
                />
                <div className="min-w-0">
                  <span className={`block text-[12px] font-semibold ${t.estado === 'hecho' ? 'line-through text-ink-3' : ''}`}>{t.titulo}</span>
                  <span className="font-mono text-[10px] text-ink-3">{formatearFecha(t.fecha_limite)}</span>
                </div>
              </div>
            ))}
            {tareasPersonales.length === 0 && <p className="py-6 text-center font-mono text-xs text-ink-3">Sin pendientes personales.</p>}
          </div>
        </Panel>

        {/* Ideas en radar → abribles como página */}
        <Panel
          title="Ideas en radar"
          icono="lightbulb"
          extra={<span className="mono-label text-[10px] text-ink-3">{ideasRadar.length} sin leer</span>}
        >
<div className="vlist flex flex-col gap-2.5 pr-1">
          {ideasRadar.map((i) => (
              <button
                key={i.id}
                onClick={() => setIdeaActiva(i)}
                className="cursor-pointer border border-line bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[12px] font-black uppercase tracking-tight">{i.titulo}</span>
                  <span className="font-mono text-[9px] uppercase text-ink-3">{i.categoria}</span>
                </div>
                {i.notas && <p className="mt-1 line-clamp-2 text-[11px] text-ink-2">{i.notas}</p>}
              </button>
            ))}
            {ideasRadar.length === 0 && (
              <p className="py-6 text-center font-mono text-xs text-ink-3">
                Radar vacío — todas las ideas leídas o archivadas.
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* ===== Recursos de investigación (fichas deep dive) ===== */}
      <Panel
        title="Recursos de investigación"
        icono="menu_book"
        extra={<span className="mono-label text-[10px] text-ink-3">fichas de lectura</span>}
      >
        <div className="vgrid grid grid-cols-1 gap-2.5 pr-1 md:grid-cols-2">
          {db.fichas.filter((f) => f.tipo === 'nota').map((f) => {
            const hechas = f.secciones.reduce((acc, s) => acc + s.mini_tareas.filter((m) => m.hecha).length, 0)
            const total = f.secciones.reduce((acc, s) => acc + s.mini_tareas.length, 0)
            return (
              <button
                key={f.id}
                onClick={() => setFichaActiva(f)}
                className="cursor-pointer border border-line bg-surface-2 p-4 text-left transition-colors hover:bg-surface-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[12px] font-black uppercase tracking-tight">{f.titulo}</span>
                  <span className="font-mono text-[9px] font-bold uppercase" style={{ color: 'rgb(var(--area-personal))' }}>
                    {hechas}/{total} pasos
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-ink-2">{f.subtitulo}</p>
              </button>
            )
          })}
          {db.fichas.filter((f) => f.tipo === 'nota').length === 0 && (
            <p className="py-6 text-center font-mono text-xs text-ink-3 md:col-span-2">Sin recursos de investigación todavía.</p>
          )}
        </div>
      </Panel>

      {/* ===== Detalle de idea (página abrible) ===== */}
      <Modal open={!!ideaActiva} onClose={() => setIdeaActiva(null)} title="Idea" ancho="max-w-3xl">
        {ideaActiva && (
          <div className="flex flex-col gap-3">
            <DetailHeader
              icono="lightbulb"
              color="rgb(var(--area-emprende))"
              titulo={ideaActiva.titulo}
              sub={ideaActiva.categoria}
              onClose={() => setIdeaActiva(null)}
            />
            <div>
              <Prop label="Potencial">{ideaActiva.potencial}</Prop>
              <Prop label="Estado">{estadoLabel(ideaActiva.estado)}</Prop>
              {ideaActiva.proyecto_id && (
                <Prop label="Proyecto">{db.proyectos.find((p) => p.id === ideaActiva.proyecto_id)?.nombre ?? '—'}</Prop>
              )}
            </div>
            <Notas>{ideaActiva.notas}</Notas>
            <Tags items={[ideaActiva.categoria]} color="rgb(var(--area-emprende))" />
            <DetailActions>
              <Button
                variant="ghost"
                size="sm"
                icono="archive"
                onClick={() => {
                  updateIdea(ideaActiva.id, { estado: 'archivada', leida: true })
                  setIdeaActiva(null)
                }}
              >
                Archivar
              </Button>
              <Button
                variant="primary"
                size="sm"
                icono="done_all"
                onClick={() => {
                  updateIdea(ideaActiva.id, { leida: true })
                  setIdeaActiva(null)
                }}
              >
                Marcar como leída
              </Button>
            </DetailActions>
          </div>
        )}
      </Modal>

      {/* ===== Ficha de recurso personal (mockup web/móvil) ===== */}
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

function estadoLabel(estado: string) {
  return estado.charAt(0).toUpperCase() + estado.slice(1)
}