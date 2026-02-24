import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerStoreTools } from "./tools/store-tools.js";
import { registerAscTools } from "./tools/asc-tools.js";

// CLI validation mode: `node dist/index.js --validate [file]`
if (process.argv.includes("--validate")) {
  const { runCLIValidation } = await import("./cli-validate.js");
  const filePath = process.argv[process.argv.indexOf("--validate") + 1];
  await runCLIValidation(filePath);
  process.exit(0);
}

// Normal MCP server mode
const server = new McpServer({
  name: "appstore-connect",
  version: "0.1.0",
});

// Register tool groups
registerStoreTools(server);
registerAscTools(server);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
