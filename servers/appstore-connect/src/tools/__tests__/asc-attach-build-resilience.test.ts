import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/builds.js", () => ({
  listBuilds: vi.fn(),
  attachBuildToVersion: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("t"),
}));
vi.mock("../../store/history.js", () => ({
  appendHistoryEntry: vi.fn().mockRejectedValue(new Error("disk full")),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "attach-res-"));
  process.chdir(tempDir);
  await mkdir(join(tempDir, ".appstore"), { recursive: true });
  const server = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const o = (server.tool as any).bind(server);
  (server.tool as any) = (n: string, ...r: any[]) =>
    (registry.set(n, { handler: r[r.length - 1] }), o(n, ...r));
  registerAscTools(server);
});
afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("asc_attach_build history resilience", () => {
  it("returns success even when history append throws", async () => {
    const tool = registry.get("asc_attach_build")!;
    const res = await tool.handler({ version_id: "v_1", build_id: "b_1" });
    expect(res.isError).not.toBe(true);
  });
});
