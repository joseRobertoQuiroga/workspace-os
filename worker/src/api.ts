import type { Env } from './types'
import { leerSnapshot, escribirSnapshot, listarFilas, insertarFila, actualizarFila, eliminarFila } from './db'

const TABLAS: Record<string, string> = {
  clientes: 'clientes',
  ideas: 'ideas',
  materias: 'materias',
  eventos: 'eventos',
}

export function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.CORS_ALLOW_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data: unknown, status = 200, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env ?? ({} as Env)) },
  })
}

function authOk(request: Request, env: Env): boolean {
  const token = env.API_TOKEN
  if (!token) return true // sin token configurado → abierto (solo para desarrollo)
  return request.headers.get('X-API-Token') === token
}

/** API REST: /api/* (la app frontend y scripts externos sincronizan contra aquí) */
export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '')

  if (!authOk(request, env)) {
    return json({ error: 'Token inválido. Envía el header X-API-Token.' }, 401, env)
  }

  // Health
  if (path === 'health' || path === '') {
    const [{ total }] = (await env.DB.prepare('SELECT COUNT(*) as total FROM tareas').all()).results
    return json({ ok: true, app: 'workspace-os', version: env.APP_VERSION ?? '0.1.0', tareas: total })
  }

  // Snapshot completo (GET/PUT) — sincronización full entre app y nube
  if (path === 'db') {
    if (request.method === 'GET') {
      return json({ ok: true, db: await leerSnapshot(env) })
    }
    if (request.method === 'PUT') {
      const body = (await request.json()) as { db?: unknown }
      if (!body.db) return json({ error: 'Cuerpo inválido: espera { db: {...} }' }, 400, env)
      await escribirSnapshot(env, body.db as Parameters<typeof escribirSnapshot>[1])
      return json({ ok: true, mensaje: 'Base de datos sincronizada' })
    }
  }

  // Tareas individuales
  if (path === 'tareas' || path.startsWith('tareas/')) {
    const id = path.split('/')[1]
    if (request.method === 'GET' && !id) {
      const r = await env.DB.prepare('SELECT * FROM tareas ORDER BY creado_en DESC').all()
      return json({ ok: true, tareas: r.results })
    }
    if (request.method === 'POST' && !id) {
      const t = (await request.json()) as Record<string, unknown>
      await insertarFila(env, 'tareas', {
        ...t,
        destacado: t.destacado ? 1 : 0,
        arrastrada: t.arrastrada ? 1 : 0,
        mi_dia: t.mi_dia ? 1 : 0,
        etiquetas_json: JSON.stringify(t.etiquetas ?? []),
        subtareas_json: JSON.stringify(t.subtareas ?? []),
      })
      return json({ ok: true, id: t.id })
    }
    if (request.method === 'PATCH' && id) {
      const cambios = (await request.json()) as Record<string, unknown>
      await actualizarFila(env, 'tareas', id, cambios)
      return json({ ok: true, id })
    }
    if (request.method === 'DELETE' && id) {
      await eliminarFila(env, 'tareas', id)
      return json({ ok: true, id })
    }
  }

  // Tablas simples genéricas (clientes, ideas, materias, eventos)
  for (const [key, tabla] of Object.entries(TABLAS)) {
    if (path === key || path.startsWith(`${key}/`)) {
      const id = path.split('/')[1]
      if (request.method === 'GET' && !id) return json({ ok: true, [key]: await listarFilas(env, tabla) })
      if (request.method === 'POST' && !id) {
        const f = (await request.json()) as Record<string, unknown>
        await insertarFila(env, tabla, f)
        return json({ ok: true, id: f.id })
      }
      if (request.method === 'PATCH' && id) {
        const cambios = (await request.json()) as Record<string, unknown>
        await actualizarFila(env, tabla, id, cambios)
        return json({ ok: true, id })
      }
      if (request.method === 'DELETE' && id) {
        await eliminarFila(env, tabla, id)
        return json({ ok: true, id })
      }
    }
  }

  return json({ error: 'Ruta no encontrada' }, 404, env)
}