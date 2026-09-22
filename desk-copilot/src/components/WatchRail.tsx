import { useState } from 'react'
import type { Watch } from '../types'

interface Props {
  watches: Watch[]
  activeId: string | null
  onSelect: (id: string | null) => void
  onCreate: (w: Omit<Watch, 'id' | 'createdAt'>) => void
}

export function WatchRail({ watches, activeId, onSelect, onCreate }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [ticker, setTicker] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [worryLevel, setWorryLevel] = useState<Watch['worryLevel']>('somewhat')
  const [note, setNote] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticker.trim()) return
    onCreate({
      ticker: ticker.trim().toUpperCase(),
      timeframe: timeframe.trim() || 'no particular timeframe',
      worryLevel,
      note,
    })
    setTicker('')
    setTimeframe('')
    setNote('')
    setShowForm(false)
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-[var(--color-divider)] bg-[var(--color-surface)]">
      <div className="px-6 py-6">
        <p className="font-display text-xl text-[var(--color-ink)]">Plain Money</p>
        <p className="mt-0.5 font-body text-sm text-[var(--color-ink-muted)]">Money stuff, explained simply</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="font-body text-sm text-[var(--color-ink-muted)]">Stocks you're watching</span>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="font-body text-sm text-[var(--color-accent)] hover:underline"
          >
            {showForm ? 'cancel' : 'add'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-3 space-y-2 rounded-lg bg-[var(--color-surface-raised)] p-3">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g. AAPL, or a company name"
              className="w-full rounded border border-[var(--color-divider)] bg-[var(--color-surface)] px-2.5 py-1.5 font-body text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]"
            />
            <input
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              placeholder="how long you plan to hold (optional)"
              className="w-full rounded border border-[var(--color-divider)] bg-[var(--color-surface)] px-2.5 py-1.5 font-body text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]"
            />
            <div>
              <label className="mb-1 block font-body text-xs text-[var(--color-ink-muted)]">
                How much do price swings stress you out?
              </label>
              <select
                value={worryLevel}
                onChange={(e) => setWorryLevel(e.target.value as Watch['worryLevel'])}
                className="w-full rounded border border-[var(--color-divider)] bg-[var(--color-surface)] px-2.5 py-1.5 font-body text-sm text-[var(--color-ink)]"
              >
                <option value="not-much">not much, I'm in it for the long run</option>
                <option value="somewhat">somewhat, I keep an eye on it</option>
                <option value="a-lot">a lot, I check it often</option>
              </select>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="why you're watching this (optional)"
              rows={2}
              className="w-full rounded border border-[var(--color-divider)] bg-[var(--color-surface)] px-2.5 py-1.5 font-body text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)]"
            />
            <button
              type="submit"
              className="w-full rounded bg-[var(--color-accent)] px-2.5 py-1.5 font-body text-sm font-medium text-[var(--color-surface)] hover:opacity-90"
            >
              Start watching
            </button>
          </form>
        )}

        <button
          onClick={() => onSelect(null)}
          className={`mb-1 w-full rounded px-2.5 py-2 text-left font-body text-sm ${
            activeId === null
              ? 'bg-[var(--color-accent-soft)] text-[var(--color-ink)]'
              : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-raised)]'
          }`}
        >
          Just ask anything
        </button>

        {watches.map((w) => (
          <button
            key={w.id}
            onClick={() => onSelect(w.id)}
            className={`mb-1 w-full rounded px-2.5 py-2 text-left ${
              activeId === w.id ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-surface-raised)]'
            }`}
          >
            <div className="font-body text-sm font-medium text-[var(--color-ink)]">{w.ticker}</div>
            <div className="font-body text-xs text-[var(--color-ink-muted)]">{w.timeframe}</div>
          </button>
        ))}

        {watches.length === 0 && !showForm && (
          <p className="px-2 py-2 font-body text-sm text-[var(--color-ink-muted)]">
            No stocks saved yet. You can still ask a question below — saving one just means
            follow-ups remember what you're watching.
          </p>
        )}
      </div>
    </aside>
  )
}