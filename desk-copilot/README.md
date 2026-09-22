# Plain Money

A market explainer for everyday people who own a few stocks or are curious
about investing — not active traders. Built for **Bitget AI Base Camp
Hackathon S2** — AI Trading Desk track, Open Theme.

Pivoted from an earlier trader-focused concept ("Desk Copilot") — same
underlying architecture, reframed for a broader, non-expert audience: ask
anything about the market in plain English, get an answer without jargon,
with reasons to be cautious explained calmly rather than in technical
risk-speak.

Ask a question, the app routes it to relevant `bitget-signal` research
sources (macro, market-intel, news, sentiment, technical), and Qwen
synthesizes the results into: **plain-English answer → why → things to
keep in mind → how confident**. Save stocks you're "watching" so
follow-ups remember what you care about.

## Status

Working end to end with **mock data** where real integrations aren't
wired yet, clearly flagged in code:

| File | Status |
|---|---|
| `src/skills/index.ts` | 4 of 5 skills wired to live `bitget-signal` MCP data; `technical-analysis` still mocked (needs local Python indicator computation) |
| `api/synthesize.ts` + `src/lib/synthesize.ts` | Wired to real Qwen (`qwen3.8-max`), plain-language prompt |
| `src/lib/supabase.ts` | Works without credentials (falls back to `localStorage`) |
| `bitget-mcp-server` (US-stock fundamentals/quotes) | Not yet wired — blocked on local DNS resolution, see `scripts/list-mcp-tools.mjs` |

## Getting started (pnpm)

```bash
pnpm install
pnpm dev
```

To exercise the real Qwen synthesis locally, use `pnpm dlx vercel dev`
instead (needed for `/api` routes), with `QWEN_API_KEY` set in
`.env.local` — never as a `VITE_`-prefixed var, that would leak into the
client bundle.

To persist watches/reports to Supabase instead of localStorage: run
`supabase/schema.sql` in your project's SQL editor, then fill in
`.env.local` from `.env.example`.

## Stack

Vite + React + TypeScript + Tailwind v4 + Supabase, managed with pnpm.