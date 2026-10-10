import type { ResearchReport, SkillResult, Watch } from '../types'
import { callSkills } from '../skills'
import { routeQuery } from './router'

type SynthesisFields = Pick<ResearchReport, 'headline' | 'supportingSignals' | 'riskFlags' | 'confidence'>
type SynthesisAttempt = { ok: true; data: SynthesisFields } | { ok: false; reason: string }

const SYNTHESIS_TIMEOUT_MS = 55000

function buildMockSynthesis(
  query: string,
  skillResults: SkillResult[],
  watch: Watch | null,
  reason: string
): SynthesisFields {
  return {
    headline: watch
      ? `[mock] "${query}" relative to your watch on ${watch.ticker} (${watch.timeframe})`
      : `[mock] "${query}" — no active watch, general read`,
    supportingSignals: skillResults.map((r) => ({ skill: r.skill, point: r.summary })),
    riskFlags: [`[mock] Live synthesis unavailable: ${reason}`],
    confidence: 'low',
  }
}

async function synthesizeViaApi(
  query: string,
  skillResults: SkillResult[],
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
        skillResults: skillResults.map((r) => ({ skill: r.skill, label: r.label, summary: r.summary })),
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
      return { ok: false, reason: 'response was missing headline/supportingSignals' }
    }
    return { ok: true, data }
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
  const skillsUsed = routeQuery(query)
  const rawSkillResults = await callSkills(skillsUsed, query)

  const attempt = await synthesizeViaApi(query, rawSkillResults, watch)
  const synthesis = attempt.ok
    ? attempt.data
    : buildMockSynthesis(query, rawSkillResults, watch, attempt.reason)

  return {
    id: crypto.randomUUID(),
    query,
    watchId: watch?.id ?? null,
    skillsUsed,
    rawSkillResults,
    createdAt: new Date().toISOString(),
    ...synthesis,
  }
}