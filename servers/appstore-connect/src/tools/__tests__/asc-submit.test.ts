import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/submission.js", () => ({
  submitForReview: vi.fn(),
  getSubmissionState: vi.fn(),
}));
vi.mock("../../api/client.js", () => ({
  ascRequest: vi.fn(),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("t"),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";
import { submitForReview } from "../../api/submission.js";
import { ascRequest } from "../../api/client.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "submit-"));
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

describe("asc_submit_for_review dry-run", () => {
  it("reports NO_BUILD_ATTACHED when version has no build relationship", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "v_1", attributes: { releaseType: "AFTER_APPROVAL" }, relationships: { build: { data: null } } },
    });
    const tool = registry.get("asc_submit_for_review")!;
    const res = await tool.handler({ app_id: "app_1", version_id: "v_1", dry_run: true });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.ready).toBe(false);
    expect(parsed.blockers.some((b: any) => b.check === "no-build-attached")).toBe(true);
    expect(submitForReview).not.toHaveBeenCalled();
  });

  it("reports ready:true when all prerequisites are met", async () => {
    (ascRequest as any).mockImplementation(async (path: string) => {
      if (path === "/v1/appStoreVersions/v_1") {
        return { data: { id: "v_1", attributes: { releaseType: "AFTER_APPROVAL" }, relationships: { build: { data: { id: "b_1", type: "builds" } } } } };
      }
      if (path === "/v1/builds/b_1") {
        return { data: { id: "b_1", attributes: { processingState: "VALID", usesNonExemptEncryption: false } } };
      }
      if (path === "/v1/appStoreVersions/v_1/appStoreReviewDetail") {
        return { data: { id: "rd_1", attributes: { contactFirstName: "A", contactLastName: "B", contactEmail: "e@e.com", reviewNotes: "ok" } } };
      }
      if (path === "/v1/apps/app_1/dataUsages") {
        return { data: [{ id: "du_1", attributes: { dataPublishState: "PUBLISHED" } }] };
      }
      if (path === "/v1/apps/app_1/appInfos") {
        return { data: [{ id: "ai_1", attributes: { primaryCategory: "PRODUCTIVITY" } }] };
      }
      return { data: null };
    });
    const tool = registry.get("asc_submit_for_review")!;
    const res = await tool.handler({ app_id: "app_1", version_id: "v_1", dry_run: true });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.ready).toBe(true);
    expect(parsed.blockers).toEqual([]);
    expect(submitForReview).not.toHaveBeenCalled();
  });
});

describe("asc_submit_for_review real submit", () => {
  it("calls submitForReview when dry_run=false", async () => {
    (submitForReview as any).mockResolvedValue({ submission_id: "sub_xyz", submitted_at: "2026-05-15T18:43:00Z" });
    const tool = registry.get("asc_submit_for_review")!;
    const res = await tool.handler({ app_id: "app_1", version_id: "v_1", dry_run: false });
    expect(res.isError).not.toBe(true);
    expect(submitForReview).toHaveBeenCalledWith("v_1");
  });
});
