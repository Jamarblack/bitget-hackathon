import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export const config = { runtime: 'nodejs' }

// TEMPORARY explorer — call any bitget-mcp-server tool from the browser:
//   /api/mcp-call?tool=guide&args={}
//   /api/mcp-call?tool=do_query&args={"entry_id":"...","params":{...}}
// Delete this file (and api/mcp-tools.ts) once the integration is wired.
const MCP_URL = 'https://agent.bitget.com/mcp'
const TIMEOUT_MS = 45000

interface VercelLikeReq {
  query?: Record<string, string | string[] | undefined>
}
interface VercelLikeRes {
  status: (code: number) => VercelLikeRes
  json: (body: unknown) => void
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms)),
  ])
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function handler(req: VercelLikeReq, res: VercelLikeRes): Promise<void> {
  const tool = first(req.query?.tool)
  if (!tool) {
    res.status(400).json({ error: 'pass ?tool=guide or ?tool=do_query, plus &args={...} as JSON' })
    return
  }

  let args: Record<string, unknown> = {}
  try {
    args = JSON.parse(first(req.query?.args) ?? '{}')
  } catch (err) {
    res.status(400).json({ error: 'args is not valid JSON', detail: String(err) })
    return
  }

  const client = new Client({ name: 'plain-money-explorer', version: '0.1.0' })
  try {
    await withTimeout(client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL))), TIMEOUT_MS)
    const result = await withTimeout(client.callTool({ name: tool, arguments: args }), TIMEOUT_MS)
    const blocks = Array.isArray(result.content) ? result.content : []
    const text = blocks
      .map((b) => (b && typeof b === 'object' && 'text' in b ? String((b as { text: unknown }).text) : ''))
      .join('\n')
    res.status(200).json({ isError: result.isError ?? false, length: text.length, text: text.slice(0, 20000) })
  } catch (err) {
    console.error('[api/mcp-call]', err)
    res.status(502).json({ error: 'mcp call failed', detail: String(err) })
  } finally {
    await client.close().catch(() => {})
  }
}