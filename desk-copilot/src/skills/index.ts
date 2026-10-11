import type { SkillId, SkillResult } from '../types'

/**
 * Live market data comes from Bitget's official bitget-mcp-server, fetched
 * server-side by /api/market-data. Three sources:
 *   stock-quote   latest price and basics for one stock
 *   analyst-view  what Wall Street analysts rate it and their price targets
 *   market-mood   an overall fear/greed index for the market
 * A source that fails is reported as "unavailable" with the reason — it is
 * never replaced with made-up data.
 */

const SKILL_LABELS: Record<SkillId, string> = {
  'stock-quote': 'Latest price',
  'analyst-view': 'What analysts think',
  'market-mood': 'Overall market mood',
}

const ALL_SKILLS: SkillId[] = ['stock-quote', 'analyst-view', 'market-mood']

const MARKET_DATA_TIMEOUT_MS = 55000

export interface MarketDataOutcome {
  results: SkillResult[]
  unavailable: string[]
}

interface ApiSource {
  skill: SkillId
  ok: boolean
  summary?: string
  data?: SkillResult['structuredData']
  error?: string
}

export async function fetchMarketData(symbol: string | null): Promise<MarketDataOutcome> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MARKET_DATA_TIMEOUT_MS)

  try {
    const res = await fetch('/api/market-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
      signal: controller.signal,
    })
    if (!res.ok) {
      return { results: [], unavailable: [`The market data service returned HTTP ${res.status}`] }
    }

    const data = (await res.json()) as { results?: ApiSource[] }
    const sources = Array.isArray(data.results) ? data.results : []
    const results: SkillResult[] = []
    const unavailable: string[] = []

    for (const s of sources) {
      const label = SKILL_LABELS[s.skill] ?? s.skill
      if (s.ok && s.summary) {
        results.push({
          skill: s.skill,
          label,
          summary: s.summary,
          dataPoints: [],
          structuredData: s.data,
          fetchedAt: new Date().toISOString(),
        })
      } else {
        unavailable.push(`${label}: ${s.error ?? 'no data'}`)
      }
    }
    return { results, unavailable }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      results: [],
      unavailable: [
        aborted
          ? `Market data timed out after ${MARKET_DATA_TIMEOUT_MS / 1000}s`
          : `Could not reach the market data service: ${String(err)}`,
      ],
    }
  } finally {
    clearTimeout(timeout)
  }
}

export { SKILL_LABELS, ALL_SKILLS }