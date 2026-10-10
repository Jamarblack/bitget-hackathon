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
  unavailable?: string[]
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

You will receive JSON with:
- "query": what the person asked
- "watch": a stock they're tracking (or null), including how much price
  swings stress them out
- "skillResults": real data that was just fetched. Each has a "skill" id and
  a "summary" of the facts
- "unavailable": data that could not be fetched (may be empty)

Write a plain-English answer using ONLY the facts in skillResults. Respond
with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:

{
  "headline": string,
  "supportingSignals": [ { "skill": string, "point": string } ],
  "riskFlags": [string],
  "confidence": "low" | "medium" | "high"
}

- headline: one plain-English sentence that directly answers their question.
- supportingSignals: one point per data source you used. "skill" must be one
  of the skill ids you were given. Explain each in everyday words.
- riskFlags: calm reasons for caution, plus a short note on anything listed
  in "unavailable" that you could not check.
- confidence: how well the data actually answers the question.

Rules:
- Never invent numbers, dates, causes or news. If the data shows WHAT is
  happening but not WHY, say plainly that you can see the numbers but not
  the reason.
- Prices may be from the most recent trading session if markets are closed.
- Analyst ratings are opinions, not predictions.
- Do not tell the person to buy, sell or hold anything.
- If the watch says price swings stress them out a lot, be extra calm and
  reassuring, without hiding any facts.
- No unexplained financial jargon: if you must use a term like "market
  value" or "price target", explain it in the same sentence. Prefer everyday
  comparisons over statistics. Never sound alarmist.`

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

  const { query, watch, skillResults, unavailable } = (req.body ?? {}) as RequestBody
  const userContent = JSON.stringify({ query, watch, skillResults, unavailable: unavailable ?? [] })

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
    fail(res, isTimeout ? 504 : 500, isTimeout ? 'qwen timed out' : 'synthesis failed', String(err))
  } finally {
    clearTimeout(timeout)
  }
}