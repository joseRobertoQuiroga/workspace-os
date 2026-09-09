import { useState } from 'react'

/**
 * Texto editable con un clic directo: muestra el texto, al hacer clic se
 * convierte en input; Enter o blur guarda y vuelve al modo lectura.
 */
export function EditableText({
  value,
  onSave,
  className = '',
  placeholder = 'Escribe…',
  mono = false,
}: {
  value: string
  onSave: (v: string) => void
  className?: string
  placeholder?: string
  mono?: boolean
}) {
  const [editando, setEditando] = useState(false)
  const [v, setV] = useState(value)

  const guardar = () => {
    onSave(v.trim() || value)
    setEditando(false)
  }

  if (editando) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') guardar()
          if (e.key === 'Escape') { setV(value); setEditando(false) }
        }}
        placeholder={placeholder}
        className={`cursor-text border border-line-strong bg-canvas outline-none ${mono ? 'font-mono' : ''} ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => { setV(value); setEditando(true) }}
      title="Clic para editar"
      className={`cursor-pointer transition-colors hover:text-accent ${className}`}
    >
      {value}
    </span>
  )
}