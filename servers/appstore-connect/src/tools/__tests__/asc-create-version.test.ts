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
import { createVersion } from "../../api/release.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "create-version-"));
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

describe("asc_create_version", () => {
  it("calls the API and returns the new version's id", async () => {
    (createVersion as any).mockResolvedValue({ id: "v_new", versionString: "1.1.0" });
    const tool = registry.get("asc_create_version")!;
    const res = await tool.handler({ app_id: "app_1", version_string: "1.1.0", platform: "IOS" });
    expect(res.isError).not.toBe(true);
    expect(createVersion).toHaveBeenCalledWith({ appId: "app_1", versionString: "1.1.0", platform: "IOS" });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.id).toBe("v_new");
  });
});
