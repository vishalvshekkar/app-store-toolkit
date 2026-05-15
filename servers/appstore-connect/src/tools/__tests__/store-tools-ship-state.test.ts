import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStoreTools } from "../store-tools.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "ship-state-tools-"));
  process.chdir(tempDir);

  const server = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const orig = (server.tool as any).bind(server);
  (server.tool as any) = (name: string, ...rest: any[]) => {
    registry.set(name, { handler: rest[rest.length - 1] });
    return orig(name, ...rest);
  };
  registerStoreTools(server);
});
afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("store_read/write/clear_ship_state", () => {
  it("read returns 'no ship-state.json' when the file doesn't exist", async () => {
    const tool = registry.get("store_read_ship_state")!;
    const res = await tool.handler({});
    expect(res.content[0].text).toMatch(/no ship-state\.json/i);
  });

  it("write then read round-trips", async () => {
    const state = {
      schema_version: 1,
      version: "1.0.0",
      started_at: "2026-05-15T18:00:00Z",
      current_phase: "push-listing",
      completed_phases: ["audit", "push-metadata"],
      audit_findings_ref: null,
      waivers: [],
    };
    const writeTool = registry.get("store_write_ship_state")!;
    await writeTool.handler({ state });

    const readTool = registry.get("store_read_ship_state")!;
    const res = await readTool.handler({});
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.current_phase).toBe("push-listing");
  });

  it("clear removes the state file", async () => {
    const writeTool = registry.get("store_write_ship_state")!;
    await writeTool.handler({
      state: {
        schema_version: 1,
        version: "1.0.0",
        started_at: "2026-05-15T18:00:00Z",
        current_phase: "audit",
        completed_phases: [],
        audit_findings_ref: null,
        waivers: [],
      },
    });
    const clearTool = registry.get("store_clear_ship_state")!;
    await clearTool.handler({});
    const readTool = registry.get("store_read_ship_state")!;
    const res = await readTool.handler({});
    expect(res.content[0].text).toMatch(/no ship-state\.json/i);
  });
});
