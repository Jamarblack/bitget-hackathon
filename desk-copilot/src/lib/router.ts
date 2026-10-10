// Works out which stock (if any) a question is about, so the app knows
// whether to fetch a price and analyst view or just the overall market mood.

const NAME_TO_TICKER: Record<string, string> = {
  apple: 'AAPL',
  microsoft: 'MSFT',
  nvidia: 'NVDA',
  tesla: 'TSLA',
  amazon: 'AMZN',
  google: 'GOOGL',
  alphabet: 'GOOGL',
  meta: 'META',
  facebook: 'META',
  netflix: 'NFLX',
  disney: 'DIS',
  intel: 'INTC',
  amd: 'AMD',
  boeing: 'BA',
  walmart: 'WMT',
  costco: 'COST',
  nike: 'NKE',
  starbucks: 'SBUX',
  paypal: 'PYPL',
  uber: 'UBER',
  coinbase: 'COIN',
  palantir: 'PLTR',
  oracle: 'ORCL',
  salesforce: 'CRM',
  adobe: 'ADBE',
  mastercard: 'MA',
}

const KNOWN_TICKERS = new Set<string>([...Object.values(NAME_TO_TICKER), 'QQQ', 'SPY', 'JPM', 'KO', 'PEP', 'BABA', 'TSM', 'V'])
const TICKER_SHAPE = /^[A-Z][A-Z.\-]{0,5}$/


export function normalizeTicker(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const byName = NAME_TO_TICKER[t.toLowerCase()]
  if (byName) return byName
  const upper = t.toUpperCase()
  return TICKER_SHAPE.test(upper) ? upper : null
}


export function resolveSymbol(query: string, watchTicker: string | null): string | null {
  const dollar = query.match(/\$([A-Za-z]{1,5})\b/)
  if (dollar) return dollar[1].toUpperCase()

  for (const word of query.match(/\b[A-Za-z]{2,}\b/g) ?? []) {
    const byName = NAME_TO_TICKER[word.toLowerCase()]
    if (byName) return byName
    const upper = word.toUpperCase()
    if (word === upper && KNOWN_TICKERS.has(upper)) return upper
  }

  return watchTicker ? normalizeTicker(watchTicker) : null
}