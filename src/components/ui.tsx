import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useEffect } from 'react'
import { Icon } from './Icon'
import { playSound } from '../lib/audio'

/* ---------- Badge de estado/área (usa color por token) ---------- */
export function Badge({
  children,
  color = 'surface-2',
  mono = true,
  className = '',
}: {
  children: ReactNode
  color?: string
  mono?: boolean
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap border border-line px-1.5 py-0.5 text-[10px] font-bold ${
        mono ? 'font-mono uppercase' : ''
      } ${className}`}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    >
      {children}
    </span>
  )
}

/* Badge de área por nombre de token */
export function AreaBadge({ area, nombre }: { area: string; nombre: string }) {
  return <Badge color={`rgb(var(--${area}))`}>{nombre}</Badge>
}

/* ---------- Botones ---------- */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'soft'
  size?: 'sm' | 'md'
  icono?: string
}

export function Button({ variant = 'primary', size = 'md', icono, className = '', children, ...rest }: BtnProps) {
  const base =
    'theme-btn-press inline-flex items-center justify-center gap-1.5 border border-line font-mono font-black uppercase tracking-tight'
  const sizes = size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-[11px]'
  const variants = {
    primary: 'bg-accent text-on-accent',
    ghost: 'bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
    soft: 'bg-surface-2 text-ink',
  }
  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest}>
      {icono && <Icon name={icono} className="text-[15px]" />}
      {children}
    </button>
  )
}

/* ---------- Panel / tarjeta ---------- */
export function Panel({
  children,
  className = '',
  title,
  icono,
  extra,
  pad = true,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  icono?: string
  extra?: ReactNode
  pad?: boolean
}) {
  return (
    <section className={`theme-card ${pad ? 'p-5 sm:p-6' : ''} ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {icono && <Icon name={icono} className="shrink-0 text-[18px] text-ink-2" />}
            <h2 className="mono-label truncate text-[11px] font-bold text-ink">{title}</h2>
          </div>
          {extra}
        </div>
      )}
      {children}
    </section>
  )
}

/* ---------- Barra de progreso ---------- */
export function Progress({ value, color = 'rgb(var(--accent))', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 w-full border border-line bg-canvas p-px ${className}`}>
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  )
}

/* ---------- Checkbox con trazo animado ---------- */
export function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => {
        onChange()
        playSound(checked ? 'checkOff' : 'checkOn')
      }}
      className={`check-btn flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center border-2 border-line bg-canvas transition-colors ${
        checked ? 'check-on' : ''
      }`}
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
        <path
          d="M2.5 6.5 L5 9 L9.5 3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          className={`check-path ${checked ? 'check-path-drawn' : ''}`}
        />
      </svg>
    </button>
  )
}

/* ---------- Campos de formulario ---------- */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="mono-label text-[10px] text-ink-3">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full border border-line bg-canvas px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-20 resize-y ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} cursor-pointer ${props.className ?? ''}`} />
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  ancho = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  ancho?: string
}) {
  useEffect(() => {
    if (open) playSound('open')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`theme-card w-full ${ancho} max-h-[88vh] overflow-y-auto p-5 shadow-lift`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-2.5">
          <h3 className="mono-label text-[12px] font-bold text-ink">{title}</h3>
          <button onClick={() => { onClose(); playSound('close') }} className="cursor-pointer text-ink-3 hover:text-ink">
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------- Estado vacío ---------- */
export function Empty({ icono = 'inbox', texto }: { icono?: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon name={icono} className="text-[34px] text-ink-3" />
      <p className="font-mono text-xs text-ink-3">{texto}</p>
    </div>
  )
}

/* ---------- Número/estadística ---------- */
export function Stat({ valor, etiqueta, color = 'rgb(var(--ink))', icono }: { valor: ReactNode; etiqueta: string; color?: string; icono?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {icono && <Icon name={icono} className="text-[14px] text-ink-3" />}
        <span className="mono-label text-[9px] text-ink-3">{etiqueta}</span>
      </div>
      <span className="font-mono text-xl font-bold leading-tight" style={{ color }}>
        {valor}
      </span>
    </div>
  )
}