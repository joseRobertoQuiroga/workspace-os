import type { ReactNode } from 'react'
import { Icon } from './Icon'

/** Cabecera de carta de detalle con color por entidad */
export function DetailHeader({
  icono,
  color,
  titulo,
  sub,
  onClose,
}: {
  icono: string
  color: string
  titulo: ReactNode
  sub?: ReactNode
  onClose: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-line pb-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-line"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
        >
          <Icon name={icono} className="text-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-sm font-black uppercase leading-tight tracking-tight">{titulo}</div>
          {sub && <div className="truncate font-mono text-[10px] text-ink-3">{sub}</div>}
        </div>
      </div>
      <button onClick={onClose} className="cursor-pointer text-ink-3 hover:text-ink">
        <Icon name="close" className="text-[17px]" />
      </button>
    </div>
  )
}

/** Fila de propiedad label/valor */
export function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/60 py-1.5">
      <span className="mono-label shrink-0 pt-0.5 text-[9px] text-ink-3">{label}</span>
      <span className="min-w-0 text-right font-mono text-[11px] font-medium text-ink">{children}</span>
    </div>
  )
}

/** Lista de etiquetas */
export function Tags({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span
          key={t}
          className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px]"
          style={{ color: `color-mix(in srgb, ${color} 75%, rgb(var(--ink-2)))` }}
        >
          #{t}
        </span>
      ))}
    </div>
  )
}

/** Bloque de notas */
export function Notas({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className="border border-line bg-canvas p-2.5">
      <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-2">{children}</p>
    </div>
  )
}

/** Pie de acciones */
export function DetailActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-2.5">{children}</div>
}