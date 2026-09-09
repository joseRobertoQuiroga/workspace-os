import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * LABERINTO — generación con algoritmo "recursive backtracker"
 * (randomized depth-first search con pila explícita; ver Wikipedia: Maze generation algorithm
 * y Rosetta Code: Maze). Produce laberintos perfectos con corredores largos.
 * Dificultad por nivel: el tablero crece con la fórmula tam = 5 + nivel (máx 15).
 */

interface Cella {
  visitada: boolean
  norte: boolean
  este: boolean
  sur: boolean
  oeste: boolean
}

function generarMaze(tam: number): Cella[][] {
  const g: Cella[][] = Array.from({ length: tam }, () =>
    Array.from({ length: tam }, () => ({ visitada: false, norte: true, este: true, sur: true, oeste: true }))
  )
  // Recursive backtracker iterativo con pila
  const pila: [number, number][] = [[0, 0]]
  g[0][0].visitada = true
  while (pila.length) {
    const [x, y] = pila[pila.length - 1]
    const vecinos: [number, number, 'norte' | 'este' | 'sur' | 'oeste'][] = []
    if (y > 0 && !g[y - 1][x].visitada) vecinos.push([x, y - 1, 'norte'])
    if (x < tam - 1 && !g[y][x + 1].visitada) vecinos.push([x + 1, y, 'este'])
    if (y < tam - 1 && !g[y + 1][x].visitada) vecinos.push([x, y + 1, 'sur'])
    if (x > 0 && !g[y][x - 1].visitada) vecinos.push([x - 1, y, 'oeste'])
    if (!vecinos.length) {
      pila.pop()
      continue
    }
    const [nx, ny, dir] = vecinos[Math.floor(Math.random() * vecinos.length)]
    if (dir === 'norte') { g[y][x].norte = false; g[ny][nx].sur = false }
    if (dir === 'sur') { g[y][x].sur = false; g[ny][nx].norte = false }
    if (dir === 'este') { g[y][x].este = false; g[ny][nx].oeste = false }
    if (dir === 'oeste') { g[y][x].oeste = false; g[ny][nx].este = false }
    g[ny][nx].visitada = true
    pila.push([nx, ny])
  }
  return g
}

export function JuegoLaberinto({ onPuntaje }: { onPuntaje?: (pts: number) => void }) {
  const [nivel, setNivel] = useState(1)
  const [maze, setMaze] = useState<Cella[][]>(() => generarMaze(5))
  const [pos, setPos] = useState<[number, number]>([0, 0])
  const [meta, setMeta] = useState<[number, number]>([4, 4])
  const [movs, setMovs] = useState(0)
  const [ganado, setGanado] = useState(false)
  const estado = useRef({ nivel: 1, pos: [0, 0] as [number, number], meta: [4, 4] as [number, number], ganado: false })

  const tam = 5 + nivel

  const nuevoJuego = useCallback((n: number) => {
    const t = 5 + n
    const g = generarMaze(t)
    const m: [number, number] = [t - 1, t - 1]
    estado.current = { nivel: n, pos: [0, 0], meta: m, ganado: false }
    setMaze(g)
    setPos([0, 0])
    setMeta(m)
    setMovs(0)
    setGanado(false)
    setNivel(n)
  }, [])

  useEffect(() => {
    const movsRef = { current: 0 }
    const onKey = (e: KeyboardEvent) => {
      if (estado.current.ganado) return
      const g = mazeRef.current
      if (!g) return
      const [x, y] = estado.current.pos
      const c = g[y][x]
      let nx = x
      let ny = y
      if (e.key === 'ArrowUp' && !c.norte) ny--
      else if (e.key === 'ArrowDown' && !c.sur) ny++
      else if (e.key === 'ArrowLeft' && !c.oeste) nx--
      else if (e.key === 'ArrowRight' && !c.este) nx++
      else return
      e.preventDefault()
      movsRef.current += 1
      estado.current.pos = [nx, ny]
      setPos([nx, ny])
      setMovs(movsRef.current)
      if (nx === estado.current.meta[0] && ny === estado.current.meta[1]) {
        estado.current.ganado = true
        setGanado(true)
        onPuntaje?.(100 + nivel * 50 - movsRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nivel, onPuntaje])

  const mazeRef = useRef(maze)
  useEffect(() => {
    mazeRef.current = maze
  }, [maze])

  const siguiente = () => nuevoJuego(estado.current.nivel + 1)

  const tamPix = Math.min(420, 40 * tam)
  const celda = tamPix / tam

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex w-full items-center justify-between font-mono text-[10px] uppercase">
        <span className="font-bold text-ink-2">Nivel {nivel} · {tam}×{tam}</span>
        <span className="text-ink-3">flechas para moverte · gen: backtracking DFS</span>
        <span className="font-bold text-accent">Pasos {movs}</span>
      </div>
      <div
        className="relative border border-line bg-canvas"
        style={{ width: tamPix, height: tamPix }}
      >
        {maze.map((fila, y) =>
          fila.map((c, x) => (
            <div
              key={`${x}-${y}`}
              className="absolute"
              style={{
                left: x * celda,
                top: y * celda,
                width: celda,
                height: celda,
                borderTop: c.norte ? '2px solid rgb(var(--ink-2))' : '2px solid transparent',
                borderRight: c.este ? '2px solid rgb(var(--ink-2))' : '2px solid transparent',
                borderBottom: c.sur ? '2px solid rgb(var(--ink-2))' : '2px solid transparent',
                borderLeft: c.oeste ? '2px solid rgb(var(--ink-2))' : '2px solid transparent',
              }}
            />
          ))
        )}
        {/* Meta */}
        <div
          className="absolute"
          style={{
            left: meta[0] * celda + celda / 2 - 4,
            top: meta[1] * celda + celda / 2 - 4,
            width: 8,
            height: 8,
            backgroundColor: 'rgb(var(--state-done))',
          }}
        />
        {/* Jugador (puntito) */}
        <div
          className="absolute transition-all duration-100"
          style={{
            left: pos[0] * celda + celda / 2 - 5,
            top: pos[1] * celda + celda / 2 - 5,
            width: 10,
            height: 10,
            borderRadius: 9999,
            backgroundColor: 'rgb(var(--accent))',
            boxShadow: '0 0 8px rgb(var(--accent))',
          }}
        />
      </div>
      <div className="flex w-full items-center justify-between font-mono text-[10px] uppercase">
        <span className="text-ink-3">{ganado ? `¡Meta alcanzada en ${movs} pasos!` : 'Encuentra el punto verde'}</span>
        {ganado && (
          <button onClick={siguiente} className="theme-btn-press cursor-pointer border border-line bg-accent px-2.5 py-1 font-mono text-[10px] font-black text-on-accent">
            Nivel {nivel + 1} →
          </button>
        )}
      </div>
    </div>
  )
}