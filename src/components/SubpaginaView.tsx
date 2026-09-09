import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { Button, Check, Progress, TextInput, TextArea, Select } from './ui'
import { Markdown } from './Markdown'
import { MapaEditor } from './MapaEditor'
import { MapaVista } from './MapaVista'
import { TablaVista, TablaEditor, tablaNueva } from './TablaEditor'
import { TIPOS_MAPA, TIPO_LABEL, crearMapaInicial } from '../lib/mapas'
import type { Subpagina, Mapa, MapaTipo, Tabla } from '../lib/types'

/**
 * Vista de subpágina anidada (estilo página de Notion):
 * título, contenido extendido en modo lectura, checklist propio y mapas.
 * Misma estética que las fichas (breadcrumb, tokens del tema).
 */
export function SubpaginaView({
  subpagina,
  areaColor,
  fichaTitulo,
  onCambio,
  onEliminar,
  onCerrar,
  toggleMini,
  addMini,
  addMapa,
  updateMapa,
  deleteMapa,
}: {
  subpagina: Subpagina
  areaColor: string
  fichaTitulo?: string
  onCambio: (cambios: Partial<Subpagina>) => void
  onEliminar: () => void
  onCerrar: () => void
  toggleMini: (miniId: string) => void
  addMini: (titulo: string) => void
  addMapa: (mapa: Mapa) => void
  updateMapa: (mapaId: string, cambios: Partial<Mapa>) => void
  deleteMapa: (mapaId: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(subpagina)
  const [nuevaMini, setNuevaMini] = useState('')
  const [mapaAbierto, setMapaAbierto] = useState<Mapa | null>(null)
  const [mapaVistaSub, setMapaVistaSub] = useState<Mapa | null>(null)
  const [nuevoMapaTipo, setNuevoMapaTipo] = useState<MapaTipo>('dominio')
  const [tablaActiva, setTablaActiva] = useState<Tabla | null>(null)
  const [tablaNuevaAbierta, setTablaNuevaAbierta] = useState(false)

  // Auto-guardado con debounce: cualquier cambio de título/contenido/tablas se persiste solo.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const actualizarBorrador = (cambios: Partial<Subpagina>) => {
    const nuevo = { ...borrador, ...cambios }
    setBorrador(nuevo)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onCambio({ titulo: nuevo.titulo, contenido: nuevo.contenido, tablas: nuevo.tablas })
    }, 600)
  }
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const guardarTablas = (tablas: Tabla[]) => {
    setBorrador((b) => ({ ...b, tablas }))
    onCambio({ tablas })
  }

  const hechas = subpagina.mini_tareas.filter((m) => m.hecha).length
  const total = subpagina.mini_tareas.length
  const pct = total ? Math.round((hechas / total) * 100) : 0

  const guardar = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onCambio({ titulo: borrador.titulo, contenido: borrador.contenido, tablas: borrador.tablas })
    setEditando(false)
  }

  const crearMapa = () => {
    const m = crearMapaInicial(nuevoMapaTipo, 'Nuevo mapa')
    addMapa(m)
    setMapaAbierto(m)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb + acciones */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="mono-label flex min-w-0 items-center gap-1.5 text-[10px] text-ink-3">
          <button className="cursor-pointer hover:text-ink" onClick={onCerrar}>Ficha</button>
          <span>»</span>
          {fichaTitulo && (
            <>
              <button className="max-w-40 cursor-pointer truncate hover:text-ink" onClick={onCerrar}>{fichaTitulo}</button>
              <span>»</span>
            </>
          )}
          <span className="truncate font-bold text-ink-2">{subpagina.titulo}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!editando ? (
            <>
              <Button variant="soft" size="sm" icono="edit" onClick={() => { setBorrador(subpagina); setEditando(true) }}>Editar</Button>
              <Button variant="ghost" size="sm" icono="delete" onClick={onEliminar}>Eliminar</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditando(false)}>Cancelar</Button>
              <Button variant="primary" size="sm" icono="save" onClick={guardar}>Guardar</Button>
            </>
          )}
          <Button variant="ghost" size="sm" icono="close" onClick={onCerrar}>Cerrar</Button>
        </div>
      </div>

      {/* Título */}
      {editando ? (
        <TextInput value={borrador.titulo} onChange={(e) => actualizarBorrador({ titulo: e.target.value })} className="!text-base" />
      ) : (
        <div className="flex items-center gap-2">
          <Icon name={subpagina.icono} className="text-[22px]" />
          <h2 className="font-display text-xl font-black uppercase tracking-tight">{subpagina.titulo}</h2>
        </div>
      )}

      {/* Contenido */}
      {editando ? (
        <TextArea
          rows={10}
          value={borrador.contenido}
          onChange={(e) => actualizarBorrador({ contenido: e.target.value })}
          className="min-h-[30vh] font-mono !text-[12px]"
        />
      ) : (
        <div className="border border-line bg-canvas p-4">
          <Markdown text={subpagina.contenido} className="text-[13px] leading-relaxed text-ink-2" />
        </div>
      )}

      {/* Tablas de la subpágina */}
      <div className="border border-line bg-surface-2 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="mono-label text-[10px] font-bold text-ink-3">
            Tablas {(subpagina.tablas ?? []).length > 0 && `[${(subpagina.tablas ?? []).length}]`}
          </span>
          <Button variant="primary" size="sm" icono="table" onClick={() => { setTablaActiva(tablaNueva()); setTablaNuevaAbierta(true) }}>
            Nueva tabla
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {(subpagina.tablas ?? []).map((t) => (
            <div key={t.id} className="flex flex-col gap-1.5 border border-line bg-canvas p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[11px] font-black uppercase tracking-tight">{t.titulo}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setTablaActiva(t) }} className="flex cursor-pointer items-center gap-1 border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-2 transition-colors hover:text-ink" title="Editar tabla">
                    <Icon name="edit" className="text-[12px]" /> Editar
                  </button>
                  <button onClick={() => { if (confirm(`¿Eliminar la tabla "${t.titulo}"?`)) guardarTablas((subpagina.tablas ?? []).filter((x) => x.id !== t.id)) }} className="flex cursor-pointer items-center gap-1 border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-3 transition-colors hover:text-prio-high" title="Eliminar tabla">
                    <Icon name="delete" className="text-[12px]" />
                  </button>
                </div>
              </div>
              <TablaVista tabla={t} areaColor={areaColor} />
            </div>
          ))}
          {(subpagina.tablas ?? []).length === 0 && (
            <p className="font-mono text-[10px] text-ink-3">Sin tablas — crea una para organizar y seccionar la información.</p>
          )}
        </div>
      </div>

      {/* Editor de tabla en overlay */}
      {tablaActiva && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2" onClick={() => setTablaActiva(null)}>
          <div className="popover theme-card max-h-[92vh] w-[95vw] overflow-y-auto p-4 sm:max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="mono-label text-[10px] font-bold uppercase text-ink-3">Editor de tabla</span>
              <Icon name="table" className="text-[18px] text-ink-2" />
            </div>
            <TablaEditor
              tabla={tablaActiva}
              onCambio={(t) => setTablaActiva(t)}
              onGuardar={() => {
                const existentes = subpagina.tablas ?? []
                if (tablaNuevaAbierta) {
                  guardarTablas([...existentes, tablaActiva])
                } else {
                  guardarTablas(existentes.map((x) => (x.id === tablaActiva.id ? tablaActiva : x)))
                }
                setTablaActiva(null)
                setTablaNuevaAbierta(false)
              }}
              onCancelar={() => { setTablaActiva(null); setTablaNuevaAbierta(false) }}
              onEliminar={() => {
                guardarTablas((subpagina.tablas ?? []).filter((x) => x.id !== tablaActiva.id))
                setTablaActiva(null)
                setTablaNuevaAbierta(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Checklist de la subpágina */}
      <div className="border border-line bg-surface-2 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="mono-label text-[10px] font-bold text-ink-3">
            Checklist {total > 0 && `[${hechas}/${total}]`}
          </span>
          {total > 0 && <Progress value={pct} color={`rgb(var(--${areaColor}))`} className="!h-1 w-24" />}
        </div>
        <div className="space-y-1.5">
          {subpagina.mini_tareas.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5">
              <Check checked={m.hecha} onChange={() => toggleMini(m.id)} />
              <span className={`text-[12px] font-medium ${m.hecha ? 'strike-anim strike-on text-ink-3' : ''}`}>{m.titulo}</span>
            </div>
          ))}
          <div className="flex gap-1.5 pt-0.5">
            <TextInput
              value={nuevaMini}
              onChange={(e) => setNuevaMini(e.target.value)}
              placeholder="Añadir paso..."
              className="!py-1 !text-[11px]"
              onKeyDown={(e) => { if (e.key === 'Enter' && nuevaMini.trim()) { addMini(nuevaMini.trim()); setNuevaMini('') } }}
            />
            <Button variant="soft" size="sm" icono="add" onClick={() => { if (nuevaMini.trim()) { addMini(nuevaMini.trim()); setNuevaMini('') } }}>OK</Button>
          </div>
        </div>
      </div>

      {/* Mapas de la subpágina */}
      <div className="border border-line bg-surface-2 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="mono-label text-[10px] font-bold text-ink-3">Mapas</span>
          <div className="flex items-center gap-1.5">
            <Select value={nuevoMapaTipo} onChange={(e) => setNuevoMapaTipo(e.target.value as MapaTipo)} className="!w-auto !px-1.5 !py-0.5 !text-[10px]" title={TIPOS_MAPA.find((t) => t.id === nuevoMapaTipo)?.objetivo}>
              {TIPOS_MAPA.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
            <Button variant="primary" size="sm" icono="add" onClick={crearMapa}>Nuevo mapa</Button>
          </div>
        </div>
        {TIPOS_MAPA.find((t) => t.id === nuevoMapaTipo) && (
          <p className="mb-2 font-mono text-[9px] italic text-ink-3">{TIPOS_MAPA.find((t) => t.id === nuevoMapaTipo)!.objetivo}</p>
        )}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(subpagina.mapas ?? []).map((m) => (
            <div key={m.id} className="flex flex-col gap-1.5 border border-line bg-canvas p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 font-display text-[12px] font-black uppercase tracking-tight">
                  <Icon name={m.tipo === 'datos' ? 'data_object' : m.tipo === 'dominio' ? 'domain' : m.tipo === 'esquema' ? 'dns' : 'hub'} className="shrink-0 text-[14px] text-ink-2" />
                  <span className="truncate">{m.titulo || 'Sin título'}</span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => setMapaVistaSub(m)} className="flex cursor-pointer items-center gap-1 border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-2 transition-colors hover:text-ink" title="Pantalla completa">
                    <Icon name="open_in_full" className="text-[12px]" /> Ver
                  </button>
                  <button onClick={() => setMapaAbierto(m)} className="flex cursor-pointer items-center gap-1 border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-2 transition-colors hover:text-ink" title="Editar">
                    <Icon name="edit" className="text-[12px]" /> Editar
                  </button>
                  <button onClick={() => deleteMapa(m.id)} className="flex cursor-pointer items-center gap-1 border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] font-bold text-ink-3 transition-colors hover:text-prio-high" title="Eliminar">
                    <Icon name="delete" className="text-[12px]" />
                  </button>
                </div>
              </div>
              <MapaVista mapa={m} height={200} />
            </div>
          ))}
        </div>
        {(subpagina.mapas ?? []).length === 0 && (
          <p className="font-mono text-[10px] text-ink-3">Sin mapas — crea uno para visualizar flujos, dominios, esquemas o conceptos.</p>
        )}
      </div>

      {/* Editor de mapa en overlay */}
      {mapaAbierto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2" onClick={() => setMapaAbierto(null)}>
          <div className="popover theme-card h-[96vh] w-[97vw] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <MapaEditor
              mapa={mapaAbierto}
              onChange={(m) => { setMapaAbierto(m); updateMapa(m.id, m) }}
              onEliminar={() => { deleteMapa(mapaAbierto.id); setMapaAbierto(null) }}
              onCerrar={() => setMapaAbierto(null)}
            />
          </div>
        </div>
      )}

      {/* Pantalla completa de mapa */}
      {mapaVistaSub && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2" onClick={() => setMapaVistaSub(null)}>
          <div className="popover theme-card flex h-[96vh] w-[97vw] flex-col overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 font-display text-sm font-black uppercase tracking-tight">
                <Icon name={mapaVistaSub.tipo === 'datos' ? 'data_object' : mapaVistaSub.tipo === 'dominio' ? 'domain' : mapaVistaSub.tipo === 'esquema' ? 'dns' : 'hub'} className="text-[18px]" />
                <span className="truncate">{mapaVistaSub.titulo || 'Sin título'}</span>
                <span className="font-mono text-[10px] font-bold text-ink-3">{TIPO_LABEL[mapaVistaSub.tipo]}</span>
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="soft" size="sm" icono="edit" onClick={() => { setMapaAbierto(mapaVistaSub); setMapaVistaSub(null) }}>Editar</Button>
                <Button variant="ghost" size="sm" icono="delete" onClick={() => { deleteMapa(mapaVistaSub.id); setMapaVistaSub(null) }}>Eliminar</Button>
                <Button variant="ghost" size="sm" icono="close" onClick={() => setMapaVistaSub(null)}>Cerrar</Button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <MapaVista mapa={mapaVistaSub} height="100%" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}