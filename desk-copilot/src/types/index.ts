export type SkillId = 'stock-quote' | 'analyst-view' | 'market-mood'

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