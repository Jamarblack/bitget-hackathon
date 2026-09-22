import { useState } from 'react'

interface Props {
  onSubmit: (query: string) => void
  running: boolean
  activeTickerHint: string | null
}

export function QueryPrompt({ onSubmit, running, activeTickerHint }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || running) return
    onSubmit(value.trim())
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl items-center gap-2 border-t border-[var(--color-divider)] px-6 py-4"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          activeTickerHint
            ? `Ask anything about ${activeTickerHint}, or something else entirely`
            : 'Why did my stocks drop today?'
        }
        disabled={running}
        className="flex-1 rounded-full border border-[var(--color-divider)] bg-[var(--color-surface)] px-4 py-2.5 font-body text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={running || !value.trim()}
        className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 font-body text-sm font-medium text-[var(--color-surface)] hover:opacity-90 disabled:opacity-40"
      >
        {running ? 'Thinking…' : 'Ask'}
      </button>
    </form>
  )
}