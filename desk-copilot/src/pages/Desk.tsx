import { useTheses } from '../hooks/useTheses'
import { useReports } from '../hooks/useReports'
import { ThesisRail } from '../components/ThesisRail'
import { QueryPrompt } from '../components/QueryPrompt'
import { ReportCard } from '../components/ReportCard'

export function Desk() {
  const { theses, activeThesis, activeId, setActiveId, addThesis } = useTheses()
  const { reports, submitQuery, running } = useReports()

  return (
    <div className="flex h-screen">
      <ThesisRail theses={theses} activeId={activeId} onSelect={setActiveId} onCreate={addThesis} />

      <main className="flex flex-1 flex-col">
        <div className="border-b border-[var(--color-hairline)] px-6 py-4">
          <p className="font-mono text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            {activeThesis ? `Active thesis: ${activeThesis.ticker}` : 'No active thesis'}
          </p>
          {activeThesis && (
            <p className="mt-0.5 font-serif text-sm text-[var(--color-text)]">
              {activeThesis.timeframe} · {activeThesis.riskAppetite}
              {activeThesis.note ? ` — ${activeThesis.note}` : ''}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {reports.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="font-serif text-base text-[var(--color-text-muted)]">
                Ask a research question below. Save a thesis first if you want follow-ups to build on it.
              </p>
            </div>
          ) : (
            reports.map((r) => <ReportCard key={r.id} report={r} />)
          )}
        </div>

        <QueryPrompt
          onSubmit={(q) => submitQuery(q, activeThesis)}
          running={running}
          activeTickerHint={activeThesis?.ticker ?? null}
        />
      </main>
    </div>
  )
}