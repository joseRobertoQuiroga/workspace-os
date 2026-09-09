import { useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Badge, Button, Modal, Field, TextInput, TextArea, Select, AreaBadge } from '../components/ui'
import { FichaDetalle } from '../components/FichaDetalle'
import { estadoNotaLabel, formatearFecha } from '../lib/utils'
import type { Nota, NotaEstado, Ficha } from '../lib/types'

const TIPO_COLOR: Record<string, string> = {
  'Decisión técnica (ADR)': 'rgb(var(--area-emprende))',
  'Apunte de clase': 'rgb(var(--area-univ))',
  'Nota de reunión': 'rgb(var(--area-freelance))',
  Guía: 'rgb(var(--state-doing))',
  'Nota rápida': 'rgb(var(--area-personal))',
}

export function Documentos() {
  const db = useApp((s) => s.db)
  const addNota = useApp((s) => s.addNota)
  const updateNota = useApp((s) => s.updateNota)
  const deleteNota = useApp((s) => s.deleteNota)
  const toggleFichaMiniTarea = useApp((s) => s.toggleFichaMiniTarea)
  const addFichaMiniTarea = useApp((s) => s.addFichaMiniTarea)
  const crearFicha = useApp((s) => s.crearFicha)
  const [fichaActiva, setFichaActiva] = useState<Ficha | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todas')
  const [ver, setVer] = useState<Nota | null>(null)
  const [editar, setEditar] = useState(false)
  const [nuevaAbierta, setNuevaAbierta] = useState(false)

  const [fTitulo, setFTitulo] = useState('')
  const [fTipo, setFTipo] = useState('Nota rápida')
  const [fContenido, setFContenido] = useState('')
  const [fResumen, setFResumen] = useState('')

  const tipos = [...new Set(db.notas.map((n) => n.tipo))]
  const notas = db.notas.filter((n) => {
    if (filtroTipo !== 'todas' && n.tipo !== filtroTipo) return false
    if (busqueda && !(n.titulo + n.contenido_md + n.etiquetas.join(' ')).toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const crear = () => {
    if (!fTitulo.trim()) return
    addNota({
      titulo: fTitulo.trim(),
      proyecto_id: null,
      area_id: 'personal',
      plantilla_id: 'tpl-nota-rapida',
      tipo: fTipo,
      estado: 'borrador',
      contenido_md: fContenido,
      resumen: fResumen,
      etiquetas: [],
    })
    setFTitulo(''); setFContenido(''); setFResumen(''); setNuevaAbierta(false)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // KNOWLEDGE_VAULT
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-area-personal" /> {db.notas.length} documentos
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Documentos <span className="text-area-personal">/</span> Wiki
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TextInput placeholder="Buscar en documentos..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="sm:max-w-56" />
          <Button variant="primary" icono="add_box" onClick={() => setNuevaAbierta(true)}>
            Nuevo documento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFiltroTipo('todas')}
          className={`border border-line px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
            filtroTipo === 'todas' ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink'
          }`}
        >
          Todas
        </button>
        {tipos.map((t) => (
          <button
            key={t}
            onClick={() => setFiltroTipo(t)}
            className={`border border-line px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
              filtroTipo === t ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Galería */}
      <div className="vgrid grid grid-cols-1 gap-4 pr-1 md:grid-cols-2 xl:grid-cols-3">
        {notas.map((n, i) => {
          const color = TIPO_COLOR[n.tipo] ?? 'rgb(var(--ink-3))'
          return (
            <div key={n.id} className="theme-card rise-in flex flex-col overflow-hidden transition-all hover:-translate-y-0.5" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              {/* Portada por tipo */}
              <div
                className="flex h-16 items-center justify-between px-4"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
              >
                <Icon name={n.tipo === 'Decisión técnica (ADR)' ? 'account_tree' : n.tipo === 'Apunte de clase' ? 'school' : n.tipo === 'Nota de reunión' ? 'groups' : 'description'} className="text-[22px]" />
                <span className="font-mono text-[10px] font-black uppercase" style={{ color }}>{n.tipo}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <AreaBadge area={db.areas.find((a) => a.id === n.area_id)?.color ?? 'area-personal'} nombre={db.areas.find((a) => a.id === n.area_id)?.nombre ?? ''} />
                  <Badge color={n.estado === 'publicado' ? 'rgb(var(--state-done))' : n.estado === 'revisado' ? 'rgb(var(--state-doing))' : 'rgb(var(--state-todo))'}>
                    {estadoNotaLabel[n.estado]}
                  </Badge>
                </div>
                <h3 className="font-display text-sm font-black uppercase tracking-tight">{n.titulo}</h3>
                <p className="line-clamp-3 text-[11px] text-ink-2">{n.resumen || n.contenido_md}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {n.etiquetas.map((e) => (
                    <span key={e} className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-ink-2">#{e}</span>
                  ))}
                  {n.etiquetas.length === 0 && (
                    <span className="font-mono text-[9px] text-ink-3">actualizado {formatearFecha(n.actualizado_en)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2">
                  {(() => {
                    const ficha = db.fichas.find((f) => (f.tipo === 'documento' || f.tipo === 'nota') && f.entidad_id === n.id)
                    return ficha ? (
                      <Button variant="primary" size="sm" icono="description" onClick={() => setFichaActiva(ficha)}>
                        Abrir ficha
                      </Button>
                    ) : (
                      <Button variant="soft" size="sm" icono="open_in_new" onClick={() => setVer(n)}>
                        Abrir
                      </Button>
                    )
                  })()}
                  <button onClick={() => deleteNota(n.id)} className="cursor-pointer px-1 text-ink-3 hover:text-prio-high" title="Eliminar">
                    <Icon name="delete" className="text-[15px]" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {notas.length === 0 && (
          <div className="col-span-full">
            <Panel>
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Icon name="description" className="text-[34px] text-ink-3" />
                <p className="font-mono text-xs text-ink-3">No hay documentos con estos filtros.</p>
              </div>
            </Panel>
          </div>
        )}
      </div>

      {/* Modal ver documento */}
      <Modal open={!!ver} onClose={() => { setVer(null); setEditar(false) }} title={ver?.titulo ?? ''} ancho="max-w-[66vw]">
        {ver && (
          <div className="flex h-[70vh] flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={TIPO_COLOR[ver.tipo] ?? 'rgb(var(--ink-3))'}>{ver.tipo}</Badge>
              <Badge color={ver.estado === 'publicado' ? 'rgb(var(--state-done))' : ver.estado === 'revisado' ? 'rgb(var(--state-doing))' : 'rgb(var(--state-todo))'}>
                {estadoNotaLabel[ver.estado]}
              </Badge>
              {ver.proyecto_id && (
                <span className="font-mono text-[10px] text-ink-3">
                  {db.proyectos.find((p) => p.id === ver.proyecto_id)?.nombre}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto border border-line bg-canvas p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
              {ver.contenido_md}
            </div>
            {/* Relacionados */}
            {(() => {
              const rel = db.notas.filter(
                (n) =>
                  n.id !== ver.id &&
                  (n.etiquetas.some((e) => ver.etiquetas.includes(e)) || n.proyecto_id === ver.proyecto_id)
              )
              if (!rel.length) return null
              return (
                <div>
                  <span className="mono-label text-[9px] text-ink-3">Relacionados</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {rel.slice(0, 4).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => setVer(n)}
                        className="cursor-pointer border border-line bg-surface-2 px-2 py-1 text-left font-mono text-[10px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                      >
                        ↳ {n.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}
            <div className="flex flex-wrap gap-1.5">
              {ver.etiquetas.map((e) => (
                <span key={e} className="border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">#{e}</span>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2 font-mono text-[9px] text-ink-3">
              <span>Creada {formatearFecha(ver.creado_en)} · Actualizada {formatearFecha(ver.actualizado_en)}</span>
              <div className="flex items-center gap-2">
                <Select
                  value={ver.estado}
                  onChange={(e) => updateNota(ver.id, { estado: e.target.value as NotaEstado })}
                  className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                >
                  <option value="borrador">Borrador</option>
                  <option value="revisado">Revisado</option>
                  <option value="publicado">Publicado</option>
                </Select>
                {(() => {
                  const ficha = db.fichas.find((f) => (f.tipo === 'documento' || f.tipo === 'nota') && f.entidad_id === ver.id)
                  return ficha ? (
                    <Button variant="primary" size="sm" icono="description" onClick={() => { setVer(null); setFichaActiva(ficha) }}>
                      Abrir ficha
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icono="add_task"
                      onClick={() => {
                        const ficha = crearFicha({
                          tipo: 'documento',
                          entidad_id: ver.id,
                          titulo: ver.titulo,
                          subtitulo: `Ficha de Documento · ${ver.tipo}`,
                          area_id: ver.area_id,
                          estado: estadoNotaLabel[ver.estado].toUpperCase(),
                          descripcion: ver.resumen || ver.contenido_md.slice(0, 200),
                        })
                        setVer(null)
                        setFichaActiva(ficha)
                      }}
                    >
                      Crear ficha
                    </Button>
                  )
                })()}
                <Button variant="soft" size="sm" icono="edit" onClick={() => setEditar(true)}>Editar</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal editar */}
      <Modal open={editar && !!ver} onClose={() => setEditar(false)} title="Editar documento" ancho="max-w-[66vw]">
        {ver && (
          <div className="flex h-[70vh] flex-col gap-3">
            <Field label="Título">
              <TextInput value={editar ? fTitulo || ver.titulo : ver.titulo} onChange={(e) => setFTitulo(e.target.value)} />
            </Field>
            <Field label="Resumen">
              <TextInput value={editar ? fResumen || ver.resumen : ver.resumen} onChange={(e) => setFResumen(e.target.value)} />
            </Field>
            <div className="flex-1 overflow-y-auto">
              <Field label="Contenido (Markdown)">
                <TextArea rows={12} className="min-h-[60vh]" value={editar ? fContenido || ver.contenido_md : ver.contenido_md} onChange={(e) => setFContenido(e.target.value)} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditar(false)}>Cancelar</Button>
              <Button
                variant="primary"
                icono="save"
                onClick={() => {
                  updateNota(ver.id, {
                    titulo: fTitulo || ver.titulo,
                    resumen: fResumen || ver.resumen,
                    contenido_md: fContenido || ver.contenido_md,
                  })
                  setVer({ ...ver, titulo: fTitulo || ver.titulo, resumen: fResumen || ver.resumen, contenido_md: fContenido || ver.contenido_md })
                  setFTitulo(''); setFResumen(''); setFContenido('')
                  setEditar(false)
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nuevo */}
      <Modal open={nuevaAbierta} onClose={() => setNuevaAbierta(false)} title="Nuevo documento">
        <div className="space-y-3">
          <Field label="Título"><TextInput value={fTitulo} onChange={(e) => setFTitulo(e.target.value)} placeholder="Título del documento" autoFocus /></Field>
          <Field label="Tipo">
            <Select value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
              <option>Nota rápida</option>
              <option>Decisión técnica (ADR)</option>
              <option>Apunte de clase</option>
              <option>Nota de reunión</option>
              <option>Guía</option>
            </Select>
          </Field>
          <Field label="Resumen"><TextInput value={fResumen} onChange={(e) => setFResumen(e.target.value)} /></Field>
          <Field label="Contenido (Markdown)"><TextArea rows={6} value={fContenido} onChange={(e) => setFContenido(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNuevaAbierta(false)}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crear}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Ficha de documento (mockup web/móvil) ===== */}
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