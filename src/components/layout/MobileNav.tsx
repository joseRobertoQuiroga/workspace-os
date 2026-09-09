import { NavLink } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { Icon } from '../Icon'

const NAV = [
  { to: '/', label: 'Inicio', icono: 'home' },
  { to: '/tareas', label: 'Tareas', icono: 'check_circle' },
  { to: '/pomodoro', label: 'Pomodoro', icono: 'timer' },
  { to: '/documentos', label: 'Docs', icono: 'description' },
  { to: '/configuracion', label: 'Ajustes', icono: 'settings' },
]

export function MobileNav() {
  const theme = useApp((s) => s.theme)
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-line bg-surface md:hidden">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px]',
              theme === 'brutalista'
                ? isActive
                  ? 'bg-accent font-black text-on-accent'
                  : 'font-semibold text-ink-2'
                : isActive
                  ? 'bg-surface-2 font-semibold text-ink'
                  : 'text-ink-3',
            ].join(' ')
          }
        >
          <Icon name={item.icono} className="text-[19px]" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}