A market explainer for people who own a few stocks, not people who trade for a living. Ask a question in plain English, get a straight answer built on real market data, with the risks explained calmly instead of in finance-speak.

Live demo: https://bitget-hack-copilot-wine.vercel.app
Built for: Bitget AI Base Camp Hackathon S2, AI Trading Desk track (Open Theme), solo entry
Who it's for

Casual retail investors who hold a handful of stocks, check in occasionally, and get anxious when the news mentions their holdings. They don't want a trading terminal or a bot. They want to understand what is happening to money they already hold. First-time buyers and the investing-curious can use it too, but the design (the "how much do price swings stress you out?" field, the calm tone) is built around the anxious holder.

What it does
You ask something like "How is Apple doing?" or "Is now a bad time to check my portfolio?"
The app works out which stock you mean (from the question, or from the stock you saved).
A serverless function fetches live data from Bitget's official MCP data service: a quote, what analysts think, and an overall market mood score.
Qwen turns those facts into a short plain-English answer: headline, why, things to keep in mind, how sure it is.
If a data source fails, the answer says so in plain words. It never fills the gap with invented numbers.

It does not place trades, give buy/sell advice, or predict prices.

Data sources

All data comes from bitget-mcp-server (https://agent.bitget.com/mcp), Bitget's official MCP server. It exposes two tools, guide (browse the catalog) and do_query (run a catalog entry). Plain Money uses three entries:

What you see	Catalog entry	What it gives
Latest price	equity_price_quote	price, change, day range, market value
What analysts think	equity_estimates_price_target	latest rating per firm, price targets
Overall market mood	sentiment_market_fear_greed	fear/greed score with history

Analyst ratings arrive in Chinese, so the server code translates them and groups them (bullish, neutral, bearish) before anything is summarized. Only the latest rating per firm from roughly the last six months is counted.

Qwen (qwen3.8-max, through Bitget's hackathon endpoint) writes the final explanation. It is told to use only the facts it was given, never to invent causes or numbers, and never to tell anyone to buy or sell.

Known limits
No news source yet. The news catalog entry needs a numeric label id, which I did not have time to map. Questions about why a stock moved can only be answered from price, analyst and mood data, and the answer says when the reason isn't visible in the data.
US stocks only. The tool does not use tokenized (rToken) markets.
Prices can be a day old. When markets are closed, "latest price" is the last trading session's. I have not cross-checked the numbers against a second provider.
A short list of company names is recognized ("Apple", "Nvidia"...). Anything else needs the ticker symbol.
Answers take a while. Real data plus a large model usually means 20 to 40 seconds.
No external user testing yet. Everything so far is my own testing.
Not financial advice. It explains; it does not recommend.
Run it locally
bash
pnpm install
pnpm dev                # the UI only: /api routes do not exist here

The data and writing steps live in serverless functions, so for the full app locally use Vercel's dev server:

bash
pnpm dlx vercel dev

Create .env.local in the project root:

QWEN_API_KEY=your_key_here

The Qwen key is read only on the server (api/synthesize.ts). Never give it a VITE_ prefix: Vite would bundle it into the public JavaScript.

Optional, for saving watches in Supabase instead of the browser's localStorage: run supabase/schema.sql in your project, then add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Without them the app works fine using localStorage.

Project layout
api/
  market-data.ts     MCP client: quote, analyst view, market mood (Bitget data)
  synthesize.ts      calls Qwen and returns the structured plain-English answer
src/
  pages/             Landing (FAQ for newcomers) and Home (the app)
  components/        WatchRail, QueryPrompt, ReportCard
  lib/router.ts      which stock is the question about?
  lib/synthesize.ts  orchestrates data fetch, synthesis and graceful fallbacks
  skills/index.ts    client for /api/market-data
supabase/schema.sql  optional persistence
vercel.json          gives the functions up to 60 seconds
Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Vercel serverless functions, the Model Context Protocol TypeScript SDK, Qwen via Bitget's endpoint, Supabase (optional).

Reliability notes

Both external services can be slow or fail, so every call has a timeout and every failure has a visible, honest outcome: if no data arrives the app says it couldn't reach live data; if data arrives but Qwen doesn't, the app shows the raw facts it found. A dead service never leaves a spinner running forever and never produces fabricated figures.

Disclaimer

Plain Money is an educational explainer built for a hackathon. It is not financial advice. For decisions that matter, talk to a qualified professional.