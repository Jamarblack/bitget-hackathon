import type { SkillId } from '../types'
import { ALL_SKILLS } from '../skills'

const KEYWORD_MAP: Record<SkillId, string[]> = {
  'macro-analyst': ['fed', 'rate', 'inflation', 'macro', 'gold', 'dxy', 'nasdaq', 'geopolitic'],
  'market-intel': ['etf', 'whale', 'flow', 'tvl', 'institutional', 'on-chain', 'onchain'],
  'news-briefing': ['news', 'headline', 'announce', 'report', 'earnings call'],
  'sentiment-analyst': ['sentiment', 'fear', 'greed', 'long/short', 'funding rate', 'crowd'],
  'technical-analysis': ['rsi', 'macd', 'support', 'resistance', 'trend', 'technical', 'chart'],
}

export function routeQuery(query: string): SkillId[] {
  const lower = query.toLowerCase()
  const matched = ALL_SKILLS.filter((skill) =>
    KEYWORD_MAP[skill].some((kw) => lower.includes(kw))
  )
  return matched.length > 0 ? matched : ['news-briefing', 'sentiment-analyst', 'macro-analyst']
}