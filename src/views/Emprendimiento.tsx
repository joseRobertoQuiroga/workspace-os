import { useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Badge, Button, Modal, Field, TextInput, TextArea, Select } from '../components/ui'
import { DetailHeader, Prop, Tags, DetailActions } from '../components/detail'
import { FichaDetalle } from '../components/FichaDetalle'
import { estadoIdeaLabel, formatearFecha } from '../lib/utils'
import type { Idea, IdeaEstado, Proyecto, ProyectoEstado, Ficha } from '../lib/types'

const POTENCIAL_COLOR: Record<string, string> = {
  alto: 'rgb(var(--state-done))',
  medio: 'rgb(var(--state-doing))',
  bajo: 'rgb(var(--state-todo))',
}

export function Emprendimiento() {
  const db = useApp((s) => s.db)
  const addIdea = useApp((s) => s.addIdea)
  const updateIdea = useApp((s) => s.updateIdea)
  const updateProyecto = useApp((s) => s.updateProyecto)
  const addProyecto = useApp((s) => s.addProyecto)
  const crearFicha = useApp((s) => s.crearFicha)
  const toggleFichaMiniTarea = useApp((s) => s.toggleFichaMiniTarea)
  const addFichaMiniTarea = useApp((s) => s.addFichaMiniTarea)
  const [nuevaIdea, setNuevaIdea] = useState(false)
  const [fTitulo, setFTitulo] = useState('')
  const [fCategoria, setFCategoria] = useState('Plataforma propia')
  const [fNotas, setFNotas] = useState('')
  const [tab, setTab] = useState<'activas' | 'historial'>('activas')

  // Detalles (página grande estilo documento)
  const [ideaActiva, setIdeaActiva] = useState<Idea | null>(null)
  const [proyActivo, setProyActivo] = useState<Proyecto | null>(null)
  const [fichaActiva, setFichaActiva] = useState<Ficha | null>(null)

  const ideasActivas = db.ideas.filter((i) => i.estado !== 'archivada' && i.estado !== 'descartada' && !i.leida)
  const historial = db.ideas.filter((i) => i.leida || i.estado === 'archivada' || i.estado === 'descartada')
  const proyectosPropios = db.proyectos.filter((p) => p.area_id === 'emprendimiento')

  const crear = () => {
    if (!fTitulo.trim()) return
    addIdea({ titulo: fTitulo.trim(), categoria: fCategoria, potencial: 'medio', estado: 'explorando', proyecto_id: null, leida: false, notas: fNotas })
    setFTitulo(''); setFCategoria('Plataforma propia'); setFNotas(''); setNuevaIdea(false)
  }

  const convertirEnProyecto = (idea: Idea) => {
    const id = `proy-${Date.now().toString(36)}`
    addProyecto({
      id,
      nombre: idea.titulo,
      area_id: 'emprendimiento',
      tipo: 'Producto propio',
      estado: 'idea',
      prioridad: idea.potencial === 'alto' ? 'alta' : idea.potencial === 'medio' ? 'media' : 'baja',
      destacado: idea.potencial === 'alto',
      fecha_inicio: null,
      fecha_limite: null,
      stack: [],
      descripcion: idea.notas,
    })
    crearFicha({
      tipo: 'proyecto',
      entidad_id: id,
      titulo: idea.titulo,
      subtitulo: `Ficha de Producto · ${idea.categoria}`,
      area_id: 'emprendimiento',
      estado: 'IDEA',
      descripcion: idea.notas,
    }, 'saas')
    updateIdea(idea.id, { estado: 'convertida', proyecto_id: id })
  }

  const fichaDeProyecto = (proyId: string) => db.fichas.find((f) => f.tipo === 'proyecto' && f.entidad_id === proyId)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // VENTURES_BACKLOG
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-area-emprende" /> {ideasActivas.length} activas
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Emprendimiento <span className="text-area-emprende">/</span> Ideas
          </h1>
        </div>
        <Button variant="primary" icono="lightbulb" onClick={() => setNuevaIdea(true)}>
          Nueva idea
        </Button>
      </div>

      {/* Sub-tabs */}
      <div className="flex border border-line">
        {(['activas', 'historial'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase ${
              tab === t ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Icon name={t === 'activas' ? 'lightbulb' : 'archive'} className="text-[14px]" />
            {t === 'activas' ? `Activas (${ideasActivas.length})` : `Leídas y archivadas (${historial.length})`}
          </button>
        ))}
      </div>

      {tab === 'activas' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Proyectos propios */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="rocket_launch" className="text-[20px] text-ink-2" />
                <h2 className="mono-label text-[12px] font-bold">Proyectos propios</h2>
              </div>
            </div>
            <div className="vlist space-y-3 pr-1">
              {proyectosPropios.map((p) => {
                const color = db.areas.find((a) => a.id === p.area_id)?.color ?? 'area-personal'
                const ficha = db.fichas.find((f) => f.tipo === 'proyecto' && f.entidad_id === p.id)
                return (
                  <div key={p.id} className="theme-card cursor-pointer p-5 transition-all hover:-translate-y-0.5" onClick={() => {
                    if (ficha) { setFichaActiva(ficha); setProyActivo(null) }
                    else setProyActivo(p)
                  }}>
                    <div className="flex items-center justify-between gap-2">
                      <Badge color={`rgb(var(--${color}))`}>{p.tipo}</Badge>
                      {ficha && (
                        <span className="flex items-center gap-1 border border-line bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-accent">
                          <Icon name="description" className="text-[12px]" /> Ficha maestra
                        </span>
                      )}
                      <span className="font-mono text-[10px] font-black uppercase text-ink-3">{p.estado}</span>
                    </div>
                    <h3 className="mt-2 font-display text-sm font-black uppercase tracking-tight">{p.nombre}</h3>
                    <p className="mt-1 line-clamp-2 text-[11px] text-ink-2">{p.descripcion}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.stack.map((s) => (
                        <span key={s} className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] text-ink-2">{s}</span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-end border-t border-line pt-1.5">
                      <span className="font-mono text-[10px] font-bold uppercase text-ink-3">
                        {ficha ? 'Abrir ficha maestra' : 'Ver detalle'}
                      </span>
                      <Icon name="open_in_new" className="ml-1 text-[14px] text-ink-3" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Backlog de ideas */}
          <div className="space-y-4 xl:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="lightbulb" className="text-[20px] text-ink-2" />
                <h2 className="mono-label text-[12px] font-bold">Backlog de ideas</h2>
              </div>
              <span className="font-mono text-[10px] text-ink-3">galería · {ideasActivas.length}</span>
            </div>
            <div className="vgrid grid grid-cols-1 gap-4 pr-1 md:grid-cols-2">
              {ideasActivas.map((i, idx) => (
                <div key={i.id} className="theme-card rise-in flex cursor-pointer flex-col gap-2 p-5 transition-all hover:-translate-y-0.5" style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }} onClick={() => setIdeaActiva(i)}>
                  <div className="flex items-center justify-between gap-2">
                    <Badge color={POTENCIAL_COLOR[i.potencial]}>potencial {i.potencial}</Badge>
                    <Badge color={i.estado === 'convertida' ? 'rgb(var(--state-done))' : 'rgb(var(--state-doing))'}>
                      {estadoIdeaLabel[i.estado]}
                    </Badge>
                  </div>
                  <h3 className="font-display text-sm font-black uppercase tracking-tight">{i.titulo}</h3>
                  <p className="mono-label text-[9px] text-ink-3">{i.categoria}</p>
                  {i.notas && <p className="line-clamp-2 text-[11px] text-ink-2">{i.notas}</p>}
                  <div className="mt-auto flex items-center justify-between border-t border-line pt-2">
                    {i.proyecto_id ? (
                      <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase text-area-emprende">
                        <Icon name="rocket_launch" className="text-[12px]" />
                        {db.proyectos.find((p) => p.id === i.proyecto_id)?.nombre ?? 'proyecto'}
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-ink-3">sin proyecto</span>
                    )}
                    <Icon name="open_in_new" className="text-[14px] text-ink-3" />
                  </div>
                </div>
              ))}
              {ideasActivas.length === 0 && (
                <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center">
                  <Icon name="lightbulb" className="text-[34px] text-ink-3" />
                  <p className="font-mono text-xs text-ink-3">Sin ideas activas — revisa el historial de leídas/archivadas.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ===== Historial: leídas + archivadas ===== */
        <div className="vlist space-y-3 pr-1">
          {historial.map((i) => (
            <div key={i.id} className="theme-card flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 opacity-80 transition-all hover:opacity-100" onClick={() => setIdeaActiva(i)}>
              <div className="flex min-w-0 items-center gap-3">
                <Icon name={i.estado === 'archivada' ? 'archive' : i.estado === 'descartada' ? 'close' : 'done_all'} className={`shrink-0 text-[18px] ${i.estado === 'archivada' ? 'text-ink-3' : 'text-state-done'}`} />
                <div className="min-w-0">
                  <span className={`block truncate font-display text-[13px] font-bold ${i.leida ? 'line-through text-ink-3' : ''}`}>{i.titulo}</span>
                  <span className="font-mono text-[10px] text-ink-3">{i.categoria} · {estadoIdeaLabel[i.estado]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={POTENCIAL_COLOR[i.potencial]}>{i.potencial}</Badge>
                <Button
                  variant="soft"
                  size="sm"
                  icono="restore"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateIdea(i.id, { estado: 'explorando', leida: false })
                  }}
                >
                  Restaurar
                </Button>
              </div>
            </div>
          ))}
          {historial.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Icon name="archive" className="text-[34px] text-ink-3" />
              <p className="font-mono text-xs text-ink-3">El historial se llena cuando marcas ideas como leídas o las archivas.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== Detalle de idea (página grande) ===== */}
      <Modal open={!!ideaActiva} onClose={() => setIdeaActiva(null)} title={ideaActiva?.titulo ?? 'Idea'} ancho="max-w-[66vw]">
        {ideaActiva && (
          <div className="flex h-[65vh] flex-col gap-3">
            <DetailHeader
              icono="lightbulb"
              color={POTENCIAL_COLOR[ideaActiva.potencial]}
              titulo={
                <input
                  value={ideaActiva.titulo}
                  onChange={(e) => updateIdea(ideaActiva.id, { titulo: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 font-display text-base font-black uppercase tracking-tight outline-none"
                />
              }
              sub={ideaActiva.categoria}
              onClose={() => setIdeaActiva(null)}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Prop label="Potencial">
                <Select
                  value={ideaActiva.potencial}
                  onChange={(e) => updateIdea(ideaActiva.id, { potencial: e.target.value as Idea['potencial'] })}
                  className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                >
                  <option value="alto">Alto</option>
                  <option value="medio">Medio</option>
                  <option value="bajo">Bajo</option>
                </Select>
              </Prop>
              <Prop label="Estado">
                <Select
                  value={ideaActiva.estado}
                  onChange={(e) => updateIdea(ideaActiva.id, { estado: e.target.value as IdeaEstado })}
                  className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                >
                  <option value="explorando">Explorando</option>
                  <option value="validando">Validando</option>
                  <option value="convertida">Convertida</option>
                  <option value="descartada">Descartada</option>
                  <option value="archivada">Archivada</option>
                </Select>
              </Prop>
              {ideaActiva.proyecto_id && (
                <Prop label="Proyecto">{db.proyectos.find((p) => p.id === ideaActiva.proyecto_id)?.nombre ?? '—'}</Prop>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <span className="mono-label text-[9px] text-ink-3">Notas / detalle (auto-guardado)</span>
              <textarea
                value={ideaActiva.notas}
                onChange={(e) => updateIdea(ideaActiva.id, { notas: e.target.value })}
                rows={10}
                placeholder="Escribe aquí toda la información de la idea: contexto, investigación, validación, próximos pasos..."
                className="mt-1 w-full resize-none border border-line bg-canvas p-3 font-mono text-[12px] leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
              />
            </div>
            <Tags items={[ideaActiva.categoria]} color={POTENCIAL_COLOR[ideaActiva.potencial]} />
            <DetailActions>
              {!ideaActiva.proyecto_id ? (
                <Button
                  variant="primary"
                  size="sm"
                  icono="rocket_launch"
                  onClick={() => {
                    convertirEnProyecto(ideaActiva)
                    setIdeaActiva(null)
                  }}
                >
                  Convertir en proyecto propio
                </Button>
              ) : (
                <Button
                  variant="soft"
                  size="sm"
                  icono="description"
                  onClick={() => {
                    const ficha = fichaDeProyecto(ideaActiva.proyecto_id!)
                    if (ficha) { setFichaActiva(ficha); setIdeaActiva(null) }
                  }}
                >
                  Abrir ficha del proyecto
                </Button>
              )}
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
                variant={ideaActiva.leida ? 'soft' : 'primary'}
                size="sm"
                icono="done_all"
                onClick={() => updateIdea(ideaActiva.id, { leida: !ideaActiva.leida })}
              >
                {ideaActiva.leida ? 'Marcar como no leída' : 'Marcar como leída'}
              </Button>
            </DetailActions>
          </div>
        )}
      </Modal>

      {/* ===== Detalle de proyecto propio (página grande) ===== */}
      <Modal open={!!proyActivo} onClose={() => setProyActivo(null)} title={proyActivo?.nombre ?? 'Proyecto'} ancho="max-w-[66vw]">
        {proyActivo && (
          <div className="flex h-[65vh] flex-col gap-3">
            <DetailHeader
              icono="rocket_launch"
              color="rgb(var(--area-emprende))"
              titulo={proyActivo.nombre}
              sub={proyActivo.tipo}
              onClose={() => setProyActivo(null)}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Prop label="Estado">
                <Select
                  value={proyActivo.estado}
                  onChange={(e) => updateProyecto(proyActivo.id, { estado: e.target.value as ProyectoEstado })}
                  className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                >
                  <option value="idea">Idea</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">En pausa</option>
                  <option value="completado">Completado</option>
                  <option value="archivado">Archivado</option>
                </Select>
              </Prop>
              <Prop label="Inicio">{formatearFecha(proyActivo.fecha_inicio)}</Prop>
              <Prop label="Límite">{formatearFecha(proyActivo.fecha_limite)}</Prop>
            </div>
            <div className="flex-1 overflow-y-auto">
              <span className="mono-label text-[9px] text-ink-3">Descripción</span>
              <textarea
                value={proyActivo.descripcion}
                onChange={(e) => updateProyecto(proyActivo.id, { descripcion: e.target.value })}
                rows={6}
                className="mt-1 w-full resize-none border border-line bg-canvas p-3 font-mono text-[12px] leading-relaxed text-ink outline-none focus:border-line-strong"
              />
              <span className="mono-label mt-3 block text-[9px] text-ink-3">Tareas asociadas ({db.tareas.filter((t) => t.proyecto_id === proyActivo.id).length})</span>
              <div className="mt-1 space-y-1.5">
                {db.tareas.filter((t) => t.proyecto_id === proyActivo.id).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 border border-line bg-surface-2 p-2">
                    <span className={`text-[12px] font-medium ${t.estado === 'hecho' ? 'line-through text-ink-3' : ''}`}>{t.titulo}</span>
                    <Badge color={t.estado === 'hecho' ? 'rgb(var(--state-done))' : 'rgb(var(--state-todo))'}>{t.estado.replace('_', ' ')}</Badge>
                  </div>
                ))}
                {db.tareas.filter((t) => t.proyecto_id === proyActivo.id).length === 0 && (
                  <p className="font-mono text-[11px] text-ink-3">Sin tareas asociadas.</p>
                )}
              </div>
            </div>
            <Tags items={proyActivo.stack} color="rgb(var(--area-emprende))" />
            <DetailActions>
              <Button variant="soft" size="sm" icono="star" onClick={() => updateProyecto(proyActivo.id, { destacado: !proyActivo.destacado })}>
                {proyActivo.destacado ? 'Quitar destacado' : 'Destacar'}
              </Button>
            </DetailActions>
          </div>
        )}
      </Modal>

      <Modal open={nuevaIdea} onClose={() => setNuevaIdea(false)} title="Nueva idea">
        <div className="space-y-3">
          <Field label="Idea"><TextInput value={fTitulo} onChange={(e) => setFTitulo(e.target.value)} placeholder="¿Qué se te ocurrió?" autoFocus /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Categoría">
              <Select value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
                <option>Plataforma propia</option>
                <option>Vertical</option>
                <option>Servicio freelance</option>
                <option>Comunidad</option>
              </Select>
            </Field>
            <Field label="Potencial">
              <Select defaultValue="medio">
                <option value="alto">Alto</option>
                <option value="medio">Medio</option>
                <option value="bajo">Bajo</option>
              </Select>
            </Field>
          </div>
          <Field label="Notas"><TextArea value={fNotas} onChange={(e) => setFNotas(e.target.value)} placeholder="Contexto..." /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNuevaIdea(false)}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crear}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Ficha maestra de proyecto (mockup web/móvil) ===== */}
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