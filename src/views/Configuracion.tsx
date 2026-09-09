import { useState } from 'react'
import { useApp } from '../lib/store'
import { Icon } from '../components/Icon'
import { Panel, Button, Check, TextInput, Field } from '../components/ui'
import { TEMAS } from '../components/layout/Topbar'
import { getBackendConfig, saveBackendConfig, healthCheck } from '../lib/api'
import { getSoundConfig, saveSoundConfig, playSound, type SoundKind } from '../lib/audio'
import type { ThemeId } from '../lib/types'

const REVISION_SEMANAL = [
  { id: 'logros', label: 'Logros de la semana', icono: 'emoji_events' },
  { id: 'pendientes', label: 'Pendientes arrastrados', icono: 'history' },
  { id: 'bloqueos', label: 'Bloqueos y cuellos de botella', icono: 'block' },
  { id: 'prioridades', label: 'Prioridades de la próxima semana', icono: 'flag' },
  { id: 'carga', label: 'Revisar carga por área (balance)', icono: 'balance' },
]

export function Configuracion() {
  const theme = useApp((s) => s.theme)
  const setTheme = useApp((s) => s.setTheme)
  const resetData = useApp((s) => s.resetData)
  const db = useApp((s) => s.db)
  const pomodoro = useApp((s) => s.pomodoro)
  const setPomodoro = useApp((s) => s.setPomodoro)
  const setSyncState = useApp((s) => s.setSyncState)
  const syncDesdeNubeStore = useApp((s) => s.syncDesdeNube)
  const syncANubeStore = useApp((s) => s.syncANube)
  const lastSyncAt = useApp((s) => s.lastSyncAt)
  const lastError = useApp((s) => s.lastError)
  const [revision, setRevision] = useState<Record<string, boolean>>({})
  const [sounds, setSounds] = useState(() => getSoundConfig())

  const guardarSonido = (kind: SoundKind, dataUrl: string) => {
    const nuevo = { ...sounds, [kind]: dataUrl }
    setSounds(nuevo)
    saveSoundConfig(nuevo)
  }
  const quitarSonido = (kind: SoundKind) => {
    const nuevo = { ...sounds, [kind]: undefined }
    setSounds(nuevo)
    saveSoundConfig(nuevo)
  }
  const leerAudio = (kind: SoundKind, archivo: File) => {
    const reader = new FileReader()
    reader.onload = () => guardarSonido(kind, String(reader.result))
    reader.readAsDataURL(archivo)
  }

  const TIPOS_SONIDO: { kind: SoundKind; nombre: string; desc: string }[] = [
    { kind: 'checkOn', nombre: 'Checkbox · marcar', desc: 'Al seleccionar un checkbox' },
    { kind: 'checkOff', nombre: 'Checkbox · desmarcar', desc: 'Al destildar un checkbox' },
    { kind: 'open', nombre: 'Abrir página / contexto', desc: 'Al abrir un modal, ficha o popover' },
    { kind: 'close', nombre: 'Cerrar página / contexto', desc: 'Al cerrar un modal, ficha o popover' },
  ]

  // Backend Cloudflare
  const [backend, setBackend] = useState(() => getBackendConfig() ?? { url: 'https://workspace-os.<tu-subdominio>.workers.dev', token: '' })
  const [estadoBackend, setEstadoBackend] = useState<'inactivo' | 'conectando' | 'ok' | 'error' | 'sincronizado' | 'subido'>('inactivo')
  const [mensajeBackend, setMensajeBackend] = useState('')

  const probarConexion = async () => {
    saveBackendConfig(backend)
    setEstadoBackend('conectando')
    const r = await healthCheck(backend)
    setEstadoBackend(r.ok ? 'ok' : 'error')
    setMensajeBackend(r.mensaje)
    setSyncState({
      syncStatus: r.ok ? 'ok' : 'error',
      lastError: r.ok ? null : r.mensaje,
      ...(r.ok ? { lastSyncAt: new Date().toISOString() } : {}),
    })
  }

  const sincronizarDesdeNube = async () => {
    saveBackendConfig(backend)
    setEstadoBackend('conectando')
    const ok = await syncDesdeNubeStore()
    if (ok) {
      setEstadoBackend('sincronizado')
      const ahora = useApp.getState().db
      setMensajeBackend(`Descargado: ${ahora.tareas.length} tareas, ${ahora.proyectos.length} proyectos, ${ahora.notas.length} notas.`)
    } else {
      setEstadoBackend('error')
      setMensajeBackend(useApp.getState().lastError ?? 'Error al sincronizar')
    }
  }

  const subirANube = async () => {
    saveBackendConfig(backend)
    setEstadoBackend('conectando')
    const ok = await syncANubeStore()
    if (ok) {
      setEstadoBackend('subido')
      const ahora = useApp.getState().db
      setMensajeBackend(`Subido: ${ahora.tareas.length} tareas, ${ahora.proyectos.length} proyectos, ${ahora.notas.length} notas.`)
    } else {
      setEstadoBackend('error')
      setMensajeBackend(useApp.getState().lastError ?? 'Error al subir')
    }
  }

  const colorBackend =
    estadoBackend === 'ok' || estadoBackend === 'sincronizado' || estadoBackend === 'subido'
      ? 'rgb(var(--state-done))'
      : estadoBackend === 'error'
        ? 'rgb(var(--prio-high))'
        : estadoBackend === 'conectando'
          ? 'rgb(var(--state-doing))'
          : 'rgb(var(--ink-3))'

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-ink-2">
              MODULE // SETTINGS_OS
            </span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
            Configuración <span className="text-ink-3">/</span> Ajustes
          </h1>
        </div>
      </div>

      {/* Estilos */}
      <Panel title="Estilo de la app" icono="palette" extra={<span className="mono-label text-[10px] text-ink-3">4 temas disponibles</span>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TEMAS.map((t) => {
            const activo = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as ThemeId)}
                className={`theme-card group flex flex-col gap-2 p-4 text-left transition-all ${
                  activo ? 'border-line-strong shadow-lift' : 'hover:-translate-y-0.5'
                }`}
              >
                {/* Mini preview */}
                <div className="relative h-20 overflow-hidden border border-line bg-canvas">
                  <div className="absolute inset-0 flex items-end gap-1 p-2">
                    <div className="h-1/2 w-1/4" style={{ backgroundColor: 'rgb(var(--area-univ))' }} />
                    <div className="h-3/4 w-1/4" style={{ backgroundColor: 'rgb(var(--area-freelance))' }} />
                    <div className="h-2/3 w-1/4" style={{ backgroundColor: 'rgb(var(--area-emprende))' }} />
                    <div className="h-1/3 w-1/4" style={{ backgroundColor: 'rgb(var(--area-personal))' }} />
                  </div>
                  <div className="absolute left-2 top-2 flex gap-1">
                    <span className="h-2 w-2" style={{ backgroundColor: 'rgb(var(--accent))' }} />
                    <span className="h-2 w-4" style={{ backgroundColor: 'rgb(var(--surface-3))' }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-sm font-black uppercase tracking-tight">{t.nombre}</div>
                    <div className="font-mono text-[10px] text-ink-3">{t.desc}</div>
                  </div>
                  {activo && <Icon name="check_circle" className="text-[18px] text-area-personal" />}
                </div>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* Plantillas */}
      <Panel title="Plantillas del sistema" icono="widgets" extra={<span className="mono-label text-[10px] text-ink-3">{db.plantillas.length} plantillas</span>}>
        <div className="space-y-2">
          {db.plantillas.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface-2 p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon name={p.icono} className="text-[20px]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold">{p.nombre}</span>
                    {p.es_sistema && (
                      <span className="border border-line bg-canvas px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-ink-3">
                        Sistema
                      </span>
                    )}
                  </div>
                  <div className="truncate font-mono text-[10px] text-ink-3">
                    {p.campos.length ? p.campos.map((c) => c.campo).join(' · ') : 'Sin campos extra'} {p.area_id ? `· área: ${db.areas.find((a) => a.id === p.area_id)?.nombre}` : '· todas las áreas'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Áreas */}
      <Panel title="Áreas de vida" icono="category" extra={<span className="mono-label text-[10px] text-ink-3">fijas</span>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {db.areas.map((a) => (
            <div key={a.id} className="theme-card flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, rgb(var(--${a.color})) 18%, transparent)`, color: `rgb(var(--${a.color}))` }}>
                <Icon name={a.icono} className="text-[20px]" />
              </div>
              <div>
                <div className="font-display text-sm font-black uppercase tracking-tight">{a.nombre}</div>
                <div className="font-mono text-[10px] text-ink-3">
                  {db.tareas.filter((t) => t.area_id === a.id).length} tareas · {db.proyectos.filter((p) => p.area_id === a.id).length} proyectos
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Revisión semanal guiada */}
      <Panel
        title="Revisión semanal (ritual Todoist/GTD)"
        icono="fact_check"
        extra={
          <span className="mono-label text-[10px] text-ink-3">
            {Object.values(revision).filter(Boolean).length}/{REVISION_SEMANAL.length} completado
          </span>
        }
      >
        <div className="space-y-2">
          {REVISION_SEMANAL.map((r) => (
            <div key={r.id} className="flex cursor-pointer items-center gap-3 border border-line bg-surface-2 p-3 transition-colors hover:bg-surface-3" onClick={() => setRevision((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}>
              <Check checked={!!revision[r.id]} onChange={() => setRevision((prev) => ({ ...prev, [r.id]: !prev[r.id] }))} />
              <Icon name={r.icono} className="text-[18px] text-ink-2" />
              <span className={`text-[12px] font-semibold ${revision[r.id] ? 'line-through text-ink-3' : ''}`}>{r.label}</span>
            </div>
          ))}
          <p className="pt-1 font-mono text-[9px] text-ink-3">
            Ritual semanal de 15-20 min: revisa vencidas, bloqueos y define el foco de la próxima semana (ver Inicio → Foco).
          </p>
        </div>
      </Panel>

      {/* Pomodoro */}
      <Panel title="Pomodoro" icono="timer" extra={<span className="mono-label text-[10px] text-ink-3">foco = 1/3 descanso</span>}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface-2 p-3">
            <div className="font-mono text-[11px] text-ink-2">
              <span className="font-bold text-ink">Duración de enfoque:</span> {pomodoro.focusMin} min
              <span className="block text-[10px] text-ink-3">Descanso automático: {pomodoro.breakMin ?? Math.round(pomodoro.focusMin / 3)} min (1/3 del foco)</span>
            </div>
            <div className="flex gap-1.5">
              <Button variant={pomodoro.focusMin === 15 ? 'soft' : 'ghost'} size="sm" onClick={() => setPomodoro({ focusMin: 15 })}>15 min</Button>
              <Button variant={pomodoro.focusMin === 20 ? 'soft' : 'ghost'} size="sm" onClick={() => setPomodoro({ focusMin: 20 })}>20 min</Button>
              <Button variant={pomodoro.focusMin === 25 ? 'soft' : 'ghost'} size="sm" onClick={() => setPomodoro({ focusMin: 25 })}>25 min</Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface-2 p-3">
            <div className="font-mono text-[11px] text-ink-2">
              <span className="font-bold text-ink">Auto-iniciar descanso</span>
              <span className="block text-[10px] text-ink-3">Al terminar el foco, pasa al descanso con minijuegos automáticamente.</span>
            </div>
            <button
              onClick={() => setPomodoro({ autoStartBreak: !pomodoro.autoStartBreak })}
              className={`theme-btn-press cursor-pointer border border-line px-3 py-1.5 font-mono text-[10px] font-black uppercase ${pomodoro.autoStartBreak ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-3'}`}
            >
              {pomodoro.autoStartBreak ? 'Activado' : 'Desactivado'}
            </button>
          </div>
        </div>
      </Panel>

      {/* ===== Sonidos ===== */}
      <Panel
        title="Sonidos de la interfaz"
        icono="music_note"
        extra={<span className="mono-label text-[10px] text-ink-3">carga dinámica · se guarda en tu dispositivo</span>}
      >
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {TIPOS_SONIDO.map((s) => {
            const tiene = !!sounds[s.kind]
            return (
              <div key={s.kind} className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface-2 p-3">
                <div className="min-w-0">
                  <div className="font-display text-[12px] font-black uppercase tracking-tight">{s.nombre}</div>
                  <div className="font-mono text-[10px] text-ink-3">{s.desc}</div>
                  <div className="mt-1 truncate font-mono text-[9px]" style={{ color: tiene ? 'rgb(var(--state-done))' : 'rgb(var(--ink-3))' }}>
                    {tiene ? `Cargado (${sounds[s.kind]!.slice(0, 30)}…)` : 'Por defecto (tono simple)'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    id={`sound-${s.kind}`}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) leerAudio(s.kind, f); e.target.value = '' }}
                  />
                  <Button variant="soft" size="sm" icono="play_arrow" onClick={() => playSound(s.kind)} title="Probar">Probar</Button>
                  <Button variant="ghost" size="sm" icono="upload_file" onClick={() => document.getElementById(`sound-${s.kind}`)?.click()}>
                    Cargar
                  </Button>
                  {tiene && (
                    <Button variant="ghost" size="sm" icono="delete" onClick={() => quitarSonido(s.kind)} title="Restaurar por defecto">✕</Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-2 font-mono text-[10px] text-ink-3">
          Los sonidos se cargan desde archivo (mp3/ogg/wav) o URL y se convierten a base64; se guardan localmente y se
          aplican en todas las vistas (checkboxes y navegación entre páginas/fichas). El Pomodoro usa su propio ambiente
          (lluvia/tren en el foco, relámpago + música relajante en el descanso).
        </p>
      </Panel>

      {/* Backend Cloudflare (Workers + D1 + MCP) */}
      <Panel
        title="Backend Cloudflare — sincronización y MCP"
        icono="cloud_sync"
        extra={
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase" style={{ color: colorBackend }}>
            <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorBackend }} />
            {estadoBackend}
          </span>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Field label="URL del Worker (Cloudflare Workers)">
                <TextInput
                  value={backend.url}
                  onChange={(e) => setBackend((b) => ({ ...b, url: e.target.value }))}
                  placeholder="https://workspace-os.<tu-subdominio>.workers.dev"
                />
              </Field>
            </div>
            <Field label="Token de API (MCP)">
              <TextInput
                value={backend.token}
                onChange={(e) => setBackend((b) => ({ ...b, token: e.target.value }))}
                placeholder="mismo token de la API y del agente"
              />
            </Field>
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-ink-3">
            El Worker expone la API REST (<span className="text-ink-2">/api/db</span>) y el servidor MCP (
            <span className="text-ink-2">/mcp</span>) sobre la misma base D1. Sincronizar descarga la nube al navegador;
            Subir envía tu estado local a la nube. Un agente conectado al MCP puede leer/crear/actualizar los mismos datos.
          </p>
          <div className="flex flex-wrap items-center gap-2 border border-line bg-surface-2 p-2.5 font-mono text-[11px]">
            <span className="flex items-center gap-1.5" style={{ color: backend.url && !backend.url.includes('<tu-subdominio>') ? 'rgb(var(--state-done))' : 'rgb(var(--ink-3))' }}>
              <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ backgroundColor: backend.url && !backend.url.includes('<tu-subdominio>') ? 'rgb(var(--state-done))' : 'rgb(var(--ink-3))' }} />
              Auto-sync a la nube: {backend.url && !backend.url.includes('<tu-subdominio>') ? 'ACTIVO — los cambios se suben solos (debounce 4s)' : 'INACTIVO — configura la URL y el token'}
            </span>
            {lastSyncAt && (
              <span className="text-ink-3">
                Última validación: {new Date(lastSyncAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {lastError && <span className="text-prio-high">· {lastError}</span>}
          </div>
          {mensajeBackend && (
            <div className="border border-line bg-surface-2 p-2.5 font-mono text-[11px]" style={{ color: colorBackend }}>
              {mensajeBackend}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" icono="wifi_tethering" onClick={probarConexion} disabled={estadoBackend === 'conectando'}>
              Verificar conexión
            </Button>
            <Button variant="primary" icono="download" onClick={sincronizarDesdeNube} disabled={estadoBackend === 'conectando'}>
              Sincronizar desde la nube
            </Button>
            <Button variant="soft" icono="upload" onClick={subirANube} disabled={estadoBackend === 'conectando'}>
              Subir a la nube
            </Button>
            <Button
              variant="ghost"
              icono="refresh"
              onClick={async () => {
                saveBackendConfig({ url: 'https://workspace-os.<tu-subdominio>.workers.dev', token: '' })
                setBackend({ url: 'https://workspace-os.<tu-subdominio>.workers.dev', token: '' })
                setEstadoBackend('inactivo')
                setMensajeBackend('')
              }}
            >
              Restablecer
            </Button>
          </div>
        </div>
      </Panel>

      {/* Datos */}
      <Panel title="Datos locales" icono="storage" extra={<span className="mono-label text-[10px] text-ink-3">local-first</span>}>
        <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-surface-2 p-3">
          <div className="font-mono text-[11px] text-ink-2">
            <span className="font-bold text-ink">Datos de demostración:</span> restaurar el seed inicial borra cambios locales.
            <span className="block text-[10px] text-ink-3">Los datos persisten en localStorage y se sincronizan con Cloudflare D1 desde el panel de arriba.</span>
          </div>
          <Button variant="soft" icono="restart_alt" onClick={() => { if (confirm('¿Restaurar datos de demo? Se perderán los cambios locales.')) resetData() }}>
            Restaurar demo
          </Button>
        </div>
      </Panel>
    </div>
  )
}