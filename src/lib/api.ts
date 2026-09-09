import type { DB } from './types'

export interface BackendConfig {
  url: string
  token: string
}

const KEY = 'workspace-os-backend-v1'

export function getBackendConfig(): BackendConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as BackendConfig) : null
  } catch {
    return null
  }
}

export function saveBackendConfig(cfg: BackendConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function clearBackendConfig(): void {
  localStorage.removeItem(KEY)
}

function headers(cfg: BackendConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(cfg.token ? { 'X-API-Token': cfg.token } : {}),
  }
}

export async function healthCheck(cfg: BackendConfig): Promise<{ ok: boolean; mensaje: string; data?: Record<string, unknown> }> {
  try {
    const res = await fetch(`${cfg.url.replace(/\/+$/, '')}/api/health`, { headers: headers(cfg) })
    if (!res.ok) return { ok: false, mensaje: `HTTP ${res.status}: ${await res.text()}` }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, mensaje: `Conectado · ${String(data.app)} v${String(data.version)} · ${String(data.tareas)} tareas en la nube`, data }
  } catch (e) {
    return { ok: false, mensaje: `Sin conexión: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/** Descarga el snapshot completo de D1 y reemplaza el estado local */
export async function descargarDb(cfg: BackendConfig): Promise<DB> {
  const res = await fetch(`${cfg.url.replace(/\/+$/, '')}/api/db`, { headers: headers(cfg) })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  const body = (await res.json()) as { db: DB }
  return body.db
}

/** Sube el estado local completo a D1 */
export async function subirDb(cfg: BackendConfig, db: DB): Promise<void> {
  const res = await fetch(`${cfg.url.replace(/\/+$/, '')}/api/db`, {
    method: 'PUT',
    headers: headers(cfg),
    body: JSON.stringify({ db }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
}