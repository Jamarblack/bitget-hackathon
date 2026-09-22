// One-off discovery script — run with `node scripts/list-mcp-tools.mjs`
// Prints every tool bitget-mcp-server exposes, with its input schema,
// so we can wire real calls instead of guessing tool names.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const MCP_URL = 'https://agent.bitget.com/mcp'

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL))
  const client = new Client({ name: 'desk-copilot-discovery', version: '0.1.0' })
  await client.connect(transport)

  const { tools } = await client.listTools()
  console.log(`Found ${tools.length} tools:\n`)
  for (const t of tools) {
    console.log(`— ${t.name}`)
    if (t.description) console.log(`  ${t.description}`)
    console.log(`  input schema: ${JSON.stringify(t.inputSchema)}`)
    console.log()
  }

  await client.close()
}

main().catch((err) => {
  console.error('Discovery failed:', err)
  process.exit(1)
})