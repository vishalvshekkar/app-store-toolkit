import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/builds.js", () => ({
  listBuilds: vi.fn(),
  attachBuildToVersion: vi.fn(),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("t"),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";
import { listBuilds } from "../../api/builds.js";

let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(() => {
  vi.clearAllMocks();
  const server = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const o = (server.tool as any).bind(server);
  (server.tool as any) = (name: string, ...rest: any[]) =>
    (registry.set(name, { handler: rest[rest.length - 1] }), o(name, ...rest));
  registerAscTools(server);
});

describe("asc_list_builds", () => {
  it("returns the API list", async () => {
    (listBuilds as any).mockResolvedValue([
      { id: "b_1", build_number: "1", version: "1.0", processing_state: "VALID", valid: true, expires_at: "2026-08-15T00:00:00Z" },
    ]);
    const tool = registry.get("asc_list_builds")!;
    const res = await tool.handler({ app_id: "app_1" });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed[0].valid).toBe(true);
    expect(listBuilds).toHaveBeenCalledWith("app_1");
  });
});
