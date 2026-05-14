import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendHistoryEntry, readHistory } from "../history.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "appstore-history-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("history", () => {
  it("appends an entry to pushes.jsonl, creating the file and directory", async () => {
    await appendHistoryEntry("pushes", {
      tool: "asc_set_categories",
      target: { app_id: "1234567890" },
      payload: { primary: "PRODUCTIVITY", secondary: "UTILITIES" },
      result: "success",
    });

    const path = join(tempDir, ".appstore", "history", "pushes.jsonl");
    const content = await readFile(path, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]);
    expect(entry.tool).toBe("asc_set_categories");
    expect(entry.payload.primary).toBe("PRODUCTIVITY");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.result).toBe("success");
  });

  it("appends multiple entries on separate lines", async () => {
    await appendHistoryEntry("pushes", { tool: "a", target: {}, payload: {}, result: "success" });
    await appendHistoryEntry("pushes", { tool: "b", target: {}, payload: {}, result: "success" });
    const entries = await readHistory("pushes");
    expect(entries).toHaveLength(2);
    expect(entries[0].tool).toBe("a");
    expect(entries[1].tool).toBe("b");
  });

  it("returns [] when reading a stream that doesn't exist yet", async () => {
    const entries = await readHistory("audits");
    expect(entries).toEqual([]);
  });

  it("captures error results with the error message", async () => {
    await appendHistoryEntry("pushes", {
      tool: "asc_set_categories",
      target: { app_id: "x" },
      payload: { primary: "INVALID" },
      result: "error",
      error: "ASC: invalid category",
    });
    const entries = await readHistory("pushes");
    expect(entries[0].result).toBe("error");
    expect(entries[0].error).toBe("ASC: invalid category");
  });
});
