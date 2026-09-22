import type { SkillId, SkillResult } from '../types'

/**
 * Thin adapter layer over Bitget's `bitget-signal` research skills
 * (macro-analyst, market-intel, news-briefing, sentiment-analyst,
 * technical-analysis). These require no account/API key per the
 * hackathon handbook.
 *
 * WIRE-UP: once Agent Hub MCP is configured, replace the mock body of
 * each function below with the real skill invocation. Keep the
 * SkillResult shape stable so nothing downstream needs to change.
 */

const SKILL_LABELS: Record<SkillId, string> = {
  'macro-analyst': 'Macro & Cross-Asset',
  'market-intel': 'On-Chain & Institutional',
  'news-briefing': 'News & Narrative',
  'sentiment-analyst': 'Sentiment & Positioning',
  'technical-analysis': 'Technical Analysis',
}

async function mockResult(skill: SkillId, query: string): Promise<SkillResult> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 250))
  return {
    skill,
    label: SKILL_LABELS[skill],
    summary: `[mock] ${SKILL_LABELS[skill]} read on "${query}" — replace with real bitget-signal output.`,
    dataPoints: [{ label: 'status', value: 'mock data — wire Agent Hub MCP' }],
    fetchedAt: new Date().toISOString(),
  }
}

export async function callSkill(skill: SkillId, query: string): Promise<SkillResult> {

  return mockResult(skill, query)
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