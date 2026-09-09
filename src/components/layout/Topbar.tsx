import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { Icon } from '../Icon'
import { SyncStatus } from '../SyncStatus'
import type { ThemeId } from '../../lib/types'

const RUTAS: Record<string, string> = {
  '/': 'PANEL_PRINCIPAL',
  '/tareas': 'MISIONES / TAREAS',
  '/proyectos': 'PROYECTOS / ROADMAP',
  '/universidad': 'UNIVERSIDAD / SISTEMAS',
  '/freelance': 'FREELANCE / CLIENTES',
  '/emprendimiento': 'EMPRENDIMIENTO / IDEAS',
  '/documentos': 'DOCUMENTOS / WIKI',
  '/calendario': 'CALENDARIO / AGENDA',
  '/configuracion': 'CONFIGURACIÓN',
}

export const TEMAS: { id: ThemeId; nombre: string; desc: string }[] = [
  { id: 'brutalista', nombre: 'Brutalista', desc: 'Neo-brutal · neón' },
  { id: 'minimalista', nombre: 'Minimalista', desc: 'Suizo · monocromo' },
  { id: 'creativo', nombre: 'Creativo', desc: 'Cyber-editorial' },
  { id: 'alternativo', nombre: 'Alternativo', desc: 'Life & Work OS' },
]

export function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useApp((s) => s.theme)
  const setTheme = useApp((s) => s.setTheme)
  const db = useApp((s) => s.db)

  const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  const ruta = RUTAS[pathname] ?? 'PANEL_PRINCIPAL'
  const vencidas = db.tareas.filter((t) => t.estado !== 'hecho' && t.fecha_limite && t.fecha_limite < new Date().toISOString().slice(0, 10)).length

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-line bg-surface px-4 md:left-60 md:px-6">
      {/* Breadcrumb */}
      <div className="mono-label flex min-w-0 items-center gap-2 text-[11px]">
        <span className="bg-accent px-2 py-0.5 font-black text-on-accent">SYS</span>
        <span className="hidden text-ink-3 sm:inline">/</span>
        <span className="hidden truncate text-ink-3 sm:inline">MASTER_OS</span>
        <span className="text-ink-3">/</span>
        <span className="truncate bg-surface-2 px-2 py-0.5 font-extrabold text-ink">{ruta}</span>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-2">
        {vencidas > 0 && (
          <span className="hidden items-center gap-1.5 border border-line bg-surface-2 px-2 py-1 font-mono text-[10px] font-bold text-prio-high sm:flex">
            <Icon name="warning" className="text-[13px]" />
            {vencidas} VENCIDA{vencidas > 1 ? 'S' : ''}
          </span>
        )}
        <span className="hidden font-mono text-[10px] text-ink-3 lg:inline">{hoy}</span>

        <SyncStatus />

        <div className="relative">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId)}
            className="cursor-pointer appearance-none border border-line bg-surface-2 px-2 py-1.5 pl-7 pr-6 font-mono text-[11px] font-bold text-ink outline-none hover:border-line-strong"
            title="Cambiar estilo"
          >
            {TEMAS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <Icon name="palette" className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-3" />
        </div>

        <button
          onClick={() => navigate('/tareas')}
          className="theme-btn-press flex items-center gap-1.5 border border-line bg-accent px-3 py-1.5 font-mono text-[11px] font-black uppercase text-on-accent"
        >
          <Icon name="add_box" className="text-[16px]" />
          <span className="hidden lg:inline">Nueva tarea</span>
        </button>
      </div>
    </header>
  )
}