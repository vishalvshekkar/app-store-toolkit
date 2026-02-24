import type { FieldWithHistory } from "./types.js";
import { getLatestContent } from "./metadata.js";

export type SyncState = "in_sync" | "local_newer" | "remote_newer" | "conflict" | "local_only" | "remote_only";

export interface FieldDiff {
  field: string;
  locale: string;
  platform?: string;
  localContent: string | null;
  remoteContent: string | null;
  state: SyncState;
}

/**
 * Compare a local field with its remote counterpart.
 */
export function compareField(
  field: string,
  locale: string,
  localData: FieldWithHistory,
  remoteContent: string | null,
  platform?: string
): FieldDiff {
  const localContent = getLatestContent(localData);

  // Determine sync state
  let state: SyncState;

  if (localContent === null && remoteContent === null) {
    state = "in_sync";
  } else if (localContent === null && remoteContent !== null) {
    state = "remote_only";
  } else if (localContent !== null && remoteContent === null) {
    state = "local_only";
  } else if (localContent === remoteContent) {
    state = "in_sync";
  } else {
    // Both have content but differ — check if local was pulled from remote
    const latestIteration = localData.iterations.find(
      (i) => i.id === localData.latest
    );

    if (latestIteration?.source === "pulled_from_asc") {
      // Last local change was a pull, so remote must have changed since
      state = "remote_newer";
    } else {
      // Local has been modified since last pull (or never pulled)
      // Check if there's a pulled_from_asc iteration that matches remote
      const pulledIteration = [...localData.iterations]
        .reverse()
        .find((i) => i.source === "pulled_from_asc");

      if (pulledIteration && pulledIteration.content === remoteContent) {
        // Remote matches what we last pulled, local has new changes
        state = "local_newer";
      } else if (pulledIteration) {
        // Both changed since last sync
        state = "conflict";
      } else {
        // Never pulled, local has content
        state = "local_newer";
      }
    }
  }

  return {
    field,
    locale,
    platform,
    localContent,
    remoteContent,
    state,
  };
}

/** Format a list of diffs as a readable status table */
export function formatDiffTable(diffs: FieldDiff[]): string {
  if (diffs.length === 0) return "No fields to compare.";

  const lines: string[] = [];
  const maxFieldLen = Math.max(...diffs.map((d) => d.field.length), 5);
  const maxLocaleLen = Math.max(...diffs.map((d) => d.locale.length), 6);

  lines.push(
    `${"Field".padEnd(maxFieldLen)}  ${"Locale".padEnd(maxLocaleLen)}  Platform  Status`
  );
  lines.push("─".repeat(maxFieldLen + maxLocaleLen + 30));

  for (const diff of diffs) {
    const statusIcon = {
      in_sync: "  =  in sync",
      local_newer: "  >  local newer",
      remote_newer: "  <  remote newer",
      conflict: "  !  CONFLICT",
      local_only: "  +  local only",
      remote_only: "  -  remote only",
    }[diff.state];

    lines.push(
      `${diff.field.padEnd(maxFieldLen)}  ${diff.locale.padEnd(maxLocaleLen)}  ${(diff.platform ?? "—").padEnd(8)}  ${statusIcon}`
    );
  }

  const counts = {
    in_sync: diffs.filter((d) => d.state === "in_sync").length,
    local_newer: diffs.filter((d) => d.state === "local_newer").length,
    remote_newer: diffs.filter((d) => d.state === "remote_newer").length,
    conflict: diffs.filter((d) => d.state === "conflict").length,
  };

  lines.push("");
  lines.push(
    `Summary: ${counts.in_sync} in sync, ${counts.local_newer} local newer, ${counts.remote_newer} remote newer, ${counts.conflict} conflicts`
  );

  return lines.join("\n");
}
