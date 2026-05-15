import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "audit-prep-"));
  process.chdir(tempDir);
  // Fixture metadata and asset structure
  const metaDir = join(tempDir, ".appstore", "metadata", "en-US", "ios");
  await mkdir(metaDir, { recursive: true });
  await writeFile(join(metaDir, "description.json"), JSON.stringify({ latest: 1, iterations: [{ id: 1, content: "Track meals and macros." }] }));
  await writeFile(join(metaDir, "keywords.json"), JSON.stringify({ latest: 1, iterations: [{ id: 1, content: "diet,calories,nutrition" }] }));
  await writeFile(join(metaDir, "promotional_text.json"), JSON.stringify({ latest: 1, iterations: [{ id: 1, content: "Free 7-day trial" }] }));
  const assetDir = join(tempDir, ".appstore", "assets", "ios", "en-US", "iphone-6.7", "screenshots");
  await mkdir(assetDir, { recursive: true });
  await writeFile(join(assetDir, "01-home.png"), Buffer.alloc(8));
  await writeFile(join(assetDir, "02-stats.png"), Buffer.alloc(8));

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

describe("audit_prepare_cross_surface", () => {
  it("returns the prompt, screenshot paths, and copy for a locale", async () => {
    const tool = registry.get("audit_prepare_cross_surface")!;
    const res = await tool.handler({ locale: "en-US", platform: "ios" });
    expect(res.isError).not.toBe(true);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.copy.description).toContain("Track meals");
    expect(parsed.copy.promotional_text).toBe("Free 7-day trial");
    expect(parsed.screenshots).toHaveLength(2);
    expect(parsed.screenshots[0].position).toBe(1);
    expect(parsed.screenshots[1].position).toBe(2);
    expect(parsed.prompt).toContain("cross-surface consistency");
    expect(parsed.prompt).toContain("Return ONLY a JSON array of findings");
  });

  it("snapshots the prompt template (locks against drift)", async () => {
    const tool = registry.get("audit_prepare_cross_surface")!;
    const res = await tool.handler({ locale: "en-US", platform: "ios" });
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.prompt).toMatchInlineSnapshot(`
      "You are checking cross-surface consistency between an iOS app's localized App Store copy and its screenshots, for locale en-US on ios.

      LOCALIZED COPY:
      - Description: Track meals and macros.
      - Keywords: diet,calories,nutrition
      - Promotional text: Free 7-day trial
      - What's new: 

      SCREENSHOTS:
        1. iphone-6.7 position 1: <image attached separately>
        2. iphone-6.7 position 2: <image attached separately>

      For each screenshot, extract the on-screen text and identify what feature/claim it shows. Then compare against the copy.

      FLAG:
      - Contradictions: copy says one thing, screenshot shows another (e.g., "7-day trial" in copy, "30-day trial" on screen).
      - Missing promises: a claim in the copy is not visually demonstrated by any screenshot.
      - Stale screen text: a screen shows a feature/wording not mentioned in copy and likely should be.

      Return ONLY a JSON array of findings, no prose. Each finding:
      {
        "type": "contradiction" | "missing_promise" | "stale_screen_text",
        "screenshot": "<device>/<file>" or null,
        "screen_text_extracted": "<text>" or null,
        "copy_field": "description" | "keywords" | "promotional_text" | "whats_new" | null,
        "copy_says": "<excerpt>" or null,
        "severity": "blocker" | "quality",
        "fix": "<one sentence suggestion>"
      }

      If there are no findings, return []."
    `);
  });
});
