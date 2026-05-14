import { readFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getAppstoreDir } from "./config.js";

export type HistoryStream = "pushes" | "submissions" | "audits";

/** A single audit-log entry. Persisted as one JSON object per line. */
export interface HistoryEntry {
  /** ISO 8601 UTC timestamp, set by appendHistoryEntry if omitted */
  timestamp?: string;
  /** Tool or skill name that produced the entry */
  tool: string;
  /** Identifying context (app_id, version_id, locale, etc.) */
  target: Record<string, unknown>;
  /** Sanitized payload that was sent to ASC or computed locally */
  payload: Record<string, unknown>;
  /** Outcome of the operation */
  result: "success" | "error" | "skipped";
  /** Error message when result === "error" */
  error?: string;
  /** Optional additional details (e.g., per-locale results) */
  details?: Record<string, unknown>;
}

function getHistoryDir(): string {
  return join(getAppstoreDir(), "history");
}

function getStreamPath(stream: HistoryStream): string {
  return join(getHistoryDir(), `${stream}.jsonl`);
}

async function ensureHistoryDir(): Promise<void> {
  const dir = getHistoryDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/** Append a single entry to a history stream. Auto-creates dir/file. */
export async function appendHistoryEntry(
  stream: HistoryStream,
  entry: HistoryEntry
): Promise<void> {
  await ensureHistoryDir();
  const withTimestamp: HistoryEntry = {
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  const line = JSON.stringify(withTimestamp) + "\n";
  await appendFile(getStreamPath(stream), line, "utf-8");
}

/** Read all entries from a history stream. Returns [] if the stream is empty. */
export async function readHistory(stream: HistoryStream): Promise<HistoryEntry[]> {
  const path = getStreamPath(stream);
  if (!existsSync(path)) return [];
  const raw = await readFile(path, "utf-8");
  return raw
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as HistoryEntry);
}
