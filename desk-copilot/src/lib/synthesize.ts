import type { ResearchReport, SkillResult, Watch } from '../types'
import { callSkills } from '../skills'
import { routeQuery } from './router'

function buildMockSynthesis(
  query: string,
  skillResults: SkillResult[],
  watch: Watch | null
): Pick<ResearchReport, 'headline' | 'supportingSignals' | 'riskFlags' | 'confidence'> {
  return {
    headline: watch
      ? `[mock] "${query}" relative to your watch on ${watch.ticker} (${watch.timeframe})`
      : `[mock] "${query}" — no active watch, general read`,
    supportingSignals: skillResults.map((r) => ({
      skill: r.skill,
      point: r.summary,
    })),
    riskFlags: ['[mock] Replace with real risk flags once LLM synthesis is wired in.'],
    confidence: 'low',
  }
}

async function synthesizeViaApi(
  query: string,
  skillResults: SkillResult[],
  watch: Watch | null
): Promise<Pick<ResearchReport, 'headline' | 'supportingSignals' | 'riskFlags' | 'confidence'> | null> {
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
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.headline || !Array.isArray(data.supportingSignals)) return null
    return data
  } catch {
    return null
  }
}

export async function runResearchQuery(query: string, watch: Watch | null): Promise<ResearchReport> {
  const skillsUsed = routeQuery(query)
  const rawSkillResults = await callSkills(skillsUsed, query)

  const synthesis =
    (await synthesizeViaApi(query, rawSkillResults, watch)) ??
    buildMockSynthesis(query, rawSkillResults, watch)

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