import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export const config = { runtime: 'nodejs' }

const MCP_URL = 'https://agent.bitget.com/mcp'
const TIMEOUT_MS = 30000

interface VercelLikeReq {
  method?: string
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

export default async function handler(_req: VercelLikeReq, res: VercelLikeRes): Promise<void> {
  const client = new Client({ name: 'plain-money-discovery', version: '0.1.0' })
  try {
    await withTimeout(client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL))), TIMEOUT_MS)
    const { tools } = await withTimeout(client.listTools(), TIMEOUT_MS)
    res.status(200).json({
      count: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: (t.description ?? '').slice(0, 200),
        input: t.inputSchema,
      })),
    })
  } catch (err) {
    console.error('[api/mcp-tools]', err)
    res.status(502).json({ error: 'could not list tools', detail: String(err) })
  } finally {
    await client.close().catch(() => {})
  }
}