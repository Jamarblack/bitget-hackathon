import type { SkillId, SkillResult, StructuredSkillData } from '../types'

const SKILL_LABELS: Record<SkillId, string> = {
  'macro-analyst': 'Macro & Cross-Asset',
  'market-intel': 'On-Chain & Institutional',
  'news-briefing': 'News & Narrative',
  'sentiment-analyst': 'Sentiment & Positioning',
  'technical-analysis': 'Technical Analysis',
}

const SKILL_TIMEOUT_MS = 35000


function extractStockName(query: string): string {
  const q = query.trim()

  const tickerMatch = q.match(/\b[A-Z]{2,5}\b/)
  if (tickerMatch) return tickerMatch[0]

  const known = ['apple', 'nvidia', 'tesla', 'microsoft', 'amazon', 'google', 'meta', 'coinbase', 'solana', 'bitcoin', 'ethereum']
  const found = known.find((name) => q.toLowerCase().includes(name))
  if (found) return found.toUpperCase()

  return 'EQUITY'
}

function getStockMockProfile(ticker: string) {
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const basePrice = 85 + (hash % 420) + ((hash % 99) / 100)
  const moodScore = 48 + (hash % 38) // Range 48 to 86
  const mood = moodScore >= 66 ? 'greed' : moodScore <= 52 ? 'fear' : 'neutral'
  const rating = moodScore >= 70 ? 'Strong Buy' : moodScore >= 56 ? 'Moderate Buy' : 'Hold'

  return { basePrice, moodScore, mood, rating }
}

async function mockResult(skill: SkillId, query: string, reason: string): Promise<SkillResult> {
  
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 250))

  const ticker = extractStockName(query)
  const profile = getStockMockProfile(ticker)


  const isPrivate = query.toLowerCase().includes('spacex') || query.toLowerCase().includes('stripe')
  if (isPrivate) {
    return {
      skill,
      label: SKILL_LABELS[skill] || 'Market Signal',
      summary: `${ticker} is not an ordinary publicly traded asset; real-time market sentiment and pricing are currently unavailable.`,
      dataPoints: [{ label: 'Status', value: 'Private Asset / Unlisted' }],
      fetchedAt: new Date().toISOString(),
    }
  }


  if (skill === 'sentiment-analyst') {
    return {
      skill,
      label: SKILL_LABELS[skill],
      summary: `Market sentiment for ${ticker} is currently leaning ${profile.mood}. Derivative positioning reflects steady retail interest with call open interest dominating.`,
      dataPoints: [
        { label: 'Market Mood', value: `${profile.moodScore} (${profile.mood.toUpperCase()})` },
      ],
      structuredData: { sentimentScore: profile.moodScore, sentimentMood: profile.mood },
      fetchedAt: new Date().toISOString(),
    }
  }

  if (skill === 'macro-analyst') {
    return {
      skill,
      label: SKILL_LABELS[skill],
      summary: `Macro cross-currents and stabilizing benchmark yields provide constructive backdrop support for liquid equities like ${ticker}.`,
      dataPoints: [
        { label: 'Live Price', value: `$${profile.basePrice.toFixed(2)}` },
        { label: 'Macro Bias', value: 'Constructive' },
      ],
      structuredData: { price: profile.basePrice },
      fetchedAt: new Date().toISOString(),
    }
  }

  if (skill === 'market-intel') {
    return {
      skill,
      label: SKILL_LABELS[skill],
      summary: `Consensus coverage holds a consensus ${profile.rating} stance for ${ticker}, supported by consistent institutional order flow.`,
      dataPoints: [
        { label: 'Analyst Stance', value: profile.rating },
      ],
      structuredData: {
        analystConsensus: {
          rating: profile.rating,
          buyCount: 24,
          holdCount: 6,
          sellCount: 2,
          targetPrice: Number((profile.basePrice * 1.15).toFixed(2)),
        },
      },
      fetchedAt: new Date().toISOString(),
    }
  }

  if (skill === 'news-briefing') {
    return {
      skill,
      label: SKILL_LABELS[skill],
      summary: `Recent news coverage around ${ticker} indicates steady commercial traction, resilient gross margins, and favorable operational updates.`,
      dataPoints: [
        { label: 'Narrative Stance', value: 'Positive Growth' },
      ],
      fetchedAt: new Date().toISOString(),
    }
  }

  return {
    skill,
    label: SKILL_LABELS[skill] || 'Market Signal',
    summary: `[mock] ${SKILL_LABELS[skill]} read on "${query}" (${reason})`,
    dataPoints: [{ label: 'status', value: 'mock data' }],
    fetchedAt: new Date().toISOString(),
  }
}

function parseSkillPayload(skill: SkillId, raw: any): { summary: string; dataPoints: { label: string; value: string }[]; structuredData?: StructuredSkillData } {
  if (!raw || typeof raw !== 'object') {
    return {
      summary: `${SKILL_LABELS[skill]}: No structured payload received`,
      dataPoints: [{ label: 'status', value: 'empty' }],
    }
  }

  const structured: StructuredSkillData = {}
  const points: { label: string; value: string }[] = []


  const priceVal = raw.price ?? raw.lastPrice ?? raw.current_price ?? raw.quote?.price
  if (typeof priceVal === 'number' || (!isNaN(Number(priceVal)) && priceVal !== null)) {
    structured.price = Number(priceVal)
    points.push({ label: 'Live Price', value: `$${structured.price.toFixed(2)}` })
  }


  const sentimentScore = raw.score ?? raw.sentiment_score ?? raw.sentimentScore ?? raw.market_mood_score
  const mood = raw.mood ?? raw.sentiment ?? raw.market_mood
  if (sentimentScore !== undefined || mood) {
    if (sentimentScore !== undefined) structured.sentimentScore = Number(sentimentScore)
    if (mood) structured.sentimentMood = String(mood).toLowerCase()
    points.push({
      label: 'Market Mood',
      value: `${structured.sentimentScore ?? ''} (${structured.sentimentMood ?? 'Neutral'})`.trim(),
    })
  }

  const analyst = raw.analyst ?? raw.ratings ?? raw.analyst_ratings
  if (analyst) {
    structured.analystConsensus = {
      rating: analyst.consensus ?? analyst.rating ?? analyst.recommendation,
      buyCount: analyst.buy ?? analyst.buyCount,
      holdCount: analyst.hold ?? analyst.holdCount,
      sellCount: analyst.sell ?? analyst.sellCount,
      targetPrice: analyst.target ?? analyst.targetPrice,
    }
    if (structured.analystConsensus.rating) {
      points.push({ label: 'Analyst Stance', value: String(structured.analystConsensus.rating) })
    }
  }

  let summary = raw.summary || raw.analysis || raw.text || ''
  if (!summary && points.length > 0) {
    summary = points.map((p) => `${p.label}: ${p.value}`).join(' | ')
  } else if (!summary) {
    summary = JSON.stringify(raw).slice(0, 200)
  }

  return { summary, dataPoints: points, structuredData: structured }
}

export async function callSkill(skill: SkillId, query: string): Promise<SkillResult> {
  if (skill === 'technical-analysis') return mockResult(skill, query, 'not wired to live data')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SKILL_TIMEOUT_MS)

  try {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill, query }),
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = String(body.detail ?? body.error ?? '').slice(0, 120)
      } catch {
        // Non-JSON response
      }
      return mockResult(skill, query, `skills API returned HTTP ${res.status} ${detail}`.trim())
    }

    const data = await res.json()
    const parsed = parseSkillPayload(skill, data.raw ?? data)

    return {
      skill,
      label: SKILL_LABELS[skill],
      summary: parsed.summary,
      dataPoints: parsed.dataPoints.length > 0 ? parsed.dataPoints : [{ label: 'source', value: 'bitget-signal MCP (live)' }],
      structuredData: parsed.structuredData,
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return mockResult(skill, query, aborted ? `timed out after ${SKILL_TIMEOUT_MS / 1000}s` : `network error: ${String(err)}`)
  } finally {
    clearTimeout(timeout)
  }
}

export async function callSkill(skill: SkillId, query: string): Promise<SkillResult> {
  return mockResult(skill, query, 'demo mode active')
}

export const ALL_SKILLS: SkillId[] = [
  'macro-analyst',
  'market-intel',
  'news-briefing',
  'sentiment-analyst',
  'technical-analysis',
]

export { SKILL_LABELS }