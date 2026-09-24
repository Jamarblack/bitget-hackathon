interface Props {
  onStart: () => void
}

const WHAT_IT_DOES = [
  {
    label: 'Ask anything, anytime',
    text: '"Why did my stocks drop today?" gets a straight answer — not a chart you have to decode yourself.',
  },
  {
    label: 'No jargon, ever',
    text: 'If we ever use a word like "volatility," we explain it in the same breath. Nothing you have to look up.',
  },
  {
    label: 'Calm about risk',
    text: "We'll tell you what could go wrong — just without being alarmist about it.",
  },
]

const STOCK_FAQS = [
  {
    q: 'What even is a "stock"?',
    a: "A tiny slice of ownership in a company. If the company does well over time, that slice can become worth more — and if it struggles, it can become worth less.",
  },
  {
    q: 'Why do stock prices move every day?',
    a: 'Buyers and sellers keep adjusting what they think a company is worth, based on news, earnings, and how people feel about the future. Most day-to-day moves are just this back-and-forth, not something dramatic happening.',
  },
  {
    q: 'Do I need to check my stocks every day?',
    a: "No. Most people who invest for the long run check in occasionally, not constantly — checking too often can just add stress without changing the outcome.",
  },
]

const TOOL_FAQS = [
  {
    q: 'Is this financial advice?',
    a: "No. We explain what's happening in plain language so you can make your own call. For anything that really matters — a big decision, a lot of money — it's worth talking to a professional too.",
  },
  {
    q: 'Where does the information come from?',
    a: 'Real market data sources, summarized by AI into plain English. We show what informed the answer, not just a confident-sounding guess.',
  },
  {
    q: 'Is what I save private?',
    a: "By default, the stocks you save stay on your own device. We don't sell your data.",
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-dashed border-[var(--color-divider)] py-4">
      <summary className="cursor-pointer list-none font-body text-[15px] font-medium text-[var(--color-ink)] marker:content-none">
        {q}
      </summary>
      <p className="mt-2 font-body text-sm leading-relaxed text-[var(--color-ink-muted)]">{a}</p>
    </details>
  )
}

// A jagged line settling into a smooth one — the whole product's idea,
// as one visual: noisy market data, calmed into something plain.
function CalmingLine() {
  return (
    <svg
      viewBox="0 0 400 60"
      className="h-12 w-full max-w-sm text-[var(--color-accent)]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 30 L20 12 L38 44 L56 8 L74 38 L92 18 L110 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <path
        d="M110 30 C 180 30, 220 30, 400 30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Landing({ onStart }: Props) {
  return (
    <div className="min-h-screen bg-[var(--color-base)]">
      <div className="bg-[var(--color-surface-raised)]">
        <div className="mx-auto max-w-xl px-6 pb-14 pt-16">
          <p className="mb-4 font-body text-sm text-[var(--color-ink-muted)]">Plain Money</p>
          <h1 className="mb-2 font-display text-5xl leading-[1.1] text-[var(--color-ink)]">
            Understand your money,
            <br />
            <span className="italic text-[var(--color-accent)]">without the jargon.</span>
          </h1>
          <CalmingLine />
          <p className="mb-8 mt-6 max-w-md font-body text-base leading-relaxed text-[var(--color-ink-muted)]">
            Plain Money turns confusing market news into a straight answer — in words you already
            understand. Built for people who own a few stocks, not people who trade for a living.
          </p>
          <button
            onClick={onStart}
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 font-body text-sm font-medium text-[var(--color-surface)] hover:opacity-90"
          >
            Ask your first question
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="space-y-8">
          {WHAT_IT_DOES.map((item, i) => (
            <div key={item.label} className="flex gap-4">
              <span className="font-display text-2xl italic text-[var(--color-accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="font-body text-[15px] font-medium text-[var(--color-ink)]">{item.label}</p>
                <p className="mt-1 font-body text-sm leading-relaxed text-[var(--color-ink-muted)]">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="mb-2 font-display text-xl text-[var(--color-ink)]">New to investing?</h2>
          <p className="mb-4 font-body text-sm text-[var(--color-ink-muted)]">
            A few basics, in case you want them before you start.
          </p>
          {STOCK_FAQS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        <div className="mt-16">
          <h2 className="mb-2 font-display text-xl text-[var(--color-ink)]">About Plain Money</h2>
          {TOOL_FAQS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        <button
          onClick={onStart}
          className="mt-16 rounded-full bg-[var(--color-accent)] px-6 py-3 font-body text-sm font-medium text-[var(--color-surface)] hover:opacity-90"
        >
          Ask your first question
        </button>
      </div>
    </div>
  )
}