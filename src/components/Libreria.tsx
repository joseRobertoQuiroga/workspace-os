import { useMemo, useState } from 'react'
import type { DB, Materia, Tema, Unidad } from '../lib/types'
import { Icon } from './Icon'
import { TextInput, Select } from './ui'

interface Resultado {
  materia: Materia
  unidad: Unidad
  tema: Tema
}

/**
 * Librería: búsqueda rápida de una unidad y su tema con filtro por materia y
 * por fecha de actualización. Al seleccionar, abre el tema en su materia.
 */
export function Libreria({ db, onAbrir }: { db: DB; onAbrir: (materiaId: string, unidadId: string, temaId: string) => void }) {
  const [q, setQ] = useState('')
  const [fMateria, setFMateria] = useState('todas')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')

  const resultados = useMemo<Resultado[]>(() => {
    const query = q.trim().toLowerCase()
    const lista: Resultado[] = []
    for (const m of db.materias) {
      if (fMateria !== 'todas' && m.id !== fMateria) continue
      for (const u of m.unidades ?? []) {
        for (const t of u.temas ?? []) {
          const fecha = t.actualizado_en ?? t.creado_en ?? ''
          if (fDesde && fecha.slice(0, 10) < fDesde) continue
          if (fHasta && fecha.slice(0, 10) > fHasta) continue
          const texto = `${m.nombre} ${u.titulo} ${u.tema} ${t.titulo} ${t.contexto} ${t.apuntes}`.toLowerCase()
          if (query && !texto.includes(query)) continue
          lista.push({ materia: m, unidad: u, tema: t })
        }
      }
    }
    return lista.sort((a, b) => (b.tema.actualizado_en ?? '').localeCompare(a.tema.actualizado_en ?? ''))
  }, [db, q, fMateria, fDesde, fHasta])

  const totalUnidades = db.materias.reduce((a, m) => a + (m.unidades ?? []).length, 0)
  const totalTemas = db.materias.reduce((a, m) => a + (m.unidades ?? []).reduce((x, u) => x + (u.temas ?? []).length, 0), 0)

  return (
    <div className="flex flex-col gap-3 border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="local_library" className="text-[20px] text-area-univ" />
          <h2 className="mono-label text-[12px] font-bold">Librería · Unidades y temas</h2>
          <span className="font-mono text-[10px] text-ink-3">
            {db.materias.length} materias · {totalUnidades} unidades · {totalTemas} temas
          </span>
        </div>
        <span className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-ink-3">
          {resultados.length} resultados
        </span>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar unidad o tema…" className="!pl-7" />
          <Icon name="search" className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[15px] text-ink-3" />
        </div>
        <Select value={fMateria} onChange={(e) => setFMateria(e.target.value)}>
          <option value="todas">Todas las materias</option>
          {db.materias.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </Select>
        <div className="flex items-center gap-1.5">
          <label className="mono-label shrink-0 text-[9px] text-ink-3">Desde</label>
          <input type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)} className="w-full border border-line bg-canvas px-2 py-1 font-mono text-[10px] text-ink outline-none focus:border-line-strong" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="mono-label shrink-0 text-[9px] text-ink-3">Hasta</label>
          <input type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)} className="w-full border border-line bg-canvas px-2 py-1 font-mono text-[10px] text-ink outline-none focus:border-line-strong" />
        </div>
      </div>

      {/* Resultados */}
      <div className="vlist max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {resultados.map((r) => (
          <button
            key={r.tema.id}
            onClick={() => onAbrir(r.materia.id, r.unidad.id, r.tema.id)}
            className="flex cursor-pointer items-center justify-between gap-2 border border-line bg-canvas p-2 text-left transition-colors hover:border-line-strong hover:bg-surface-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[11px] font-black uppercase tracking-tight">{r.tema.titulo}</span>
                {r.tema.pizarra.length > 0 && (
                  <span title="Tiene pizarra"><Icon name="gesture" className="text-[13px] text-area-freelance" /></span>
                )}
              </div>
              <div className="truncate font-mono text-[10px] text-ink-3">
                {r.materia.nombre} <span className="text-area-univ">[{r.materia.semestre}]</span> › {r.unidad.titulo}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {r.tema.contexto && <span className="hidden max-w-40 truncate font-mono text-[9px] text-ink-3 md:block">“{r.tema.contexto}”</span>}
              <span className="font-mono text-[9px] text-ink-3">
                {r.tema.actualizado_en ? new Date(r.tema.actualizado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''}
              </span>
              <Icon name="chevron_right" className="text-[15px] text-ink-3" />
            </div>
          </button>
        ))}
        {resultados.length === 0 && (
          <p className="py-4 text-center font-mono text-[10px] text-ink-3">Sin resultados — ajusta la búsqueda o los filtros.</p>
        )}
      </div>
    </div>
  )
}