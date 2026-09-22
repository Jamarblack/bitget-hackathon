export type SkillId =
  | 'macro-analyst'
  | 'market-intel'
  | 'news-briefing'
  | 'sentiment-analyst'
  | 'technical-analysis'

export interface SkillResult {
  skill: SkillId
  label: string
  summary: string
  dataPoints: { label: string; value: string }[]
  fetchedAt: string
}

export interface Watch {
  id: string
  ticker: string
  timeframe: string
  // How much market swings on this stock stress the person out —
  // renamed from trader "risk appetite" to something a layman relates to.
  worryLevel: 'not-much' | 'somewhat' | 'a-lot'
  note: string
  createdAt: string
}

export interface ResearchReport {
  id: string
  query: string
  watchId: string | null
  skillsUsed: SkillId[]
  headline: string
  supportingSignals: { skill: SkillId; point: string }[]
  riskFlags: string[]
  confidence: 'low' | 'medium' | 'high'
  rawSkillResults: SkillResult[]
  createdAt: string
}