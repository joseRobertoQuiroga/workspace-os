import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { Icon } from './Icon'

const META: Record<string, { label: string; color: string; icono: string; detalle: string }> = {
  idle: { label: 'LOCAL', color: 'rgb(var(--ink-3))', icono: 'cloud_off', detalle: 'Sin sincronizar — datos locales' },
  descargando: { label: 'DESCARGANDO', color: 'rgb(var(--state-doing))', icono: 'sync', detalle: 'Trayendo datos desde la nube…' },
  subiendo: { label: 'SUBIENDO', color: 'rgb(var(--state-doing))', icono: 'upload', detalle: 'Subiendo cambios a la nube…' },
  ok: { label: 'SINCRONIZADO', color: 'rgb(var(--state-done))', icono: 'cloud_done', detalle: 'Datos validados en la nube' },
  error: { label: 'SIN CONEXIÓN', color: 'rgb(var(--prio-high))', icono: 'cloud_off', detalle: 'No se pudo validar con la nube' },
}

/**
 * Artefacto visual del estado de sincronización: muestra la última validación /
 * actualización de datos y el estado actual. Clic → Configuración (Backend).
 */
export function SyncStatus() {
  const navigate = useNavigate()
  const syncStatus = useApp((s) => s.syncStatus)
  const lastSyncAt = useApp((s) => s.lastSyncAt)
  const lastError = useApp((s) => s.lastError)
  const meta = META[syncStatus] ?? META.idle

  const hora = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null
  const fecha = lastSyncAt
    ? new Date(lastSyncAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    : null

  return (
    <button
      onClick={() => navigate('/configuracion')}
      title={`${meta.detalle}${lastError ? ` — ${lastError}` : ''}`}
      className="theme-btn-press hidden shrink-0 cursor-pointer items-center gap-1.5 border border-line bg-surface-2 px-2 py-1 font-mono text-[10px] font-bold uppercase md:flex"
    >
      <span className="relative flex items-center">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
        {syncStatus === 'descargando' || syncStatus === 'subiendo' ? (
          <Icon name="sync" className="absolute -right-3 top-1/2 -translate-y-1/2 animate-spin text-[11px]" />
        ) : null}
      </span>
      <span style={{ color: meta.color }}>{meta.label}</span>
      {hora && (
        <span className="flex items-center gap-1 text-ink-3">
          <Icon name="schedule" className="text-[12px]" />
          {fecha} {hora}
        </span>
      )}
    </button>
  )
}