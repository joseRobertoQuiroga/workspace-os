import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { Button } from './ui'
import type { Mapa, MapaNodo, MapaTipo } from '../lib/types'

const ANCHO = 1200
const ALTO = 600
const NODO_W = 170
const NODO_H = 62

const TIPOS: { id: MapaTipo; nombre: string; desc: string; icono: string }[] = [
  { id: 'dominio', nombre: 'Mapa de dominio', desc: 'esencial vs no-esencial', icono: 'domain' },
  { id: 'datos', nombre: 'Flujo de datos', desc: 'entrada → proceso → salida → almacenamiento', icono: 'data_object' },
  { id: 'flujo', nombre: 'Diagrama de proceso', desc: 'pasos de un caso de uso', icono: 'account_tree' },
  { id: 'esquema', nombre: 'Arquitectura / esquema', desc: 'cajas por capa', icono: 'dns' },
  { id: 'mental', nombre: 'Mapa mental', desc: 'tema central + ramas', icono: 'psychology' },
  { id: 'concepto', nombre: 'Mapa conceptual', desc: 'conceptos + relaciones', icono: 'hub' },
]

const PALETA = ['rgb(var(--accent))', 'rgb(var(--area-univ))', 'rgb(var(--area-freelance))', 'rgb(var(--area-emprende))', 'rgb(var(--area-personal))', 'rgb(var(--state-done))']

const COLOR_NODO = 'rgb(var(--surface-3))'

/**
 * Editor de mapas (estilo Excalidraw/Draw.io simplificado):
 * canvas con nodos arrastrables (pointer events, compatible touch),
 * conexiones SVG con flechas y etiquetas, zoom, presets de layout por tipo.
 * Los colores y superficies usan los tokens del tema activo.
 */
export function MapaEditor({
  mapa,
  onChange,
  onEliminar,
  onCerrar,
}: {
  mapa: Mapa
  onChange: (m: Mapa) => void
  onEliminar: () => void
  onCerrar: () => void
}) {
  const [modoConectar, setModoConectar] = useState(false)
  const [origen, setOrigen] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [arrastre, setArrastre] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const moverNodo = (id: string, x: number, y: number) => {
    onChange({
      ...mapa,
      nodos: mapa.nodos.map((n) => (n.id === id ? { ...n, x: Math.max(0, Math.min(ANCHO, x)), y: Math.max(0, Math.min(ALTO, y)) } : n)),
    })
  }

  const agregarNodo = () => {
    if (!nuevoTitulo.trim()) return
    const n: MapaNodo = {
      id: `n-${Date.now().toString(36)}`,
      titulo: nuevoTitulo.trim(),
      x: 300 + Math.random() * 400,
      y: 150 + Math.random() * 200,
      color: PALETA[Math.floor(Math.random() * PALETA.length)],
    }
    onChange({ ...mapa, nodos: [...mapa.nodos, n] })
    setNuevoTitulo('')
  }

  const eliminarNodo = (id: string) => {
    onChange({
      ...mapa,
      nodos: mapa.nodos.filter((n) => n.id !== id),
      conexiones: mapa.conexiones.filter((c) => c.origen !== id && c.destino !== id),
    })
  }

  const clickNodo = (id: string) => {
    if (!modoConectar) return
    if (!origen) {
      setOrigen(id)
      return
    }
    if (origen !== id) {
      onChange({ ...mapa, conexiones: [...mapa.conexiones, { origen, destino: id }] })
    }
    setOrigen(null)
    setModoConectar(false)
  }

  const layoutSegunTipo = () => {
    const t = mapa.tipo
    if (t === 'flujo' || t === 'datos') {
      onChange({
        ...mapa,
        nodos: mapa.nodos.map((n, i) => ({ ...n, x: 90 + i * 230, y: 260 })),
      })
      return
    }
    if (t === 'mental') {
      const centro = Math.floor(mapa.nodos.length / 2)
      onChange({
        ...mapa,
        nodos: mapa.nodos.map((n, i) => {
          if (i === centro) return { ...n, x: ANCHO / 2, y: ALTO / 2 }
          const ang = (i / Math.max(1, mapa.nodos.length - 1)) * Math.PI * 2
          return { ...n, x: ANCHO / 2 + Math.cos(ang) * 320, y: ALTO / 2 + Math.sin(ang) * 180 }
        }),
      })
      return
    }
    if (t === 'dominio' || t === 'concepto') {
      const cols = Math.max(1, Math.ceil(Math.sqrt(mapa.nodos.length)))
      onChange({
        ...mapa,
        nodos: mapa.nodos.map((n, i) => ({ ...n, x: 90 + (i % cols) * 280, y: 90 + Math.floor(i / cols) * 160 })),
      })
      return
    }
    // esquema: rejilla libre
    onChange({
      ...mapa,
      nodos: mapa.nodos.map((n, i) => ({ ...n, x: 100 + (i % 4) * 260, y: 100 + Math.floor(i / 4) * 150 })),
    })
  }

  const centro = (n: MapaNodo) => ({ x: n.x, y: n.y })

  return (
    <div className="flex flex-col gap-2.5">
      {/* Barra de control */}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={mapa.titulo}
          onChange={(e) => onChange({ ...mapa, titulo: e.target.value })}
          className="min-w-0 flex-1 border border-line bg-canvas px-2.5 py-1.5 font-display text-[13px] font-black uppercase tracking-tight text-ink outline-none focus:border-line-strong"
          placeholder="Título del mapa..."
        />
        <select
          value={mapa.tipo}
          onChange={(e) => onChange({ ...mapa, tipo: e.target.value as MapaTipo })}
          className="cursor-pointer border border-line bg-surface-2 px-2 py-1.5 font-mono text-[10px] font-bold text-ink outline-none"
        >
          {TIPOS.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" icono="auto_fix_high" onClick={layoutSegunTipo} title="Auto-layout según tipo">
          Layout
        </Button>
        <Button
          variant={modoConectar ? 'primary' : 'ghost'}
          size="sm"
          icono={modoConectar ? 'link_off' : 'link'}
          onClick={() => { setModoConectar(!modoConectar); setOrigen(null) }}
        >
          {modoConectar ? 'Conectando…' : 'Conectar'}
        </Button>
        <Button variant="ghost" size="sm" icono="add" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>+</Button>
        <span className="font-mono text-[10px] text-ink-3">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" icono="remove" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>−</Button>
        <Button variant="ghost" size="sm" icono="delete" onClick={onEliminar}>Eliminar</Button>
        <Button variant="soft" size="sm" icono="close" onClick={onCerrar}>Cerrar</Button>
      </div>

      <p className="font-mono text-[9px] text-ink-3">
        {TIPOS.find((t) => t.id === mapa.tipo)?.desc} · arrastra los nodos para moverlos · modo Conectar: clic en origen → clic en destino
      </p>

      {/* Canvas */}
      <div ref={canvasRef} className="overflow-auto border border-line bg-canvas" style={{ maxHeight: '52vh' }}>
        <div style={{ width: ANCHO * zoom, height: ALTO * zoom, position: 'relative' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: ANCHO, height: ALTO, position: 'relative' }}>
            {/* Conexiones */}
            <svg width={ANCHO} height={ALTO} className="pointer-events-none absolute inset-0">
              <defs>
                <marker id="arrow-mapa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--ink-3))" />
                </marker>
              </defs>
              {mapa.conexiones.map((c, i) => {
                const o = mapa.nodos.find((n) => n.id === c.origen)
                const d = mapa.nodos.find((n) => n.id === c.destino)
                if (!o || !d) return null
                const a = centro(o)
                const b = centro(d)
                const mx = (a.x + b.x) / 2
                const my = (a.y + b.y) / 2
                return (
                  <g key={i}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(var(--ink-3))" strokeWidth={1.5} markerEnd="url(#arrow-mapa)" />
                    {c.etiqueta && (
                      <g>
                        <rect x={mx - 30} y={my - 9} width={60} height={18} rx={4} fill="rgb(var(--surface))" stroke="rgb(var(--line-strong))" />
                        <text x={mx} y={my + 4} textAnchor="middle" fontSize={9} fill="rgb(var(--ink-2))" fontFamily="JetBrains Mono, monospace">
                          {c.etiqueta}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Nodos */}
            {mapa.nodos.map((n) => (
              <div
                key={n.id}
                onPointerDown={(e) => {
                  if (modoConectar) { clickNodo(n.id); return }
                  e.preventDefault()
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const escala = rect.width / NODO_W
                  setArrastre({ id: n.id, dx: (e.clientX - rect.left) / escala, dy: (e.clientY - rect.top) / escala })
                }}
                onPointerMove={(e) => {
                  if (!arrastre || arrastre.id !== n.id) return
                  const rect = (canvasRef.current as HTMLElement).getBoundingClientRect()
                  const sx = rect.width / ANCHO
                  const sy = rect.height / ALTO
                  moverNodo(n.id, (e.clientX - rect.left) / sx - arrastre.dx + NODO_W / 2, (e.clientY - rect.top) / sy - arrastre.dy + NODO_H / 2)
                }}
                onPointerUp={() => setArrastre(null)}
                onPointerCancel={() => setArrastre(null)}
                className={`absolute z-10 flex cursor-grab touch-none flex-col justify-center overflow-hidden border px-2 py-1 text-center transition-shadow active:cursor-grabbing ${
                  modoConectar ? 'cursor-crosshair' : ''
                } ${origen === n.id ? 'border-line-strong shadow-lift' : ''}`}
                style={{
                  left: n.x - NODO_W / 2,
                  top: n.y - NODO_H / 2,
                  width: NODO_W,
                  height: NODO_H,
                  backgroundColor: COLOR_NODO,
                  borderLeft: `3px solid ${n.color ?? 'rgb(var(--accent))'}`,
                }}
                title={modoConectar ? 'Clic para conectar' : 'Arrastrar para mover'}
              >
                <span className="truncate font-display text-[11px] font-bold uppercase leading-tight">{n.titulo}</span>
                {n.sub && <span className="truncate font-mono text-[8px] text-ink-3">{n.sub}</span>}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); eliminarNodo(n.id) }}
                  className="absolute right-0.5 top-0.5 cursor-pointer p-0.5 text-ink-3 opacity-0 transition-opacity hover:opacity-100 hover:text-prio-high"
                  title="Eliminar nodo"
                >
                  <Icon name="close" className="text-[11px]" />
                </button>
              </div>
            ))}

            {/* Añadir nodo flotante */}
            <div className="absolute bottom-2 left-2 z-20 flex gap-1.5 border border-line bg-surface-2 p-1.5">
              <input
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarNodo()}
                placeholder="Nodo..."
                className="w-36 border border-line bg-canvas px-2 py-1 font-mono text-[10px] text-ink outline-none placeholder:text-ink-3"
              />
              <Button variant="primary" size="sm" icono="add" onClick={agregarNodo}>OK</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between font-mono text-[9px] text-ink-3">
        <span>{mapa.nodos.length} nodos · {mapa.conexiones.length} conexiones</span>
        <span>canvas 1200×600 · desplázate para navegar</span>
      </div>
    </div>
  )
}