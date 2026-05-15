import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
import { attachBuildToVersion } from "../../api/builds.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "attach-build-"));
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

describe("asc_attach_build", () => {
  it("calls attachBuildToVersion and returns success", async () => {
    (attachBuildToVersion as any).mockResolvedValue(undefined);
    const tool = registry.get("asc_attach_build")!;
    const res = await tool.handler({ version_id: "v_1", build_id: "b_1" });
    expect(res.isError).not.toBe(true);
    expect(attachBuildToVersion).toHaveBeenCalledWith("v_1", "b_1");
  });
});
