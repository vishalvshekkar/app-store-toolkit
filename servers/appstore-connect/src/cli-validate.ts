import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { CHAR_LIMITS, validateField } from "./validation/limits.js";
import { getLatestContent } from "./store/metadata.js";
import type { MetadataField, FieldWithHistory } from "./store/types.js";

/**
 * CLI validation mode — invoked by hook scripts to validate a metadata file.
 * Reads the JSON file, determines the field type from the path, and validates.
 */
export async function runCLIValidation(filePath?: string): Promise<void> {
  if (!filePath) {
    console.log("Usage: node dist/index.js --validate <file>");
    return;
  }

  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const raw = await readFile(filePath, "utf-8");
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error(`Invalid JSON: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const fileName = basename(filePath, ".json");
  const parentDir = basename(dirname(filePath));

  // Determine what kind of file this is and validate
  const results: { field: string; length: number; limit: number; valid: boolean }[] = [];

  if (fileName === "app_info") {
    // App-level fields: name, subtitle, keywords
    for (const key of ["name", "subtitle", "keywords"] as const) {
      if (data[key]) {
        const content = getLatestContent(data[key] as FieldWithHistory);
        if (content) {
          const limit = CHAR_LIMITS[key as MetadataField];
          results.push({
            field: key,
            length: content.length,
            limit,
            valid: content.length <= limit,
          });
        }
      }
    }
  } else if (fileName === "description" || fileName === "promotional_text") {
    const content = getLatestContent(data as FieldWithHistory);
    if (content) {
      const limit = CHAR_LIMITS[fileName as MetadataField];
      results.push({
        field: fileName,
        length: content.length,
        limit,
        valid: content.length <= limit,
      });
    }
  } else if (parentDir === "release_notes") {
    // Release notes file
    if (data.notes) {
      const content = getLatestContent(data.notes as FieldWithHistory);
      if (content) {
        const limit = CHAR_LIMITS.release_notes;
        results.push({
          field: "release_notes",
          length: content.length,
          limit,
          valid: content.length <= limit,
        });
      }
    }
  } else if (parentDir === "iap") {
    // IAP file
    for (const [key, metaKey] of [
      ["display_name", "iap_display_name"],
      ["description", "iap_description"],
    ] as const) {
      if (data[key]) {
        const content = getLatestContent(data[key] as FieldWithHistory);
        if (content) {
          const limit = CHAR_LIMITS[metaKey as MetadataField];
          results.push({
            field: key,
            length: content.length,
            limit,
            valid: content.length <= limit,
          });
        }
      }
    }
  }

  // Output results
  const failures = results.filter((r) => !r.valid);
  if (failures.length > 0) {
    for (const f of failures) {
      console.error(
        `VALIDATION FAIL: ${f.field} is ${f.length}/${f.limit} chars (+${f.length - f.limit} over limit)`
      );
    }
    process.exitCode = 1;
  } else if (results.length > 0) {
    for (const r of results) {
      console.log(`OK: ${r.field} ${r.length}/${r.limit} chars`);
    }
  }
}
