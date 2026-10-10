export type SkillId =
  | 'macro-analyst'
  | 'market-intel'
  | 'news-briefing'
  | 'sentiment-analyst'
  | 'technical-analysis'

export interface StructuredSkillData {
  price?: number
  currency?: string
  sentimentScore?: number
  sentimentMood?: 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed' | string
  analystConsensus?: {
    rating?: string
    buyCount?: number
    holdCount?: number
    sellCount?: number
    targetPrice?: number
  }
  rawIndicators?: Record<string, unknown>
}

export interface SkillResult {
  skill: SkillId
  label: string
  summary: string
  dataPoints: { label: string; value: string }[]
  structuredData?: StructuredSkillData
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