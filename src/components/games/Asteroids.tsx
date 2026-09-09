import { useEffect, useRef, useState } from 'react'

/**
 * ASTEROIDS — reinterpretación minimalista del clásico de Atari (1979).
 * Física clásica: nave triangular con rotación e impulso, wrap-around de pantalla,
 * asteroides poligonales que se parten en trozos al ser destruidos.
 * Dificultad por nivel (fórmula simple): más asteroides, más velocidad, menos retardo de disparo.
 */

const TAM = { w: 560, h: 360 }

interface Asteroide {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  rot: number
  vr: number
  pts: number[]
}

interface Bala {
  x: number
  y: number
  vx: number
  vy: number
  vida: number
}

interface Nave {
  x: number
  y: number
  ang: number
  vx: number
  vy: number
}

const RANGO_INICIAL = 5 // asteroide grande = 5 rayos de tamaño 4, 3, 2...

function crearAsteroide(x: number, y: number, rango: number): Asteroide {
  const r = rango * 8
  const ang = Math.random() * Math.PI * 2
  const vel = (1.2 + Math.random() * 0.8) * (6 - rango) / 2
  const pts = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2
    return (0.7 + Math.random() * 0.4) * Math.cos(a) * r
  })
  return { x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, r, rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.06, pts }
}

function spawnNivel(nivel: number, especiales: boolean): Asteroide[] {
  // Fórmula de dificultad: cantidad crece, velocidad base crece
  const cantidad = Math.min(3 + nivel, 12)
  const lista: Asteroide[] = []
  for (let i = 0; i < cantidad; i++) {
    const lado = Math.floor(Math.random() * 4)
    const x = lado === 0 ? -20 : lado === 1 ? TAM.w + 20 : Math.random() * TAM.w
    const y = lado === 2 ? -20 : lado === 3 ? TAM.h + 20 : Math.random() * TAM.h
    const rango = especiales && Math.random() < 0.25 ? 3 : RANGO_INICIAL
    lista.push(crearAsteroide(x, y, rango))
  }
  return lista
}

export function JuegoAsteroids({ onPuntaje }: { onPuntaje?: (pts: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nivel, setNivel] = useState(1)
  const [puntaje, setPuntaje] = useState(0)
  const [vidas, setVidas] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const estado = useRef({ nivel: 1, puntaje: 0, vidas: 3, gameOver: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const teclas = new Set<string>()
    let nave: Nave = { x: TAM.w / 2, y: TAM.h / 2, ang: -Math.PI / 2, vx: 0, vy: 0 }
    let asteroides: Asteroide[] = spawnNivel(1, false)
    let balas: Bala[] = []
    let disparoRetardo = 0
    let invulnerable = 0
    let raf = 0
    let animado = false

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', ' '].includes(e.key)) e.preventDefault()
      teclas.add(e.key)
    }
    const onKeyUp = (e: KeyboardEvent) => teclas.delete(e.key)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const subirNivel = () => {
      estado.current.nivel += 1
      setNivel(estado.current.nivel)
      asteroides = spawnNivel(estado.current.nivel, true)
      nave = { x: TAM.w / 2, y: TAM.h / 2, ang: -Math.PI / 2, vx: 0, vy: 0 }
      invulnerable = 90
    }

    const wrap = (v: number, max: number) => ((v % max) + max) % max

    const loop = () => {
      if (!ctx) return
      const st = estado.current
      ctx.fillStyle = 'rgb(var(--canvas))'
      ctx.fillRect(0, 0, TAM.w, TAM.h)

      // Controles: rotación e impulso
      if (teclas.has('ArrowLeft')) nave.ang -= 0.07
      if (teclas.has('ArrowRight')) nave.ang += 0.07
      if (teclas.has('ArrowUp')) {
        nave.vx += Math.cos(nave.ang) * 0.18
        nave.vy += Math.sin(nave.ang) * 0.18
        animado = true
      }
      const freno = 0.985
      nave.vx *= freno
      nave.vy *= freno
      nave.x = wrap(nave.x + nave.vx, TAM.w)
      nave.y = wrap(nave.y + nave.vy, TAM.h)

      // Disparo con retardo por nivel
      disparoRetardo = Math.max(0, disparoRetardo - 1)
      if ((teclas.has(' ') || teclas.has('Space')) && disparoRetardo === 0 && balas.length < 4) {
        const retardoMax = Math.max(8, 22 - st.nivel * 2)
        balas.push({ x: nave.x, y: nave.y, vx: Math.cos(nave.ang) * 5, vy: Math.sin(nave.ang) * 5, vida: 55 })
        disparoRetardo = retardoMax
      }
      invulnerable = Math.max(0, invulnerable - 1)

      // Dibujar nave (triángulo)
      ctx.save()
      ctx.translate(nave.x, nave.y)
      ctx.rotate(nave.ang)
      ctx.strokeStyle = 'rgb(var(--ink))'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(12, 0)
      ctx.lineTo(-9, -7)
      ctx.lineTo(-5, 0)
      ctx.lineTo(-9, 7)
      ctx.closePath()
      if (invulnerable > 0 && Math.floor(invulnerable / 4) % 2 === 0) {
        ctx.strokeStyle = 'rgb(var(--accent))'
      }
      ctx.stroke()
      if (animado) {
        ctx.beginPath()
        ctx.moveTo(-5, 0)
        ctx.lineTo(-12, 0)
        ctx.strokeStyle = 'rgb(var(--prio-medium))'
        ctx.stroke()
      }
      ctx.restore()

      // Balas
      balas = balas.filter((b) => b.vida > 0)
      for (const b of balas) {
        b.x = wrap(b.x + b.vx, TAM.w)
        b.y = wrap(b.y + b.vy, TAM.h)
        b.vida--
        ctx.strokeStyle = 'rgb(var(--accent-soft))'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.x - b.vx * 1.5, b.y - b.vy * 1.5)
        ctx.stroke()
      }

      // Asteroides
      for (const a of asteroides) {
        a.x = wrap(a.x + a.vx, TAM.w)
        a.y = wrap(a.y + a.vy, TAM.h)
        a.rot += a.vr
        ctx.save()
        ctx.translate(a.x, a.y)
        ctx.rotate(a.rot)
        ctx.strokeStyle = 'rgb(var(--ink-2))'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(a.pts[0], 0)
        a.pts.forEach((p, i) => ctx.lineTo(p * Math.cos((i / 9) * Math.PI * 2), p * Math.sin((i / 9) * Math.PI * 2)))
        ctx.closePath()
        ctx.stroke()
        ctx.restore()
      }

      // Colisiones bala-asteroide → partir
      const nuevos: Asteroide[] = []
      for (const a of asteroides) {
        const hit = balas.find((b) => Math.hypot(b.x - a.x, b.y - a.y) < a.r + 2)
        if (hit) {
          balas = balas.filter((b) => b !== hit)
          st.puntaje += (6 - a.r / 8) * 10
          setPuntaje(st.puntaje)
          onPuntaje?.(st.puntaje)
          if (a.r > 9) {
            for (let i = 0; i < 2; i++) {
              const ang = Math.random() * Math.PI * 2
              const vel = 2 + Math.random() * 1.5
              nuevos.push({
                ...crearAsteroide(a.x, a.y, a.r / 8 - 0.6),
                vx: Math.cos(ang) * vel,
                vy: Math.sin(ang) * vel,
              })
            }
          }
        } else {
          nuevos.push(a)
        }
      }
      asteroides = nuevos

      // Colisión nave-asteroide
      if (invulnerable === 0 && !st.gameOver) {
        const chocó = asteroides.some((a) => Math.hypot(a.x - nave.x, a.y - nave.y) < a.r + 8)
        if (chocó) {
          st.vidas -= 1
          setVidas(st.vidas)
          if (st.vidas <= 0) {
            st.gameOver = true
            setGameOver(true)
          } else {
            nave = { x: TAM.w / 2, y: TAM.h / 2, ang: -Math.PI / 2, vx: 0, vy: 0 }
            invulnerable = 120
          }
        }
      }

      // Nivel completado
      if (asteroides.length === 0 && !st.gameOver) {
        subirNivel()
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [onPuntaje])

  const reiniciar = () => {
    estado.current = { nivel: 1, puntaje: 0, vidas: 3, gameOver: false }
    setNivel(1)
    setPuntaje(0)
    setVidas(3)
    setGameOver(false)
  }

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex w-full items-center justify-between font-mono text-[10px] uppercase">
        <span className="font-bold text-ink-2">Nivel {nivel}</span>
        <span className="text-ink-3">nave: ← → rotar · ↑ impulso · espacio disparar</span>
        <span className="font-bold text-accent">Pts {puntaje}</span>
      </div>
      <canvas ref={canvasRef} width={TAM.w} height={TAM.h} className="w-full border border-line bg-canvas" />
      <div className="flex w-full items-center justify-between font-mono text-[10px] uppercase">
        <span className="text-ink-3">Vidas: {'▲ '.repeat(Math.max(0, vidas)) || '—'}</span>
        {gameOver && (
          <button onClick={reiniciar} className="theme-btn-press cursor-pointer border border-line bg-accent px-2.5 py-1 font-mono text-[10px] font-black text-on-accent">
            Reiniciar
          </button>
        )}
      </div>
    </div>
  )
}