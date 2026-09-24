import { useState } from 'react'
import { useWatches } from '../hooks/useWatches'
import { useReports } from '../hooks/useReports'
import { WatchRail } from '../components/WatchRail'
import { QueryPrompt } from '../components/QueryPrompt'
import { ReportCard } from '../components/ReportCard'

interface Props {
  onBack: () => void
}

export function Home({ onBack }: Props) {
  const { watches, activeWatch, activeId, setActiveId, addWatch } = useWatches()
  const { reports, submitQuery, running } = useReports()
  const [railOpen, setRailOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-base)] md:flex-row">
      {/* Mobile-only top bar: sidebar is a drawer here instead of a persistent column */}
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] px-4 py-3 md:hidden">
        <button
          onClick={() => setRailOpen(true)}
          className="font-body text-sm text-[var(--color-ink)]"
        >
          ☰ Stocks
        </button>
        <p className="font-display text-base text-[var(--color-ink)]">Plain Money</p>
        <button onClick={onBack} className="font-body text-sm text-[var(--color-ink-muted)]">
          About
        </button>
      </div>

      {railOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setRailOpen(false)}
        />
      )}
      <div className={`${railOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'} md:static md:z-auto md:flex`}>
        <WatchRail
          watches={watches}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id)
            setRailOpen(false)
          }}
          onCreate={addWatch}
        />
      </div>

      <main className="flex flex-1 flex-col items-center overflow-hidden">
        <div className="hidden w-full max-w-xl items-baseline justify-between border-b border-[var(--color-divider)] px-6 py-5 md:flex">
          <div>
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
          <button
            onClick={onBack}
            className="font-body text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
          >
            About
          </button>
        </div>

        {activeWatch && (
          <div className="w-full max-w-xl px-6 py-3 md:hidden">
            <p className="font-body text-sm text-[var(--color-ink-muted)]">Watching {activeWatch.ticker}</p>
          </div>
        )}

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