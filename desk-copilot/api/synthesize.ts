export const config = { runtime: 'nodejs' }

interface SkillResultIn {
  skill: string
  label: string
  summary: string
}

interface RequestBody {
  query: string
  watch: { ticker: string; timeframe: string; worryLevel: string; note: string } | null
  skillResults: SkillResultIn[]
}

// Vercel's Node.js runtime (as opposed to Edge) uses this Express-like
// shape, not the Fetch API Request/Response — req.body is pre-parsed
// JSON, and you write the response via res.status().json() rather than
// returning a Response object. Using @vercel/node's types would also
// work, but this avoids adding another dependency just for types.
interface VercelLikeReq {
  method?: string
  body?: unknown
}
interface VercelLikeRes {
  status: (code: number) => VercelLikeRes
  json: (body: unknown) => void
}

const SYSTEM_PROMPT = `You are the synthesis layer of Plain Money, a market
explainer for everyday people who own a few stocks or are curious about
investing — not active traders. They don't speak finance jargon.

Given a user's question, an optional saved "watch" (a stock they're
tracking, with why they care and how nervous market swings make them),
and raw research signals pulled from several analysis sources, produce a
plain-English answer. Respond with ONLY valid JSON, no markdown fences,
no preamble, matching exactly this shape:

{
  "headline": string,
  "supportingSignals": [ { "skill": string, "point": string } ],
  "riskFlags": [string],
  "confidence": "low" | "medium" | "high"
}

Rules: no unexplained financial jargon (if you must use a term like
"volatility" or "P/E ratio", explain it in the same sentence). Prefer
everyday comparisons over statistics. Never sound alarmist — explain risk
calmly.`

const UPSTREAM_TIMEOUT_MS = 20000

export default async function handler(req: VercelLikeReq, res: VercelLikeRes): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'QWEN_API_KEY not configured on server' })
    return
  }

  const { query, watch, skillResults } = (req.body ?? {}) as RequestBody
  const userContent = JSON.stringify({ query, watch, skillResults })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const upstream = await fetch('https://hackathon.bitgetops.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen3.8-max',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      res.status(502).json({ error: 'upstream error', detail: text })
      return
    }

    const data = await upstream.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    res.status(200).json(parsed)
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? 'upstream timed out' : 'synthesis failed',
      detail: String(err),
    })
  } finally {
    clearTimeout(timeout)
  }
}