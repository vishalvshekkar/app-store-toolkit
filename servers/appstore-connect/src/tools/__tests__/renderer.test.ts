import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// vi.hoisted ensures the spy is initialized BEFORE the hoisted vi.mock factory runs
const { mockRender } = vi.hoisted(() => ({ mockRender: vi.fn() }));

vi.mock("../renderer.js", () => ({
  ensurePuppeteer: vi.fn().mockResolvedValue(undefined),
  renderScreenshots: mockRender,
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "render-"));
  process.chdir(tempDir);
  mockRender.mockReset();
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

describe("assets_render_template", () => {
  it("reads assets.json, picks the device entries, and invokes the renderer", async () => {
    const metaDir = join(tempDir, ".appstore", "metadata", "en-US", "ios");
    await mkdir(metaDir, { recursive: true });
    await writeFile(join(metaDir, "assets.json"), JSON.stringify({
      screenshots: {
        "iphone-6.7": [
          { file: "01.png", headline: "Track every meal" },
          { file: "02.png", headline: "See your trends" },
        ],
      },
      previews: {},
    }));
    const tplDir = join(tempDir, ".appstore", "templates");
    await mkdir(tplDir, { recursive: true });
    await writeFile(join(tplDir, "screenshot-iphone-6.7.html"), "<html><body>{{headline}}</body></html>");

    mockRender.mockResolvedValue([
      { file: "01.png", path: "/p/01.png" },
      { file: "02.png", path: "/p/02.png" },
    ]);

    const tool = registry.get("assets_render_template")!;
    const res = await tool.handler({ locale: "en-US", platform: "ios", device: "iphone-6.7" });
    expect(res.isError).not.toBe(true);
    expect(mockRender).toHaveBeenCalledWith(expect.objectContaining({
      locale: "en-US",
      device: "iphone-6.7",
      width: 1290,
      height: 2796,
      entries: [
        { file: "01.png", headline: "Track every meal" },
        { file: "02.png", headline: "See your trends" },
      ],
    }));
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.rendered).toHaveLength(2);
  });

  it("returns an error when assets.json is missing", async () => {
    const tool = registry.get("assets_render_template")!;
    const res = await tool.handler({ locale: "en-US", platform: "ios", device: "iphone-6.7" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/assets\.json/);
  });
});
