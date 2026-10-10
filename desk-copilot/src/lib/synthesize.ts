import type { ResearchReport, SkillId, SkillResult, Watch } from '../types'
import { ALL_SKILLS, fetchMarketData } from '../skills'
import { resolveSymbol } from './router'

type SynthesisFields = Pick<ResearchReport, 'headline' | 'supportingSignals' | 'riskFlags' | 'confidence'>
type SynthesisAttempt = { ok: true; data: SynthesisFields } | { ok: false; reason: string }

const SYNTHESIS_TIMEOUT_MS = 55000


function buildUnavailable(unavailable: string[]): SynthesisFields {
  return {
    headline: "I couldn't reach live market data just now, so I'd rather not guess.",
    supportingSignals: [],
    riskFlags: unavailable.length > 0 ? unavailable : ['No data source responded.'],
    confidence: 'low',
  }
}

function buildRawFacts(results: SkillResult[], reason: string): SynthesisFields {
  return {
    headline: "Here's the latest data I found. The plain-English explanation didn't finish, so these are the raw facts.",
    supportingSignals: results.map((r) => ({ skill: r.skill, point: r.summary })),
    riskFlags: [`The explanation step was unavailable: ${reason}`],
    confidence: 'low',
  }
}

async function synthesizeViaApi(
  query: string,
  results: SkillResult[],
  unavailable: string[],
  watch: Watch | null
): Promise<SynthesisAttempt> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SYNTHESIS_TIMEOUT_MS)

  try {
    const res = await fetch('/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        watch: watch
          ? { ticker: watch.ticker, timeframe: watch.timeframe, worryLevel: watch.worryLevel, note: watch.note }
          : null,
        skillResults: results.map((r) => ({ skill: r.skill, label: r.label, summary: r.summary })),
        unavailable,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = String(body.detail ?? body.error ?? '').slice(0, 200)
      } catch {
       
      }
      return { ok: false, reason: `HTTP ${res.status} ${detail}`.trim() }
    }

    const data = await res.json()
    if (!data.headline || !Array.isArray(data.supportingSignals)) {
      return { ok: false, reason: 'the reply was missing a headline or supporting points' }
    }

    const valid = new Set<string>(ALL_SKILLS)
    const fallbackSkill: SkillId = results[0]?.skill ?? 'market-mood'
    const signals = (data.supportingSignals as { skill?: unknown; point?: unknown }[])
      .filter((s) => typeof s.point === 'string')
      .map((s) => ({
        skill: (typeof s.skill === 'string' && valid.has(s.skill) ? s.skill : fallbackSkill) as SkillId,
        point: s.point as string,
      }))
    const riskFlags = Array.isArray(data.riskFlags)
      ? (data.riskFlags as unknown[]).filter((f): f is string => typeof f === 'string')
      : []
    const confidence: SynthesisFields['confidence'] =
      data.confidence === 'high' || data.confidence === 'medium' ? data.confidence : 'low'

    return { ok: true, data: { headline: String(data.headline), supportingSignals: signals, riskFlags, confidence } }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      reason: aborted ? `timed out after ${SYNTHESIS_TIMEOUT_MS / 1000}s` : `network error: ${String(err)}`,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function runResearchQuery(query: string, watch: Watch | null): Promise<ResearchReport> {
  const symbol = resolveSymbol(query, watch?.ticker ?? null)
  const { results, unavailable } = await fetchMarketData(symbol)

  let synthesis: SynthesisFields
  if (results.length === 0) {
    synthesis = buildUnavailable(unavailable)
  } else {
    const attempt = await synthesizeViaApi(query, results, unavailable, watch)
    synthesis = attempt.ok ? attempt.data : buildRawFacts(results, attempt.reason)
  }

  return {
    id: crypto.randomUUID(),
    query,
    watchId: watch?.id ?? null,
    skillsUsed: results.map((r) => r.skill),
    rawSkillResults: results,
    createdAt: new Date().toISOString(),
    ...synthesis,
  }
}