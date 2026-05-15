import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  tempDir = await mkdtemp(join(tmpdir(), "validate-"));
  process.chdir(tempDir);

  // Set up one good and one bad PNG under .appstore/assets/ios/en-US/iphone-6.7/screenshots/
  const base = join(tempDir, ".appstore", "assets", "ios", "en-US", "iphone-6.7", "screenshots");
  await mkdir(base, { recursive: true });
  await writeFile(join(base, "01-good.png"), makePng(1290, 2796));
  await writeFile(join(base, "02-bad.png"), makePng(100, 200));

  const server = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const o = (server.tool as any).bind(server);
  (server.tool as any) = (n: string, ...r: any[]) => (registry.set(n, { handler: r[r.length - 1] }), o(n, ...r));
  registerAscTools(server);
});
afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("assets_validate_dimensions", () => {
  it("returns ok for matching and fails for mismatching", async () => {
    const tool = registry.get("assets_validate_dimensions")!;
    const res = await tool.handler({ locale: "en-US", platform: "ios" });
    expect(res.isError).not.toBe(true);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.summary.total).toBe(2);
    expect(parsed.summary.ok).toBe(1);
    expect(parsed.summary.failed).toBe(1);
    const good = parsed.results.find((r: any) => r.file.endsWith("01-good.png"));
    expect(good.ok).toBe(true);
    const bad = parsed.results.find((r: any) => r.file.endsWith("02-bad.png"));
    expect(bad.ok).toBe(false);
    expect(bad.actual).toEqual({ width: 100, height: 200 });
  });

  it("returns an empty result when the assets dir is missing", async () => {
    await rm(join(tempDir, ".appstore", "assets"), { recursive: true, force: true });
    const tool = registry.get("assets_validate_dimensions")!;
    const res = await tool.handler({ locale: "en-US", platform: "ios" });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.summary.total).toBe(0);
  });
});
