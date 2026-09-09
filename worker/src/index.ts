import { createMcpHandler } from 'agents/mcp/server'
import type { Env } from './types'
import { crearMcpServer } from './mcp'
import { handleApi, corsHeaders } from './api'

/**
 * WorkSpace OS — Worker único:
 *  - /mcp  → servidor MCP (agentes IA: leer/crear/actualizar la base)
 *  - /api/* → API REST (la app frontend sincroniza contra aquí)
 *  - R2    → adjuntos (fase de archivos)
 *
 * Despliegue (capa gratuita):
 *   npx wrangler d1 create workspace-os-db          # copiar database_id a wrangler.toml
 *   npx wrangler d1 execute workspace-os-db --file ./schema.sql
 *   npx wrangler secret put API_TOKEN
 *   npx wrangler deploy
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }

    // API REST
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env)
    }

    // Servidor MCP (Streamable HTTP) — resto de rutas
    const mcp = createMcpHandler(() => crearMcpServer(env))
    return mcp(request, env, ctx)
  },
} satisfies ExportedHandler<Env>