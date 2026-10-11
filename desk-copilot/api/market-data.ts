import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export const config = { runtime: 'nodejs' }

// Bitget's official bitget-mcp-server. It exposes two tools: `guide` (browse
// the data catalog) and `do_query` (run one catalog entry by id). Every fetch
// below is a do_query call using an entry id found via `guide`.
const MCP_URL = 'https://agent.bitget.com/mcp'
const CONNECT_TIMEOUT_MS = 15000
const QUERY_TIMEOUT_MS = 35000

type SkillId = 'stock-quote' | 'analyst-view' | 'market-mood'
type Row = Record<string, unknown>

// Headline numbers the UI shows as small tiles above the written answer.
interface StructuredData {
  price?: number
  sentimentScore?: number
  sentimentMood?: string
  analystConsensus?: { rating: string }
}

interface Summary {
  summary: string
  data: StructuredData
}

interface SourceResult {
  skill: SkillId
  ok: boolean
  summary?: string
  data?: StructuredData
  error?: string
}

interface VercelLikeReq {
  method?: string
  body?: unknown
}
interface VercelLikeRes {
  status: (code: number) => VercelLikeRes
  json: (body: unknown) => void
}

const SYMBOL_SHAPE = /^[A-Z][A-Z.\-]{0,5}$/
const DISPLAY_ORDER: SkillId[] = ['stock-quote', 'analyst-view', 'market-mood']

// The server returns analyst ratings in Chinese; translate and group them.
const RATING_EN: Record<string, { label: string; bucket: 'bullish' | 'neutral' | 'bearish' }> = {
  强力买进: { label: 'strong buy', bucket: 'bullish' },
  买入: { label: 'buy', bucket: 'bullish' },
  跑赢大盘: { label: 'outperform', bucket: 'bullish' },
  增持: { label: 'overweight', bucket: 'bullish' },
  持有: { label: 'hold', bucket: 'neutral' },
  中性: { label: 'neutral', bucket: 'neutral' },
  减持: { label: 'underweight', bucket: 'bearish' },
  逊于大盘: { label: 'underperform', bucket: 'bearish' },
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

function reasonOf(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 160)
}

// Pulls the result rows out of a do_query reply. The server wraps rows in
// { success, data: { results: [...] }, error } and returns it as JSON text.
function extractRows(result: object): Row[] {
  const { content, isError } = result as { content?: unknown; isError?: unknown }
  const blocks = Array.isArray(content) ? content : []
  const text = blocks
    .map((b) => (b && typeof b === 'object' && 'text' in b ? String((b as { text: unknown }).text) : ''))
    .join('')
  if (isError) throw new Error(text.slice(0, 160) || 'the data tool reported an error')
  const parsed = JSON.parse(text) as { success?: boolean; error?: unknown; data?: { results?: unknown } }
  if (!parsed.success) {
    const e = parsed.error
    throw new Error((typeof e === 'string' ? e : JSON.stringify(e ?? 'query was not successful')).slice(0, 160))
  }
  const rows = parsed.data?.results
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('no data came back for that request')
  return rows as Row[]
}

async function doQuery(client: Client, entryId: string, params: Record<string, unknown>): Promise<Row[]> {
  const result = await client.callTool({ name: 'do_query', arguments: { entry_id: entryId, params } })
  return extractRows(result)
}

function summarizeQuote(symbol: string, r: Row): Summary {
  const price = num(r.last_price)
  if (price === null) throw new Error('the quote had no price in it')
  const prev = num(r.prev_close)
  const change = num(r.change)
  const pct = num(r.change_percent)
  const high = num(r.high)
  const low = num(r.low)
  const cap = num(r.total_market_cap)

  let s = `${symbol} latest price ${money(price)}`
  if (change !== null && pct !== null && prev !== null) {
    s += `, ${change >= 0 ? 'up' : 'down'} ${money(Math.abs(change))} (${Math.abs(pct * 100).toFixed(2)}%) from the previous close of ${money(prev)}`
  }
  s += '.'
  if (high !== null && low !== null) s += ` Day range ${money(low)} to ${money(high)}.`
  if (cap !== null) {
    s += ` Total market value about ${cap >= 1e12 ? `$${(cap / 1e12).toFixed(2)} trillion` : `$${(cap / 1e9).toFixed(1)} billion`}.`
  }
  return { summary: s, data: { price } }
}

function summarizeAnalysts(symbol: string, rows: Row[]): Summary {
  const dated = rows
    .map((r) => ({
      firm: String(r.analyst_firm ?? ''),
      date: String(r.published_date ?? ''),
      rating: String(r.rating_current ?? r.latest_rating_cn ?? ''),
      target: num(r.price_target) ?? num(r.latest_target_price),
    }))
    .filter((r) => r.firm && r.date)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  if (dated.length === 0) throw new Error('no analyst ratings came back')

  const newest = new Date(dated[0].date).getTime()
  const cutoff = newest - 180 * 24 * 3600 * 1000
  const latestByFirm = new Map<string, (typeof dated)[number]>()
  for (const r of dated) {
    if (new Date(r.date).getTime() < cutoff) continue
    if (!latestByFirm.has(r.firm)) latestByFirm.set(r.firm, r)
  }
  const firms = [...latestByFirm.values()]

  const counts = { bullish: 0, neutral: 0, bearish: 0 }
  for (const f of firms) {
    const m = RATING_EN[f.rating]
    if (m) counts[m.bucket] += 1
  }
  const rated = counts.bullish + counts.neutral + counts.bearish
  let consensus: string | undefined
  if (rated > 0) {
    if (counts.bullish / rated >= 0.6) consensus = `Mostly positive (${counts.bullish} of ${rated})`
    else if (counts.bearish / rated >= 0.6) consensus = `Mostly negative (${counts.bearish} of ${rated})`
    else consensus = `Mixed (${counts.bullish} positive, ${counts.neutral} neutral, ${counts.bearish} negative)`
  }
  const targets = firms.map((f) => f.target).filter((t): t is number => t !== null).sort((a, b) => a - b)

  let s = `Analyst view on ${symbol} (latest rating from each of ${firms.length} firms over roughly the last 6 months): ${counts.bullish} bullish (buy/overweight/outperform), ${counts.neutral} neutral (hold), ${counts.bearish} bearish (underweight/underperform).`
  if (targets.length > 0) {
    const mid = Math.floor(targets.length / 2)
    const median = targets.length % 2 ? targets[mid] : (targets[mid - 1] + targets[mid]) / 2
    s += ` Price targets range from ${money(targets[0])} to ${money(targets[targets.length - 1])}, median about ${money(median)}.`
  }
  const recent = firms.slice(0, 3).map((f) => {
    const en = RATING_EN[f.rating]?.label ?? 'rating'
    return `${f.firm} (${en}${f.target !== null ? `, target ${money(f.target)}` : ''}, ${f.date})`
  })
  if (recent.length > 0) s += ` Most recent: ${recent.join('; ')}.`
  s += ' Analyst ratings are opinions, not predictions.'
  return { summary: s, data: consensus ? { analystConsensus: { rating: consensus } } : {} }
}

function summarizeMood(r: Row): Summary {
  const score = num(r.score)
  if (score === null) throw new Error('the mood index had no score')
  const rating = typeof r.rating === 'string' ? r.rating : 'unknown'
  const fmt = (v: unknown) => {
    const n = num(v)
    return n === null ? 'n/a' : n.toFixed(1)
  }
  const summary = `Overall market mood index (0 = extreme fear, 100 = extreme greed): ${score.toFixed(0)}, which is "${rating}". For comparison: previous close ${fmt(r.previous_close)}, a week ago ${fmt(r.previous_1_week)}, a month ago ${fmt(r.previous_1_month)}, a year ago ${fmt(r.previous_1_year)}.`
  return { summary, data: { sentimentScore: Math.round(score), sentimentMood: rating } }
}

export default async function handler(req: VercelLikeReq, res: VercelLikeRes): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const rawSymbol = (req.body as { symbol?: unknown } | undefined)?.symbol
  const symbol = typeof rawSymbol === 'string' ? rawSymbol.trim().toUpperCase() : ''
  const results: SourceResult[] = []

  const client = new Client({ name: 'plain-money', version: '0.2.0' })
  const tasks: { skill: SkillId; run: () => Promise<Summary> }[] = [
    {
      skill: 'market-mood',
      run: async () => summarizeMood((await doQuery(client, 'sentiment_market_fear_greed', {}))[0]),
    },
  ]

  if (symbol) {
    if (SYMBOL_SHAPE.test(symbol)) {
      tasks.push({
        skill: 'stock-quote',
        run: async () => summarizeQuote(symbol, (await doQuery(client, 'equity_price_quote', { symbol }))[0]),
      })
      tasks.push({
        skill: 'analyst-view',
        run: async () => summarizeAnalysts(symbol, await doQuery(client, 'equity_estimates_price_target', { symbol })),
      })
    } else {
      const why = `"${symbol}" doesn't look like a US stock ticker`
      results.push({ skill: 'stock-quote', ok: false, error: why })
      results.push({ skill: 'analyst-view', ok: false, error: why })
    }
  }

  try {
    await withTimeout(client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL))), CONNECT_TIMEOUT_MS, 'connecting to the data service')
    const settled = await Promise.allSettled(tasks.map((t) => withTimeout(t.run(), QUERY_TIMEOUT_MS, 'data request')))
    settled.forEach((s, i) => {
      const skill = tasks[i].skill
      if (s.status === 'fulfilled') {
        results.push({ skill, ok: true, summary: s.value.summary, data: s.value.data })
      } else {
        console.error(`[api/market-data] ${skill} failed:`, s.reason)
        results.push({ skill, ok: false, error: reasonOf(s.reason) })
      }
    })
  } catch (err) {
    console.error('[api/market-data] could not connect:', err)
    for (const t of tasks) results.push({ skill: t.skill, ok: false, error: reasonOf(err) })
  } finally {
    await client.close().catch(() => {})
  }

  results.sort((a, b) => DISPLAY_ORDER.indexOf(a.skill) - DISPLAY_ORDER.indexOf(b.skill))
  res.status(200).json({ results })
}