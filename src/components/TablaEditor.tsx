import type { Tabla } from '../lib/types'
import { Icon } from './Icon'
import { Button, TextInput } from './ui'

const PALETA = ['rgb(var(--accent))', 'rgb(var(--area-univ))', 'rgb(var(--area-freelance))', 'rgb(var(--area-emprende))', 'rgb(var(--area-personal))', 'rgb(var(--state-done))']
const ANCHOS: { id: NonNullable<Tabla['ancho']>; label: string; cls: string }[] = [
  { id: 'compacto', label: 'Compacta', cls: 'min-w-[280px]' },
  { id: 'normal', label: 'Normal', cls: 'min-w-[480px]' },
  { id: 'amplio', label: 'Amplia', cls: 'min-w-[720px]' },
]

const uid = () => `tb-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Vista renderizada de una tabla estructurada (con columna principal resaltada) */
export function TablaVista({ tabla, areaColor = 'area-univ' }: { tabla: Tabla; areaColor?: string }) {
  const color = tabla.color ?? `rgb(var(--${areaColor}))`
  const principal = tabla.columna_principal ?? -1
  const ancho = ANCHOS.find((a) => a.id === tabla.ancho)?.cls ?? ANCHOS[1].cls
  return (
    <div className="flex flex-col gap-1">
      {tabla.titulo && (
        <span className="font-display text-[12px] font-black uppercase tracking-tight" style={{ color }}>
          {tabla.titulo}
        </span>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse text-left font-mono text-[11px] ${ancho}`}>
          <thead>
            <tr>
              {tabla.cols.map((c, ci) => (
                <th
                  key={ci}
                  className="border border-line px-2 py-1.5 font-bold uppercase"
                  style={
                    ci === principal
                      ? { backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)`, color: `rgb(var(--ink))`, borderLeft: `2px solid ${color}` }
                      : { backgroundColor: 'rgb(var(--surface-2))', color: 'rgb(var(--ink-2))' }
                  }
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila, ri) => (
              <tr key={ri} className={ri % 2 ? 'bg-canvas' : 'bg-surface-2/60'}>
                {tabla.cols.map((_, ci) => (
                  <td
                    key={ci}
                    className="border border-line px-2 py-1.5 text-ink-2"
                    style={
                      ci === principal
                        ? { backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`, borderLeft: `2px solid ${color}` }
                        : undefined
                    }
                  >
                    {fila[ci] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Editor visual de una tabla: columnas, filas, columna principal, color y tamaño */
export function TablaEditor({
  tabla,
  onCambio,
  onGuardar,
  onCancelar,
  onEliminar,
}: {
  tabla: Tabla
  onCambio: (t: Tabla) => void
  onGuardar: () => void
  onCancelar: () => void
  onEliminar: () => void
}) {
  const set = (cambios: Partial<Tabla>) => onCambio({ ...tabla, ...cambios })

  const cambiarCol = (i: number, v: string) => set({ cols: tabla.cols.map((c, j) => (j === i ? v : c)) })
  const cambiarCelda = (fi: number, ci: number, v: string) =>
    set({ filas: tabla.filas.map((f, j) => (j === fi ? f.map((c, k) => (k === ci ? v : c)) : f)) })
  const addCol = () => {
    const nombre = `Col ${tabla.cols.length + 1}`
    set({ cols: [...tabla.cols, nombre], filas: tabla.filas.map((f) => [...f, '']) })
  }
  const removeCol = (i: number) => {
    set({ cols: tabla.cols.filter((_, j) => j !== i), filas: tabla.filas.map((f) => f.filter((_, j) => j !== i)) })
  }
  const addFila = () => set({ filas: [...tabla.filas, tabla.cols.map(() => '')] })
  const removeFila = (i: number) => set({ filas: tabla.filas.filter((_, j) => j !== i) })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextInput value={tabla.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="Título de la tabla" className="max-w-64 !text-[12px]" />
        <div className="flex items-center gap-1.5">
          <select
            value={tabla.columna_principal ?? -1}
            onChange={(e) => set({ columna_principal: Number(e.target.value) })}
            title="Columna principal (lateral/vertical)"
            className="cursor-pointer border border-line bg-canvas px-2 py-1.5 font-mono text-[10px] text-ink outline-none"
          >
            <option value={-1}>Sin columna principal</option>
            {tabla.cols.map((c, i) => (
              <option key={i} value={i}>Principal: {c || `Col ${i + 1}`}</option>
            ))}
          </select>
          <select
            value={tabla.ancho ?? 'normal'}
            onChange={(e) => set({ ancho: e.target.value as Tabla['ancho'] })}
            className="cursor-pointer border border-line bg-canvas px-2 py-1.5 font-mono text-[10px] text-ink outline-none"
          >
            {ANCHOS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            {PALETA.map((c) => (
              <button
                key={c}
                onClick={() => set({ color: c })}
                title="Color de la tabla"
                className={`h-4 w-4 cursor-pointer border transition-transform ${tabla.color === c ? 'scale-125 border-line-strong' : 'border-line'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid editable */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left font-mono text-[11px]">
          <thead>
            <tr>
              {tabla.cols.map((c, ci) => (
                <th key={ci} className="border border-line bg-surface-2 p-1">
                  <div className="flex items-center gap-1">
                    <input
                      value={c}
                      onChange={(e) => cambiarCol(ci, e.target.value)}
                      className="w-full border-0 bg-transparent px-1 py-1 font-bold uppercase text-ink-2 outline-none"
                    />
                    <button onClick={() => removeCol(ci)} className="cursor-pointer text-ink-3 hover:text-prio-high" title="Quitar columna">
                      <Icon name="close" className="text-[12px]" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-7 border border-line bg-surface-2 p-1">
                <button onClick={addCol} className="cursor-pointer text-ink-2 hover:text-ink" title="Añadir columna">
                  <Icon name="add" className="text-[14px]" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((fila, fi) => (
              <tr key={fi}>
                {tabla.cols.map((_, ci) => (
                  <td key={ci} className="border border-line p-0.5">
                    <input
                      value={fila[ci] ?? ''}
                      onChange={(e) => cambiarCelda(fi, ci, e.target.value)}
                      className="w-full bg-transparent px-1.5 py-1 text-ink outline-none"
                    />
                  </td>
                ))}
                <td className="border border-line p-1 text-center">
                  <button onClick={() => removeFila(fi)} className="cursor-pointer text-ink-3 hover:text-prio-high" title="Quitar fila">
                    <Icon name="close" className="text-[12px]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="soft" size="sm" icono="add" onClick={addFila}>Añadir fila</Button>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" icono="delete" onClick={onEliminar}>Eliminar</Button>
          <Button variant="ghost" size="sm" onClick={onCancelar}>Cancelar</Button>
          <Button variant="primary" size="sm" icono="save" onClick={onGuardar}>Guardar</Button>
        </div>
      </div>
    </div>
  )
}

export function tablaNueva(): Tabla {
  return {
    id: uid(),
    titulo: 'Nueva tabla',
    cols: ['Concepto', 'Detalle'],
    filas: [['', '']],
    columna_principal: 0,
    color: 'rgb(var(--area-univ))',
    ancho: 'normal',
  }
}