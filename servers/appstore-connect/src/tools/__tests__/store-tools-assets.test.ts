import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStoreTools } from "../store-tools.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "store-assets-"));
  process.chdir(tempDir);

  const server = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const original = (server.tool as any).bind(server);
  (server.tool as any) = (name: string, ...rest: any[]) => {
    registry.set(name, { handler: rest[rest.length - 1] });
    return original(name, ...rest);
  };
  registerStoreTools(server);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("store_read_assets_lock / store_write_assets_lock", () => {
  it("read returns 'no assets.lock.json' when the file doesn't exist", async () => {
    const tool = registry.get("store_read_assets_lock")!;
    const res = await tool.handler({ locale: "en-US", platform: "ios" });
    const text = res.content[0].text;
    expect(text).toMatch(/no assets\.lock\.json/i);
  });

  it("write then read round-trips", async () => {
    const writeTool = registry.get("store_write_assets_lock")!;
    const lock = {
      schema_version: 1,
      screenshots: {
        "iphone-6.7": [
          {
            file: "01.png",
            sha256: "abc",
            asc_id: "id1",
            asc_checksum_md5: "md5",
            width: 1290,
            height: 2796,
            uploaded_at: "2026-05-15T00:00:00Z",
          },
        ],
      },
      previews: {},
    };
    const writeRes = await writeTool.handler({ locale: "en-US", platform: "ios", lock });
    expect(writeRes.isError).not.toBe(true);

    const readTool = registry.get("store_read_assets_lock")!;
    const readRes = await readTool.handler({ locale: "en-US", platform: "ios" });
    const parsed = JSON.parse(readRes.content[0].text);
    expect(parsed.screenshots["iphone-6.7"][0].asc_id).toBe("id1");
  });
});
