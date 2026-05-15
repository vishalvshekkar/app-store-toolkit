import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/screenshots.js", () => ({
  reserveScreenshot: vi.fn().mockResolvedValue({
    id: "ss_1",
    fileName: "01.png",
    uploadOperations: [{ method: "PUT", url: "https://signed/01", length: 0, offset: 0, requestHeaders: [] }],
  }),
  putScreenshotBytes: vi.fn().mockResolvedValue(undefined),
  commitScreenshot: vi.fn().mockResolvedValue(undefined),
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

function makePng(w: number, h: number): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    return Buffer.concat([len, Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
  };
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", Buffer.alloc(0)), chunk("IEND", Buffer.alloc(0))]);
}

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "upload-ss-res-"));
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

describe("asc_upload_screenshot history resilience", () => {
  it("returns upload success even when history append throws", async () => {
    const png = makePng(1290, 2796);
    const filePath = join(tempDir, "01.png");
    await writeFile(filePath, png);

    const tool = registry.get("asc_upload_screenshot")!;
    const result = await tool.handler({
      set_id: "set_1", file_path: filePath, locale: "en-US", platform: "ios", device: "iphone-6.7",
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text).uploaded).toBe(true);
  });
});
