import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { Check, Button, Badge, Progress, Select, TextInput, Field } from './ui'
import { SubpaginaView } from './SubpaginaView'
import { MapaEditor } from './MapaEditor'
import { MapaVista } from './MapaVista'
import { Markdown } from './Markdown'
import { useApp } from '../lib/store'
import { fichaToMarkdown, descargarMarkdown, parseMarkdown, leerArchivo } from '../lib/markdown'
import { TIPOS_MAPA, TIPO_LABEL, crearMapaInicial } from '../lib/mapas'
import type { Ficha, Mapa, MapaTipo, Subpagina } from '../lib/types'

const PROPIEDAD_COLORS = ['rgb(var(--accent))', 'rgb(var(--area-univ))', 'rgb(var(--area-freelance))', 'rgb(var(--area-emprende))', 'rgb(var(--area-personal))', 'rgb(var(--state-done))']

/**
 * Ficha de detalle estilo "ficha maestra" (mockups vistas_secciones_web):
 * modal grande (96vw × 94vh en web, full screen en móvil) con:
 * barra de breadcrumb + X, hero, grid de propiedades, secciones con
 * mini-tareas tickeables, subpáginas y mapas, y tabla de avance al final.
 */
export function FichaDetalle({
  ficha: fichaProp,
  onClose,
  areaColor,
  toggleMini,
  addMini,
  relacionados,
}: {
  ficha: Ficha
  onClose: () => void
  areaColor: string
  toggleMini: (seccionId: string, miniId: string) => void
  addMini: (seccionId: string, titulo: string) => void
  relacionados?: { etiqueta: string; icono: string; items: { texto: string; sub?: string; color?: string }[] }
}) {
  const [nuevaTarea, setNuevaTarea] = useState<Record<string, string>>({})
  const [nuevaSubTitulo, setNuevaSubTitulo] = useState<Record<string, string>>({})
  const [subActiva, setSubActiva] = useState<{ seccionId: string; sub: Subpagina } | null>(null)
  const [mapaActivo, setMapaActivo] = useState<Mapa | null>(null) // editor
  const [mapaVista, setMapaVista] = useState<Mapa | null>(null) // pantalla completa (solo lectura)
  const [nuevoMapaTipo, setNuevoMapaTipo] = useState<MapaTipo>('dominio')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ficha reactiva: se re-deriva del store para que cambios de secciones,
  // subpáginas o mapas se reflejen al instante en el modal abierto.
  const ficha = useApp((s) => s.db.fichas.find((f) => f.id === fichaProp.id)) ?? fichaProp

  const exportarMd = () => {
    descargarMarkdown(ficha.titulo, fichaToMarkdown(ficha))
  }

  const importarMd = async (archivo: File) => {
    const texto = await leerArchivo(archivo)
    const parsed = parseMarkdown(texto)
    const primerSec = ficha.secciones[0]
    if (primerSec) {
      addSubpagina(ficha.id, primerSec.id, parsed.titulo, texto)
    }
  }

  // Acciones de subpáginas y mapas (store directo)
  const addSubpagina = useApp((s) => s.addSubpagina)
  const updateSubpagina = useApp((s) => s.updateSubpagina)
  const deleteSubpagina = useApp((s) => s.deleteSubpagina)
  const toggleSubpaginaMini = useApp((s) => s.toggleSubpaginaMini)
  const addSubpaginaMini = useApp((s) => s.addSubpaginaMini)
  const addMapa = useApp((s) => s.addMapa)
  const updateMapa = useApp((s) => s.updateMapa)
  const deleteMapa = useApp((s) => s.deleteMapa)
  const deleteSeccion = useApp((s) => s.deleteSeccion)
  const toggleSeccionOculta = useApp((s) => s.toggleSeccionOculta)
  const addFichaPropiedad = useApp((s) => s.addFichaPropiedad)
  const updateFichaPropiedad = useApp((s) => s.updateFichaPropiedad)
  const deleteFichaPropiedad = useApp((s) => s.deleteFichaPropiedad)
  const [propEditando, setPropEditando] = useState<{ id?: string; etiqueta: string; valor: string; icono: string; color?: string } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const totalMini = ficha.secciones.reduce((acc, s) => acc + s.mini_tareas.length, 0)
  const hechasMini = ficha.secciones.reduce((acc, s) => acc + s.mini_tareas.filter((m) => m.hecha).length, 0)
  const pctGlobal = totalMini ? Math.round((hechasMini / totalMini) * 100) : 0

  const estadoSec = (hechas: number, total: number): { label: string; color: string } => {
    if (!total) return { label: 'SIN TAREAS', color: 'rgb(var(--ink-3))' }
    if (hechas === total) return { label: 'COMPLETA', color: 'rgb(var(--state-done))' }
    if (hechas > 0) return { label: 'EN CURSO', color: 'rgb(var(--state-doing))' }
    return { label: 'PENDIENTE', color: 'rgb(var(--state-todo))' }
  }

  const content = (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="popover theme-card flex h-[96vh] w-full flex-col overflow-hidden rounded-none shadow-lift sm:h-[94vh] sm:max-w-[96vw] sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior: breadcrumb + acciones + X */}
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 sm:px-4">
          <div className="mono-label flex min-w-0 items-center gap-1.5 text-[10px] text-ink-3">
            <span className="cursor-pointer hover:text-ink" onClick={onClose}>{tipoLabel(ficha.tipo)}</span>
            <span>»</span>
            <span className="cursor-pointer hover:text-ink">Detalle</span>
            <span>»</span>
            <span className="truncate font-bold text-ink-2">{ficha.titulo}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".md,text/markdown,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importarMd(f); e.target.value = '' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Importar .md como subpágina"
              className="hidden cursor-pointer items-center gap-1 border border-line bg-surface-3 px-2 py-1 font-mono text-[10px] font-bold text-ink-2 transition-colors hover:text-ink sm:flex"
            >
              <Icon name="upload_file" className="text-[14px]" /> .md
            </button>
            <button
              onClick={exportarMd}
              title="Exportar ficha a .md"
              className="hidden cursor-pointer items-center gap-1 border border-line bg-surface-3 px-2 py-1 font-mono text-[10px] font-bold text-ink-2 transition-colors hover:text-ink sm:flex"
            >
              <Icon name="download" className="text-[14px]" /> .md
            </button>
            <span className="hidden font-mono text-[9px] uppercase text-ink-3 lg:inline">Ficha · {pctGlobal}%</span>
            <button onClick={onClose} title="Cerrar [ESC]" className="flex cursor-pointer items-center gap-1 border border-line bg-surface-3 px-2 py-1 font-mono text-[10px] font-bold text-ink-2 transition-colors hover:text-ink">
              <Icon name="close" className="text-[15px]" />
              <span className="hidden sm:inline">ESC</span>
            </button>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-5">
            {/* Hero */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono-label border border-line bg-canvas px-2 py-0.5 text-[9px]" style={{ color: `rgb(var(--${areaColor}))` }}>
                  SYS.{ficha.id.toUpperCase()}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold" style={{ color: `rgb(var(--${areaColor}))` }}>
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `rgb(var(--${areaColor}))` }} />
                  {ficha.estado}
                </span>
              </div>
              <h1 className="font-display text-xl font-black uppercase tracking-tight sm:text-2xl">{ficha.titulo}</h1>
              <p className="font-mono text-[11px] text-ink-3">{ficha.subtitulo}</p>
            </div>

            {/* Propiedades metadata (bloques editables) */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ficha.propiedades.map((p) => {
                const color = p.color ?? `rgb(var(--${areaColor}))`
                return (
                  <div key={p.id ?? p.etiqueta} className="group relative flex flex-col gap-1 border border-line bg-surface-2 p-2.5" style={{ borderLeft: `3px solid ${color}` }}>
                    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-ink-3">
                      <Icon name={p.icono} className="text-[13px]" />
                      {p.etiqueta}
                    </span>
                    <span className="text-[12px] font-semibold leading-snug">{p.valor}</span>
                    <div className="absolute -right-1.5 -top-1.5 hidden items-center gap-0.5 group-hover:flex">
                      <button
                        onClick={() => setPropEditando({ id: p.id ?? p.etiqueta, etiqueta: p.etiqueta, valor: p.valor, icono: p.icono, color })}
                        title="Editar bloque"
                        className="cursor-pointer border border-line bg-surface-3 px-1 py-0.5 text-ink-2 transition-colors hover:text-ink"
                      >
                        <Icon name="edit" className="text-[11px]" />
                      </button>
                      <button
                        onClick={() => deleteFichaPropiedad(ficha.id, p.id ?? p.etiqueta)}
                        title="Eliminar bloque"
                        className="cursor-pointer border border-line bg-surface-3 px-1 py-0.5 text-ink-3 transition-colors hover:text-prio-high"
                      >
                        <Icon name="close" className="text-[11px]" />
                      </button>
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => setPropEditando({ etiqueta: '', valor: '', icono: 'data_object', color: `rgb(var(--${areaColor}))` })}
                className="flex min-h-[54px] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-line text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
              >
                <Icon name="add_box" className="text-[16px]" />
                <span className="font-mono text-[9px] font-bold uppercase">Añadir bloque</span>
              </button>
            </div>

            {/* Editor de bloque de propiedad */}
            {propEditando && (
              <div className="border border-line bg-surface-2 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="mono-label text-[9px] font-bold uppercase text-ink-3">Editor de bloque</span>
                  <button onClick={() => setPropEditando(null)} className="cursor-pointer text-ink-3 hover:text-ink"><Icon name="close" className="text-[15px]" /></button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Field label="Etiqueta">
                    <TextInput value={propEditando.etiqueta} onChange={(e) => setPropEditando((p) => p && { ...p, etiqueta: e.target.value })} placeholder="Fuente de verdad, prioridad…" />
                  </Field>
                  <Field label="Valor">
                    <TextInput value={propEditando.valor} onChange={(e) => setPropEditando((p) => p && { ...p, valor: e.target.value })} placeholder="Valor del bloque" />
                  </Field>
                  <Field label="Icono (nombre)">
                    <TextInput value={propEditando.icono} onChange={(e) => setPropEditando((p) => p && { ...p, icono: e.target.value })} placeholder="link, star, flag…" />
                  </Field>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="mono-label text-[9px] text-ink-3">Color</span>
                    {PROPIEDAD_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPropEditando((p) => p && { ...p, color: c })}
                        className={`h-4 w-4 cursor-pointer border transition-transform ${propEditando.color === c ? 'scale-125 border-line-strong' : 'border-line'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {propEditando.id && (
                      <Button variant="ghost" size="sm" icono="delete" onClick={() => { deleteFichaPropiedad(ficha.id, propEditando.id!); setPropEditando(null) }}>Eliminar</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setPropEditando(null)}>Cancelar</Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icono="save"
                      onClick={() => {
                        if (!propEditando.etiqueta.trim()) return
                        if (propEditando.id) {
                          updateFichaPropiedad(ficha.id, propEditando.id, {
                            etiqueta: propEditando.etiqueta,
                            valor: propEditando.valor,
                            icono: propEditando.icono || 'data_object',
                            color: propEditando.color,
                          })
                        } else {
                          addFichaPropiedad(ficha.id, {
                            etiqueta: propEditando.etiqueta,
                            valor: propEditando.valor,
                            icono: propEditando.icono || 'data_object',
                            color: propEditando.color,
                          })
                        }
                        setPropEditando(null)
                      }}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Progreso global */}
            <div className="border border-line bg-canvas p-3">
              <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-bold">
                <span className="uppercase text-ink-3">Avance global de la ficha</span>
                <span style={{ color: `rgb(var(--${areaColor}))` }}>{hechasMini}/{totalMini} · {pctGlobal}%</span>
              </div>
              <Progress value={pctGlobal} color={`rgb(var(--${areaColor}))`} />
            </div>

            {/* Secciones con mini-tareas */}
            {ficha.secciones.map((sec, i) => {
              const hechas = sec.mini_tareas.filter((m) => m.hecha).length
              const st = estadoSec(hechas, sec.mini_tareas.length)
              return (
                <section key={sec.id} className="flex flex-col gap-2.5 border border-line bg-surface-2 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold" style={{ color: `rgb(var(--${areaColor}))` }}>
                        {String(i + 1).padStart(2, '0')} //
                      </span>
                      <Icon name={sec.icono} className="text-[17px] text-ink-2" />
                      <h2 className="mono-label text-[11px] font-bold text-ink">{sec.titulo}</h2>
                      {sec.oculta && (
                        <span className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[8px] font-black uppercase text-ink-3">
                          OCULTA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="border border-line px-1.5 py-0.5 font-mono text-[9px] font-black uppercase"
                        style={{ color: st.color, backgroundColor: `color-mix(in srgb, ${st.color} 12%, transparent)` }}
                      >
                        {st.label} · {hechas}/{sec.mini_tareas.length}
                      </span>
                      <button
                        onClick={() => toggleSeccionOculta(ficha.id, sec.id)}
                        title={sec.oculta ? 'Mostrar sección' : 'Ocultar sección'}
                        className="flex cursor-pointer items-center gap-1 border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-2 transition-colors hover:text-ink"
                      >
                        <Icon name={sec.oculta ? 'visibility' : 'visibility_off'} className="text-[12px]" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar la sección "${sec.titulo}"? Se perderán sus mini-tareas y subpáginas.`)) deleteSeccion(ficha.id, sec.id) }}
                        title="Eliminar sección"
                        className="flex cursor-pointer items-center gap-1 border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-3 transition-colors hover:text-prio-high"
                      >
                        <Icon name="delete" className="text-[12px]" />
                      </button>
                    </div>
                  </div>

                  {!sec.oculta && (
                    <>
                  {sec.contenido.map((c, j) => (
                    <p key={j} className="text-[12px] leading-relaxed text-ink-2"><Markdown text={c} /></p>
                  ))}

                  {/* Mini-tareas */}
                  <div className="flex flex-col gap-1.5">
                    {sec.mini_tareas.map((mt) => (
                      <div key={mt.id} className="flex items-center gap-2.5 border border-line bg-canvas p-2 transition-colors hover:bg-surface-3">
                        <Check checked={mt.hecha} onChange={() => toggleMini(sec.id, mt.id)} />
                        <span className={`flex-1 text-[12px] font-medium ${mt.hecha ? 'strike-anim strike-on text-ink-3' : ''}`}>{mt.titulo}</span>
                        {mt.hecha && <Icon name="verified" className="text-[14px] text-state-done" />}
                      </div>
                    ))}
                    {/* Añadir paso */}
                    <div className="flex gap-1.5">
                      <input
                        value={nuevaTarea[sec.id] ?? ''}
                        onChange={(e) => setNuevaTarea((prev) => ({ ...prev, [sec.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (nuevaTarea[sec.id] ?? '').trim()) {
                            addMini(sec.id, (nuevaTarea[sec.id] ?? '').trim())
                            setNuevaTarea((prev) => ({ ...prev, [sec.id]: '' }))
                          }
                        }}
                        placeholder="Añadir mini-tarea / paso..."
                        className="flex-1 border border-line bg-canvas px-2.5 py-1.5 font-mono text-[11px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
                      />
                      <Button
                        variant="soft"
                        size="sm"
                        icono="add"
                        onClick={() => {
                          const v = (nuevaTarea[sec.id] ?? '').trim()
                          if (v) {
                            addMini(sec.id, v)
                            setNuevaTarea((prev) => ({ ...prev, [sec.id]: '' }))
                          }
                        }}
                      >
                        OK
                      </Button>
                    </div>
                  </div>

                  {/* Subpáginas anidadas de la sección */}
                  <div className="mt-1 border-t border-line/60 pt-2">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="mono-label text-[9px] text-ink-3">
                        Subpáginas {(sec.subpaginas ?? []).length > 0 && `(${(sec.subpaginas ?? []).length})`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          value={nuevaSubTitulo[sec.id] ?? ''}
                          onChange={(e) => setNuevaSubTitulo((prev) => ({ ...prev, [sec.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (nuevaSubTitulo[sec.id] ?? '').trim()) {
                              addSubpagina(ficha.id, sec.id, (nuevaSubTitulo[sec.id] ?? '').trim())
                              setNuevaSubTitulo((prev) => ({ ...prev, [sec.id]: '' }))
                            }
                          }}
                          placeholder="Nueva subpágina..."
                          className="w-44 border border-line bg-canvas px-2 py-1 font-mono text-[10px] text-ink outline-none placeholder:text-ink-3"
                        />
                        <Button
                          variant="soft"
                          size="sm"
                          icono="note_add"
                          onClick={() => {
                            const v = (nuevaSubTitulo[sec.id] ?? '').trim()
                            if (v) {
                              addSubpagina(ficha.id, sec.id, v)
                              setNuevaSubTitulo((prev) => ({ ...prev, [sec.id]: '' }))
                            }
                          }}
                        >
                          Subpágina
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(sec.subpaginas ?? []).map((sp) => (
                        <button
                          key={sp.id}
                          onClick={() => setSubActiva({ seccionId: sec.id, sub: sp })}
                          className="flex cursor-pointer items-center gap-1 border border-line bg-canvas px-2 py-1 font-mono text-[10px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                        >
                          <Icon name={sp.icono} className="text-[12px]" />
                          <span className="max-w-40 truncate">{sp.titulo}</span>
                          {sp.mini_tareas.length > 0 && (
                            <span className="font-bold" style={{ color: `rgb(var(--${areaColor}))` }}>
                              {sp.mini_tareas.filter((m) => m.hecha).length}/{sp.mini_tareas.length}
                            </span>
                          )}
                          {(sp.mapas ?? []).length > 0 && <span className="text-ink-3">· {sp.mapas?.length} mapa{sp.mapas && sp.mapas.length > 1 ? 's' : ''}</span>}
                        </button>
                      ))}
                      {(sec.subpaginas ?? []).length === 0 && (
                        <p className="font-mono text-[9px] text-ink-3">Sin subpáginas — agrega documentos, contextos o fragmentos extendidos.</p>
                      )}
                    </div>
                  </div>
                  </>
                  )}
                </section>
              )
            })}

            {/* ===== Tabla de avance ===== */}
            <section className="flex flex-col gap-2.5 border border-line bg-canvas p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon name="assessment" className="text-[17px] text-ink-2" />
                  <h2 className="mono-label text-[11px] font-bold text-ink">Tabla de avance por sección</h2>
                </div>
                <Badge color={`rgb(var(--${areaColor}))`}>{pctGlobal}% global</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface-2 font-mono text-[9px] uppercase tracking-wider text-ink-3">
                      <th className="px-2.5 py-2">Sección</th>
                      <th className="px-2.5 py-2">Mini-tareas</th>
                      <th className="px-2.5 py-2 w-36">Avance</th>
                      <th className="px-2.5 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {ficha.secciones.map((sec) => {
                      const hechas = sec.mini_tareas.filter((m) => m.hecha).length
                      const total = sec.mini_tareas.length
                      const st = estadoSec(hechas, total)
                      return (
                        <tr key={sec.id}>
                          <td className="px-2.5 py-2 text-[11px] font-semibold">{sec.titulo}</td>
                          <td className="px-2.5 py-2 font-mono text-[11px] text-ink-2">{hechas}/{total}</td>
                          <td className="px-2.5 py-2">
                            <Progress value={total ? (hechas / total) * 100 : 0} color={st.color} className="!h-1.5" />
                          </td>
                          <td className="px-2.5 py-2">
                            <Badge color={st.color}>{st.label}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Relacionados (tareas/notas asociadas) ===== */}
            {relacionados && relacionados.items.length > 0 && (
              <section className="flex flex-col gap-2.5 border border-line bg-canvas p-3.5 sm:p-4">
                <div className="flex items-center gap-2">
                  <Icon name={relacionados.icono} className="text-[17px] text-ink-2" />
                  <h2 className="mono-label text-[11px] font-bold text-ink">{relacionados.etiqueta}</h2>
                  <span className="font-mono text-[10px] text-ink-3">({relacionados.items.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {relacionados.items.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 border border-line bg-surface-2 p-2">
                      <span className="min-w-0 text-[12px] font-medium"><Markdown text={r.texto} /></span>
                      {r.sub && (
                        <span className="shrink-0 font-mono text-[9px] uppercase" style={{ color: r.color ?? 'rgb(var(--ink-3))' }}>
                          {r.sub}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

{/* ===== Mapas de la ficha ===== */}
              <section className="flex flex-col gap-3 border border-line bg-canvas p-3.5 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon name="hub" className="text-[17px] text-ink-2" />
                    <h2 className="mono-label text-[11px] font-bold text-ink">Mapas de la ficha</h2>
                    <span className="font-mono text-[10px] text-ink-3">({(ficha.mapas ?? []).length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Select value={nuevoMapaTipo} onChange={(e) => setNuevoMapaTipo(e.target.value as MapaTipo)} className="!w-auto !px-1.5 !py-0.5 !text-[10px]" title={TIPOS_MAPA.find((t) => t.id === nuevoMapaTipo)?.objetivo}>
                      {TIPOS_MAPA.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                      ))}
                    </Select>
                    <Button
                      variant="primary"
                      size="sm"
                      icono="add"
                      onClick={() => {
                        const m = crearMapaInicial(nuevoMapaTipo, 'Nuevo mapa')
                        addMapa(ficha.id, m)
                        setMapaActivo(m)
                      }}
                    >
                      Nuevo mapa
                    </Button>
                  </div>
                </div>
                {TIPOS_MAPA.find((t) => t.id === nuevoMapaTipo) && (
                  <p className="-mt-1 font-mono text-[9px] italic text-ink-3">
                    {TIPOS_MAPA.find((t) => t.id === nuevoMapaTipo)!.objetivo}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {(ficha.mapas ?? []).map((m) => (
                    <div key={m.id} className="flex flex-col gap-1.5 border border-line bg-surface-2 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 font-display text-[12px] font-black uppercase tracking-tight">
                          <Icon name={m.tipo === 'datos' ? 'data_object' : m.tipo === 'dominio' ? 'domain' : m.tipo === 'esquema' ? 'dns' : 'hub'} className="shrink-0 text-[14px] text-ink-2" />
                          <span className="truncate">{m.titulo || 'Sin título'}</span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <button onClick={() => setMapaVista(m)} className="flex cursor-pointer items-center gap-1 border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-2 transition-colors hover:text-ink" title="Pantalla completa">
                            <Icon name="open_in_full" className="text-[12px]" /> Ver
                          </button>
                          <button onClick={() => setMapaActivo(m)} className="flex cursor-pointer items-center gap-1 border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-2 transition-colors hover:text-ink" title="Editar">
                            <Icon name="edit" className="text-[12px]" /> Editar
                          </button>
                          <button onClick={() => deleteMapa(ficha.id, m.id)} className="flex cursor-pointer items-center gap-1 border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-3 transition-colors hover:text-prio-high" title="Eliminar">
                            <Icon name="delete" className="text-[12px]" />
                          </button>
                        </div>
                      </div>
                      <MapaVista mapa={m} height={200} />
                    </div>
                  ))}
                </div>
                {(ficha.mapas ?? []).length === 0 && (
                  <p className="font-mono text-[9px] text-ink-3">
                    Sin mapas — elige un tipo arriba (dominio, flujo de datos, proceso, arquitectura, mental, conceptual) y crea el primero.
                  </p>
                )}
              </section>
          </div>
        </div>
      </div>
    </div>
  )

  // Overlay: subpágina anidada
  // Subpágina reactiva: se re-deriva del store para que tablas, mapas y checklist se reflejen al instante.
  const subViva = subActiva
    ? ficha.secciones.find((s) => s.id === subActiva.seccionId)?.subpaginas?.find((sp) => sp.id === subActiva.sub.id) ?? subActiva.sub
    : null
  const subOverlay = subActiva && subViva && (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-2" onClick={() => setSubActiva(null)}>
      <div className="popover theme-card flex h-[96vh] w-full max-w-[97vw] flex-col overflow-hidden rounded-none p-4 shadow-lift sm:rounded-card sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto">
          <SubpaginaView
            subpagina={subViva}
            areaColor={areaColor}
            fichaTitulo={ficha.titulo}
            onCambio={(c) => updateSubpagina(ficha.id, subActiva.seccionId, subActiva.sub.id, c)}
            onEliminar={() => { deleteSubpagina(ficha.id, subActiva.seccionId, subActiva.sub.id); setSubActiva(null) }}
            onCerrar={() => setSubActiva(null)}
            toggleMini={(miniId) => toggleSubpaginaMini(ficha.id, subActiva.seccionId, subActiva.sub.id, miniId)}
            addMini={(titulo) => addSubpaginaMini(ficha.id, subActiva.seccionId, subActiva.sub.id, titulo)}
            addMapa={(m) => addMapa(ficha.id, m, subActiva.sub.id)}
            updateMapa={(mapaId, c) => updateMapa(ficha.id, mapaId, c, subActiva.sub.id)}
            deleteMapa={(mapaId) => deleteMapa(ficha.id, mapaId, subActiva.sub.id)}
          />
        </div>
      </div>
    </div>
  )

  // Overlay: editor de mapa de la ficha
  const mapaOverlay = mapaActivo && (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2" onClick={() => setMapaActivo(null)}>
      <div className="popover theme-card h-[96vh] max-h-[96vh] w-[97vw] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <MapaEditor
          mapa={mapaActivo}
          onChange={(m) => { setMapaActivo(m); updateMapa(ficha.id, m.id, m) }}
          onEliminar={() => { deleteMapa(ficha.id, mapaActivo.id); setMapaActivo(null) }}
          onCerrar={() => setMapaActivo(null)}
        />
      </div>
    </div>
  )

  // Overlay: pantalla completa (solo lectura interactiva)
  const mapaFull = mapaVista && (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2" onClick={() => setMapaVista(null)}>
      <div className="popover theme-card flex h-[96vh] w-[97vw] flex-col overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 font-display text-sm font-black uppercase tracking-tight">
            <Icon name={mapaVista.tipo === 'datos' ? 'data_object' : mapaVista.tipo === 'dominio' ? 'domain' : mapaVista.tipo === 'esquema' ? 'dns' : 'hub'} className="text-[18px]" />
            <span className="truncate">{mapaVista.titulo || 'Sin título'}</span>
            <span className="font-mono text-[10px] font-bold text-ink-3">{TIPO_LABEL[mapaVista.tipo]}</span>
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="soft" size="sm" icono="edit" onClick={() => { setMapaActivo(mapaVista); setMapaVista(null) }}>Editar</Button>
            <Button variant="ghost" size="sm" icono="delete" onClick={() => { deleteMapa(ficha.id, mapaVista.id); setMapaVista(null) }}>Eliminar</Button>
            <Button variant="ghost" size="sm" icono="close" onClick={() => setMapaVista(null)}>Cerrar</Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <MapaVista mapa={mapaVista} height="100%" />
        </div>
      </div>
    </div>
  )

  return createPortal(
    <>
      {content}
      {subOverlay}
      {mapaOverlay}
      {mapaFull}
    </>,
    document.body
  )
}

function tipoLabel(tipo: Ficha['tipo']) {
  const m: Record<string, string> = {
    proyecto: 'Proyectos',
    tarea: 'Tareas',
    cliente: 'Freelance',
    nota: 'Personal',
    documento: 'Documentos',
  }
  return m[tipo] ?? 'Detalle'
}