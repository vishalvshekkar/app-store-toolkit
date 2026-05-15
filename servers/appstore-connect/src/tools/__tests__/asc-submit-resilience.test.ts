import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/submission.js", () => ({
  submitForReview: vi.fn().mockResolvedValue({ submission_id: "sub_xyz", submitted_at: "2026-05-15T18:43:00Z" }),
  getSubmissionState: vi.fn(),
}));
vi.mock("../../api/client.js", () => ({ ascRequest: vi.fn() }));
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
  tempDir = await mkdtemp(join(tmpdir(), "submit-res-"));
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

describe("asc_submit_for_review history resilience", () => {
  it("returns submit success even when history append throws", async () => {
    const tool = registry.get("asc_submit_for_review")!;
    const res = await tool.handler({ app_id: "app_1", version_id: "v_1", dry_run: false });
    expect(res.isError).not.toBe(true);
    expect(JSON.parse(res.content[0].text).submission_id).toBe("sub_xyz");
  });
});
