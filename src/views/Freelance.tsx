import { useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Badge, Button, Progress, Modal, Field, TextInput, TextArea, Select } from '../components/ui'
import { Popover } from '../components/Popover'
import { DetailHeader, Prop, Tags, Notas, DetailActions } from '../components/detail'
import { FichaDetalle } from '../components/FichaDetalle'
import { estadoClienteLabel, formatearFecha } from '../lib/utils'
import type { Cliente, ClienteEstado, Proyecto, ProyectoEstado, Ficha } from '../lib/types'

const usd = (v: number | null | undefined) => (v == null ? '—' : `$${Number(v).toLocaleString('en-US')}`)

export function Freelance() {
  const db = useApp((s) => s.db)
  const addCliente = useApp((s) => s.addCliente)
  const updateCliente = useApp((s) => s.updateCliente)
  const updateProyecto = useApp((s) => s.updateProyecto)
  const toggleFichaMiniTarea = useApp((s) => s.toggleFichaMiniTarea)
  const addFichaMiniTarea = useApp((s) => s.addFichaMiniTarea)
  const crearFicha = useApp((s) => s.crearFicha)
  const [fichaActiva, setFichaActiva] = useState<Ficha | null>(null)
  const [nuevoCliente, setNuevoCliente] = useState(false)
  const [fNombre, setFNombre] = useState('')
  const [fContacto, setFContacto] = useState('')
  const [fNotas, setFNotas] = useState('')

  // Popovers
  const [clienteAncla, setClienteAncla] = useState<HTMLElement | null>(null)
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null)
  const [proyAncla, setProyAncla] = useState<HTMLElement | null>(null)
  const [proyActivo, setProyActivo] = useState<Proyecto | null>(null)

  const activos = db.clientes.filter((c) => c.estado === 'activo')
  const proyectosFree = db.proyectos.filter((p) => p.area_id === 'freelance')
  const enCurso = proyectosFree.filter((p) => p.estado === 'activo')
  // Ingreso en pipe = presupuesto de proyectos activos en curso (datos reales cargados)
  const ingresoEstimado = enCurso.reduce((acc, p) => acc + (p.presupuesto ?? 0), 0)
  // Cobrado real del pipe
  const totalFacturado = proyectosFree.reduce((acc, p) => acc + (p.facturado ?? 0), 0)

  const setCampoEconomico = (id: string, campo: 'presupuesto' | 'tarifa_hora' | 'facturado', raw: string) => {
    const v = raw.trim() === '' ? null : Number(raw.replace(/[$,\s]/g, ''))
    updateProyecto(id, { [campo]: Number.isNaN(v as number) ? null : v })
  }

  const crear = () => {
    if (!fNombre.trim()) return
    addCliente({ nombre: fNombre.trim(), contacto: fContacto, estado: 'prospecto', notas: fNotas })
    setFNombre(''); setFContacto(''); setFNotas(''); setNuevoCliente(false)
  }

  const pctAvance = (id: string) => {
    const tareas = db.tareas.filter((t) => t.proyecto_id === id)
    if (!tareas.length) return 0
    return Math.round((tareas.filter((t) => t.estado === 'hecho').length / tareas.length) * 100)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // CRM_FREELANCE
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-area-freelance" /> {activos.length} clientes activos
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Freelance <span className="text-area-freelance">/</span> Clientes
          </h1>
        </div>
        <Button variant="primary" icono="person_add" onClick={() => setNuevoCliente(true)}>
          Nuevo cliente
        </Button>
      </div>

      {/* Métricas rápidas (datos reales del pipe) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { etiqueta: 'Clientes activos', valor: String(activos.length), color: 'rgb(var(--area-freelance))' },
          { etiqueta: 'Proyectos en curso', valor: String(enCurso.length), color: 'rgb(var(--ink))' },
          { etiqueta: 'Ingreso en pipe', valor: usd(ingresoEstimado), color: 'rgb(var(--area-personal))', sub: `${enCurso.length} proyecto(s) en curso` },
          { etiqueta: 'Facturado / cobrado', valor: usd(totalFacturado), color: 'rgb(var(--state-done))', sub: 'acumulado freelance' },
        ].map((m) => (
          <div key={m.etiqueta} className="theme-card flex flex-col gap-1 p-4">
            <span className="mono-label text-[9px] text-ink-3">{m.etiqueta}</span>
            <span className="font-mono text-2xl font-bold" style={{ color: m.color }}>{m.valor}</span>
            {m.sub && <span className="font-mono text-[9px] text-ink-3">{m.sub}</span>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Clientes */}
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="group" className="text-[20px] text-ink-2" />
              <h2 className="mono-label text-[12px] font-bold">Clientes</h2>
            </div>
            <span className="font-mono text-[10px] text-ink-3">{db.clientes.length} total</span>
          </div>
          <div className="vlist space-y-3 pr-1">
            {db.clientes.map((c) => {
              const proyectosCliente = db.proyectos.filter((p) => p.cliente_id === c.id)
              const color = c.estado === 'activo' ? 'rgb(var(--state-done))' : c.estado === 'prospecto' ? 'rgb(var(--state-doing))' : 'rgb(var(--state-todo))'
              return (
                <div key={c.id} className="theme-card cursor-pointer p-4 transition-all hover:-translate-y-0.5" onClick={(e) => { setProyActivo(null); setProyAncla(null); setClienteActivo(c); setClienteAncla(e.currentTarget) }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-black uppercase tracking-tight">{c.nombre}</h3>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-ink-3">{c.contacto}</p>
                    </div>
                    <Badge color={color}>{estadoClienteLabel[c.estado]}</Badge>
                  </div>
                  {c.notas && <p className="mt-2 line-clamp-2 text-[11px] text-ink-2">{c.notas}</p>}
                  <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
                    <span className="font-mono text-[10px] text-ink-3">{proyectosCliente.length} proyecto(s)</span>
                    {(() => {
                      const ficha = db.fichas.find((f) => f.tipo === 'cliente' && f.entidad_id === c.id)
                      return ficha ? (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setFichaActiva(ficha) }}
                          className="flex cursor-pointer items-center gap-1 border border-line bg-accent/10 px-2 py-1 font-mono text-[9px] font-bold uppercase text-accent transition-colors hover:bg-accent hover:text-on-accent"
                          title="Abrir ficha del cliente"
                        >
                          <Icon name="description" className="text-[12px]" /> Ficha
                        </button>
                      ) : (
                        <Icon name="open_in_new" className="text-[14px] text-ink-3" />
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Proyectos freelance */}
        <div className="space-y-4 xl:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="work" className="text-[20px] text-ink-2" />
              <h2 className="mono-label text-[12px] font-bold">Proyectos freelance</h2>
            </div>
            <span className="font-mono text-[10px] text-ink-3">{proyectosFree.length} en pipe</span>
          </div>
          <Panel>
            <div className="vlist space-y-3 pr-1">
              {proyectosFree.map((p) => {
                const pct = pctAvance(p.id)
                return (
                  <div
                    key={p.id}
                    className="cursor-pointer border border-line bg-surface-2 p-4 transition-all hover:-translate-y-0.5"
                    onClick={(e) => { setClienteActivo(null); setClienteAncla(null); setProyActivo(p); setProyAncla(e.currentTarget) }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-sm font-black uppercase tracking-tight">{p.nombre}</h3>
                          {p.destacado && <Icon name="star" className="text-[13px] text-area-univ" />}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-ink-2">{p.descripcion}</p>
                      </div>
                      <Badge color={p.estado === 'activo' ? 'rgb(var(--state-doing))' : 'rgb(var(--state-todo))'}>{p.estado}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Progress value={pct} color="rgb(var(--area-freelance))" className="!h-1.5" />
                      <span className="font-mono text-[10px] font-bold text-area-freelance">{pct}%</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-ink-3">
                      <span>{p.stack.slice(0, 3).join(' · ')}</span>
                      <span>Límite: {formatearFecha(p.fecha_limite)}</span>
                    </div>
                  </div>
                )
              })}
              {proyectosFree.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Icon name="work_off" className="text-[30px] text-ink-3" />
                  <p className="font-mono text-xs text-ink-3">Sin proyectos freelance todavía.</p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Modal open={nuevoCliente} onClose={() => setNuevoCliente(false)} title="Nuevo cliente">
        <div className="space-y-3">
          <Field label="Nombre / empresa"><TextInput value={fNombre} onChange={(e) => setFNombre(e.target.value)} placeholder="Corp Logística" autoFocus /></Field>
          <Field label="Contacto"><TextInput value={fContacto} onChange={(e) => setFContacto(e.target.value)} placeholder="email · teléfono" /></Field>
          <Field label="Notas"><TextArea value={fNotas} onChange={(e) => setFNotas(e.target.value)} placeholder="Contexto del cliente..." /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNuevoCliente(false)}>Cancelar</Button>
            <Button variant="primary" icono="add" onClick={crear}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* ===== Ficha de cliente/proyecto (mockup web/móvil) ===== */}
      {fichaActiva && (
        <FichaDetalle
          ficha={fichaActiva}
          onClose={() => setFichaActiva(null)}
          areaColor="area-freelance"
          toggleMini={(secId, miniId) => toggleFichaMiniTarea(fichaActiva.id, secId, miniId)}
          addMini={(secId, titulo) => addFichaMiniTarea(fichaActiva.id, secId, titulo)}
        />
      )}

      {/* ===== Popover: detalle de cliente ===== */}
      <Popover anchor={clienteAncla} onClose={() => { setClienteAncla(null); setClienteActivo(null) }}>
        {clienteActivo && (
          <div className="flex flex-col gap-2.5">
            <DetailHeader
              icono="handshake"
              color="rgb(var(--area-freelance))"
              titulo={
                <input
                  value={clienteActivo.nombre}
                  onChange={(e) => updateCliente(clienteActivo.id, { nombre: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 font-display text-sm font-black uppercase tracking-tight outline-none"
                />
              }
              sub={clienteActivo.contacto}
              onClose={() => { setClienteAncla(null); setClienteActivo(null) }}
            />
            <div>
              <Prop label="Estado">
                <Select
                  value={clienteActivo.estado}
                  onChange={(e) => updateCliente(clienteActivo.id, { estado: e.target.value as ClienteEstado })}
                  className="!w-auto !px-1.5 !py-0.5 !text-[10px]"
                >
                  <option value="prospecto">Prospecto</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </Select>
              </Prop>
              <Prop label="Proyectos">
                {db.proyectos.filter((p) => p.cliente_id === clienteActivo.id).map((p) => p.nombre).join(' · ') || '—'}
              </Prop>
            </div>
            <Notas>
              <textarea
                value={clienteActivo.notas}
                onChange={(e) => updateCliente(clienteActivo.id, { notas: e.target.value })}
                rows={3}
                placeholder="Contexto, acuerdos, contactos..."
                className="w-full resize-none border-0 bg-transparent p-0 font-mono text-[11px] text-ink-2 outline-none placeholder:text-ink-3"
              />
            </Notas>
            <DetailActions>
              <span className="mr-auto font-mono text-[9px] text-ink-3">edición inline · auto-guardado</span>
              {(() => {
                const ficha = db.fichas.find((f) => f.tipo === 'cliente' && f.entidad_id === clienteActivo.id)
                if (ficha) {
                  return (
                    <Button variant="primary" size="sm" icono="description" onClick={() => { setClienteAncla(null); setClienteActivo(null); setFichaActiva(ficha) }}>
                      Abrir ficha completa
                    </Button>
                  )
                }
                return (
                  <Button
                    variant="primary"
                    size="sm"
                    icono="add_task"
                    onClick={() => {
                      const ficha = crearFicha({
                        tipo: 'cliente',
                        entidad_id: clienteActivo.id,
                        titulo: clienteActivo.nombre,
                        subtitulo: 'Ficha de Cliente · proyectos y hitos',
                        area_id: 'freelance',
                        estado: estadoClienteLabel[clienteActivo.estado].toUpperCase(),
                        descripcion: clienteActivo.notas,
                      })
                      setClienteAncla(null)
                      setClienteActivo(null)
                      setFichaActiva(ficha)
                    }}
                  >
                    Crear ficha
                  </Button>
                )
              })()}
              <Button variant="soft" size="sm" icono="work" onClick={() => { setClienteAncla(null); setClienteActivo(null) }}>
                Ver proyectos
              </Button>
            </DetailActions>
          </div>
        )}
      </Popover>

      {/* ===== Popover: detalle de proyecto freelance ===== */}
      <Popover anchor={proyAncla} onClose={() => { setProyAncla(null); setProyActivo(null) }}>
        {proyActivo && (
          <div className="flex flex-col gap-2.5">
            <DetailHeader
              icono="rocket_launch"
              color="rgb(var(--area-freelance))"
              titulo={proyActivo.nombre}
              sub={proyActivo.tipo}
              onClose={() => { setProyAncla(null); setProyActivo(null) }}
            />
            <div>
              <Prop label="Cliente">
                {db.clientes.find((c) => c.id === proyActivo.cliente_id)?.nombre ?? '—'}
              </Prop>
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
              <Prop label="Límite">{formatearFecha(proyActivo.fecha_limite)}</Prop>
              <Prop label="Avance">{pctAvance(proyActivo.id)}% · {db.tareas.filter((t) => t.proyecto_id === proyActivo.id).length} tareas</Prop>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-2">{proyActivo.descripcion}</p>

            {/* Facturación & ingreso (datos reales editables) */}
            <div className="border border-line bg-surface-2 p-2.5">
              <span className="mb-2 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase text-ink-3">
                <Icon name="payments" className="text-[13px]" /> Facturación & ingreso
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="flex flex-col gap-1 border border-line bg-canvas p-2">
                  <span className="mono-label text-[8px] uppercase text-ink-3">Monto del proyecto</span>
                  <input
                    type="number"
                    value={proyActivo.presupuesto ?? ''}
                    onChange={(e) => setCampoEconomico(proyActivo.id, 'presupuesto', e.target.value)}
                    placeholder="0"
                    className="w-full border-0 bg-transparent font-mono text-[13px] font-bold text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
                <div className="flex flex-col gap-1 border border-line bg-canvas p-2">
                  <span className="mono-label text-[8px] uppercase text-ink-3">Tarifa</span>
                  <input
                    type="number"
                    value={proyActivo.tarifa_hora ?? ''}
                    onChange={(e) => setCampoEconomico(proyActivo.id, 'tarifa_hora', e.target.value)}
                    placeholder="USD/h"
                    className="w-full border-0 bg-transparent font-mono text-[13px] font-bold text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
                <div className="flex flex-col gap-1 border border-line bg-canvas p-2">
                  <span className="mono-label text-[8px] uppercase text-ink-3">Facturado</span>
                  <input
                    type="number"
                    value={proyActivo.facturado ?? ''}
                    onChange={(e) => setCampoEconomico(proyActivo.id, 'facturado', e.target.value)}
                    placeholder="0"
                    className="w-full border-0 bg-transparent font-mono text-[13px] font-bold text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
                <div className="flex flex-col gap-1 border border-line bg-canvas p-2">
                  <span className="mono-label text-[8px] uppercase text-ink-3">Saldo</span>
                  <span className="font-mono text-[13px] font-bold text-area-personal">
                    {usd((proyActivo.presupuesto ?? 0) - (proyActivo.facturado ?? 0))}
                  </span>
                </div>
              </div>
              {proyActivo.presupuesto ? (
                <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-ink-3">
                  <span>
                    Facturado {Math.round(((proyActivo.facturado ?? 0) / proyActivo.presupuesto) * 100)}% ·{' '}
                    {proyActivo.tarifa_hora ? `tarifa ${usd(proyActivo.tarifa_hora)}/h` : 'sin tarifa'}
                  </span>
                  <Progress value={((proyActivo.facturado ?? 0) / proyActivo.presupuesto) * 100} color="rgb(var(--state-done))" className="!h-1 w-24" />
                </div>
              ) : (
                <p className="mt-1.5 font-mono text-[9px] italic text-ink-3">Sin monto cargado — edita los campos para reflejar el ingreso real.</p>
              )}
            </div>

            <Tags items={proyActivo.stack} color="rgb(var(--area-freelance))" />
            <DetailActions>
              <Button variant="soft" size="sm" icono="check_circle" onClick={() => updateProyecto(proyActivo.id, { estado: 'completado' })}>
                Marcar completado
              </Button>
            </DetailActions>
          </div>
        )}
      </Popover>
    </div>
  )
}