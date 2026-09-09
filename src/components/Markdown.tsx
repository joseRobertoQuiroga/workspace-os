import type { ReactNode } from 'react'

/**
 * Renderer Markdown-ligero para el contenido de fichas y subpáginas.
 * Soporta: títulos (#/##/###), negrita, cursiva, subrayado, código, listas,
 * citas, líneas horizontales, tablas (| a | b |) y URLs resaltadas.
 * Mantiene la estética de tokens del tema activo.
 */

function renderInline(texto: string): ReactNode {
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|`[^`]+`|https?:\/\/[^\s<>"']+)/g
  const parts: ReactNode[] = []
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) {
    if (m.index > last) parts.push(<span key={`t${k++}`}>{texto.slice(last, m.index)}</span>)
    const tok = m[0]
    if (tok.startsWith('**')) parts.push(<strong key={`b${k++}`} className="font-bold text-ink">{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('__')) parts.push(<u key={`u${k++}`} className="underline decoration-accent underline-offset-2">{tok.slice(2, -2)}</u>)
    else if (tok.startsWith('`')) parts.push(<code key={`c${k++}`} className="border border-line bg-surface-2 px-1 font-mono text-[0.92em] text-accent">{tok.slice(1, -1)}</code>)
    else if (/^https?:\/\//.test(tok)) parts.push(<a key={`a${k++}`} href={tok} target="_blank" rel="noopener noreferrer" className="link-ref">{tok}</a>)
    else parts.push(<em key={`e${k++}`} className="italic">{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < texto.length) parts.push(<span key={`t${k++}`}>{texto.slice(last)}</span>)
  return parts
}

function TablaMd({ filas, key }: { filas: string[]; key: string }) {
  const celdas = (fila: string) => fila.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
  const esSeparador = (fila: string) => /^\s*\|?[\s:|-]+\|?$/.test(fila) && fila.includes('-')
  const cuerpo = filas.filter((f) => !esSeparador(f))
  const encabezado = cuerpo.length ? celdas(cuerpo[0]) : []
  const datos = cuerpo.slice(1).map(celdas)
  const cols = Math.max(encabezado.length, ...datos.map((d) => d.length))
  return (
    <div key={key} className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-left font-mono text-[11px]">
        <thead>
          <tr className="border-b border-line bg-surface-2">
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} className="border border-line px-2 py-1.5 font-bold uppercase text-ink-2">{encabezado[i] ?? ''}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((d, ri) => (
            <tr key={ri} className={ri % 2 ? 'bg-canvas' : 'bg-surface-2/60'}>
              {Array.from({ length: cols }, (_, ci) => (
                <td key={ci} className="border border-line px-2 py-1.5 text-ink-2">{renderInline(d[ci] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null
  const lineas = text.split('\n')
  const bloques: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lineas.length) {
    const l = lineas[i]
    const t = l.trim()
    if (!t) { i++; continue }

    // Tabla: bloque de líneas | ... |
    if (t.startsWith('|')) {
      const filas: string[] = []
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        filas.push(lineas[i])
        i++
      }
      bloques.push(<TablaMd key={`tb${k++}`} filas={filas} />)
      continue
    }

    // Títulos
    const hm = t.match(/^(#{1,3})\s+(.*)$/)
    if (hm) {
      const nivel = hm[1].length
      const Contenido = renderInline(hm[2])
      if (nivel === 1) bloques.push(<h3 key={`h${k++}`} className="mt-3 font-display text-lg font-black uppercase tracking-tight text-ink">{Contenido}</h3>)
      else if (nivel === 2) bloques.push(<h4 key={`h${k++}`} className="mt-2.5 font-display text-base font-black uppercase tracking-tight text-ink">{Contenido}</h4>)
      else bloques.push(<h5 key={`h${k++}`} className="mt-2 font-display text-sm font-black uppercase tracking-tight text-ink-2">{Contenido}</h5>)
      i++
      continue
    }

    // Línea horizontal
    if (/^(-{3,}|\*{3,})$/.test(t)) {
      bloques.push(<hr key={`r${k++}`} className="my-3 border-line-strong" />)
      i++
      continue
    }

    // Cita
    if (t.startsWith('> ')) {
      bloques.push(
        <blockquote key={`q${k++}`} className="mt-1 border-l-2 border-accent bg-surface-2/60 px-3 py-1.5 italic text-ink-2">
          {renderInline(t.slice(2))}
        </blockquote>
      )
      i++
      continue
    }

    // Lista
    if (/^[-*]\s+/.test(t)) {
      const items: string[] = []
      while (i < lineas.length && /^\s*[-*]\s+/.test(lineas[i])) {
        items.push(lineas[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      bloques.push(
        <ul key={`l${k++}`} className="mt-1 space-y-0.5 pl-4">
          {items.map((it, j) => (
            <li key={j} className="list-disc marker:text-accent">{renderInline(it)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Párrafo
    bloques.push(
      <p key={`p${k++}`} className="mt-1 leading-relaxed">
        {renderInline(l)}
      </p>
    )
    i++
  }

  return <div className={`space-y-0.5 ${className}`}>{bloques}</div>
}