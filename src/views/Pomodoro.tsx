import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Button } from '../components/ui'
import { JuegoAsteroids } from '../components/games/Asteroids'
import { JuegoLaberinto } from '../components/games/Maze'
import { iniciarLluvia, iniciarTren, detenerLoopAmbiente, sonidoRelampago, iniciarMusicaRelajante } from '../lib/audio'

type Fase = 'focus' | 'descanso'
type JuegoId = 'asteroids' | 'laberinto'

export function Pomodoro() {
  const pomodoro = useApp((s) => s.pomodoro)
  const setPomodoro = useApp((s) => s.setPomodoro)
  const registrarSesion = useApp((s) => s.registrarSesionPomodoro)
  const db = useApp((s) => s.db)

  const focusMin = pomodoro.focusMin
  const breakMin = pomodoro.breakMin ?? Math.round(focusMin / 3)

  const [fase, setFase] = useState<Fase>('focus')
  const [restantes, setRestantes] = useState(focusMin * 60)
  const [corriendo, setCorriendo] = useState(false)
  const [ciclos, setCiclos] = useState(0)
  const [juego, setJuego] = useState<JuegoId | null>(null)
  const [puntajeTotal, setPuntajeTotal] = useState(0)
  const [sesionesHoy, setSesionesHoy] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const duracionActual = fase === 'focus' ? focusMin * 60 : breakMin * 60
  const pct = Math.round(((duracionActual - restantes) / duracionActual) * 100)

  const hoy = new Date().toISOString().slice(0, 10)
  const logHoy = db.pomodoroLog?.find((l) => l.fecha === hoy)

  useEffect(() => {
    setRestantes(fase === 'focus' ? focusMin * 60 : breakMin * 60)
  }, [fase, focusMin, breakMin])

  // Sonido ambiental según la fase y si está corriendo.
  useEffect(() => {
    if (!corriendo) {
      detenerLoopAmbiente()
      return
    }
    if (fase === 'focus') {
      // Alternar lluvia/tren sutilmente según el minuto para variar
      if (Math.floor(Date.now() / 1000) % 2 === 0) iniciarLluvia()
      else iniciarTren()
    } else {
      iniciarMusicaRelajante()
    }
    return () => detenerLoopAmbiente()
  }, [fase, corriendo])

  useEffect(() => {
    if (!corriendo) return
    timer.current = setInterval(() => {
      setRestantes((r) => {
        if (r <= 1) {
          if (fase === 'focus') {
            setCiclos((c) => c + 1)
            registrarSesion(focusMin)
            setSesionesHoy((s) => s + 1)
            sonidoRelampago()
            if (pomodoro.autoStartBreak) {
              setFase('descanso')
              setJuego(null)
              return Math.round(focusMin / 3) * 60
            }
            setCorriendo(false)
            return 0
          }
          setFase('focus')
          setJuego(null)
          return focusMin * 60
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [corriendo, fase, focusMin, pomodoro.autoStartBreak, registrarSesion])

  const mm = Math.floor(restantes / 60).toString().padStart(2, '0')
  const ss = (restantes % 60).toString().padStart(2, '0')

  const elegirJuego = (j: JuegoId) => {
    setJuego(j)
    setPuntajeTotal(0)
  }

  const juegos = useMemo(
    () => [
      { id: 'asteroids' as JuegoId, nombre: 'Asteroids', icono: 'rocket_launch', desc: 'Navega, dispara y parte asteroides' },
      { id: 'laberinto' as JuegoId, nombre: 'Laberinto', icono: 'route', desc: 'Generado con backtracking, crece por nivel' },
    ],
    []
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // FOCUS_POMODORO
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-soft" /> descanso = 1/3 del foco
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Pomodoro <span className="text-accent-soft">/</span> Deep Focus
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="border border-line bg-surface-2 px-2.5 py-1.5">
            Hoy: <span className="font-bold text-accent">{sesionesHoy || logHoy?.sesiones || 0}</span> sesiones · {logHoy?.minutos ?? 0} min
          </span>
          <Button variant="soft" size="sm" icono="timelapse" onClick={() => setPomodoro({ focusMin: focusMin === 20 ? 15 : 20 })}>
            {focusMin} min foco
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Timer */}
        <Panel className="lg:col-span-1" title={fase === 'focus' ? 'Sesión de enfoque' : 'Descanso'} icono={fase === 'focus' ? 'bolt' : 'self_improvement'} extra={
          <span className="mono-label text-[10px] text-ink-3">{fase === 'focus' ? `${breakMin} min de descanso` : `vuelve a ${focusMin} min`}</span>
        }>
          <div className="flex flex-col items-center gap-4 py-2">
            {/* Anillo de progreso */}
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgb(var(--surface-3))" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke={fase === 'focus' ? 'rgb(var(--accent))' : 'rgb(var(--state-done))'}
                  strokeWidth="6"
                  strokeLinecap="square"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - pct / 100)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono text-4xl font-black ${fase === 'focus' ? '' : 'text-state-done'}`}>{mm}:{ss}</span>
                <span className="mono-label mt-1 text-[10px] text-ink-3">{fase === 'focus' ? 'enfocado' : 'recarga'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={corriendo ? 'ghost' : 'primary'}
                icono={corriendo ? 'pause' : 'play_arrow'}
                onClick={() => setCorriendo((c) => !c)}
              >
                {corriendo ? 'Pausar' : 'Iniciar'}
              </Button>
              <Button
                variant="ghost"
                icono="restart_alt"
                onClick={() => { setCorriendo(false); setRestantes(fase === 'focus' ? focusMin * 60 : breakMin * 60) }}
              >
                Reset
              </Button>
              {fase === 'descanso' && (
                <Button variant="soft" icono="skip_next" onClick={() => { setFase('focus'); setJuego(null); setCorriendo(true) }}>
                  Saltar
                </Button>
              )}
            </div>

            <div className="flex w-full justify-between border-t border-line pt-2 font-mono text-[10px] text-ink-3">
              <span>Ciclos hoy: <span className="font-bold text-ink-2">{ciclos}</span></span>
              <span>Foco: {focusMin} min</span>
            </div>
          </div>
        </Panel>

        {/* Zona de juego durante el descanso */}
        <Panel
          className="lg:col-span-2"
          title={fase === 'descanso' ? 'Descanso activo — elige un mini-juego' : 'Mini-juegos de descanso (disponibles en el break)'}
          icono={juego === 'asteroids' ? 'rocket_launch' : 'sports_esports'}
          extra={<span className="mono-label text-[10px] text-ink-3">física clásica · generación procedural</span>}
        >
          {fase === 'focus' ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Icon name="sports_esports" className="text-[40px] text-ink-3" />
              <p className="max-w-sm font-mono text-[11px] leading-relaxed text-ink-2">
                Cuando termine la sesión de enfoque, el descanso se abre con dos minijuegos:
                <span className="font-bold text-ink"> Asteroids</span> (nave triangular que parte asteroides) y{' '}
                <span className="font-bold text-ink"> Laberinto</span> (generado con backtracking DFS).
              </p>
            </div>
          ) : !juego ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {juegos.map((j) => (
                <button
                  key={j.id}
                  onClick={() => elegirJuego(j.id)}
                  className="theme-card group flex cursor-pointer flex-col items-center gap-2 p-5 text-center transition-all hover:-translate-y-0.5"
                >
                  <Icon name={j.icono} className="text-[34px] text-accent transition-transform group-hover:scale-110" />
                  <span className="font-display text-sm font-black uppercase tracking-tight">{j.nombre}</span>
                  <span className="font-mono text-[10px] text-ink-3">{j.desc}</span>
                  <span className="theme-btn-press mt-1 border border-line bg-accent px-2.5 py-1 font-mono text-[10px] font-black uppercase text-on-accent">
                    Jugar
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="mono-label text-[10px] font-bold text-ink-2">
                  {juego === 'asteroids' ? 'ASTEROIDS · modo arcade' : 'LABERINTO · recursive backtracker'}
                </span>
                <div className="flex items-center gap-2">
                  {puntajeTotal > 0 && <span className="font-mono text-[10px] font-bold text-accent">+{puntajeTotal} pts</span>}
                  <Button variant="ghost" size="sm" icono="swap_horiz" onClick={() => setJuego(juego === 'asteroids' ? 'laberinto' : 'asteroids')}>
                    Cambiar juego
                  </Button>
                </div>
              </div>
              {juego === 'asteroids' ? (
                <JuegoAsteroids onPuntaje={setPuntajeTotal} />
              ) : (
                <JuegoLaberinto onPuntaje={setPuntajeTotal} />
              )}
              <p className="text-center font-mono text-[9px] text-ink-3">
                El temporizador sigue corriendo abajo — cierra el juego o cambia de minijuego cuando quieras volver a la rutina.
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* Historial reciente */}
      <Panel title="Historial de sesiones" icono="bar_chart" extra={<span className="mono-label text-[10px] text-ink-3">últimos días</span>}>
        <div className="flex items-end gap-2">
          {[...(db.pomodoroLog ?? [])].slice(-7).map((l) => (
            <div key={l.fecha} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="flex w-full items-end justify-center border border-line bg-surface-2 pt-1 font-mono text-[9px] font-bold text-ink-2"
                style={{ height: `${Math.min(90, Math.max(14, l.minutos / 2))}px` }}
              >
                {l.minutos}m
              </div>
              <span className="font-mono text-[9px] text-ink-3">
                {new Date(l.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}