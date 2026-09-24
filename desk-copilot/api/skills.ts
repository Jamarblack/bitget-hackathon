import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export const config = { runtime: 'nodejs' }

const MCP_URL = 'https://datahub.noxiaohao.com/mcp'
const MCP_TIMEOUT_MS = 6000

type SkillId = 'macro-analyst' | 'market-intel' | 'news-briefing' | 'sentiment-analyst'

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

// Races the real MCP call against a timeout — without this, a stuck
// connection (bad DNS, unreachable host, slow server) blocks the
// serverless function indefinitely, which the client above then
// also waits on. Failing fast here is what lets the client's own
// fallback-to-mock logic actually kick in within a few seconds.
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
    await client.close().catch(() => {
      // best-effort cleanup — a close failure shouldn't mask the real result/error
    })
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 })
  }

  const { skill } = (await req.json()) as { skill: SkillId }

  if ((skill as string) === 'technical-analysis') {
    return new Response(
      JSON.stringify({ error: 'technical-analysis not wired — requires local Python indicator computation' }),
      { status: 501 }
    )
  }

  try {
    const raw = await callMcpSkill(skill)
    return new Response(JSON.stringify({ skill, raw }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'mcp call failed or timed out', detail: String(err) }), {
      status: 502,
    })
  }
}