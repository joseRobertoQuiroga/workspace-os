import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface Pos {
  left: number
  top: number
  arrowX: number // posición horizontal de la flecha relativa a la carta
  below: boolean
}

/**
 * Carta flotante anclada a un elemento.
 * - Desktop: aparece DEBAJO del ancla (o encima si no cabe), con flecha apuntando al punto de clic.
 *   Nunca cubre el elemento ancla: se mide el alto real del contenido antes de posicionar.
 * - Móvil (<640px): bottom-sheet a pantalla completa.
 * Cierra con Escape y clic fuera.
 */
export function Popover({
  anchor,
  onClose,
  children,
  ancho = 340,
}: {
  anchor: HTMLElement | null
  onClose: () => void
  children: ReactNode
  ancho?: number
}) {
  const [pos, setPos] = useState<Pos | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  // Medir el alto real del contenido (render previo oculto)
  useLayoutEffect(() => {
    if (!ref.current || !anchor) return
    const h = ref.current.offsetHeight
    if (h > 0 && h !== height) setHeight(h)
  })

  useLayoutEffect(() => {
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const esMovil = vw < 640
    setIsMobile(esMovil)
    if (esMovil) return

    const gap = 10
    const vh = window.innerHeight
    const alto = height ?? 320
    const abajo = rect.bottom + gap + alto <= vh - 8
    const top = abajo ? rect.bottom + gap : Math.max(8, rect.top - gap - alto)
    const centrado = rect.left + rect.width / 2
    const left = Math.max(8, Math.min(centrado - ancho / 2, vw - ancho - 8))
    // Flecha apuntando al centro del ancla (clamp a los bordes de la carta)
    const arrowX = Math.max(18, Math.min(centrado - left, ancho - 18))

    setPos({ left, top, arrowX, below: abajo })
  }, [anchor, ancho, height])

  useEffect(() => {
    if (!anchor) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose()
    }
    const onScroll = () => onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [anchor, onClose])

  if (!anchor) return null

  const content = (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      className={`popover theme-card z-[70] shadow-lift ${
        isMobile
          ? 'fixed inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-none border-x-0 border-b-0 p-4 pb-6'
          : 'fixed'
      }`}
      style={
        isMobile
          ? undefined
          : pos
            ? { left: pos.left, top: pos.top, width: ancho, visibility: height ? 'visible' : 'hidden' }
            : { left: -9999, top: -9999, width: ancho }
      }
      onClick={(e) => e.stopPropagation()}
    >
      {!isMobile && pos && height && (
        <span
          className="pointer-events-none absolute h-2.5 w-2.5 rotate-45 border-l border-t border-line bg-surface"
          style={pos.below ? { left: pos.arrowX - 5, top: -7 } : { left: pos.arrowX - 5, bottom: -7, borderLeft: 'none', borderTop: 'none', borderRight: '1px solid rgb(var(--line))', borderBottom: '1px solid rgb(var(--line))' }}
        />
      )}
      {children}
    </div>
  )

  return createPortal(content, document.body)
}