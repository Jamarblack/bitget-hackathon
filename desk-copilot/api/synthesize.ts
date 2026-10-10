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

const UPSTREAM_TIMEOUT_MS = 50000



function extractJson(raw: string): unknown {
  const noThink = raw.replace(/<think>[\s\S]*?<\/think>/g, '')
  const start = noThink.indexOf('{')
  const end = noThink.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('no JSON object found in model reply')
  return JSON.parse(noThink.slice(start, end + 1))
}

function fail(res: VercelLikeRes, status: number, error: string, detail: string): void {

  console.error(`[api/synthesize] ${error}: ${detail}`)
  res.status(status).json({ error, detail })
}

export default async function handler(req: VercelLikeReq, res: VercelLikeRes): Promise<void> {
  if (req.method !== 'POST') {
    fail(res, 405, 'method not allowed', 'POST only')
    return
  }

  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) {
    fail(res, 500, 'server misconfigured', 'QWEN_API_KEY is not set in this deployment environment')
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
      fail(res, 502, 'qwen upstream error', `status ${upstream.status}: ${text.slice(0, 300)}`)
      return
    }

    const data = await upstream.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    if (!raw) {
      fail(res, 502, 'qwen returned no content', JSON.stringify(data).slice(0, 300))
      return
    }

    res.status(200).json(extractJson(raw))
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    fail(
      res,
      isTimeout ? 504 : 500,
      isTimeout ? 'qwen timed out' : 'synthesis failed',
      String(err)
    )
  } finally {
    clearTimeout(timeout)
  }
}