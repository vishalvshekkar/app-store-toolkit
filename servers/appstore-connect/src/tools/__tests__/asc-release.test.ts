import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/release.js", () => ({
  setReleaseStrategy: vi.fn(),
  createVersion: vi.fn(),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("t"),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";
import { setReleaseStrategy } from "../../api/release.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "release-"));
  process.chdir(tempDir);
  await mkdir(join(tempDir, ".appstore"), { recursive: true });
  vi.clearAllMocks();
  const server = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const o = (server.tool as any).bind(server);
  (server.tool as any) = (name: string, ...rest: any[]) =>
    (registry.set(name, { handler: rest[rest.length - 1] }), o(name, ...rest));
  registerAscTools(server);
});
afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("asc_set_release_strategy", () => {
  it("calls the API with AFTER_APPROVAL", async () => {
    (setReleaseStrategy as any).mockResolvedValue(undefined);
    const tool = registry.get("asc_set_release_strategy")!;
    const res = await tool.handler({ version_id: "v_1", strategy: { type: "AFTER_APPROVAL" } });
    expect(res.isError).not.toBe(true);
    expect(setReleaseStrategy).toHaveBeenCalledWith("v_1", { type: "AFTER_APPROVAL" });
  });

  it("calls the API with SCHEDULED + date", async () => {
    (setReleaseStrategy as any).mockResolvedValue(undefined);
    const tool = registry.get("asc_set_release_strategy")!;
    const res = await tool.handler({
      version_id: "v_1",
      strategy: { type: "SCHEDULED", earliestReleaseDate: "2026-06-01T00:00:00Z" },
    });
    expect(res.isError).not.toBe(true);
    expect(setReleaseStrategy).toHaveBeenCalledWith("v_1", { type: "SCHEDULED", earliestReleaseDate: "2026-06-01T00:00:00Z" });
  });
});
