import { useCallback, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ResearchReport, Watch } from '../types'
import { runResearchQuery } from '../lib/synthesize'

export function useReports() {
  const [reports, setReports] = useState<ResearchReport[]>([])
  const [running, setRunning] = useState(false)

  const submitQuery = useCallback(async (query: string, watch: Watch | null) => {
    setRunning(true)
    try {
      const report = await runResearchQuery(query, watch)

      if (isSupabaseConfigured && supabase) {
        await supabase.from('reports').insert({
          id: report.id,
          query: report.query,
          watch_id: report.watchId,
          skills_used: report.skillsUsed,
          headline: report.headline,
          supporting_signals: report.supportingSignals,
          risk_flags: report.riskFlags,
          confidence: report.confidence,
          raw_skill_results: report.rawSkillResults,
          created_at: report.createdAt,
        })
      }

      setReports((prev) => [report, ...prev])
      return report
    } finally {
      setRunning(false)
    }
  }, [])

  return { reports, submitQuery, running }
}