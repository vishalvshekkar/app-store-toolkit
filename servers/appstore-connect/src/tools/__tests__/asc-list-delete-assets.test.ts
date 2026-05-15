import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/screenshots.js", () => ({
  listScreenshots: vi.fn(),
  deleteScreenshot: vi.fn(),
  reserveScreenshot: vi.fn(),
  putScreenshotBytes: vi.fn(),
  commitScreenshot: vi.fn(),
}));
vi.mock("../../api/app-previews.js", () => ({
  listAppPreviews: vi.fn(),
  deleteAppPreview: vi.fn(),
  reserveAppPreview: vi.fn(),
  commitAppPreview: vi.fn(),
  secondsToTimeCode: vi.fn(),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("t"),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";
import { listScreenshots, deleteScreenshot } from "../../api/screenshots.js";
import { listAppPreviews, deleteAppPreview } from "../../api/app-previews.js";
import { readAssetsLock, writeAssetsLock, emptyAssetsLock } from "../../store/assets-lock.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "ld-assets-"));
  process.chdir(tempDir);
  await mkdir(join(tempDir, ".appstore"), { recursive: true });
  vi.clearAllMocks();
  const s = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const o = (s.tool as any).bind(s);
  (s.tool as any) = (n: string, ...r: any[]) => (registry.set(n, { handler: r[r.length - 1] }), o(n, ...r));
  registerAscTools(s);
});
afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("asc_list_screenshots", () => {
  it("returns the list from the API", async () => {
    (listScreenshots as any).mockResolvedValue([
      { id: "ss_1", fileName: "01.png", sourceFileChecksum: "md5", width: 1290, height: 2796 },
    ]);
    const tool = registry.get("asc_list_screenshots")!;
    const res = await tool.handler({ set_id: "set_1" });
    expect(JSON.parse(res.content[0].text)).toEqual([
      { id: "ss_1", fileName: "01.png", sourceFileChecksum: "md5", width: 1290, height: 2796 },
    ]);
  });
});

describe("asc_list_app_previews", () => {
  it("returns the list from the API", async () => {
    (listAppPreviews as any).mockResolvedValue([
      { id: "pv_1", fileName: "01.mp4", sourceFileChecksum: "md5", previewFrameTimeCode: "00:00:02.500" },
    ]);
    const tool = registry.get("asc_list_app_previews")!;
    const res = await tool.handler({ set_id: "pset_1" });
    expect(JSON.parse(res.content[0].text)[0].fileName).toBe("01.mp4");
  });
});

describe("asc_delete_screenshot", () => {
  it("calls deleteScreenshot and nulls the matching lock entry's asc_id", async () => {
    const lock = emptyAssetsLock();
    lock.screenshots["iphone-6.7"] = [
      { file: "01.png", sha256: "x", asc_id: "ss_1", asc_checksum_md5: "y", width: 1290, height: 2796, uploaded_at: "2026-05-15T00:00:00Z" },
    ];
    await writeAssetsLock("en-US", "ios", lock);

    (deleteScreenshot as any).mockResolvedValue(undefined);
    const tool = registry.get("asc_delete_screenshot")!;
    const res = await tool.handler({
      asset_id: "ss_1", locale: "en-US", platform: "ios", device: "iphone-6.7",
    });
    expect(res.isError).not.toBe(true);
    expect(deleteScreenshot).toHaveBeenCalledWith("ss_1");

    const updated = await readAssetsLock("en-US", "ios");
    expect(updated!.screenshots["iphone-6.7"][0].asc_id).toBeNull();
  });
});

describe("asc_delete_app_preview", () => {
  it("calls deleteAppPreview and nulls the lock entry's asc_id", async () => {
    const lock = emptyAssetsLock();
    lock.previews["iphone-6.7"] = [
      { file: "01.mp4", sha256: "x", asc_id: "pv_1", asc_checksum_md5: "y", width: 886, height: 1920, uploaded_at: "2026-05-15T00:00:00Z" },
    ];
    await writeAssetsLock("en-US", "ios", lock);

    (deleteAppPreview as any).mockResolvedValue(undefined);
    const tool = registry.get("asc_delete_app_preview")!;
    await tool.handler({ asset_id: "pv_1", locale: "en-US", platform: "ios", device: "iphone-6.7" });

    const updated = await readAssetsLock("en-US", "ios");
    expect(updated!.previews["iphone-6.7"][0].asc_id).toBeNull();
  });
});
