import type { ResearchReport} from '../types'
import { SKILL_LABELS } from '../skills'

const CONFIDENCE_LABEL: Record<ResearchReport['confidence'], string> = {
  low: 'not very sure about this one',
  medium: 'fairly sure about this',
  high: 'pretty confident about this',
}

export function ReportCard({ report }: { report: ResearchReport }) {
  const time = new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Aggregate active live metrics across skill results
  const metrics: { label: string; value: string }[] = []
  for (const sr of report.rawSkillResults ?? []) {
    if (sr.structuredData?.price) {
      metrics.push({ label: 'Price', value: `$${sr.structuredData.price.toFixed(2)}` })
    }
    if (sr.structuredData?.sentimentScore !== undefined) {
      const mood = sr.structuredData.sentimentMood ? ` (${sr.structuredData.sentimentMood})` : ''
      metrics.push({ label: 'Market Mood', value: `${sr.structuredData.sentimentScore}${mood}` })
    }
    if (sr.structuredData?.analystConsensus?.rating) {
      metrics.push({ label: 'Analyst Consensus', value: sr.structuredData.analystConsensus.rating })
    }
  }

  return (
    <article className="border-b border-dashed border-[var(--color-divider)] py-8">
      <p className="mb-1 font-body text-sm text-[var(--color-ink-muted)]">
        You asked, at {time}
      </p>
      <p className="mb-5 font-display text-base italic text-[var(--color-ink-muted)]">"{report.query}"</p>

      <h3 className="mb-3 font-display text-2xl leading-snug text-[var(--color-ink)]">{report.headline}</h3>

      {/* Live Data Badge Strip */}
      {metrics.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-divider)] bg-[var(--color-surface)] px-3 py-1 font-body text-xs text-[var(--color-ink)]"
            >
              <span className="text-[var(--color-ink-muted)]">{m.label}:</span>
              <span className="font-semibold">{m.value}</span>
            </div>
          ))}
        </div>
      )}

     <div className="mb-5 space-y-3">
  {report.supportingSignals.map((s, i) => {
    const label = SKILL_LABELS[s.skill] || (s.skill ? String(s.skill) : 'Market Signal')
    return (
      <p key={i} className="font-body text-[15px] leading-relaxed text-[var(--color-ink)]">
        <span className="text-[var(--color-accent)]">{label}: </span>
        {s.point}
      </p>
    )
  })}
</div>

      {report.riskFlags.length > 0 && (
        <div className="rounded-lg bg-[var(--color-caution-soft)] px-4 py-3">
          <p className="mb-1.5 font-body text-sm font-medium text-[var(--color-caution)]">
            Worth keeping in mind
          </p>
          <div className="space-y-1">
            {report.riskFlags.map((f, i) => (
              <p key={i} className="font-body text-sm leading-relaxed text-[var(--color-ink)]">
                {f}
              </p>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 font-body text-xs text-[var(--color-ink-muted)]">{CONFIDENCE_LABEL[report.confidence]}</p>
    </article>
  )
}