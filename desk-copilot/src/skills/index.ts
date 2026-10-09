import type { SkillId, SkillResult } from '../types'

/**
 * Adapter over Bitget's bitget-signal research skills, called through
 * /api/skills (an MCP client). If a call fails we degrade to a labelled
 * mock — and, importantly, say WHY on screen, so a failure is never silent.
 *
 * technical-analysis is not wired to live data (it needs local Python
 * indicator maths per Bitget's skill docs), so it is always mocked.
 */

const SKILL_LABELS: Record<SkillId, string> = {
  'macro-analyst': 'Macro & Cross-Asset',
  'market-intel': 'On-Chain & Institutional',
  'news-briefing': 'News & Narrative',
  'sentiment-analyst': 'Sentiment & Positioning',
  'technical-analysis': 'Technical Analysis',
}

const SKILL_TIMEOUT_MS = 8000

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

function summarizeRaw(skill: SkillId, raw: unknown): string {
  try {
    return `${SKILL_LABELS[skill]}: ${JSON.stringify(raw).slice(0, 300)}`
  } catch {
    return `${SKILL_LABELS[skill]}: (unparseable result)`
  }
}

export async function callSkill(skill: SkillId, query: string): Promise<SkillResult> {
  if (skill === 'technical-analysis') return mockResult(skill, query, 'not wired to live data')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SKILL_TIMEOUT_MS)

  try {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill }),
      signal: controller.signal,
    })
    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = String(body.detail ?? body.error ?? '').slice(0, 120)
      } catch {
        // response wasn't JSON — status code alone will do
      }
      return mockResult(skill, query, `skills API returned HTTP ${res.status} ${detail}`.trim())
    }

    const data = await res.json()
    return {
      skill,
      label: SKILL_LABELS[skill],
      summary: summarizeRaw(skill, data.raw),
      dataPoints: [{ label: 'source', value: 'bitget-signal MCP (live)' }],
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
  'macro-analyst', 'market-intel', 'news-briefing', 'sentiment-analyst', 'technical-analysis',
]

export { SKILL_LABELS }