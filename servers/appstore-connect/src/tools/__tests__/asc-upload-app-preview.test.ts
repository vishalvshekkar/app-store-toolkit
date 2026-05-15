import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/app-previews.js", () => ({
  reserveAppPreview: vi.fn(),
  commitAppPreview: vi.fn(),
  secondsToTimeCode: (s: number) => `TC(${s})`,
}));
vi.mock("../../api/screenshots.js", async () => ({
  putScreenshotBytes: vi.fn().mockResolvedValue(undefined),
  reserveScreenshot: vi.fn(),
  commitScreenshot: vi.fn(),
  listScreenshots: vi.fn(),
  deleteScreenshot: vi.fn(),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("t"),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";
import { reserveAppPreview, commitAppPreview } from "../../api/app-previews.js";
import { readAssetsLock } from "../../store/assets-lock.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "upload-pv-"));
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

function makeMp4(width: number, height: number): Buffer {
  function box(type: string, data: Buffer) {
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length + 8, 0);
    return Buffer.concat([size, Buffer.from(type, "ascii"), data]);
  }
  const ftyp = box("ftyp", Buffer.concat([Buffer.from("isom"), Buffer.alloc(4), Buffer.from("isomavc1mp41")]));
  const tkhd = Buffer.alloc(92);
  tkhd.writeUInt32BE(width << 16, 76);
  tkhd.writeUInt32BE(height << 16, 80);
  return Buffer.concat([ftyp, box("moov", box("trak", box("tkhd", tkhd)))]);
}

describe("asc_upload_app_preview", () => {
  it("calls reserve → commit and stores cover_frame_seconds in the lock", async () => {
    const mp4 = makeMp4(886, 1920);
    const filePath = join(tempDir, "01-tour.mp4");
    await writeFile(filePath, mp4);

    (reserveAppPreview as any).mockResolvedValue({
      id: "pv_1",
      fileName: "01-tour.mp4",
      uploadOperations: [{ method: "PUT", url: "https://signed/01", length: mp4.length, offset: 0, requestHeaders: [] }],
    });
    (commitAppPreview as any).mockResolvedValue(undefined);

    const tool = registry.get("asc_upload_app_preview")!;
    const result = await tool.handler({
      set_id: "pset_1",
      file_path: filePath,
      locale: "en-US",
      platform: "ios",
      device: "iphone-6.7",
      cover_frame_seconds: 2.5,
    });

    expect(result.isError).not.toBe(true);
    expect(reserveAppPreview).toHaveBeenCalledWith({
      setId: "pset_1",
      fileName: "01-tour.mp4",
      fileSize: mp4.length,
      mimeType: "video/mp4",
    });
    expect(commitAppPreview).toHaveBeenCalledWith("pv_1", expect.stringMatching(/^[a-f0-9]{32}$/), "TC(2.5)");

    const lock = await readAssetsLock("en-US", "ios");
    expect(lock!.previews["iphone-6.7"][0]).toMatchObject({
      file: "01-tour.mp4",
      asc_id: "pv_1",
      width: 886,
      height: 1920,
      cover_frame_seconds: 2.5,
    });
  });
});
