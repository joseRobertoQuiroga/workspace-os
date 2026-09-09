import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { Icon } from '../Icon'

const NAV_GRUPOS: { titulo: string; items: { to: string; label: string; icono: string; color?: string }[] }[] = [
  {
    titulo: 'Principal',
    items: [
      { to: '/', label: 'Inicio', icono: 'home' },
      { to: '/tareas', label: 'Tareas', icono: 'check_circle' },
      { to: '/proyectos', label: 'Proyectos', icono: 'rocket_launch' },
    ],
  },
  {
    titulo: 'Esferas',
    items: [
      { to: '/universidad', label: 'Universidad', icono: 'school', color: 'text-area-univ' },
      { to: '/freelance', label: 'Freelance', icono: 'business_center', color: 'text-area-freelance' },
      { to: '/emprendimiento', label: 'Emprendimiento', icono: 'lightbulb', color: 'text-area-emprende' },
      { to: '/personal', label: 'Personal', icono: 'favorite', color: 'text-area-personal' },
    ],
  },
  {
    titulo: 'Conocimiento',
    items: [
      { to: '/documentos', label: 'Documentos', icono: 'description' },
      { to: '/calendario', label: 'Calendario', icono: 'calendar_month' },
      { to: '/pomodoro', label: 'Pomodoro', icono: 'timer' },
    ],
  },
]

export function Sidebar() {
  const db = useApp((s) => s.db)
  const theme = useApp((s) => s.theme)
  const { pathname } = useLocation()

  const tareasPendientes = db.tareas.filter((t) => t.estado !== 'hecho').length

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-60 select-none flex-col justify-between md:flex">
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Logo */}
        <div className="theme-border flex h-14 shrink-0 items-center justify-between border-b-0 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center bg-accent font-mono text-base font-black text-on-accent">
              W
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-black uppercase leading-none tracking-tight">
                Workspace OS
              </span>
              <span className="mono-label text-[9px] text-ink-3">v0.1 · {theme}</span>
            </div>
          </div>
          <span className="h-2.5 w-2.5 bg-area-personal" />
        </div>

        {NAV_GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="mt-3">
            <div className="mono-label px-4 pb-1.5 text-[10px] text-ink-3">
              {theme === 'brutalista' ? `// ${grupo.titulo.toUpperCase()}` : grupo.titulo}
            </div>
            <nav className="space-y-1 px-2.5">
              {grupo.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2.5 border-2 px-3 py-2 text-xs transition-all',
                      theme === 'brutalista'
                        ? isActive
                          ? 'border-line bg-accent font-black uppercase tracking-tight text-on-accent shadow-hard'
                          : 'border-transparent font-semibold text-ink hover:border-line hover:bg-surface-2 hover:text-ink'
                        : isActive
                          ? 'border-line bg-surface-2 font-semibold text-ink'
                          : 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
                    ].join(' ')
                  }
                >
                  <Icon name={item.icono} className={`text-[18px] ${item.color ?? 'text-ink-2'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.to === '/tareas' && tareasPendientes > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center bg-prio-high px-1 font-mono text-[10px] font-black text-black">
                      {tareasPendientes}
                    </span>
                  )}
                  {item.to === '/' && pathname === '/' && theme === 'brutalista' && (
                    <span className="ml-auto font-mono text-[9px] font-black">ACTIVE</span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Usuario */}
      <div className="theme-border border-x-0 border-b-0 p-3">
        <div className="theme-card flex items-center gap-2 p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-area-univ font-mono text-sm font-black text-black">
            AL
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-display text-xs font-black uppercase leading-none tracking-tight">
              Dev / Founder
            </span>
            <span className="mono-label mt-1 text-[9px] text-area-personal">● Santa Cruz, BO</span>
          </div>
          <NavLink to="/configuracion" className="ml-auto" title="Configuración">
            <Icon name="settings" className="text-[18px] text-ink-3 hover:text-ink" />
          </NavLink>
        </div>
      </div>
    </aside>
  )
}