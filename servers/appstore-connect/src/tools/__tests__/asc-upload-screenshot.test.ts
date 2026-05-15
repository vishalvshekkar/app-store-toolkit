import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/screenshots.js", () => ({
  reserveScreenshot: vi.fn(),
  putScreenshotBytes: vi.fn(),
  commitScreenshot: vi.fn(),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("t"),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";
import { reserveScreenshot, putScreenshotBytes, commitScreenshot } from "../../api/screenshots.js";
import { readAssetsLock } from "../../store/assets-lock.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "upload-ss-"));
  process.chdir(tempDir);
  await mkdir(join(tempDir, ".appstore"), { recursive: true });

  vi.clearAllMocks();
  const server = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const orig = (server.tool as any).bind(server);
  (server.tool as any) = (name: string, ...rest: any[]) =>
    (registry.set(name, { handler: rest[rest.length - 1] }), orig(name, ...rest));
  registerAscTools(server);
});
afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

function makePng(width: number, height: number): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  function chunk(type: string, data: Buffer) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    return Buffer.concat([len, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", Buffer.alloc(0)), chunk("IEND", Buffer.alloc(0))]);
}

describe("asc_upload_screenshot", () => {
  it("calls reserve → PUT → commit in order with the right payloads, and writes the lock", async () => {
    const png = makePng(1290, 2796);
    const filePath = join(tempDir, "01-home.png");
    await writeFile(filePath, png);

    (reserveScreenshot as any).mockResolvedValue({
      id: "ss_1",
      fileName: "01-home.png",
      uploadOperations: [{ method: "PUT", url: "https://signed/01", length: png.length, offset: 0, requestHeaders: [] }],
    });
    (putScreenshotBytes as any).mockResolvedValue(undefined);
    (commitScreenshot as any).mockResolvedValue(undefined);

    const tool = registry.get("asc_upload_screenshot")!;
    const result = await tool.handler({
      set_id: "set_1",
      file_path: filePath,
      locale: "en-US",
      platform: "ios",
      device: "iphone-6.7",
    });

    expect(result.isError).not.toBe(true);
    expect(reserveScreenshot).toHaveBeenCalledWith({
      setId: "set_1",
      fileName: "01-home.png",
      fileSize: png.length,
    });
    expect(putScreenshotBytes).toHaveBeenCalledTimes(1);
    expect(commitScreenshot).toHaveBeenCalledWith("ss_1", expect.stringMatching(/^[a-f0-9]{32}$/));

    const lock = await readAssetsLock("en-US", "ios");
    expect(lock).not.toBeNull();
    const entries = lock!.screenshots["iphone-6.7"];
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      file: "01-home.png",
      asc_id: "ss_1",
      width: 1290,
      height: 2796,
    });
    expect(entries[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(entries[0].asc_checksum_md5).toMatch(/^[a-f0-9]{32}$/);
  });

  it("returns DIMENSION_MISMATCH when the PNG size does not match the declared device", async () => {
    const png = makePng(100, 100);
    const filePath = join(tempDir, "wrong.png");
    await writeFile(filePath, png);

    const tool = registry.get("asc_upload_screenshot")!;
    const result = await tool.handler({
      set_id: "set_1",
      file_path: filePath,
      locale: "en-US",
      platform: "ios",
      device: "iphone-6.7",
    });

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toMatch(/DIMENSION_MISMATCH/);
    expect(reserveScreenshot).not.toHaveBeenCalled();
  });

  it("returns FILE_NOT_FOUND when the file does not exist", async () => {
    const tool = registry.get("asc_upload_screenshot")!;
    const result = await tool.handler({
      set_id: "set_1",
      file_path: join(tempDir, "missing.png"),
      locale: "en-US",
      platform: "ios",
      device: "iphone-6.7",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/FILE_NOT_FOUND/);
  });
});
