import type { SkillId, SkillResult, StructuredSkillData } from '../types'

const SKILL_LABELS: Record<SkillId, string> = {
  'macro-analyst': 'Macro & Cross-Asset',
  'market-intel': 'On-Chain & Institutional',
  'news-briefing': 'News & Narrative',
  'sentiment-analyst': 'Sentiment & Positioning',
  'technical-analysis': 'Technical Analysis',
}

const SKILL_TIMEOUT_MS = 35000

async function mockResult(skill: SkillId, query: string, reason: string): Promise<SkillResult> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250))
  return {
    skill,
    label: SKILL_LABELS[skill],
    summary: `[mock] ${SKILL_LABELS[skill]} read on "${query}" (${reason})`,
    dataPoints: [{ label: 'status', value: 'mock data' }],
    fetchedAt: new Date().toISOString(),
  }
}

function parseSkillPayload(skill: SkillId, raw: any): { summary: string; dataPoints: { label: string; value: string }[]; structuredData?: StructuredSkillData } {
  if (!raw || typeof raw !== 'object') {
    return {
      summary: `${SKILL_LABELS[skill]}: No structured payload received`,
      dataPoints: [{ label: 'status', value: 'empty' }]
    }
  }

  const structured: StructuredSkillData = {}
  const points: { label: string; value: string }[] = []

  // Extract price data if present
  const priceVal = raw.price ?? raw.lastPrice ?? raw.current_price ?? raw.quote?.price
  if (typeof priceVal === 'number' || (!isNaN(Number(priceVal)) && priceVal !== null)) {
    structured.price = Number(priceVal)
    points.push({ label: 'Live Price', value: `$${structured.price.toFixed(2)}` })
  }

  // Extract sentiment & fear/greed
  const sentimentScore = raw.score ?? raw.sentiment_score ?? raw.sentimentScore ?? raw.market_mood_score
  const mood = raw.mood ?? raw.sentiment ?? raw.market_mood
  if (sentimentScore !== undefined || mood) {
    if (sentimentScore !== undefined) structured.sentimentScore = Number(sentimentScore)
    if (mood) structured.sentimentMood = String(mood).toLowerCase()
    points.push({
      label: 'Market Mood',
      value: `${structured.sentimentScore ?? ''} (${structured.sentimentMood ?? 'Neutral'})`.trim()
    })
  }

  // Extract analyst ratings / consensus
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

  // Construct clean summary text
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
        // Not JSON
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

export async function callSkills(skills: SkillId[], query: string): Promise<SkillResult[]> {
  return Promise.all(skills.map((s) => callSkill(s, query)))
}

export const ALL_SKILLS: SkillId[] = [
  'macro-analyst',
  'market-intel',
  'news-briefing',
  'sentiment-analyst',
  'technical-analysis',
]

export { SKILL_LABELS }