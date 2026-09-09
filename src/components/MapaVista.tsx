import { useRef, useState } from 'react'
import { Icon } from './Icon'
import type { Mapa, MapaNodo } from '../lib/types'

const NODO_W = 170
const NODO_H = 62

/**
 * Vista previa interactiva de un mapa (read-only): pan con arrastre (touch y ratón)
 * y zoom con botones/rueda. Se usa tanto en miniatura como en pantalla completa.
 * Los nodos y conexiones usan los tokens del tema.
 */
export function MapaVista({
  mapa,
  height = 240,
  zoomable = true,
}: {
  mapa: Mapa
  height?: number | string
  zoomable?: boolean
}) {
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const contRef = useRef<HTMLDivElement>(null)

  // Bounds del mapa (para centrar)
  const xMin = Math.min(...mapa.nodos.map((n) => n.x)) - NODO_W / 2
  const yMin = Math.min(...mapa.nodos.map((n) => n.y)) - NODO_H / 2
  const xMax = Math.max(...mapa.nodos.map((n) => n.x)) + NODO_W / 2
  const yMax = Math.max(...mapa.nodos.map((n) => n.y)) + NODO_H / 2
  const W = Math.max(600, xMax - xMin + 120)
  const H = Math.max(400, yMax - yMin + 120)

  const centro = (n: MapaNodo) => ({ x: n.x, y: n.y })

  const onWheel = (e: React.WheelEvent) => {
    if (!zoomable) return
    setZoom((z) => Math.max(0.4, Math.min(1.6, z + (e.deltaY < 0 ? 0.08 : -0.08))))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = contRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    setPan({ x: dragRef.current.panX + (e.clientX - dragRef.current.x), y: dragRef.current.panY + (e.clientY - dragRef.current.y) })
  }
  const onPointerUp = () => { dragRef.current = null }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {zoomable && (
        <div className="absolute right-2 top-2 z-20 flex items-center gap-1 border border-line bg-surface-2 p-1">
          <button onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} className="cursor-pointer px-1 text-ink-2 hover:text-ink" title="Acercar"><Icon name="add" className="text-[13px]" /></button>
          <span className="font-mono text-[9px] text-ink-3">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} className="cursor-pointer px-1 text-ink-2 hover:text-ink" title="Alejar"><Icon name="remove" className="text-[13px]" /></button>
          <button onClick={() => { setZoom(0.85); setPan({ x: 0, y: 0 }) }} className="cursor-pointer px-1 text-ink-2 hover:text-ink" title="Reiniciar vista"><Icon name="center_focus_strong" className="text-[12px]" /></button>
        </div>
      )}
      <div
        ref={contRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full flex-1 touch-none overflow-hidden border border-line bg-canvas"
        style={typeof height === 'number' ? { height } : { minHeight: 280 }}
        title="Arrastra para navegar · rueda para zoom"
      >
        <div
          className="absolute"
          style={{ width: W * zoom, height: H * zoom, left: -xMin * zoom + pan.x, top: -yMin * zoom + pan.y }}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: W, height: H, position: 'relative' }}>
            {/* Conexiones */}
            <svg width={W} height={H} className="pointer-events-none absolute inset-0">
              {mapa.conexiones.map((c, i) => {
                const o = mapa.nodos.find((n) => n.id === c.origen)
                const d = mapa.nodos.find((n) => n.id === c.destino)
                if (!o || !d) return null
                const a = centro(o); const b = centro(d)
                const mx = (a.x + b.x) / 2; const my = (a.y + b.y) / 2
                return (
                  <g key={i}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(var(--ink-3))" strokeWidth={1.5} markerEnd="url(#arrow-mapa-v)"/>
                    {c.etiqueta && (
                      <g>
                        <rect x={mx - 30} y={my - 9} width={60} height={18} rx={4} fill="rgb(var(--surface))" stroke="rgb(var(--line-strong))"/>
                        <text x={mx} y={my + 4} textAnchor="middle" fontSize={9} fill="rgb(var(--ink-2))" fontFamily="JetBrains Mono, monospace">{c.etiqueta}</text>
                      </g>
                    )}
                  </g>
                )
              })}
              <defs>
                <marker id="arrow-mapa-v" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--ink-3))" />
                </marker>
              </defs>
            </svg>
            {/* Nodos */}
            {mapa.nodos.map((n) => (
              <div
                key={n.id}
                className="absolute z-10 flex flex-col justify-center overflow-hidden border px-2 py-1 text-center"
                style={{ left: n.x - NODO_W / 2, top: n.y - NODO_H / 2, width: NODO_W, height: NODO_H, backgroundColor: 'rgb(var(--surface-3))', borderLeft: `3px solid ${n.color ?? 'rgb(var(--accent))'}` }}
              >
                <span className="truncate font-display text-[11px] font-bold uppercase leading-tight">{n.titulo}</span>
                {n.sub && <span className="truncate font-mono text-[8px] text-ink-3">{n.sub}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-1 right-2 z-20 font-mono text-[8px] uppercase text-ink-3">
        {mapa.nodos.length} nodos · {mapa.conexiones.length} enlaces · arrastra para navegar
      </div>
    </div>
  )
}