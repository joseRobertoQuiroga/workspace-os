import { useRef, useState } from 'react'
import type { PizarraNodo } from '../lib/types'
import { Icon } from './Icon'
import { Button } from './ui'

const PALETA = ['rgb(var(--accent))', 'rgb(var(--area-univ))', 'rgb(var(--area-freelance))', 'rgb(var(--area-emprende))', 'rgb(var(--area-personal))', 'rgb(var(--state-done))', 'rgb(var(--state-todo))']
const uid = () => `pz-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/**
 * Pizarra: lienzo grande para colocar ejemplos visuales (notas de texto y/o
 * imágenes). Arrastrable con puntero/touch, edición doble clic, colores.
 */
export function Pizarra({ nodos, onChange, height = 460 }: { nodos: PizarraNodo[]; onChange: (n: PizarraNodo[]) => void; height?: number }) {
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const [editando, setEditando] = useState<PizarraNodo | null>(null)
  const [nuevoTexto, setNuevoTexto] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')

  const onPointerDown = (e: React.PointerEvent, n: PizarraNodo) => {
    if (editando?.id === n.id) return
    dragRef.current = { id: n.id, dx: e.clientX - n.x, dy: e.clientY - n.y }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const x = Math.max(0, e.clientX - dragRef.current.dx)
    const y = Math.max(0, e.clientY - dragRef.current.dy)
    onChange(nodos.map((n) => (n.id === dragRef.current!.id ? { ...n, x, y } : n)))
  }
  const onPointerUp = () => { dragRef.current = null }

  const agregarNota = () => {
    const n: PizarraNodo = {
      id: uid(),
      titulo: 'Ejemplo',
      texto: nuevoTexto.trim() || 'Escribe aquí el ejemplo…',
      color: PALETA[Math.floor(Math.random() * PALETA.length)],
      x: 40 + Math.random() * (height > 400 ? 200 : 60),
      y: 40 + Math.random() * 120,
      ancho: 230,
      alto: 90,
    }
    onChange([...nodos, n])
    setNuevoTexto('')
  }

  const agregarImagen = () => {
    if (!imagenUrl.trim()) return
    const n: PizarraNodo = {
      id: uid(),
      titulo: 'Imagen',
      texto: '',
      color: 'rgb(var(--accent))',
      x: 40 + Math.random() * 150,
      y: 40 + Math.random() * 120,
      ancho: 300,
      alto: 200,
      imagen: imagenUrl.trim(),
    }
    onChange([...nodos, n])
    setImagenUrl('')
  }

  const guardarEdicion = () => {
    if (editando) {
      onChange(nodos.map((n) => (n.id === editando.id ? { ...n, texto: nuevoTexto } : n)))
      setEditando(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border border-line bg-surface-2 p-2">
        <span className="mono-label text-[9px] text-ink-3">PIZARRA</span>
        <input
          value={nuevoTexto}
          onChange={(e) => setNuevoTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregarNota()}
          placeholder="Texto del ejemplo…"
          className="min-w-0 flex-1 border border-line bg-canvas px-2 py-1 font-mono text-[11px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
        />
        <Button variant="soft" size="sm" icono="note_add" onClick={agregarNota}>Nota</Button>
        <input
          value={imagenUrl}
          onChange={(e) => setImagenUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregarImagen()}
          placeholder="URL de imagen…"
          className="min-w-0 flex-1 border border-line bg-canvas px-2 py-1 font-mono text-[11px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
        />
        <Button variant="soft" size="sm" icono="image" onClick={agregarImagen}>Imagen</Button>
        <span className="font-mono text-[9px] text-ink-3">{nodos.length} elementos · arrastra para mover</span>
      </div>

      {/* Lienzo */}
      <div
        className="relative w-full overflow-auto border border-line bg-canvas p-2"
        style={{ height }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div className="relative h-full min-h-[300px] w-full min-w-[700px]" style={{ backgroundImage: 'radial-gradient(rgb(var(--line)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {nodos.map((n) => (
            <div
              key={n.id}
              onPointerDown={(e) => onPointerDown(e, n)}
              onDoubleClick={() => { setEditando(n); setNuevoTexto(n.texto) }}
              className="absolute cursor-grab select-none overflow-hidden border p-2.5 shadow-hard active:cursor-grabbing"
              style={{
                left: n.x,
                top: n.y,
                width: n.ancho,
                minHeight: n.alto,
                backgroundColor: `color-mix(in srgb, ${n.color} 12%, rgb(var(--surface-2)))`,
                borderLeft: `3px solid ${n.color}`,
                color: 'rgb(var(--ink))',
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-display text-[11px] font-black uppercase tracking-tight">{n.titulo}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onChange(nodos.filter((x) => x.id !== n.id)) }}
                  className="cursor-pointer text-ink-3 transition-colors hover:text-prio-high"
                  title="Quitar de la pizarra"
                >
                  <Icon name="close" className="text-[13px]" />
                </button>
              </div>
              {editando?.id === n.id ? (
                <textarea
                  value={nuevoTexto}
                  onChange={(e) => setNuevoTexto(e.target.value)}
                  onBlur={guardarEdicion}
                  autoFocus
                  className="mt-1 w-full resize-none border border-line bg-canvas p-1.5 font-mono text-[11px] text-ink outline-none"
                  rows={4}
                />
              ) : n.imagen ? (
                <img src={n.imagen} alt={n.titulo} className="mt-1 max-h-48 w-full object-contain" />
              ) : (
                <p className="mt-1 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-2">{n.texto}</p>
              )}
            </div>
          ))}
          {nodos.length === 0 && (
            <div className="pointer-events-none flex h-full w-full items-center justify-center font-mono text-[10px] text-ink-3">
              Lienzo vacío — añade notas de texto o imágenes para ejemplos visuales grandes.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}