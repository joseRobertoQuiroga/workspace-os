import { useEffect, useRef, useState } from 'react'
import type { DB, Materia, Tema, TareaPrioridad } from '../lib/types'
import { Icon } from './Icon'
import { Button, TextArea, TextInput } from './ui'
import { RichText } from './RichText'
import { Pizarra } from './Pizarra'

interface Props {
  materia: Materia
  db: DB
  abrirTema?: { unidadId: string; temaId: string } | null
  addUnidad: (materiaId: string, titulo: string, tema: string) => void
  updateUnidad: (materiaId: string, unidadId: string, cambios: Partial<import('../lib/types').Unidad>) => void
  deleteUnidad: (materiaId: string, unidadId: string) => void
  addTema: (materiaId: string, unidadId: string, titulo: string, contexto: string) => void
  updateTema: (materiaId: string, unidadId: string, temaId: string, cambios: Partial<Tema>) => void
  deleteTema: (materiaId: string, unidadId: string, temaId: string) => void
  addTarea: (t: import('../lib/types').Tarea) => void
  updateTarea: (id: string, cambios: Partial<import('../lib/types').Tarea>) => void
}

/** Explorador de una materia: unidades (varias/una/ninguna) → temas con contexto, apuntes, tareas y pizarra */
export function MateriaExplorer(props: Props) {
  const { materia, db } = props
  const unidades = materia.unidades ?? []
  const [unidadExp, setUnidadExp] = useState<string | null>(props.abrirTema?.unidadId ?? null)
  const [temaActivo, setTemaActivo] = useState<{ unidadId: string; temaId: string } | null>(props.abrirTema ?? null)
  const [nuevaUnidad, setNuevaUnidad] = useState(false)
  const [uTitulo, setUTitulo] = useState('')
  const [uTema, setUTema] = useState('')
  const [nuevoTemaTitulo, setNuevoTemaTitulo] = useState('')
  const [nuevoTemaContexto, setNuevoTemaContexto] = useState('')
  const [creandoTemaEn, setCreandoTemaEn] = useState<string | null>(null)
  const [nuevaTareaTxt, setNuevaTareaTxt] = useState('')
  const [nuevaTareaPrio, setNuevaTareaPrio] = useState<TareaPrioridad>('media')
  const [temaBorrador, setTemaBorrador] = useState<{ titulo: string; contexto: string; apuntes: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const temaActual = temaActivo
    ? unidades.find((u) => u.id === temaActivo.unidadId)?.temas.find((t) => t.id === temaActivo.temaId) ?? null
    : null

  // Sincroniza el borrador cuando cambia el tema activo
  useEffect(() => {
    if (temaActual) setTemaBorrador({ titulo: temaActual.titulo, contexto: temaActual.contexto, apuntes: temaActual.apuntes })
    else setTemaBorrador(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaActivo?.temaId])

  useEffect(() => {
    if (!props.abrirTema) return
    setUnidadExp(props.abrirTema.unidadId)
    setTemaActivo(props.abrirTema)
  }, [props.abrirTema])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const guardarTema = (cambios: Partial<Tema>) => {
    if (!temaActivo) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      props.updateTema(materia.id, temaActivo.unidadId, temaActivo.temaId, cambios)
    }, 500)
  }

  const crearUnidad = () => {
    if (!uTitulo.trim()) return
    props.addUnidad(materia.id, uTitulo.trim(), uTema.trim())
    setUTitulo(''); setUTema(''); setNuevaUnidad(false)
  }

  const crearTema = (unidadId: string) => {
    if (!nuevoTemaTitulo.trim()) return
    props.addTema(materia.id, unidadId, nuevoTemaTitulo.trim(), nuevoTemaContexto.trim())
    setNuevoTemaTitulo(''); setNuevoTemaContexto(''); setCreandoTemaEn(null)
  }

  const crearTareaUnidad = (unidadId: string) => {
    if (!nuevaTareaTxt.trim()) return
    props.addTarea({
      id: `tmp-${Date.now().toString(36)}`,
      titulo: nuevaTareaTxt.trim(),
      area_id: 'universidad',
      proyecto_id: materia.id,
      unidad_id: unidadId,
      tema_id: temaActivo?.unidadId === unidadId ? temaActivo.temaId : null,
      estado: 'por_hacer',
      prioridad: nuevaTareaPrio,
      destacado: false,
      fecha_limite: null,
      notas: '',
      etiquetas: [],
      arrastrada: false,
      mi_dia: false,
      subtareas: [],
      recurrencia: null,
      cerrada_en: null,
      creado_en: new Date().toISOString(),
    })
    setNuevaTareaTxt('')
  }

  const tareasMateria = db.tareas.filter((t) => t.proyecto_id === materia.id)

  return (
    <div className="flex flex-col gap-3">
      {/* Header de la materia */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-black uppercase tracking-tight">{materia.nombre}</h3>
            <span className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] font-black text-area-univ">{materia.semestre}</span>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-ink-3">
            {materia.docente} · {materia.creditos} créditos · {unidades.length} unidades ·{' '}
            {unidades.reduce((a, u) => a + (u.temas ?? []).length, 0)} temas
          </p>
        </div>
        <Button variant="soft" size="sm" icono="add" onClick={() => setNuevaUnidad((v) => !v)}>
          {nuevaUnidad ? 'Cancelar' : 'Nueva unidad'}
        </Button>
      </div>

      {nuevaUnidad && (
        <div className="flex flex-col gap-2 border border-line bg-canvas p-2.5">
          <TextInput value={uTitulo} onChange={(e) => setUTitulo(e.target.value)} placeholder="Nombre de la unidad (ej. Unidad 3 · Arreglos)" autoFocus />
          <TextInput value={uTema} onChange={(e) => setUTema(e.target.value)} placeholder="Tema general de la unidad (opcional)" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNuevaUnidad(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" icono="add" onClick={crearUnidad}>Crear unidad</Button>
          </div>
        </div>
      )}

      {/* Unidades */}
      {unidades.length === 0 && (
        <p className="border border-dashed border-line p-3 text-center font-mono text-[10px] text-ink-3">
          Sin unidades — crea la primera (una materia puede tener varias unidades, una o ninguna).
        </p>
      )}

      {unidades.map((u) => {
        const expandida = unidadExp === u.id
        const temasU = u.temas ?? []
        const tareasU = tareasMateria.filter((t) => !t.unidad_id || t.unidad_id === u.id)
        const hechasU = tareasU.filter((t) => t.estado === 'hecho').length
        return (
          <div key={u.id} className="border border-line bg-canvas">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 p-2.5">
              <button
                onClick={() => { setUnidadExp(expandida ? null : u.id); if (!expandida) setTemaActivo(null) }}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              >
                <Icon name={expandida ? 'expand_more' : 'chevron_right'} className="text-[16px] text-ink-3" />
                <span className="truncate font-display text-[12px] font-black uppercase tracking-tight">{u.titulo}</span>
                <span className="hidden font-mono text-[9px] text-ink-3 sm:inline">{u.tema}</span>
              </button>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="font-mono text-[9px] text-ink-3">
                  {temasU.length} tema{temasU.length === 1 ? '' : 's'} · {hechasU}/{tareasU.length} tareas
                </span>
                <button
                  onClick={() => { if (confirm(`¿Eliminar la unidad "${u.titulo}"?`)) props.deleteUnidad(materia.id, u.id) }}
                  title="Eliminar unidad"
                  className="cursor-pointer text-ink-3 transition-colors hover:text-prio-high"
                >
                  <Icon name="delete" className="text-[15px]" />
                </button>
              </div>
            </div>

            {expandida && (
              <div className="flex flex-col gap-2 p-2.5">
                {/* Temas */}
                <div className="flex flex-wrap gap-1.5">
                  {temasU.map((t) => {
                    const activo = temaActivo?.temaId === t.id && temaActivo.unidadId === u.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTemaActivo({ unidadId: u.id, temaId: t.id })}
                        className={`flex cursor-pointer items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors ${
                          activo ? 'bg-area-univ/15 text-area-univ' : 'text-ink-2 hover:border-line-strong hover:text-ink'
                        }`}
                      >
                        <Icon name={t.pizarra.length > 0 ? 'gesture' : 'menu_book'} className="text-[13px]" />
                        {t.titulo}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCreandoTemaEn(creandoTemaEn === u.id ? null : u.id)}
                    className="flex cursor-pointer items-center gap-1 border border-dashed border-line px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase text-ink-3 transition-colors hover:text-ink"
                  >
                    <Icon name="add" className="text-[13px]" /> Tema
                  </button>
                </div>
                {temasU.length === 0 && !creandoTemaEn && (
                  <p className="font-mono text-[9px] text-ink-3">Sin temas todavía (puede tener varios, uno o ninguno).</p>
                )}

                {creandoTemaEn === u.id && (
                  <div className="flex flex-col gap-2 border border-dashed border-line bg-surface-2 p-2.5">
                    <TextInput value={nuevoTemaTitulo} onChange={(e) => setNuevoTemaTitulo(e.target.value)} placeholder="Título del tema" autoFocus />
                    <TextInput value={nuevoTemaContexto} onChange={(e) => setNuevoTemaContexto(e.target.value)} placeholder="Contexto (una línea que resume el tema)" />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setCreandoTemaEn(null)}>Cancelar</Button>
                      <Button variant="primary" size="sm" icono="add" onClick={() => crearTema(u.id)}>Crear tema</Button>
                    </div>
                  </div>
                )}

                {/* Detalle del tema activo */}
                {temaActivo?.unidadId === u.id && temaActual && (
                  <div className="mt-1 flex flex-col gap-3 border border-line bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon name="menu_book" className="text-[16px] text-area-univ" />
                        <TextInput value={temaBorrador?.titulo ?? ''} onChange={(e) => { setTemaBorrador((b) => b ? { ...b, titulo: e.target.value } : b); guardarTema({ titulo: e.target.value }) }} className="!border-transparent !bg-transparent !px-0 !font-display !text-[13px] !font-black !uppercase" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] text-ink-3">
                          {temaActual.actualizado_en ? `Actualizado ${new Date(temaActual.actualizado_en).toLocaleDateString('es-ES')}` : ''}
                        </span>
                        <button
                          onClick={() => { if (confirm(`¿Eliminar el tema "${temaActual.titulo}"?`)) { props.deleteTema(materia.id, u.id, temaActual.id); setTemaActivo(null) } }}
                          className="cursor-pointer text-ink-3 transition-colors hover:text-prio-high"
                          title="Eliminar tema"
                        >
                          <Icon name="delete" className="text-[16px]" />
                        </button>
                      </div>
                    </div>

                    {/* Contexto */}
                    <div className="flex flex-col gap-1">
                      <span className="mono-label text-[9px] font-bold uppercase text-ink-3">Contexto</span>
                      <TextInput
                        value={temaBorrador?.contexto ?? ''}
                        onChange={(e) => { setTemaBorrador((b) => b ? { ...b, contexto: e.target.value } : b); guardarTema({ contexto: e.target.value }) }}
                        placeholder="Contexto del tema…"
                        className="!text-[11px]"
                      />
                    </div>

                    {/* Apuntes */}
                    <div className="flex flex-col gap-1">
                      <span className="mono-label text-[9px] font-bold uppercase text-ink-3">Apuntes (Markdown)</span>
                      <TextArea
                        rows={5}
                        value={temaBorrador?.apuntes ?? ''}
                        onChange={(e) => { setTemaBorrador((b) => b ? { ...b, apuntes: e.target.value } : b); guardarTema({ apuntes: e.target.value }) }}
                        placeholder="Escribe el apunte del tema…"
                      />
                      {temaBorrador?.apuntes && (
                        <div className="border border-line bg-canvas p-2.5">
                          <RichText text={temaBorrador.apuntes} />
                        </div>
                      )}
                    </div>

                    {/* Pizarra */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="mono-label text-[9px] font-bold uppercase text-ink-3">Pizarra · ejemplo visual</span>
                        <span className="font-mono text-[9px] text-ink-3">arrastra · doble clic edita</span>
                      </div>
                      <Pizarra
                        nodos={temaActual.pizarra ?? []}
                        onChange={(pizarra) => guardarTema({ pizarra })}
                        height={320}
                      />
                    </div>

                    {/* Tareas asociadas a la unidad */}
                    <div className="flex flex-col gap-1.5">
                      <span className="mono-label text-[9px] font-bold uppercase text-ink-3">Tareas de la unidad</span>
                      <div className="flex flex-col gap-1.5">
                        {tareasU.map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-2 border border-line bg-canvas p-2">
                            <div className="min-w-0">
                              <div className={`truncate text-[11px] font-semibold ${t.estado === 'hecho' ? 'line-through text-ink-3' : ''}`}>{t.titulo}</div>
                              {t.tema_id && <div className="font-mono text-[9px] text-ink-3">tema: {unidades.flatMap((x) => x.temas).find((x) => x.id === t.tema_id)?.titulo ?? '—'}</div>}
                            </div>
                            <button
                              onClick={() => props.updateTarea(t.id, { estado: t.estado === 'hecho' ? 'por_hacer' : 'hecho', cerrada_en: t.estado === 'hecho' ? null : new Date().toISOString() })}
                              className={`shrink-0 cursor-pointer border border-line px-2 py-1 font-mono text-[9px] font-black uppercase transition-colors ${
                                t.estado === 'hecho' ? 'bg-state-done/15 text-state-done' : 'text-ink-3 hover:text-ink'
                              }`}
                            >
                              {t.estado === 'hecho' ? 'Hecho' : 'Marcar'}
                            </button>
                          </div>
                        ))}
                        {tareasU.length === 0 && <p className="font-mono text-[9px] text-ink-3">Sin tareas asociadas a esta unidad.</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          value={nuevaTareaTxt}
                          onChange={(e) => setNuevaTareaTxt(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && crearTareaUnidad(u.id)}
                          placeholder="Nueva tarea de la unidad…"
                          className="min-w-0 flex-1 border border-line bg-canvas px-2 py-1.5 font-mono text-[11px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
                        />
                        <select
                          value={nuevaTareaPrio}
                          onChange={(e) => setNuevaTareaPrio(e.target.value as TareaPrioridad)}
                          className="cursor-pointer border border-line bg-canvas px-2 py-1.5 font-mono text-[10px] text-ink outline-none"
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
                        </select>
                        <Button variant="soft" size="sm" icono="add" onClick={() => crearTareaUnidad(u.id)}>OK</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}