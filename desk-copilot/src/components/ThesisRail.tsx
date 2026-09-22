import { useState } from 'react'
import type { Thesis } from '../types'

interface Props {
  theses: Thesis[]
  activeId: string | null
  onSelect: (id: string | null) => void
  onCreate: (t: Omit<Thesis, 'id' | 'createdAt'>) => void
}

export function ThesisRail({ theses, activeId, onSelect, onCreate }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [ticker, setTicker] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [riskAppetite, setRiskAppetite] = useState<Thesis['riskAppetite']>('moderate')
  const [note, setNote] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker.trim() || !timeframe.trim()) return
    onCreate({ ticker: ticker.trim().toUpperCase(), timeframe: timeframe.trim(), riskAppetite, note })
    setTicker('')
    setTimeframe('')
    setNote('')
    setShowForm(false)
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-hairline)] px-4 py-4">
        <p className="font-mono text-[11px] tracking-wide text-[var(--color-text-muted)]">Desk Copilot</p>
        <p className="mt-0.5 font-serif text-sm text-[var(--color-text)]">Research Workbench</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Theses</span>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="font-mono text-[11px] text-[var(--color-accent)] hover:underline"
          >
            {showForm ? 'cancel' : '+ new'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-3 space-y-2 border border-[var(--color-hairline)] bg-[var(--color-surface-raised)] p-3">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="TICKER"
              className="w-full border border-[var(--color-hairline)] bg-transparent px-2 py-1 font-mono text-xs uppercase text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            />
            <input
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              placeholder="timeframe, e.g. 2-4 weeks"
              className="w-full border border-[var(--color-hairline)] bg-transparent px-2 py-1 font-mono text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            />
            <select
              value={riskAppetite}
              onChange={(e) => setRiskAppetite(e.target.value as Thesis['riskAppetite'])}
              className="w-full border border-[var(--color-hairline)] bg-transparent px-2 py-1 font-mono text-xs text-[var(--color-text)]"
            >
              <option value="conservative">conservative</option>
              <option value="moderate">moderate</option>
              <option value="aggressive">aggressive</option>
            </select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="thesis note (optional)"
              rows={2}
              className="w-full border border-[var(--color-hairline)] bg-transparent px-2 py-1 font-serif text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            />
            <button
              type="submit"
              className="w-full border border-[var(--color-accent-dim)] bg-[var(--color-accent-dim)]/20 px-2 py-1 font-mono text-[11px] text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)]/40"
            >
              save thesis
            </button>
          </form>
        )}

        <button
          onClick={() => onSelect(null)}
          className={`mb-1 w-full border-l-2 px-2 py-1.5 text-left font-mono text-xs ${
            activeId === null
              ? 'border-[var(--color-accent)] text-[var(--color-text)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          no active thesis
        </button>

        {theses.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`mb-1 w-full border-l-2 px-2 py-1.5 text-left ${
              activeId === t.id
                ? 'border-[var(--color-accent)] bg-[var(--color-surface-raised)]'
                : 'border-transparent hover:bg-[var(--color-surface-raised)]'
            }`}
          >
            <div className="font-mono text-xs text-[var(--color-text)]">{t.ticker}</div>
            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
              {t.timeframe} · {t.riskAppetite}
            </div>
          </button>
        ))}

        {theses.length === 0 && !showForm && (
          <p className="px-1 py-2 font-serif text-xs italic text-[var(--color-text-muted)]">
            No saved thesis yet. Queries work fine without one — a thesis just lets follow-ups build on it.
          </p>
        )}
      </div>
    </aside>
  )
}