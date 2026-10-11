import type { ResearchReport } from '../types'
import { SKILL_LABELS } from '../skills'

const CONFIDENCE_LABEL: Record<ResearchReport['confidence'], string> = {
  low: 'not very sure about this one',
  medium: 'fairly sure about this',
  high: 'pretty confident about this',
}

interface Metric {
  label: string
  value: string
}

// Headline numbers pulled from whichever data sources returned them.
function metricsFrom(report: ResearchReport): Metric[] {
  const metrics: Metric[] = []
  for (const source of report.rawSkillResults) {
    const d = source.structuredData
    if (!d) continue
    if (typeof d.price === 'number') {
      metrics.push({ label: 'Latest price', value: `$${d.price.toFixed(2)}` })
    }
    if (d.analystConsensus?.rating) {
      metrics.push({ label: 'Analysts', value: d.analystConsensus.rating })
    }
    if (typeof d.sentimentScore === 'number') {
      const mood = d.sentimentMood ? ` (${d.sentimentMood})` : ''
      metrics.push({ label: 'Market mood', value: `${d.sentimentScore} of 100${mood}` })
    }
  }
  return metrics
}

export function ReportCard({ report }: { report: ResearchReport }) {
  const time = new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const metrics = metricsFrom(report)

  return (
    <article className="border-b border-dashed border-[var(--color-divider)] py-8">
      <p className="mb-1 font-body text-sm text-[var(--color-ink-muted)]">You asked, at {time}</p>
      <p className="mb-5 font-display text-base italic text-[var(--color-ink-muted)]">"{report.query}"</p>

      <h3 className="mb-4 font-display text-2xl leading-snug text-[var(--color-ink)]">{report.headline}</h3>

      {metrics.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="min-w-[8.5rem] flex-1 rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface)] px-3 py-2"
            >
              <p className="font-body text-xs text-[var(--color-ink-muted)]">{m.label}</p>
              <p className="font-display text-lg leading-snug text-[var(--color-ink)]">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 space-y-3">
        {report.supportingSignals.map((s, i) => (
          <p key={i} className="font-body text-[15px] leading-relaxed text-[var(--color-ink)]">
            <span className="text-[var(--color-accent)]">{SKILL_LABELS[s.skill]}: </span>
            {s.point}
          </p>
        ))}
      </div>

      {report.riskFlags.length > 0 && (
        <div className="rounded-lg bg-[var(--color-caution-soft)] px-4 py-3">
          <p className="mb-1.5 font-body text-sm font-medium text-[var(--color-caution)]">Worth keeping in mind</p>
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