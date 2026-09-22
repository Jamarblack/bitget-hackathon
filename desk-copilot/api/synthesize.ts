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

const SYSTEM_PROMPT = `You are the synthesis layer of Plain Money, a market
explainer for everyday people who own a few stocks or are curious about
investing — not active traders. They don't speak finance jargon.

Given a user's question, an optional saved "watch" (a stock they're
tracking, with why they care and how nervous market swings make them),
and raw research signals pulled from several analysis sources, produce a
plain-English answer. Respond with ONLY valid JSON, no markdown fences,
no preamble, matching exactly this shape:

{
  "headline": string,        // one plain-English sentence answering their question directly, no jargon
  "supportingSignals": [ { "skill": string, "point": string } ],  // each point in plain language, use a simple analogy if it helps
  "riskFlags": [string],     // "things that could go wrong" or "reasons to be cautious" — phrased for a non-expert, not technical risk language
  "confidence": "low" | "medium" | "high"  // how sure the picture is, given the evidence
}

Rules: no unexplained financial jargon (if you must use a term like
"volatility" or "P/E ratio", explain it in the same sentence). Prefer
everyday comparisons over statistics. Never sound alarmist — explain risk
calmly.`

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 })
  }

  const apiKey = process.env.QWEN_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'QWEN_API_KEY not configured on server' }), {
      status: 500,
    })
  }

  const body = (await req.json()) as RequestBody
  const { query, watch, skillResults } = body
  const userContent = JSON.stringify({ query, watch, skillResults })

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
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return new Response(JSON.stringify({ error: 'upstream error', detail: text }), { status: 502 })
    }

    const data = await upstream.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'synthesis failed', detail: String(err) }), { status: 500 })
  }
}