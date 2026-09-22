import { useWatches } from '../hooks/useWatches'
import { useReports } from '../hooks/useReports'
import { WatchRail } from '../components/WatchRail'
import { QueryPrompt } from '../components/QueryPrompt'
import { ReportCard } from '../components/ReportCard'

export function Home() {
  const { watches, activeWatch, activeId, setActiveId, addWatch } = useWatches()
  const { reports, submitQuery, running } = useReports()

  return (
    <div className="flex h-screen bg-[var(--color-base)]">
      <WatchRail watches={watches} activeId={activeId} onSelect={setActiveId} onCreate={addWatch} />

      <main className="flex flex-1 flex-col items-center overflow-hidden">
        <div className="w-full max-w-xl border-b border-[var(--color-divider)] px-6 py-5">
          <p className="font-body text-sm text-[var(--color-ink-muted)]">
            {activeWatch ? `Watching ${activeWatch.ticker}` : 'Ask about anything'}
          </p>
          {activeWatch && (
            <p className="mt-0.5 font-display text-lg text-[var(--color-ink)]">
              {activeWatch.timeframe}
              {activeWatch.note ? ` — ${activeWatch.note}` : ''}
            </p>
          )}
        </div>

        <div className="w-full max-w-xl flex-1 overflow-y-auto px-6">
          {reports.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <p className="max-w-sm font-display text-xl leading-snug text-[var(--color-ink)]">
                Ask anything about the market or a stock you own, in plain English.
              </p>
              <p className="max-w-sm font-body text-sm text-[var(--color-ink-muted)]">
                No jargon, no assumptions you already know how investing works.
              </p>
              <div className="flex flex-col gap-2">
                <span className="font-body text-sm text-[var(--color-accent)]">
                  "why did tech stocks drop today?"
                </span>
                <span className="font-body text-sm text-[var(--color-accent)]">
                  "is now a bad time to check my portfolio?"
                </span>
              </div>
            </div>
          ) : (
            reports.map((r) => <ReportCard key={r.id} report={r} />)
          )}
        </div>

        <QueryPrompt
          onSubmit={(q) => submitQuery(q, activeWatch)}
          running={running}
          activeTickerHint={activeWatch?.ticker ?? null}
        />
      </main>
    </div>
  )
}