import type { Ficha, FichaSeccion } from './types'

/**
 * Exporta una ficha (o subpágina) a Markdown.
 * Estructura: título, subtítulo, propiedades, secciones con contenido + checklist, y subpáginas.
 */
export function fichaToMarkdown(ficha: Ficha): string {
  const lines: string[] = []
  lines.push(`# ${ficha.titulo}`)
  if (ficha.subtitulo) lines.push(`> ${ficha.subtitulo}`)
  lines.push(`> Estado: ${ficha.estado}`)
  lines.push('')

  if (ficha.propiedades.length) {
    lines.push('## Propiedades')
    ficha.propiedades.forEach((p) => lines.push(`- **${p.etiqueta}:** ${p.valor}`))
    lines.push('')
  }

  ficha.secciones.forEach((sec, i) => {
    lines.push(`## ${i + 1}. ${sec.titulo}`)
    sec.contenido.forEach((c) => {
      c.split('\n').forEach((l) => lines.push(l))
    })
    if (sec.mini_tareas.length) {
      lines.push('')
      lines.push('### Checklist')
      sec.mini_tareas.forEach((m) => lines.push(`- [${m.hecha ? 'x' : ' '}] ${m.titulo}`))
    }
    ;(sec.subpaginas ?? []).forEach((sp) => {
      lines.push('')
      lines.push(`### Subpágina: ${sp.titulo}`)
      lines.push('')
      sp.contenido.split('\n').forEach((l) => lines.push(l))
      if (sp.mini_tareas.length) {
        lines.push('')
        lines.push('#### Checklist')
        sp.mini_tareas.forEach((m) => lines.push(`- [${m.hecha ? 'x' : ' '}] ${m.titulo}`))
      }
    })
    lines.push('')
  })

  return lines.join('\n')
}

export function descargarMarkdown(nombre: string, contenido: string): void {
  const blob = new Blob([contenido], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre.endsWith('.md') ? nombre : `${nombre}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parsea un archivo .md y devuelve título + secciones + checklist (para re-instanciar).
 * Formato compatible con fichaToMarkdown (round-trip).
 */
export interface MarkdownParsed {
  titulo: string
  contenido: string[]
  mini_tareas: { titulo: string; hecha: boolean }[]
  subpaginas: { titulo: string; contenido: string }[]
}

export function parseMarkdown(texto: string): MarkdownParsed {
  const lineas = texto.split('\n')
  const contenido: string[] = []
  const mini_tareas: { titulo: string; hecha: boolean }[] = []
  const subpaginas: { titulo: string; contenido: string }[] = []
  let titulo = ''
  let enSub: { titulo: string; contenido: string } | null = null

  for (const l of lineas) {
    const t = l.trim()
    if (t.startsWith('# ') && !titulo) {
      titulo = t.slice(2).trim()
    } else if (t.startsWith('### Subpágina:')) {
      if (enSub) subpaginas.push(enSub)
      enSub = { titulo: t.slice('### Subpágina:'.length).trim(), contenido: '' }
    } else if (enSub) {
      const m = t.match(/^-\s+\[(x| )\]\s+(.*)$/i)
      if (m) {
        // en sub: ignorar checklist por ahora (se puede enriquecer después)
      } else {
        enSub.contenido += (enSub.contenido ? '\n' : '') + l
      }
    } else if (/^-\s+\[(x| )\]\s+.*$/i.test(t)) {
      const m = t.match(/^-\s+\[(x| )\]\s+(.*)$/i)
      if (m) mini_tareas.push({ titulo: m[2].trim(), hecha: m[1].toLowerCase() === 'x' })
    } else if (t && !t.startsWith('## ') && !t.startsWith('> ') && !t.startsWith('### Checklist') && !t.startsWith('#### Checklist')) {
      contenido.push(l)
    }
  }
  if (enSub) subpaginas.push(enSub)

  return {
    titulo: titulo || 'Documento importado',
    contenido: contenido.length ? contenido : [''],
    mini_tareas,
    subpaginas,
  }
}

export function leerArchivo(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsText(archivo)
  })
}

export function nuevaSeccionVacia(id: string): FichaSeccion {
  return { id, titulo: 'Detalle y contexto', icono: 'description', contenido: [], mini_tareas: [], subpaginas: [] }
}