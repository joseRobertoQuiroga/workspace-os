import type { ReactNode } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"']+)/g

/**
 * Renderiza texto convirtiendo URLs en enlaces resaltados (azul eléctrico).
 * Abren en otra pestaña. Mantiene saltos de línea con whitespace-pre-wrap.
 */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null
  const partes = text.split(URL_RE)
  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {partes.map((p, i) => {
        if (/^https?:\/\//.test(p)) {
          return (
            <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="link-ref">
              {p}
            </a>
          )
        }
        return <span key={i}>{p}</span>
      })}
    </span>
  )
}

/** Detecta si un texto contiene URLs (para resaltar chips/títulos) */
export function tieneUrl(texto: string): boolean {
  return URL_RE.test(texto)
}

/** Extrae todas las URLs de un texto */
export function extraerUrls(texto: string): string[] {
  return texto.match(URL_RE) ?? []
}

/** Convierte bloques de contenido (array de párrafos) a RichText */
export function RichParagraphs({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <>
      {items.map((t, i) => (
        <p key={i} className={className}>
          <RichText text={t} />
        </p>
      ))}
    </>
  )
}

/** Componente que detecta enlaces dentro de contenido markdown-ligero y los vuelve botones */
export function renderConEnlaces(texto: string): ReactNode {
  const partes = texto.split(URL_RE)
  return (
    <>
      {partes.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="link-ref">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}