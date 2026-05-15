import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the api wrappers + the history module BEFORE importing the tool registrar
vi.mock("../../api/categories.js", () => ({
  setCategories: vi.fn().mockResolvedValue({
    id: "ai_1",
    attributes: { primaryCategory: "PRODUCTIVITY" },
  }),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("test-token"),
}));
vi.mock("../../store/history.js", () => ({
  appendHistoryEntry: vi.fn().mockRejectedValue(new Error("disk full")),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";

describe("MCP tool history-write resilience", () => {
  let server: McpServer;
  let registry: Map<string, { handler: (args: any) => Promise<any> }>;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.0" });
    registry = new Map();
    const originalTool = server.tool.bind(server) as any;
    vi.spyOn(server, "tool").mockImplementation((name: string, ...rest: any[]) => {
      // Last argument is the handler
      const handler = rest[rest.length - 1];
      registry.set(name, { handler });
      return originalTool(name, ...rest);
    });
    registerAscTools(server);
  });

  it("asc_set_categories returns the API success even when history append throws", async () => {
    const tool = registry.get("asc_set_categories")!;
    const result = await tool.handler({
      app_info_id: "ai_1",
      primary: "PRODUCTIVITY",
    });
    expect(result.isError).not.toBe(true);
    const text = result.content[0].text;
    expect(text).toContain("PRODUCTIVITY");
  });
});
