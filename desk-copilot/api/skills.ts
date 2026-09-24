import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export const config = { runtime: 'nodejs' }

const MCP_URL = 'https://datahub.noxiaohao.com/mcp'
const MCP_TIMEOUT_MS = 6000

type SkillId = 'macro-analyst' | 'market-intel' | 'news-briefing' | 'sentiment-analyst'

interface VercelLikeReq {
  method?: string
  body?: unknown
}
interface VercelLikeRes {
  status: (code: number) => VercelLikeRes
  json: (body: unknown) => void
}

const SKILL_CALLS: Record<SkillId, { tool: string; args: Record<string, unknown> }[]> = {
  'macro-analyst': [
    { tool: 'rates_yields', args: { action: 'rates_snapshot' } },
    { tool: 'macro_indicators', args: { action: 'latest_release', indicator: 'cpi' } },
    { tool: 'global_assets', args: { action: 'price', symbol: '^VIX' } },
  ],
  'market-intel': [
    { tool: 'crypto_market', args: { action: 'global' } },
    { tool: 'defi_analytics', args: { action: 'tvl_rank', limit: 5 } },
  ],
  'news-briefing': [
    { tool: 'news_feed', args: { action: 'latest', feeds: 'cnbc,fed,coincenter', limit: 5 } },
  ],
  'sentiment-analyst': [
    { tool: 'sentiment_index', args: { action: 'current' } },
    { tool: 'derivatives_sentiment', args: { action: 'long_short', symbol: 'BTCUSDT', period: '4h' } },
  ],
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('mcp call timed out')), ms)),
  ])
}

async function callMcpSkill(skill: SkillId) {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL))
  const client = new Client({ name: 'plain-money', version: '0.1.0' })

  try {
    await withTimeout(client.connect(transport), MCP_TIMEOUT_MS)
    const calls = SKILL_CALLS[skill]
    const results = await withTimeout(
      Promise.all(calls.map((c) => client.callTool({ name: c.tool, arguments: c.args }))),
      MCP_TIMEOUT_MS
    )
    return results
  } finally {
    await client.close().catch(() => {})
  }
}

export default async function handler(req: VercelLikeReq, res: VercelLikeRes): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const { skill } = (req.body ?? {}) as { skill: SkillId }

  if ((skill as string) === 'technical-analysis') {
    res.status(501).json({
      error: 'technical-analysis not wired — requires local Python indicator computation',
    })
    return
  }

  try {
    const raw = await callMcpSkill(skill)
    res.status(200).json({ skill, raw })
  } catch (err) {
    res.status(502).json({ error: 'mcp call failed or timed out', detail: String(err) })
  }
}