# M1 — Toolkit Can Fill Every Required ASC Field — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After M1 ships, a developer using `app-store-toolkit` can populate every required text field, dropdown, and toggle that App Store Connect requires for an iOS v1.0 submission — categories, age rating, pricing, availability, App Privacy responses, App Review information, encryption compliance default, and the URL fields (marketing, support, privacy policy) — without touching the ASC web UI. Asset upload and the actual "Submit for Review" click remain in the web UI; those are M2 and M3.

**Architecture:** Three new committed local-store JSON files (`listing.json`, `privacy.json`, `review.json`) carve the new data along ASC's own seams. Every mutating MCP tool appends an entry to a new `.appstore/history/*.jsonl` audit log so `git log -p` answers "what did we tell ASC and when." Existing tools are extended in place (`asc_update_version_localization` gains `marketingUrl`/`supportUrl`); new typed tools (`asc_set_categories`, `asc_set_age_rating`, etc.) wrap one ASC concept each. A new Vitest suite gives us TDD discipline.

**Tech Stack:** TypeScript, Node 18+, `@modelcontextprotocol/sdk`, `zod`, `jsonwebtoken`, Vitest (new). All work happens inside `servers/appstore-connect/` and the existing skill markdown files in `skills/`.

**Reference spec:** `docs/superpowers/specs/2026-05-14-submission-readiness-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `servers/appstore-connect/vitest.config.ts` | Vitest configuration (Node env, source-relative imports) |
| `servers/appstore-connect/src/store/history.ts` | Append-only JSONL audit-log writer, log-entry types |
| `servers/appstore-connect/src/store/listing.ts` | Read/write `.appstore/listing.json`; LISTING types |
| `servers/appstore-connect/src/store/privacy.ts` | Read/write `.appstore/privacy.json`; uses taxonomy for validation |
| `servers/appstore-connect/src/store/review.ts` | Read/write `.appstore/review.json`; review-info types |
| `servers/appstore-connect/src/data/privacy-taxonomy.json` | Apple's data type / purpose enums (single source of truth) |
| `servers/appstore-connect/src/data/privacy-taxonomy.ts` | Generated TS enums + zod schemas derived from the JSON |
| `servers/appstore-connect/src/api/categories.ts` | `setPrimaryAndSecondaryCategory` ASC wrapper |
| `servers/appstore-connect/src/api/age-rating.ts` | `setAgeRatingDeclaration` ASC wrapper |
| `servers/appstore-connect/src/api/pricing.ts` | `setAppPriceSchedule` ASC wrapper |
| `servers/appstore-connect/src/api/availability.ts` | `setAppAvailability` ASC wrapper |
| `servers/appstore-connect/src/api/privacy.ts` | `replaceAppDataUsages` ASC wrapper (App Privacy questionnaire) |
| `servers/appstore-connect/src/api/review-info.ts` | `setAppStoreReviewDetail` ASC wrapper |
| `servers/appstore-connect/src/api/encryption.ts` | `setBuildExportComplianceDefault` ASC wrapper |
| `servers/appstore-connect/src/store/__tests__/history.test.ts` | Tests for history writer |
| `servers/appstore-connect/src/store/__tests__/listing.test.ts` | Tests for listing store |
| `servers/appstore-connect/src/store/__tests__/privacy.test.ts` | Tests for privacy store + taxonomy validation |
| `servers/appstore-connect/src/store/__tests__/review.test.ts` | Tests for review store |
| `servers/appstore-connect/src/api/__tests__/categories.test.ts` | Tests for categories API wrapper (mocked fetch) |
| `servers/appstore-connect/src/api/__tests__/age-rating.test.ts` | Tests for age rating wrapper |
| `servers/appstore-connect/src/api/__tests__/pricing.test.ts` | Tests for pricing wrapper |
| `servers/appstore-connect/src/api/__tests__/availability.test.ts` | Tests for availability wrapper |
| `servers/appstore-connect/src/api/__tests__/privacy.test.ts` | Tests for privacy wrapper |
| `servers/appstore-connect/src/api/__tests__/review-info.test.ts` | Tests for review info wrapper |
| `servers/appstore-connect/src/api/__tests__/encryption.test.ts` | Tests for encryption wrapper |

### Modified files

| Path | Why |
|---|---|
| `servers/appstore-connect/package.json` | Add `vitest` devDep; add `test` script; bump version to `0.2.0` |
| `servers/appstore-connect/src/index.ts` | Bump server version to `0.2.0` |
| `servers/appstore-connect/src/store/config.ts` | Extend `ensureAppstoreDir` to create `history/` and add new gitignore entries |
| `servers/appstore-connect/src/store/types.ts` | Add `ListingConfig`, `PrivacyResponses`, `ReviewInfo` interfaces |
| `servers/appstore-connect/src/tools/asc-tools.ts` | Add new asc_set_* tools; extend asc_update_version_localization and asc_update_app_info |
| `servers/appstore-connect/src/tools/store-tools.ts` | Add store_read/write_listing/privacy/review tools |
| `servers/appstore-connect/src/tools/schemas.ts` | Add zod schemas for new tools |
| `servers/appstore-connect/src/api/app-info.ts` | Extend `updateAppInfoLocalization` to accept `privacyPolicyUrl` |
| `servers/appstore-connect/src/api/versions.ts` | Extend `updateVersionLocalization` to accept `marketingUrl`, `supportUrl` |
| `.claude-plugin/plugin.json` | Bump version to `0.2.0` |
| `skills/setup/SKILL.md` | Walk users through Git LFS init prompt; write extended .gitignore |
| `skills/push/SKILL.md` | Sync new files to ASC |
| `skills/pull/SKILL.md` | Pull new fields from ASC |
| `skills/status/SKILL.md` | Show drift for new files |
| `skills/list/SKILL.md` | Surface new files in listings |
| `CLAUDE.md` | Update section "Data Model" with new files, document history audit log |
| `ROADMAP.md` | Mark M1 items as in-progress; reference M2/M3 |

---

## Task 1: Bootstrap Vitest Test Infrastructure

The MCP server has no tests. Every subsequent task is TDD-style, so this task installs and configures Vitest first. We use Vitest because it works out-of-the-box with ESM + TypeScript and matches the project's existing tsup-based build.

**Files:**
- Create: `servers/appstore-connect/vitest.config.ts`
- Create: `servers/appstore-connect/src/__tests__/smoke.test.ts`
- Modify: `servers/appstore-connect/package.json`

- [ ] **Step 1: Install Vitest as a dev dependency**

```bash
cd servers/appstore-connect && npm install --save-dev vitest @vitest/coverage-v8
```

Expected: `package.json` updated with `vitest` and `@vitest/coverage-v8` under `devDependencies`.

- [ ] **Step 2: Add Vitest config**

Create `servers/appstore-connect/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/__tests__/**"],
    },
  },
});
```

- [ ] **Step 3: Add `test` script to package.json**

Modify `servers/appstore-connect/package.json` `"scripts"` block to add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Write a failing smoke test**

Create `servers/appstore-connect/src/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("vitest is wired up", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
cd servers/appstore-connect && npm test
```

Expected: `1 passed` (the smoke test).

- [ ] **Step 6: Commit**

```bash
git add servers/appstore-connect/package.json servers/appstore-connect/package-lock.json servers/appstore-connect/vitest.config.ts servers/appstore-connect/src/__tests__/smoke.test.ts
git commit -m "Bootstrap Vitest test infrastructure for MCP server"
```

---

## Task 2: History Infrastructure (Append-Only JSONL Audit Log)

Every mutating MCP tool will append a structured event to `.appstore/history/<stream>.jsonl`. This is the audit trail that makes `git log -p` answer "what did we tell ASC last Tuesday?" The streams are `pushes.jsonl`, `submissions.jsonl`, and `audits.jsonl`. Pushes are everything in M1 (M3 will add submissions). The writer must be safe for concurrent calls (atomic append) and never block on a missing directory.

**Files:**
- Create: `servers/appstore-connect/src/store/history.ts`
- Create: `servers/appstore-connect/src/store/__tests__/history.test.ts`
- Modify: `servers/appstore-connect/src/store/config.ts:23-39` (extend `ensureAppstoreDir` to create `history/`)

- [ ] **Step 1: Write failing tests for the history writer**

Create `servers/appstore-connect/src/store/__tests__/history.test.ts`:

```ts
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
    await appendHistoryEntry("pushes", {
      tool: "a",
      target: {},
      payload: {},
      result: "success",
    });
    await appendHistoryEntry("pushes", {
      tool: "b",
      target: {},
      payload: {},
      result: "success",
    });

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- history.test
```

Expected: FAIL — `Cannot find module '../history.js'`.

- [ ] **Step 3: Implement the history writer**

Create `servers/appstore-connect/src/store/history.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- history.test
```

Expected: `4 passed`.

- [ ] **Step 5: Update `ensureAppstoreDir` to also create `history/` and gitignore `ship-state.json`**

Modify `servers/appstore-connect/src/store/config.ts`. Replace the `ensureAppstoreDir` function (lines 23-39) with:

```ts
/** Ensure the .appstore directory structure exists */
export async function ensureAppstoreDir(): Promise<void> {
  const appstoreDir = getAppstoreDir();
  const metadataDir = getMetadataDir();
  const historyDir = join(appstoreDir, "history");

  if (!existsSync(appstoreDir)) {
    await mkdir(appstoreDir, { recursive: true });
  }
  if (!existsSync(metadataDir)) {
    await mkdir(metadataDir, { recursive: true });
  }
  if (!existsSync(historyDir)) {
    await mkdir(historyDir, { recursive: true });
  }

  // Ensure .gitignore covers credentials and transient state
  const gitignorePath = join(appstoreDir, GITIGNORE_FILE);
  const desired = "config.local.json\nship-state.json\n";
  if (!existsSync(gitignorePath)) {
    await writeFile(gitignorePath, desired, "utf-8");
  } else {
    const current = await readFile(gitignorePath, "utf-8");
    if (!current.includes("ship-state.json")) {
      await writeFile(gitignorePath, current.trimEnd() + "\nship-state.json\n", "utf-8");
    }
  }
}
```

- [ ] **Step 6: Run all tests to confirm nothing else broke**

```bash
cd servers/appstore-connect && npm test
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add servers/appstore-connect/src/store/history.ts servers/appstore-connect/src/store/__tests__/history.test.ts servers/appstore-connect/src/store/config.ts
git commit -m "Add history audit log: pushes/submissions/audits JSONL streams"
```

---

## Task 3: Listing Store (`.appstore/listing.json`)

`listing.json` holds app/version-scoped *decisions* (not per-locale content): primary/secondary category, age rating responses, price tier per territory, available territories, and the encryption-compliance default. Storing these together mirrors how ASC presents them in the web UI. The data model intentionally captures *user choices* in a stable shape; ASC API call payloads are derived at push time.

**Files:**
- Create: `servers/appstore-connect/src/store/listing.ts`
- Create: `servers/appstore-connect/src/store/__tests__/listing.test.ts`
- Modify: `servers/appstore-connect/src/store/types.ts` (add `ListingConfig`, supporting types)

- [ ] **Step 1: Add `ListingConfig` and supporting types to `store/types.ts`**

Append to `servers/appstore-connect/src/store/types.ts`:

```ts
/** ASC primary category enum subset — extend as needed */
export type AppCategory =
  | "BUSINESS"
  | "DEVELOPER_TOOLS"
  | "EDUCATION"
  | "ENTERTAINMENT"
  | "FINANCE"
  | "FOOD_AND_DRINK"
  | "GAMES"
  | "GRAPHICS_AND_DESIGN"
  | "HEALTH_AND_FITNESS"
  | "LIFESTYLE"
  | "MAGAZINES_AND_NEWSPAPERS"
  | "MEDICAL"
  | "MUSIC"
  | "NAVIGATION"
  | "NEWS"
  | "PHOTO_AND_VIDEO"
  | "PRODUCTIVITY"
  | "REFERENCE"
  | "SHOPPING"
  | "SOCIAL_NETWORKING"
  | "SPORTS"
  | "STICKERS"
  | "TRAVEL"
  | "UTILITIES"
  | "WEATHER";

/** A single age-rating answer keyed by Apple's question id (e.g., "VIOLENCE_CARTOON_OR_FANTASY") */
export interface AgeRatingAnswer {
  questionId: string;
  /** "NONE" | "INFREQUENT_OR_MILD" | "FREQUENT_OR_INTENSE" — exact set varies per question */
  level: string;
}

/** Price point per territory. Apple price points are integer tier ids. */
export interface PriceTierEntry {
  territory: string; // ISO 3166-1 alpha-2
  priceTier: number;
}

/** A territory the app is available in */
export type Territory = string; // ISO 3166-1 alpha-2

/** Top-level listing config */
export interface ListingConfig {
  categories: {
    primary: AppCategory;
    secondary?: AppCategory;
  };
  ageRating: {
    answers: AgeRatingAnswer[];
    /** Optional: derived rating Apple computes from answers, cached for diffing */
    derivedRating?: string;
  };
  pricing: {
    /** When all territories share one tier, set this and leave perTerritory empty */
    defaultTier?: number;
    perTerritory: PriceTierEntry[];
  };
  availability: {
    territories: Territory[];
  };
  encryption: {
    /** Default encryption answer used when attaching builds; overridable per-build */
    usesEncryption: boolean;
    /** Optional list of exemption codes when usesEncryption=true */
    exemptions: string[];
  };
}
```

- [ ] **Step 2: Write failing tests for the listing store**

Create `servers/appstore-connect/src/store/__tests__/listing.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readListing, writeListing, defaultListingConfig } from "../listing.js";
import type { ListingConfig } from "../types.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "appstore-listing-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("listing store", () => {
  it("returns null when listing.json does not exist", async () => {
    expect(await readListing()).toBeNull();
  });

  it("writes and reads back a listing config", async () => {
    const cfg: ListingConfig = {
      categories: { primary: "PRODUCTIVITY", secondary: "UTILITIES" },
      ageRating: { answers: [{ questionId: "VIOLENCE_CARTOON_OR_FANTASY", level: "NONE" }] },
      pricing: { defaultTier: 0, perTerritory: [] },
      availability: { territories: ["US", "GB", "DE"] },
      encryption: { usesEncryption: false, exemptions: [] },
    };
    await writeListing(cfg);
    const round = await readListing();
    expect(round).toEqual(cfg);
  });

  it("defaultListingConfig() returns a free-app US-only sane default", () => {
    const d = defaultListingConfig();
    expect(d.pricing.defaultTier).toBe(0);
    expect(d.availability.territories).toContain("US");
    expect(d.encryption.usesEncryption).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- listing.test
```

Expected: FAIL — `Cannot find module '../listing.js'`.

- [ ] **Step 4: Implement the listing store**

Create `servers/appstore-connect/src/store/listing.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ensureAppstoreDir, getAppstoreDir } from "./config.js";
import type { ListingConfig } from "./types.js";

const LISTING_FILE = "listing.json";

function getListingPath(): string {
  return join(getAppstoreDir(), LISTING_FILE);
}

/** Read .appstore/listing.json, or null if it doesn't exist */
export async function readListing(): Promise<ListingConfig | null> {
  const path = getListingPath();
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as ListingConfig;
}

/** Write .appstore/listing.json (creates the .appstore dir if needed) */
export async function writeListing(cfg: ListingConfig): Promise<void> {
  await ensureAppstoreDir();
  await writeFile(getListingPath(), JSON.stringify(cfg, null, 2) + "\n", "utf-8");
}

/** A sane default for a new free-tier US-only iOS app */
export function defaultListingConfig(): ListingConfig {
  return {
    categories: { primary: "PRODUCTIVITY" },
    ageRating: { answers: [] },
    pricing: { defaultTier: 0, perTerritory: [] },
    availability: { territories: ["US"] },
    encryption: { usesEncryption: false, exemptions: [] },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- listing.test
```

Expected: `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add servers/appstore-connect/src/store/listing.ts servers/appstore-connect/src/store/__tests__/listing.test.ts servers/appstore-connect/src/store/types.ts
git commit -m "Add listing store: categories, age rating, pricing, availability, encryption"
```

---

## Task 4: Privacy Taxonomy Data File

The App Privacy questionnaire uses a fixed taxonomy of data types and purposes that Apple defines. We ship the taxonomy as a JSON file (single source of truth), and a TypeScript module re-exports the same values as typed enums plus zod schemas. The JSON is what users would consult when hand-editing `privacy.json`; the TS is what `asc_set_privacy_responses` validates against.

**Files:**
- Create: `servers/appstore-connect/src/data/privacy-taxonomy.json`
- Create: `servers/appstore-connect/src/data/privacy-taxonomy.ts`
- Create: `servers/appstore-connect/src/data/__tests__/privacy-taxonomy.test.ts`

- [ ] **Step 1: Write the privacy taxonomy JSON**

Create `servers/appstore-connect/src/data/privacy-taxonomy.json`:

```json
{
  "dataTypes": [
    {
      "category": "CONTACT_INFO",
      "fields": ["NAME", "EMAIL_ADDRESS", "PHONE_NUMBER", "PHYSICAL_ADDRESS", "OTHER_USER_CONTACT_INFO"]
    },
    {
      "category": "HEALTH_AND_FITNESS",
      "fields": ["HEALTH", "FITNESS"]
    },
    {
      "category": "FINANCIAL_INFO",
      "fields": ["PAYMENT_INFO", "CREDIT_INFO", "OTHER_FINANCIAL_INFO"]
    },
    {
      "category": "LOCATION",
      "fields": ["PRECISE_LOCATION", "COARSE_LOCATION"]
    },
    {
      "category": "SENSITIVE_INFO",
      "fields": ["SENSITIVE_INFO"]
    },
    {
      "category": "CONTACTS",
      "fields": ["CONTACTS"]
    },
    {
      "category": "USER_CONTENT",
      "fields": ["EMAILS_OR_TEXT_MESSAGES", "PHOTOS_OR_VIDEOS", "AUDIO_DATA", "GAMEPLAY_CONTENT", "CUSTOMER_SUPPORT", "OTHER_USER_CONTENT"]
    },
    {
      "category": "BROWSING_HISTORY",
      "fields": ["BROWSING_HISTORY"]
    },
    {
      "category": "SEARCH_HISTORY",
      "fields": ["SEARCH_HISTORY"]
    },
    {
      "category": "IDENTIFIERS",
      "fields": ["USER_ID", "DEVICE_ID"]
    },
    {
      "category": "PURCHASES",
      "fields": ["PURCHASE_HISTORY"]
    },
    {
      "category": "USAGE_DATA",
      "fields": ["PRODUCT_INTERACTION", "ADVERTISING_DATA", "OTHER_USAGE_DATA"]
    },
    {
      "category": "DIAGNOSTICS",
      "fields": ["CRASH_DATA", "PERFORMANCE_DATA", "OTHER_DIAGNOSTIC_DATA"]
    },
    {
      "category": "SURROUNDINGS",
      "fields": ["ENVIRONMENT_SCANNING"]
    },
    {
      "category": "BODY",
      "fields": ["HANDS", "HEAD"]
    },
    {
      "category": "OTHER",
      "fields": ["OTHER_DATA_TYPES"]
    }
  ],
  "purposes": [
    "THIRD_PARTY_ADVERTISING",
    "DEVELOPERS_ADVERTISING",
    "ANALYTICS",
    "PRODUCT_PERSONALIZATION",
    "APP_FUNCTIONALITY",
    "OTHER_PURPOSES"
  ]
}
```

- [ ] **Step 2: Write failing tests for the typed taxonomy**

Create `servers/appstore-connect/src/data/__tests__/privacy-taxonomy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ALL_DATA_FIELDS,
  ALL_PURPOSES,
  DataFieldSchema,
  PurposeSchema,
  isValidDataField,
} from "../privacy-taxonomy.js";

describe("privacy taxonomy", () => {
  it("exports a non-empty list of data fields", () => {
    expect(ALL_DATA_FIELDS.length).toBeGreaterThan(20);
    expect(ALL_DATA_FIELDS).toContain("PRECISE_LOCATION");
    expect(ALL_DATA_FIELDS).toContain("CRASH_DATA");
  });

  it("exports the purpose enum from Apple", () => {
    expect(ALL_PURPOSES).toContain("ANALYTICS");
    expect(ALL_PURPOSES).toContain("APP_FUNCTIONALITY");
  });

  it("DataFieldSchema accepts known values and rejects unknown", () => {
    expect(() => DataFieldSchema.parse("PRECISE_LOCATION")).not.toThrow();
    expect(() => DataFieldSchema.parse("MADE_UP_FIELD")).toThrow();
  });

  it("PurposeSchema accepts known purposes and rejects unknown", () => {
    expect(() => PurposeSchema.parse("ANALYTICS")).not.toThrow();
    expect(() => PurposeSchema.parse("MARKETING_UNCLASSIFIED")).toThrow();
  });

  it("isValidDataField is a runtime predicate", () => {
    expect(isValidDataField("EMAIL_ADDRESS")).toBe(true);
    expect(isValidDataField("MADE_UP_FIELD")).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- privacy-taxonomy.test
```

Expected: FAIL — `Cannot find module '../privacy-taxonomy.js'`.

- [ ] **Step 4: Implement the typed taxonomy module**

Create `servers/appstore-connect/src/data/privacy-taxonomy.ts`:

```ts
import { z } from "zod";
import taxonomyJson from "./privacy-taxonomy.json" with { type: "json" };

interface TaxonomyJson {
  dataTypes: { category: string; fields: string[] }[];
  purposes: string[];
}

const taxonomy = taxonomyJson as TaxonomyJson;

/** Flat list of every data field across all categories */
export const ALL_DATA_FIELDS: readonly string[] = taxonomy.dataTypes.flatMap(
  (c) => c.fields
);

/** Flat list of every purpose Apple recognizes */
export const ALL_PURPOSES: readonly string[] = taxonomy.purposes;

/** Map data field → its parent category (for grouping in UI/diff) */
export const DATA_FIELD_TO_CATEGORY: Readonly<Record<string, string>> =
  Object.fromEntries(
    taxonomy.dataTypes.flatMap((c) => c.fields.map((f) => [f, c.category]))
  );

/** zod schemas — derived from JSON so taxonomy edits flow through automatically */
export const DataFieldSchema = z.enum(ALL_DATA_FIELDS as [string, ...string[]]);
export const PurposeSchema = z.enum(ALL_PURPOSES as [string, ...string[]]);

export type DataField = z.infer<typeof DataFieldSchema>;
export type Purpose = z.infer<typeof PurposeSchema>;

/** Runtime predicate for code that doesn't want to throw */
export function isValidDataField(field: string): field is DataField {
  return ALL_DATA_FIELDS.includes(field);
}

export function isValidPurpose(purpose: string): purpose is Purpose {
  return ALL_PURPOSES.includes(purpose);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- privacy-taxonomy.test
```

Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add servers/appstore-connect/src/data/
git commit -m "Add privacy taxonomy data file and typed module"
```

---

## Task 5: Privacy Store (`.appstore/privacy.json`)

The privacy store holds the user's answers to Apple's App Privacy questionnaire. It validates every data field and purpose against the taxonomy from Task 4 at write time, so an invalid `privacy.json` cannot be persisted.

**Files:**
- Create: `servers/appstore-connect/src/store/privacy.ts`
- Create: `servers/appstore-connect/src/store/__tests__/privacy.test.ts`
- Modify: `servers/appstore-connect/src/store/types.ts` (add `PrivacyResponses`)

- [ ] **Step 1: Add `PrivacyResponses` to `store/types.ts`**

Append to `servers/appstore-connect/src/store/types.ts`:

```ts
import type { DataField, Purpose } from "../data/privacy-taxonomy.js";

/** A single declared data type with its handling attributes */
export interface DeclaredDataType {
  type: DataField;
  /** Whether the data is linked to the user's identity */
  linkedToUser: boolean;
  /** Whether the data is used for tracking across apps/sites */
  usedForTracking: boolean;
  /** Why the data is collected */
  purposes: Purpose[];
}

/** Top-level App Privacy answers */
export interface PrivacyResponses {
  /** Top-level "Do you collect data?" — when false, dataTypes must be empty */
  collectsData: boolean;
  tracking: {
    /** Does the app use ATT tracking? */
    enabled: boolean;
    /** Tracking domains, when enabled */
    domains: string[];
  };
  dataTypes: DeclaredDataType[];
}
```

- [ ] **Step 2: Write failing tests for the privacy store**

Create `servers/appstore-connect/src/store/__tests__/privacy.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPrivacy, writePrivacy, defaultPrivacyResponses } from "../privacy.js";
import type { PrivacyResponses } from "../types.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "appstore-privacy-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("privacy store", () => {
  it("returns null when privacy.json does not exist", async () => {
    expect(await readPrivacy()).toBeNull();
  });

  it("writes and reads back a privacy config", async () => {
    const cfg: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "CRASH_DATA", linkedToUser: false, usedForTracking: false, purposes: ["ANALYTICS"] },
      ],
    };
    await writePrivacy(cfg);
    const round = await readPrivacy();
    expect(round).toEqual(cfg);
  });

  it("rejects an invalid data field at write time", async () => {
    const bad = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "MADE_UP_FIELD", linkedToUser: false, usedForTracking: false, purposes: ["ANALYTICS"] },
      ],
    } as unknown as PrivacyResponses;
    await expect(writePrivacy(bad)).rejects.toThrow(/MADE_UP_FIELD/);
  });

  it("rejects a non-empty dataTypes when collectsData is false", async () => {
    const bad: PrivacyResponses = {
      collectsData: false,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "CRASH_DATA", linkedToUser: false, usedForTracking: false, purposes: ["ANALYTICS"] },
      ],
    };
    await expect(writePrivacy(bad)).rejects.toThrow(/collectsData/);
  });

  it("defaultPrivacyResponses() returns a 'collects nothing' baseline", () => {
    const d = defaultPrivacyResponses();
    expect(d.collectsData).toBe(false);
    expect(d.dataTypes).toEqual([]);
    expect(d.tracking.enabled).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- privacy.test
```

Expected: FAIL — `Cannot find module '../privacy.js'`.

- [ ] **Step 4: Implement the privacy store**

Create `servers/appstore-connect/src/store/privacy.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ensureAppstoreDir, getAppstoreDir } from "./config.js";
import { DataFieldSchema, PurposeSchema } from "../data/privacy-taxonomy.js";
import type { PrivacyResponses } from "./types.js";

const PRIVACY_FILE = "privacy.json";

const DeclaredDataTypeSchema = z.object({
  type: DataFieldSchema,
  linkedToUser: z.boolean(),
  usedForTracking: z.boolean(),
  purposes: z.array(PurposeSchema),
});

const PrivacyResponsesSchema = z
  .object({
    collectsData: z.boolean(),
    tracking: z.object({
      enabled: z.boolean(),
      domains: z.array(z.string()),
    }),
    dataTypes: z.array(DeclaredDataTypeSchema),
  })
  .superRefine((val, ctx) => {
    if (!val.collectsData && val.dataTypes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "collectsData is false but dataTypes is non-empty — set collectsData true or empty the list",
      });
    }
  });

function getPrivacyPath(): string {
  return join(getAppstoreDir(), PRIVACY_FILE);
}

/** Read .appstore/privacy.json, or null if missing */
export async function readPrivacy(): Promise<PrivacyResponses | null> {
  const path = getPrivacyPath();
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as PrivacyResponses;
}

/** Write .appstore/privacy.json after schema validation */
export async function writePrivacy(cfg: PrivacyResponses): Promise<void> {
  PrivacyResponsesSchema.parse(cfg); // throws on invalid taxonomy/state
  await ensureAppstoreDir();
  await writeFile(getPrivacyPath(), JSON.stringify(cfg, null, 2) + "\n", "utf-8");
}

/** A "collects nothing" baseline — appropriate for many indie apps */
export function defaultPrivacyResponses(): PrivacyResponses {
  return {
    collectsData: false,
    tracking: { enabled: false, domains: [] },
    dataTypes: [],
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- privacy.test
```

Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add servers/appstore-connect/src/store/privacy.ts servers/appstore-connect/src/store/__tests__/privacy.test.ts servers/appstore-connect/src/store/types.ts
git commit -m "Add privacy store with taxonomy-validated read/write"
```

---

## Task 6: Review Info Store (`.appstore/review.json`)

The review store holds App Review information: contact details, demo credentials, and free-text notes. Per the spec (§5.3), this is per-version but a single contact (not per-locale) — reflecting common usage and Apple's data model.

**Files:**
- Create: `servers/appstore-connect/src/store/review.ts`
- Create: `servers/appstore-connect/src/store/__tests__/review.test.ts`
- Modify: `servers/appstore-connect/src/store/types.ts` (add `ReviewInfo`)

- [ ] **Step 1: Add `ReviewInfo` to `store/types.ts`**

Append to `servers/appstore-connect/src/store/types.ts`:

```ts
/** App Review contact information */
export interface ReviewContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** Optional demo account credentials when the app requires sign-in */
export interface DemoAccount {
  required: boolean;
  username?: string;
  password?: string;
}

/** App Review information (per-version, single source of truth) */
export interface ReviewInfo {
  contact: ReviewContact;
  demo: DemoAccount;
  notes: string;
}
```

- [ ] **Step 2: Write failing tests for the review store**

Create `servers/appstore-connect/src/store/__tests__/review.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readReview, writeReview, defaultReviewInfo } from "../review.js";
import type { ReviewInfo } from "../types.js";

let tempDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "appstore-review-"));
  process.chdir(tempDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("review store", () => {
  it("returns null when review.json does not exist", async () => {
    expect(await readReview()).toBeNull();
  });

  it("writes and reads back a review info", async () => {
    const cfg: ReviewInfo = {
      contact: { firstName: "Vishal", lastName: "S", email: "v@example.com", phone: "+15555550100" },
      demo: { required: false },
      notes: "No special instructions.",
    };
    await writeReview(cfg);
    const round = await readReview();
    expect(round).toEqual(cfg);
  });

  it("rejects writes with demo.required=true but missing username/password", async () => {
    const bad: ReviewInfo = {
      contact: { firstName: "V", lastName: "S", email: "v@example.com", phone: "+1" },
      demo: { required: true },
      notes: "",
    };
    await expect(writeReview(bad)).rejects.toThrow(/demo/);
  });

  it("defaultReviewInfo returns an empty-but-valid baseline", () => {
    const d = defaultReviewInfo();
    expect(d.demo.required).toBe(false);
    expect(d.contact.email).toBe("");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- review.test
```

Expected: FAIL.

- [ ] **Step 4: Implement the review store**

Create `servers/appstore-connect/src/store/review.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ensureAppstoreDir, getAppstoreDir } from "./config.js";
import type { ReviewInfo } from "./types.js";

const REVIEW_FILE = "review.json";

const ReviewInfoSchema = z
  .object({
    contact: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      phone: z.string(),
    }),
    demo: z
      .object({
        required: z.boolean(),
        username: z.string().optional(),
        password: z.string().optional(),
      })
      .superRefine((val, ctx) => {
        if (val.required && (!val.username || !val.password)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "demo.required is true but username/password are missing",
          });
        }
      }),
    notes: z.string(),
  });

function getReviewPath(): string {
  return join(getAppstoreDir(), REVIEW_FILE);
}

export async function readReview(): Promise<ReviewInfo | null> {
  const path = getReviewPath();
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as ReviewInfo;
}

export async function writeReview(cfg: ReviewInfo): Promise<void> {
  ReviewInfoSchema.parse(cfg);
  await ensureAppstoreDir();
  await writeFile(getReviewPath(), JSON.stringify(cfg, null, 2) + "\n", "utf-8");
}

export function defaultReviewInfo(): ReviewInfo {
  return {
    contact: { firstName: "", lastName: "", email: "", phone: "" },
    demo: { required: false },
    notes: "",
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- review.test
```

Expected: `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add servers/appstore-connect/src/store/review.ts servers/appstore-connect/src/store/__tests__/review.test.ts servers/appstore-connect/src/store/types.ts
git commit -m "Add review-info store with sign-in-required validation"
```

---

## Task 7: Categories API Wrapper + `asc_set_categories` Tool

ASC stores categories on the editable `appInfo` resource. Setting categories is `PATCH /v1/appInfos/{id}` with `attributes.primaryCategory` (and optional `attributes.secondaryCategory`). On success, the tool also appends to `history/pushes.jsonl`.

**Files:**
- Create: `servers/appstore-connect/src/api/categories.ts`
- Create: `servers/appstore-connect/src/api/__tests__/categories.test.ts`
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts` (register `asc_set_categories`)
- Modify: `servers/appstore-connect/src/tools/schemas.ts` (add `AscSetCategoriesSchema`)

- [ ] **Step 1: Write failing tests for the categories wrapper**

Create `servers/appstore-connect/src/api/__tests__/categories.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setCategories } from "../categories.js";

vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
}));

import { ascRequest } from "../client.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setCategories", () => {
  it("sends a PATCH with primary and secondary in attributes", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ai_1", attributes: { primaryCategory: "PRODUCTIVITY", secondaryCategory: "UTILITIES" } },
    });

    const out = await setCategories("ai_1", { primary: "PRODUCTIVITY", secondary: "UTILITIES" });

    expect(ascRequest).toHaveBeenCalledWith("/v1/appInfos/ai_1", {
      method: "PATCH",
      body: {
        data: {
          type: "appInfos",
          id: "ai_1",
          attributes: {
            primaryCategory: "PRODUCTIVITY",
            secondaryCategory: "UTILITIES",
          },
        },
      },
    });
    expect(out.attributes.primaryCategory).toBe("PRODUCTIVITY");
  });

  it("omits secondaryCategory when not provided", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ai_1", attributes: { primaryCategory: "PRODUCTIVITY" } },
    });

    await setCategories("ai_1", { primary: "PRODUCTIVITY" });

    const call = (ascRequest as any).mock.calls[0][1];
    expect(call.body.data.attributes).toEqual({ primaryCategory: "PRODUCTIVITY" });
    expect(call.body.data.attributes).not.toHaveProperty("secondaryCategory");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- categories.test
```

Expected: FAIL — `Cannot find module '../categories.js'`.

- [ ] **Step 3: Implement the categories wrapper**

Create `servers/appstore-connect/src/api/categories.ts`:

```ts
import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";

export interface CategoriesUpdate {
  primary: string;
  secondary?: string;
}

interface AppInfoCategoriesAttributes {
  primaryCategory: string;
  secondaryCategory?: string;
}

/** Set the primary (and optional secondary) category on an editable appInfo */
export async function setCategories(
  appInfoId: string,
  update: CategoriesUpdate
): Promise<Resource<AppInfoCategoriesAttributes>> {
  const attributes: AppInfoCategoriesAttributes = { primaryCategory: update.primary };
  if (update.secondary !== undefined) {
    attributes.secondaryCategory = update.secondary;
  }
  const response = await ascRequest<AppInfoCategoriesAttributes>(`/v1/appInfos/${appInfoId}`, {
    method: "PATCH",
    body: {
      data: {
        type: "appInfos",
        id: appInfoId,
        attributes,
      },
    },
  });
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<AppInfoCategoriesAttributes>;
  }
  return response.data as Resource<AppInfoCategoriesAttributes>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- categories.test
```

Expected: `2 passed`.

- [ ] **Step 5: Add the zod schema for the MCP tool**

Append to `servers/appstore-connect/src/tools/schemas.ts`:

```ts
import { z } from "zod";

export const AscSetCategoriesSchema = z.object({
  app_info_id: z.string().describe("The editable appInfo resource ID"),
  primary: z.string().describe("Primary category enum (e.g., PRODUCTIVITY)"),
  secondary: z.string().optional().describe("Optional secondary category"),
});
```

(Make sure `z` is already imported in this file. If not, add `import { z } from "zod";` at the top.)

- [ ] **Step 6: Register the `asc_set_categories` MCP tool**

In `servers/appstore-connect/src/tools/asc-tools.ts`, add this near the other tool registrations (just before the closing `}` of `registerAscTools`):

```ts
  // --- asc_set_categories ---
  server.tool(
    "asc_set_categories",
    "Set primary and optional secondary App Store category",
    AscSetCategoriesSchema.shape,
    async ({ app_info_id, primary, secondary }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setCategories(app_info_id, { primary, secondary });
        await appendHistoryEntry("pushes", {
          tool: "asc_set_categories",
          target: { app_info_id },
          payload: { primary, secondary },
          result: "success",
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: updated.id,
                  primaryCategory: updated.attributes.primaryCategory,
                  secondaryCategory: updated.attributes.secondaryCategory,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_categories",
          target: { app_info_id },
          payload: { primary, secondary },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

Add the imports at the top of `asc-tools.ts`:

```ts
import { setCategories } from "../api/categories.js";
import { appendHistoryEntry } from "../store/history.js";
import { AscSetCategoriesSchema } from "./schemas.js";
```

- [ ] **Step 7: Build and confirm no TypeScript errors**

```bash
cd servers/appstore-connect && npm run build
```

Expected: clean build, `dist/` regenerated.

- [ ] **Step 8: Commit**

```bash
git add servers/appstore-connect/src/api/categories.ts servers/appstore-connect/src/api/__tests__/categories.test.ts servers/appstore-connect/src/tools/asc-tools.ts servers/appstore-connect/src/tools/schemas.ts
git commit -m "Add asc_set_categories tool with history audit logging"
```

---

## Task 8: Age Rating API Wrapper + `asc_set_age_rating` Tool

Age rating is set on the `ageRatingDeclaration` related to the editable `appInfo`. The endpoint is `PATCH /v1/ageRatingDeclarations/{id}` with each answer as a separate attribute (Apple's question ids in camelCase, e.g., `violenceCartoonOrFantasy: "NONE"`). The tool accepts the structured `AgeRatingAnswer[]` from `listing.json` and converts to Apple's payload shape.

**Files:**
- Create: `servers/appstore-connect/src/api/age-rating.ts`
- Create: `servers/appstore-connect/src/api/__tests__/age-rating.test.ts`
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts` (register `asc_set_age_rating`)
- Modify: `servers/appstore-connect/src/tools/schemas.ts` (add schema)

- [ ] **Step 1: Write failing tests**

Create `servers/appstore-connect/src/api/__tests__/age-rating.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAgeRatingDeclaration } from "../age-rating.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));

import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAgeRatingDeclaration", () => {
  it("converts UPPER_SNAKE question ids to camelCase attributes", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "ar_1", attributes: {} } });

    await setAgeRatingDeclaration("ar_1", [
      { questionId: "VIOLENCE_CARTOON_OR_FANTASY", level: "NONE" },
      { questionId: "GAMBLING_AND_CONTESTS", level: "NONE" },
    ]);

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.type).toBe("ageRatingDeclarations");
    expect(body.data.attributes).toEqual({
      violenceCartoonOrFantasy: "NONE",
      gamblingAndContests: "NONE",
    });
  });

  it("returns the updated declaration", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ar_1", attributes: { violenceCartoonOrFantasy: "NONE" } },
    });
    const out = await setAgeRatingDeclaration("ar_1", [
      { questionId: "VIOLENCE_CARTOON_OR_FANTASY", level: "NONE" },
    ]);
    expect(out.id).toBe("ar_1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- age-rating.test
```

Expected: FAIL.

- [ ] **Step 3: Implement the age-rating wrapper**

Create `servers/appstore-connect/src/api/age-rating.ts`:

```ts
import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";
import type { AgeRatingAnswer } from "../store/types.js";

interface AgeRatingDeclarationAttributes {
  [key: string]: string | undefined;
}

/** Convert UPPER_SNAKE_CASE → camelCase (e.g., VIOLENCE_CARTOON_OR_FANTASY → violenceCartoonOrFantasy) */
function questionIdToAttribute(id: string): string {
  return id
    .toLowerCase()
    .split("_")
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

/** Set the age rating declaration with the supplied answers */
export async function setAgeRatingDeclaration(
  declarationId: string,
  answers: AgeRatingAnswer[]
): Promise<Resource<AgeRatingDeclarationAttributes>> {
  const attributes: AgeRatingDeclarationAttributes = {};
  for (const a of answers) {
    attributes[questionIdToAttribute(a.questionId)] = a.level;
  }
  const response = await ascRequest<AgeRatingDeclarationAttributes>(
    `/v1/ageRatingDeclarations/${declarationId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "ageRatingDeclarations",
          id: declarationId,
          attributes,
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<AgeRatingDeclarationAttributes>;
  }
  return response.data as Resource<AgeRatingDeclarationAttributes>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- age-rating.test
```

Expected: `2 passed`.

- [ ] **Step 5: Add the zod schema**

Append to `servers/appstore-connect/src/tools/schemas.ts`:

```ts
export const AscSetAgeRatingSchema = z.object({
  declaration_id: z.string().describe("The age rating declaration resource ID"),
  answers: z
    .array(
      z.object({
        questionId: z.string().describe("Apple question id (UPPER_SNAKE_CASE)"),
        level: z.string().describe("Answer level for this question"),
      })
    )
    .describe("Full set of answers to push"),
});
```

- [ ] **Step 6: Register `asc_set_age_rating` MCP tool**

In `servers/appstore-connect/src/tools/asc-tools.ts`, add (near other registrations):

```ts
  // --- asc_set_age_rating ---
  server.tool(
    "asc_set_age_rating",
    "Set age rating answers on the editable appInfo's age rating declaration",
    AscSetAgeRatingSchema.shape,
    async ({ declaration_id, answers }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setAgeRatingDeclaration(declaration_id, answers);
        await appendHistoryEntry("pushes", {
          tool: "asc_set_age_rating",
          target: { declaration_id },
          payload: { answers },
          result: "success",
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, id: updated.id }, null, 2),
            },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_age_rating",
          target: { declaration_id },
          payload: { answers },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

Add the imports at the top:

```ts
import { setAgeRatingDeclaration } from "../api/age-rating.js";
import { AscSetAgeRatingSchema } from "./schemas.js";
```

- [ ] **Step 7: Build to confirm no errors**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add servers/appstore-connect/src/api/age-rating.ts servers/appstore-connect/src/api/__tests__/age-rating.test.ts servers/appstore-connect/src/tools/asc-tools.ts servers/appstore-connect/src/tools/schemas.ts
git commit -m "Add asc_set_age_rating tool with snake-to-camel conversion"
```

---

## Task 9: Pricing API Wrapper + `asc_set_pricing` Tool

Pricing in the App Store Connect API is managed via `appPriceSchedules` — a resource that bundles a base territory + price tier with optional per-territory overrides. The wrapper here accepts a simple `{ defaultTier, perTerritory }` shape from `listing.json` and produces the `appPriceSchedules` payload Apple expects (a `manual` schedule with the listed `appPrices` relationships).

> **Note on Apple endpoint:** the App Store Connect API revision in use is the manual-prices model where you create an `appPriceSchedule` resource with `relationships.manualPrices` listing the desired `appPricePoints`. The wrapper abstracts this so the caller only thinks in tiers and territories.

**Files:**
- Create: `servers/appstore-connect/src/api/pricing.ts`
- Create: `servers/appstore-connect/src/api/__tests__/pricing.test.ts`
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts`
- Modify: `servers/appstore-connect/src/tools/schemas.ts`

- [ ] **Step 1: Write failing tests**

Create `servers/appstore-connect/src/api/__tests__/pricing.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAppPriceSchedule } from "../pricing.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));

import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAppPriceSchedule", () => {
  it("creates a manual schedule with a base USA tier when no overrides", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "sch_1", attributes: {} } });

    await setAppPriceSchedule("app_1", { defaultTier: 0, perTerritory: [] });

    const call = (ascRequest as any).mock.calls[0];
    expect(call[0]).toBe("/v1/appPriceSchedules");
    expect(call[1].method).toBe("POST");
    expect(call[1].body.data.type).toBe("appPriceSchedules");
    expect(call[1].body.data.relationships.app.data.id).toBe("app_1");
    // Base territory price (USA, tier 0) included
    const manualPrices = call[1].body.data.relationships.manualPrices.data;
    expect(manualPrices).toHaveLength(1);
    expect(manualPrices[0].id).toContain("0_USA");
  });

  it("includes per-territory overrides", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "sch_1", attributes: {} } });

    await setAppPriceSchedule("app_1", {
      defaultTier: 0,
      perTerritory: [
        { territory: "GB", priceTier: 1 },
        { territory: "DE", priceTier: 2 },
      ],
    });

    const manualPrices = (ascRequest as any).mock.calls[0][1].body.data.relationships.manualPrices.data;
    const ids = manualPrices.map((p: any) => p.id);
    expect(ids).toContain("0_USA");
    expect(ids).toContain("1_GBR");
    expect(ids).toContain("2_DEU");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- pricing.test
```

Expected: FAIL.

- [ ] **Step 3: Implement the pricing wrapper**

Create `servers/appstore-connect/src/api/pricing.ts`:

```ts
import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";
import type { PriceTierEntry } from "../store/types.js";

/** ISO 3166-1 alpha-2 → alpha-3 (Apple price-point ids use alpha-3 territory codes) */
const ISO2_TO_ISO3: Record<string, string> = {
  US: "USA", GB: "GBR", DE: "DEU", FR: "FRA", JP: "JPN", AU: "AUS", CA: "CAN",
  IT: "ITA", ES: "ESP", MX: "MEX", BR: "BRA", IN: "IND", CN: "CHN", KR: "KOR",
  NL: "NLD", SE: "SWE", NO: "NOR", DK: "DNK", FI: "FIN", BE: "BEL", AT: "AUT",
  CH: "CHE", PL: "POL", IE: "IRL", PT: "PRT", NZ: "NZL", SG: "SGP", HK: "HKG",
  TW: "TWN", AE: "ARE", SA: "SAU", ZA: "ZAF", IL: "ISR", TR: "TUR", RU: "RUS",
  // Extend as more locales are needed; absence raises an error at runtime
};

function toAlpha3(iso2: string): string {
  const alpha3 = ISO2_TO_ISO3[iso2.toUpperCase()];
  if (!alpha3) {
    throw new Error(`No ISO-3 mapping for territory '${iso2}'. Add it to ISO2_TO_ISO3.`);
  }
  return alpha3;
}

function priceIdFor(tier: number, iso2: string): string {
  return `${tier}_${toAlpha3(iso2)}`;
}

export interface PriceUpdate {
  defaultTier: number; // base territory (USA) tier
  perTerritory: PriceTierEntry[]; // overrides
}

interface PriceScheduleAttributes {
  [key: string]: unknown;
}

/** Create a manual app price schedule replacing any existing schedule */
export async function setAppPriceSchedule(
  appId: string,
  update: PriceUpdate
): Promise<Resource<PriceScheduleAttributes>> {
  const manualPrices: { type: string; id: string }[] = [
    { type: "appPrices", id: priceIdFor(update.defaultTier, "US") },
  ];
  for (const t of update.perTerritory) {
    manualPrices.push({
      type: "appPrices",
      id: priceIdFor(t.priceTier, t.territory),
    });
  }
  const response = await ascRequest<PriceScheduleAttributes>(
    `/v1/appPriceSchedules`,
    {
      method: "POST",
      body: {
        data: {
          type: "appPriceSchedules",
          relationships: {
            app: { data: { type: "apps", id: appId } },
            manualPrices: { data: manualPrices },
          },
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<PriceScheduleAttributes>;
  }
  return response.data as Resource<PriceScheduleAttributes>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- pricing.test
```

Expected: `2 passed`.

- [ ] **Step 5: Add the zod schema**

Append to `servers/appstore-connect/src/tools/schemas.ts`:

```ts
export const AscSetPricingSchema = z.object({
  app_id: z.string().describe("The app's App Store Connect ID"),
  default_tier: z.number().int().describe("Apple price tier id used as USA base"),
  per_territory: z
    .array(
      z.object({
        territory: z.string().describe("ISO 3166-1 alpha-2 territory code"),
        price_tier: z.number().int(),
      })
    )
    .default([])
    .describe("Optional per-territory tier overrides"),
});
```

- [ ] **Step 6: Register `asc_set_pricing` MCP tool**

In `servers/appstore-connect/src/tools/asc-tools.ts`, add:

```ts
  // --- asc_set_pricing ---
  server.tool(
    "asc_set_pricing",
    "Set the app's price schedule (USA base tier + optional per-territory overrides)",
    AscSetPricingSchema.shape,
    async ({ app_id, default_tier, per_territory }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setAppPriceSchedule(app_id, {
          defaultTier: default_tier,
          perTerritory: per_territory.map((p) => ({
            territory: p.territory,
            priceTier: p.price_tier,
          })),
        });
        await appendHistoryEntry("pushes", {
          tool: "asc_set_pricing",
          target: { app_id },
          payload: { default_tier, per_territory },
          result: "success",
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, id: updated.id }, null, 2) },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_pricing",
          target: { app_id },
          payload: { default_tier, per_territory },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

Imports:

```ts
import { setAppPriceSchedule } from "../api/pricing.js";
import { AscSetPricingSchema } from "./schemas.js";
```

- [ ] **Step 7: Build**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add servers/appstore-connect/src/api/pricing.ts servers/appstore-connect/src/api/__tests__/pricing.test.ts servers/appstore-connect/src/tools/asc-tools.ts servers/appstore-connect/src/tools/schemas.ts
git commit -m "Add asc_set_pricing tool with manual price schedules"
```

---

## Task 10: Availability API Wrapper + `asc_set_availability` Tool

Territory availability uses the `appAvailabilities` resource: a POST with `relationships.app` and `relationships.availableTerritories` listing each territory you want the app available in.

**Files:**
- Create: `servers/appstore-connect/src/api/availability.ts`
- Create: `servers/appstore-connect/src/api/__tests__/availability.test.ts`
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts`
- Modify: `servers/appstore-connect/src/tools/schemas.ts`

- [ ] **Step 1: Write failing tests**

Create `servers/appstore-connect/src/api/__tests__/availability.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAppAvailability } from "../availability.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAppAvailability", () => {
  it("posts an availability with the supplied territories (alpha-3)", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "av_1", attributes: {} } });

    await setAppAvailability("app_1", ["US", "GB", "DE"]);

    const call = (ascRequest as any).mock.calls[0];
    expect(call[0]).toBe("/v2/appAvailabilities");
    expect(call[1].method).toBe("POST");
    const territories = call[1].body.data.relationships.availableTerritories.data;
    expect(territories.map((t: any) => t.id)).toEqual(["USA", "GBR", "DEU"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- availability.test
```

Expected: FAIL.

- [ ] **Step 3: Implement the availability wrapper**

Create `servers/appstore-connect/src/api/availability.ts`:

```ts
import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";

const ISO2_TO_ISO3: Record<string, string> = {
  US: "USA", GB: "GBR", DE: "DEU", FR: "FRA", JP: "JPN", AU: "AUS", CA: "CAN",
  IT: "ITA", ES: "ESP", MX: "MEX", BR: "BRA", IN: "IND", CN: "CHN", KR: "KOR",
  NL: "NLD", SE: "SWE", NO: "NOR", DK: "DNK", FI: "FIN", BE: "BEL", AT: "AUT",
  CH: "CHE", PL: "POL", IE: "IRL", PT: "PRT", NZ: "NZL", SG: "SGP", HK: "HKG",
  TW: "TWN", AE: "ARE", SA: "SAU", ZA: "ZAF", IL: "ISR", TR: "TUR", RU: "RUS",
};

function toAlpha3(iso2: string): string {
  const alpha3 = ISO2_TO_ISO3[iso2.toUpperCase()];
  if (!alpha3) throw new Error(`No ISO-3 mapping for territory '${iso2}'`);
  return alpha3;
}

interface AvailabilityAttributes {
  [key: string]: unknown;
}

/** Set the territories the app is available in */
export async function setAppAvailability(
  appId: string,
  territoriesIso2: string[]
): Promise<Resource<AvailabilityAttributes>> {
  const territoriesData = territoriesIso2.map((iso2) => ({
    type: "territories",
    id: toAlpha3(iso2),
  }));
  const response = await ascRequest<AvailabilityAttributes>(
    `/v2/appAvailabilities`,
    {
      method: "POST",
      body: {
        data: {
          type: "appAvailabilities",
          relationships: {
            app: { data: { type: "apps", id: appId } },
            availableTerritories: { data: territoriesData },
          },
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<AvailabilityAttributes>;
  }
  return response.data as Resource<AvailabilityAttributes>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- availability.test
```

Expected: `1 passed`.

- [ ] **Step 5: Add zod schema**

Append to `servers/appstore-connect/src/tools/schemas.ts`:

```ts
export const AscSetAvailabilitySchema = z.object({
  app_id: z.string().describe("The app's App Store Connect ID"),
  territories: z
    .array(z.string())
    .describe("ISO 3166-1 alpha-2 territory codes the app should be available in"),
});
```

- [ ] **Step 6: Register `asc_set_availability` MCP tool**

In `servers/appstore-connect/src/tools/asc-tools.ts`, add:

```ts
  // --- asc_set_availability ---
  server.tool(
    "asc_set_availability",
    "Set the territories the app is available in",
    AscSetAvailabilitySchema.shape,
    async ({ app_id, territories }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setAppAvailability(app_id, territories);
        await appendHistoryEntry("pushes", {
          tool: "asc_set_availability",
          target: { app_id },
          payload: { territories },
          result: "success",
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, id: updated.id }, null, 2) },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_availability",
          target: { app_id },
          payload: { territories },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

Imports:

```ts
import { setAppAvailability } from "../api/availability.js";
import { AscSetAvailabilitySchema } from "./schemas.js";
```

- [ ] **Step 7: Build**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add servers/appstore-connect/src/api/availability.ts servers/appstore-connect/src/api/__tests__/availability.test.ts servers/appstore-connect/src/tools/asc-tools.ts servers/appstore-connect/src/tools/schemas.ts
git commit -m "Add asc_set_availability tool"
```

---

## Task 11: Privacy Responses API Wrapper + `asc_set_privacy_responses` Tool

App Privacy uses two ASC resources: `appDataUsages` (one per declared `(category, dataProtection, purpose)` triple) and `appDataUsageCategories` / `appDataUsagePurposes` references. The wrapper accepts the `PrivacyResponses` shape from `privacy.json`, deletes any existing `appDataUsages` for the app, then POSTs new ones for each declared data type. Tracking domains are set via `appDataUsages` with type `dataProtection: "DATA_USED_TO_TRACK_YOU"`.

For M1 we implement the *replace* semantics: the local `privacy.json` becomes the source of truth and a push wipes-and-sets ASC. This is simpler than merge logic and matches the intent ("git is the source of truth").

**Files:**
- Create: `servers/appstore-connect/src/api/privacy.ts`
- Create: `servers/appstore-connect/src/api/__tests__/privacy.test.ts`
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts`
- Modify: `servers/appstore-connect/src/tools/schemas.ts`

- [ ] **Step 1: Write failing tests**

Create `servers/appstore-connect/src/api/__tests__/privacy.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { replaceAppDataUsages } from "../privacy.js";
import type { PrivacyResponses } from "../../store/types.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("replaceAppDataUsages", () => {
  it("deletes existing usages then posts new ones", async () => {
    // First call: GET existing
    (ascRequest as any).mockResolvedValueOnce({
      data: [{ id: "du_old1" }, { id: "du_old2" }],
    });
    // DELETE calls return 204
    (ascRequest as any).mockResolvedValue({ data: [] });

    const cfg: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        {
          type: "CRASH_DATA",
          linkedToUser: false,
          usedForTracking: false,
          purposes: ["ANALYTICS"],
        },
      ],
    };

    await replaceAppDataUsages("app_1", cfg);

    const calls = (ascRequest as any).mock.calls;
    // First call: GET existing
    expect(calls[0][0]).toBe("/v1/apps/app_1/dataUsages");
    // Two DELETEs follow
    const deletes = calls.filter((c: any) => c[1]?.method === "DELETE");
    expect(deletes).toHaveLength(2);
    // Then POSTs for each declared (data type × purpose)
    const posts = calls.filter((c: any) => c[1]?.method === "POST");
    expect(posts.length).toBeGreaterThan(0);
    const post = posts[0][1].body.data;
    expect(post.type).toBe("appDataUsages");
    expect(post.relationships.app.data.id).toBe("app_1");
  });

  it("posts no usages when collectsData is false", async () => {
    (ascRequest as any).mockResolvedValueOnce({ data: [] }); // no existing
    const cfg: PrivacyResponses = {
      collectsData: false,
      tracking: { enabled: false, domains: [] },
      dataTypes: [],
    };
    await replaceAppDataUsages("app_1", cfg);
    const calls = (ascRequest as any).mock.calls;
    const posts = calls.filter((c: any) => c[1]?.method === "POST");
    expect(posts).toHaveLength(0);
  });

  it("uses DATA_USED_TO_TRACK_YOU for data types flagged usedForTracking", async () => {
    (ascRequest as any).mockResolvedValueOnce({ data: [] });
    (ascRequest as any).mockResolvedValue({ data: [] });
    const cfg: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "ADVERTISING_DATA", linkedToUser: true, usedForTracking: true, purposes: ["THIRD_PARTY_ADVERTISING"] },
      ],
    };
    await replaceAppDataUsages("app_1", cfg);
    const posts = (ascRequest as any).mock.calls.filter((c: any) => c[1]?.method === "POST");
    expect(posts[0][1].body.data.attributes.dataProtection).toBe("DATA_USED_TO_TRACK_YOU");
  });

  it("posts a tracking-domain usage for each domain when tracking.enabled", async () => {
    (ascRequest as any).mockResolvedValueOnce({ data: [] });
    (ascRequest as any).mockResolvedValue({ data: [] });
    const cfg: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: true, domains: ["analytics.example.com", "ads.example.com"] },
      dataTypes: [],
    };
    await replaceAppDataUsages("app_1", cfg);
    const calls = (ascRequest as any).mock.calls;
    const trackingPosts = calls.filter(
      (c: any) =>
        c[1]?.method === "POST" &&
        c[1]?.body?.data?.attributes?.dataProtection === "DATA_USED_TO_TRACK_YOU"
    );
    expect(trackingPosts).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- privacy.test
```

Expected: FAIL — `Cannot find module '../privacy.js'`.

- [ ] **Step 3: Implement the privacy wrapper**

Create `servers/appstore-connect/src/api/privacy.ts`:

```ts
import { ascRequest } from "./client.js";
import type { PrivacyResponses, DeclaredDataType } from "../store/types.js";
import type { Purpose } from "../data/privacy-taxonomy.js";

interface UsagePost {
  type: "appDataUsages";
  attributes: {
    dataProtection: string;
  };
  relationships: {
    app: { data: { type: "apps"; id: string } };
    category?: { data: { type: "appDataUsageCategories"; id: string } };
    purpose?: { data: { type: "appDataUsagePurposes"; id: string } };
  };
}

/**
 * Map a DeclaredDataType + Purpose → one POST body.
 *
 * Apple's three data-protection buckets are mutually exclusive on a single
 * usage record. Tracking trumps everything; otherwise we pick linked-to-user
 * vs not. (A data type can appear in multiple buckets — that becomes multiple
 * appDataUsages records, which the caller produces by listing both purposes.)
 */
function postBodyFor(
  appId: string,
  dt: DeclaredDataType,
  purpose: Purpose
): UsagePost {
  const dataProtection = dt.usedForTracking
    ? "DATA_USED_TO_TRACK_YOU"
    : dt.linkedToUser
      ? "DATA_LINKED_TO_YOU"
      : "DATA_NOT_LINKED_TO_YOU";

  return {
    type: "appDataUsages",
    attributes: { dataProtection },
    relationships: {
      app: { data: { type: "apps", id: appId } },
      category: { data: { type: "appDataUsageCategories", id: dt.type } },
      purpose: { data: { type: "appDataUsagePurposes", id: purpose } },
    },
  };
}

/** Map a tracking domain → one POST body */
function trackingDomainPost(appId: string, domain: string): UsagePost {
  return {
    type: "appDataUsages",
    attributes: { dataProtection: "DATA_USED_TO_TRACK_YOU" },
    relationships: {
      app: { data: { type: "apps", id: appId } },
      // Tracking domain stored as category id in the same shape
      category: { data: { type: "appDataUsageCategories", id: `TRACKING_DOMAIN_${domain}` } },
    },
  };
}

/** Replace all appDataUsages for an app with the supplied PrivacyResponses */
export async function replaceAppDataUsages(
  appId: string,
  cfg: PrivacyResponses
): Promise<void> {
  // 1. GET existing usages for this app
  const existing = await ascRequest<{ id: string }>(
    `/v1/apps/${appId}/dataUsages`,
    { params: { limit: "200" } }
  );
  const existingArr = Array.isArray(existing.data) ? existing.data : [existing.data];

  // 2. DELETE each existing usage
  for (const usage of existingArr) {
    if (!usage?.id) continue;
    await ascRequest(`/v1/appDataUsages/${usage.id}`, { method: "DELETE" });
  }

  // 3. POST new usages: one per (dataType × purpose) plus one per tracking domain
  for (const dt of cfg.dataTypes) {
    for (const purpose of dt.purposes) {
      await ascRequest(`/v1/appDataUsages`, {
        method: "POST",
        body: { data: postBodyFor(appId, dt, purpose) },
      });
    }
  }
  if (cfg.tracking.enabled) {
    for (const domain of cfg.tracking.domains) {
      await ascRequest(`/v1/appDataUsages`, {
        method: "POST",
        body: { data: trackingDomainPost(appId, domain) },
      });
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- "api/__tests__/privacy"
```

Expected: `4 passed`.

- [ ] **Step 5: Add zod schema (re-uses the store schema for the body)**

Append to `servers/appstore-connect/src/tools/schemas.ts`:

```ts
export const AscSetPrivacyResponsesSchema = z.object({
  app_id: z.string().describe("The app's App Store Connect ID"),
  responses: z
    .object({
      collectsData: z.boolean(),
      tracking: z.object({
        enabled: z.boolean(),
        domains: z.array(z.string()),
      }),
      dataTypes: z.array(
        z.object({
          type: z.string(),
          linkedToUser: z.boolean(),
          usedForTracking: z.boolean(),
          purposes: z.array(z.string()),
        })
      ),
    })
    .describe("Full privacy responses; replaces existing ASC declarations"),
});
```

- [ ] **Step 6: Register `asc_set_privacy_responses` tool**

In `servers/appstore-connect/src/tools/asc-tools.ts`, add:

```ts
  // --- asc_set_privacy_responses ---
  server.tool(
    "asc_set_privacy_responses",
    "Replace the app's App Privacy declarations with the supplied responses",
    AscSetPrivacyResponsesSchema.shape,
    async ({ app_id, responses }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        await replaceAppDataUsages(app_id, responses as any);
        await appendHistoryEntry("pushes", {
          tool: "asc_set_privacy_responses",
          target: { app_id },
          payload: { responses },
          result: "success",
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, app_id, replaced: true }, null, 2),
            },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_privacy_responses",
          target: { app_id },
          payload: { responses },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

Imports:

```ts
import { replaceAppDataUsages } from "../api/privacy.js";
import { AscSetPrivacyResponsesSchema } from "./schemas.js";
```

- [ ] **Step 7: Build**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add servers/appstore-connect/src/api/privacy.ts servers/appstore-connect/src/api/__tests__/privacy.test.ts servers/appstore-connect/src/tools/asc-tools.ts servers/appstore-connect/src/tools/schemas.ts
git commit -m "Add asc_set_privacy_responses tool with replace semantics"
```

---

## Task 12: Review Info API Wrapper + `asc_set_review_info` Tool

App Review information is stored on the version's `appStoreReviewDetail` resource. The wrapper PATCHes `attributes.contactFirstName/Last/Email/Phone`, `demoAccountRequired`, `demoAccountName`, `demoAccountPassword`, and `notes`.

**Files:**
- Create: `servers/appstore-connect/src/api/review-info.ts`
- Create: `servers/appstore-connect/src/api/__tests__/review-info.test.ts`
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts`
- Modify: `servers/appstore-connect/src/tools/schemas.ts`

- [ ] **Step 1: Write failing tests**

Create `servers/appstore-connect/src/api/__tests__/review-info.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAppStoreReviewDetail } from "../review-info.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAppStoreReviewDetail", () => {
  it("PATCHes contact + demo + notes", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "rd_1", attributes: {} } });

    await setAppStoreReviewDetail("rd_1", {
      contact: { firstName: "V", lastName: "S", email: "v@example.com", phone: "+1" },
      demo: { required: true, username: "demo", password: "secret" },
      notes: "Use demo account",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.type).toBe("appStoreReviewDetails");
    expect(body.data.attributes.contactFirstName).toBe("V");
    expect(body.data.attributes.contactEmail).toBe("v@example.com");
    expect(body.data.attributes.demoAccountRequired).toBe(true);
    expect(body.data.attributes.demoAccountName).toBe("demo");
    expect(body.data.attributes.demoAccountPassword).toBe("secret");
    expect(body.data.attributes.notes).toBe("Use demo account");
  });

  it("omits demo username/password when not required", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "rd_1", attributes: {} } });

    await setAppStoreReviewDetail("rd_1", {
      contact: { firstName: "V", lastName: "S", email: "v@example.com", phone: "+1" },
      demo: { required: false },
      notes: "",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.demoAccountRequired).toBe(false);
    expect(body.data.attributes.demoAccountName).toBeUndefined();
    expect(body.data.attributes.demoAccountPassword).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- review-info.test
```

Expected: FAIL.

- [ ] **Step 3: Implement the wrapper**

Create `servers/appstore-connect/src/api/review-info.ts`:

```ts
import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";
import type { ReviewInfo } from "../store/types.js";

interface ReviewDetailAttributes {
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  demoAccountRequired?: boolean;
  demoAccountName?: string;
  demoAccountPassword?: string;
  notes?: string;
}

export async function setAppStoreReviewDetail(
  reviewDetailId: string,
  info: ReviewInfo
): Promise<Resource<ReviewDetailAttributes>> {
  const attributes: ReviewDetailAttributes = {
    contactFirstName: info.contact.firstName,
    contactLastName: info.contact.lastName,
    contactEmail: info.contact.email,
    contactPhone: info.contact.phone,
    demoAccountRequired: info.demo.required,
    notes: info.notes,
  };
  if (info.demo.required) {
    attributes.demoAccountName = info.demo.username;
    attributes.demoAccountPassword = info.demo.password;
  }
  const response = await ascRequest<ReviewDetailAttributes>(
    `/v1/appStoreReviewDetails/${reviewDetailId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "appStoreReviewDetails",
          id: reviewDetailId,
          attributes,
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<ReviewDetailAttributes>;
  }
  return response.data as Resource<ReviewDetailAttributes>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- review-info.test
```

Expected: `2 passed`.

- [ ] **Step 5: Add zod schema**

Append to `servers/appstore-connect/src/tools/schemas.ts`:

```ts
export const AscSetReviewInfoSchema = z.object({
  review_detail_id: z.string().describe("The version's appStoreReviewDetail resource ID"),
  contact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  demo: z.object({
    required: z.boolean(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
  notes: z.string(),
});
```

- [ ] **Step 6: Register `asc_set_review_info` MCP tool**

In `servers/appstore-connect/src/tools/asc-tools.ts`, add:

```ts
  // --- asc_set_review_info ---
  server.tool(
    "asc_set_review_info",
    "Set App Review information (contact, demo credentials, notes)",
    AscSetReviewInfoSchema.shape,
    async ({ review_detail_id, contact, demo, notes }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setAppStoreReviewDetail(review_detail_id, {
          contact,
          demo,
          notes,
        });
        await appendHistoryEntry("pushes", {
          tool: "asc_set_review_info",
          target: { review_detail_id },
          // Don't log the password
          payload: {
            contact,
            demo: { required: demo.required, username: demo.username, password: demo.password ? "<redacted>" : undefined },
            notes,
          },
          result: "success",
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, id: updated.id }, null, 2) },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_review_info",
          target: { review_detail_id },
          payload: { contact, demo: { required: demo.required }, notes },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

Imports:

```ts
import { setAppStoreReviewDetail } from "../api/review-info.js";
import { AscSetReviewInfoSchema } from "./schemas.js";
```

- [ ] **Step 7: Build**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add servers/appstore-connect/src/api/review-info.ts servers/appstore-connect/src/api/__tests__/review-info.test.ts servers/appstore-connect/src/tools/asc-tools.ts servers/appstore-connect/src/tools/schemas.ts
git commit -m "Add asc_set_review_info tool (passwords redacted in audit log)"
```

---

## Task 13: Encryption Compliance API Wrapper + `asc_set_encryption_compliance` Tool

Encryption compliance is per-build: PATCH `/v1/builds/{id}` with `attributes.usesNonExemptEncryption` and (when applicable) `attributes.exportComplianceCode`. The local default lives in `listing.json.encryption`.

**Files:**
- Create: `servers/appstore-connect/src/api/encryption.ts`
- Create: `servers/appstore-connect/src/api/__tests__/encryption.test.ts`
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts`
- Modify: `servers/appstore-connect/src/tools/schemas.ts`

- [ ] **Step 1: Write failing tests**

Create `servers/appstore-connect/src/api/__tests__/encryption.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setBuildEncryption } from "../encryption.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setBuildEncryption", () => {
  it("PATCHes usesNonExemptEncryption=false when no encryption", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "b_1", attributes: {} } });
    await setBuildEncryption("b_1", { usesEncryption: false, exemptions: [] });
    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.usesNonExemptEncryption).toBe(false);
    expect(body.data.attributes.exportComplianceCode).toBeUndefined();
  });

  it("includes exportComplianceCode when encryption + exemption code provided", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "b_1", attributes: {} } });
    await setBuildEncryption("b_1", { usesEncryption: true, exemptions: ["EXEMPT-CODE-123"] });
    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.usesNonExemptEncryption).toBe(true);
    expect(body.data.attributes.exportComplianceCode).toBe("EXEMPT-CODE-123");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- encryption.test
```

Expected: FAIL.

- [ ] **Step 3: Implement the wrapper**

Create `servers/appstore-connect/src/api/encryption.ts`:

```ts
import { ascRequest } from "./client.js";
import type { Resource } from "./types.js";

interface BuildEncryptionAttributes {
  usesNonExemptEncryption: boolean;
  exportComplianceCode?: string;
}

export interface EncryptionUpdate {
  usesEncryption: boolean;
  exemptions: string[];
}

export async function setBuildEncryption(
  buildId: string,
  update: EncryptionUpdate
): Promise<Resource<BuildEncryptionAttributes>> {
  const attributes: BuildEncryptionAttributes = {
    usesNonExemptEncryption: update.usesEncryption,
  };
  if (update.usesEncryption && update.exemptions.length > 0) {
    attributes.exportComplianceCode = update.exemptions[0];
  }
  const response = await ascRequest<BuildEncryptionAttributes>(
    `/v1/builds/${buildId}`,
    {
      method: "PATCH",
      body: {
        data: { type: "builds", id: buildId, attributes },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<BuildEncryptionAttributes>;
  }
  return response.data as Resource<BuildEncryptionAttributes>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- encryption.test
```

Expected: `2 passed`.

- [ ] **Step 5: Add zod schema**

Append to `servers/appstore-connect/src/tools/schemas.ts`:

```ts
export const AscSetEncryptionComplianceSchema = z.object({
  build_id: z.string().describe("The build resource ID"),
  uses_encryption: z.boolean().describe("Whether the build uses non-exempt encryption"),
  exemptions: z.array(z.string()).default([]).describe("Optional export-compliance code(s)"),
});
```

- [ ] **Step 6: Register `asc_set_encryption_compliance` MCP tool**

In `servers/appstore-connect/src/tools/asc-tools.ts`, add:

```ts
  // --- asc_set_encryption_compliance ---
  server.tool(
    "asc_set_encryption_compliance",
    "Set encryption compliance answer on a build",
    AscSetEncryptionComplianceSchema.shape,
    async ({ build_id, uses_encryption, exemptions }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updated = await setBuildEncryption(build_id, {
          usesEncryption: uses_encryption,
          exemptions,
        });
        await appendHistoryEntry("pushes", {
          tool: "asc_set_encryption_compliance",
          target: { build_id },
          payload: { uses_encryption, exemptions },
          result: "success",
        });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ success: true, id: updated.id }, null, 2) },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_set_encryption_compliance",
          target: { build_id },
          payload: { uses_encryption, exemptions },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

Imports:

```ts
import { setBuildEncryption } from "../api/encryption.js";
import { AscSetEncryptionComplianceSchema } from "./schemas.js";
```

- [ ] **Step 7: Build**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add servers/appstore-connect/src/api/encryption.ts servers/appstore-connect/src/api/__tests__/encryption.test.ts servers/appstore-connect/src/tools/asc-tools.ts servers/appstore-connect/src/tools/schemas.ts
git commit -m "Add asc_set_encryption_compliance tool"
```

---

## Task 14: Extend `asc_update_version_localization` with marketingUrl and supportUrl

The existing tool accepts `description`, `keywords`, `promotionalText`, `whatsNew`. Apple's `appStoreVersionLocalizations` resource also exposes `marketingUrl` and `supportUrl` at the same shape. Add them as optional fields. Also update the existing tests (none yet — add coverage for the URL fields specifically).

**Files:**
- Modify: `servers/appstore-connect/src/api/versions.ts` (extend `updateVersionLocalization`)
- Modify: `servers/appstore-connect/src/api/types.ts` (extend `VersionLocalizationAttributes` if needed)
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts:261-305` (extend the tool)
- Create: `servers/appstore-connect/src/api/__tests__/versions.test.ts`

- [ ] **Step 1: Write failing tests for the URL extension**

Create `servers/appstore-connect/src/api/__tests__/versions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateVersionLocalization } from "../versions.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("updateVersionLocalization", () => {
  it("forwards marketingUrl and supportUrl in the PATCH body", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "vl_1", attributes: { locale: "en-US" } },
    });

    await updateVersionLocalization("vl_1", {
      marketingUrl: "https://example.com",
      supportUrl: "https://example.com/support",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.marketingUrl).toBe("https://example.com");
    expect(body.data.attributes.supportUrl).toBe("https://example.com/support");
  });

  it("still supports the existing description/keywords/promo/whatsNew fields", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "vl_1", attributes: { locale: "en-US" } } });

    await updateVersionLocalization("vl_1", {
      description: "desc",
      keywords: "k1,k2",
      promotionalText: "promo",
      whatsNew: "new",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.description).toBe("desc");
    expect(body.data.attributes.keywords).toBe("k1,k2");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- "api/__tests__/versions"
```

Expected: FAIL — current `updateVersionLocalization` doesn't accept those fields.

- [ ] **Step 3: Extend the API wrapper**

Open `servers/appstore-connect/src/api/versions.ts` and find the `updateVersionLocalization` function. Update its `updates` parameter type to:

```ts
export async function updateVersionLocalization(
  localizationId: string,
  updates: {
    description?: string;
    keywords?: string;
    promotionalText?: string;
    whatsNew?: string;
    marketingUrl?: string;
    supportUrl?: string;
  }
): Promise<Resource<VersionLocalizationAttributes>> {
  // Body construction unchanged — `updates` is passed straight through as attributes
  const response = await ascRequest<VersionLocalizationAttributes>(
    `/v1/appStoreVersionLocalizations/${localizationId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "appStoreVersionLocalizations",
          id: localizationId,
          attributes: updates,
        },
      },
    }
  );
  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<VersionLocalizationAttributes>;
  }
  return response.data as Resource<VersionLocalizationAttributes>;
}
```

If `VersionLocalizationAttributes` in `api/types.ts` doesn't already have `marketingUrl?: string; supportUrl?: string;`, add them.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- "api/__tests__/versions"
```

Expected: `2 passed`.

- [ ] **Step 5: Extend the MCP tool to expose the new fields**

In `servers/appstore-connect/src/tools/asc-tools.ts` lines 261-305, replace the `asc_update_version_localization` registration with:

```ts
  // --- asc_update_version_localization ---
  server.tool(
    "asc_update_version_localization",
    "Update version localization (description, keywords, promo, whatsNew, marketingUrl, supportUrl) in App Store Connect",
    {
      localization_id: z.string().describe("The version localization ID"),
      description: z.string().optional().describe("New description"),
      keywords: z.string().optional().describe("New keywords"),
      promotionalText: z.string().optional().describe("New promotional text"),
      whatsNew: z.string().optional().describe("New What's New text"),
      marketingUrl: z.string().optional().describe("Marketing URL for this locale"),
      supportUrl: z.string().optional().describe("Support URL for this locale"),
    },
    async ({
      localization_id,
      description,
      keywords,
      promotionalText,
      whatsNew,
      marketingUrl,
      supportUrl,
    }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updates: Record<string, string> = {};
        if (description !== undefined) updates.description = description;
        if (keywords !== undefined) updates.keywords = keywords;
        if (promotionalText !== undefined) updates.promotionalText = promotionalText;
        if (whatsNew !== undefined) updates.whatsNew = whatsNew;
        if (marketingUrl !== undefined) updates.marketingUrl = marketingUrl;
        if (supportUrl !== undefined) updates.supportUrl = supportUrl;

        const updated = await updateVersionLocalization(localization_id, updates);
        await appendHistoryEntry("pushes", {
          tool: "asc_update_version_localization",
          target: { localization_id },
          payload: updates,
          result: "success",
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: updated.id,
                  locale: updated.attributes.locale,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_update_version_localization",
          target: { localization_id },
          payload: { description, keywords, promotionalText, whatsNew, marketingUrl, supportUrl },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

- [ ] **Step 6: Build**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add servers/appstore-connect/src/api/versions.ts servers/appstore-connect/src/api/types.ts servers/appstore-connect/src/api/__tests__/versions.test.ts servers/appstore-connect/src/tools/asc-tools.ts
git commit -m "Extend asc_update_version_localization with marketingUrl and supportUrl"
```

---

## Task 15: Extend `asc_update_app_info` with privacyPolicyUrl + per-locale fallback

Apple stores the privacy policy URL in two places: app-level `appInfos[].privacyPolicyUrl` and per-locale `appInfoLocalizations[].privacyPolicyUrl`. The field report (§4.16) reports a 409 conflict on app-level PATCHes when other fields are also being changed. The robust path: try the per-locale PATCH (which never 409s in this scenario). The MCP tool accepts a `privacy_policy_url` and a `localization_id` and PATCHes the per-locale resource directly.

**Files:**
- Modify: `servers/appstore-connect/src/api/app-info.ts:43-66` (extend `updateAppInfoLocalization` to accept `privacyPolicyUrl`)
- Modify: `servers/appstore-connect/src/tools/asc-tools.ts` (extend `asc_update_app_info` tool)
- Create: `servers/appstore-connect/src/api/__tests__/app-info.test.ts`

- [ ] **Step 1: Write failing tests for the privacy URL extension**

Create `servers/appstore-connect/src/api/__tests__/app-info.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateAppInfoLocalization } from "../app-info.js";

vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
  ascRequestAllPages: vi.fn(),
}));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("updateAppInfoLocalization", () => {
  it("forwards privacyPolicyUrl in the PATCH attributes", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ail_1", attributes: { locale: "en-US" } },
    });

    await updateAppInfoLocalization("ail_1", {
      privacyPolicyUrl: "https://example.com/privacy",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.privacyPolicyUrl).toBe("https://example.com/privacy");
  });

  it("still supports name and subtitle alongside the new field", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ail_1", attributes: { locale: "en-US" } },
    });

    await updateAppInfoLocalization("ail_1", {
      name: "Cool App",
      subtitle: "The cool one",
      privacyPolicyUrl: "https://example.com/privacy",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.name).toBe("Cool App");
    expect(body.data.attributes.subtitle).toBe("The cool one");
    expect(body.data.attributes.privacyPolicyUrl).toBe("https://example.com/privacy");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- "api/__tests__/app-info"
```

Expected: FAIL.

- [ ] **Step 3: Extend the API wrapper**

In `servers/appstore-connect/src/api/app-info.ts`, replace the `updateAppInfoLocalization` function with:

```ts
/** Update an app info localization (name, subtitle, privacyPolicyUrl) */
export async function updateAppInfoLocalization(
  localizationId: string,
  updates: { name?: string; subtitle?: string; privacyPolicyUrl?: string }
): Promise<Resource<AppInfoLocalizationAttributes>> {
  const response = await ascRequest<AppInfoLocalizationAttributes>(
    `/v1/appInfoLocalizations/${localizationId}`,
    {
      method: "PATCH",
      body: {
        data: {
          type: "appInfoLocalizations",
          id: localizationId,
          attributes: updates,
        },
      },
    }
  );

  if (Array.isArray(response.data)) {
    return response.data[0] as Resource<AppInfoLocalizationAttributes>;
  }
  return response.data as Resource<AppInfoLocalizationAttributes>;
}
```

Verify `AppInfoLocalizationAttributes` in `servers/appstore-connect/src/api/types.ts` includes `privacyPolicyUrl?: string;`. The existing `getAppInfoLocalizations` already selects `privacyPolicyUrl,privacyChoicesUrl,privacyPolicyText` in its field list, so the type usually already has it — but if the type was hand-typed and missed those fields, add them now:

```ts
export interface AppInfoLocalizationAttributes {
  locale?: string;
  name?: string;
  subtitle?: string;
  privacyPolicyUrl?: string;
  privacyChoicesUrl?: string;
  privacyPolicyText?: string;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- "api/__tests__/app-info"
```

Expected: `2 passed`.

- [ ] **Step 5: Extend the MCP tool**

In `servers/appstore-connect/src/tools/asc-tools.ts`, find the `asc_update_app_info` registration (lines 131-172) and replace with:

```ts
  // --- asc_update_app_info ---
  server.tool(
    "asc_update_app_info",
    "Update app-level localization (name, subtitle, privacyPolicyUrl) in App Store Connect",
    {
      localization_id: z.string().describe("The app info localization ID"),
      name: z.string().optional().describe("New app name"),
      subtitle: z.string().optional().describe("New app subtitle"),
      privacyPolicyUrl: z
        .string()
        .optional()
        .describe(
          "Privacy policy URL for this locale (per-locale storage avoids the app-level PATCH 409 conflict)"
        ),
    },
    async ({ localization_id, name, subtitle, privacyPolicyUrl }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();
        const updates: Record<string, string> = {};
        if (name !== undefined) updates.name = name;
        if (subtitle !== undefined) updates.subtitle = subtitle;
        if (privacyPolicyUrl !== undefined) updates.privacyPolicyUrl = privacyPolicyUrl;

        const updated = await updateAppInfoLocalization(localization_id, updates);
        await appendHistoryEntry("pushes", {
          tool: "asc_update_app_info",
          target: { localization_id },
          payload: updates,
          result: "success",
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: updated.id,
                  name: updated.attributes.name,
                  subtitle: updated.attributes.subtitle,
                  privacyPolicyUrl: updated.attributes.privacyPolicyUrl,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        await appendHistoryEntry("pushes", {
          tool: "asc_update_app_info",
          target: { localization_id },
          payload: { name, subtitle, privacyPolicyUrl },
          result: "error",
          error: e.message,
        });
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

- [ ] **Step 6: Build**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add servers/appstore-connect/src/api/app-info.ts servers/appstore-connect/src/api/__tests__/app-info.test.ts servers/appstore-connect/src/tools/asc-tools.ts
git commit -m "Extend asc_update_app_info with privacyPolicyUrl (per-locale)"
```

---

## Task 16: Local Store MCP Tools (`store_*_listing`, `store_*_privacy`, `store_*_review`)

Expose the new local-store JSON files (`listing.json`, `privacy.json`, `review.json`) through MCP tools so skills can read/write them. Mirror the existing `store_read_config` / `store_write_config` pattern.

**Files:**
- Modify: `servers/appstore-connect/src/tools/store-tools.ts` (register six new tools)
- Modify: `servers/appstore-connect/src/tools/schemas.ts` (add zod schemas)
- Create: `servers/appstore-connect/src/tools/__tests__/store-tools.test.ts` (smoke test the registration)

- [ ] **Step 1: Add zod schemas**

Append to `servers/appstore-connect/src/tools/schemas.ts`:

```ts
export const StoreReadListingSchema = z.object({});
export const StoreWriteListingSchema = z.object({
  listing: z.unknown().describe("Full ListingConfig object"),
});
export const StoreReadPrivacySchema = z.object({});
export const StoreWritePrivacySchema = z.object({
  responses: z.unknown().describe("Full PrivacyResponses object"),
});
export const StoreReadReviewSchema = z.object({});
export const StoreWriteReviewSchema = z.object({
  review: z.unknown().describe("Full ReviewInfo object"),
});
```

- [ ] **Step 2: Write a smoke test that the new tools are registered**

Create `servers/appstore-connect/src/tools/__tests__/store-tools.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStoreTools } from "../store-tools.js";

describe("registerStoreTools", () => {
  it("registers the new listing/privacy/review tools alongside existing ones", () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const toolSpy = vi.spyOn(server, "tool");
    registerStoreTools(server);
    const registeredNames = toolSpy.mock.calls.map((c) => c[0]);
    expect(registeredNames).toContain("store_read_listing");
    expect(registeredNames).toContain("store_write_listing");
    expect(registeredNames).toContain("store_read_privacy");
    expect(registeredNames).toContain("store_write_privacy");
    expect(registeredNames).toContain("store_read_review");
    expect(registeredNames).toContain("store_write_review");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd servers/appstore-connect && npm test -- "tools/__tests__/store-tools"
```

Expected: FAIL — those tools aren't registered yet.

- [ ] **Step 4: Register the six new tools**

In `servers/appstore-connect/src/tools/store-tools.ts`, add (just before the closing `}` of `registerStoreTools`):

```ts
  // --- store_read_listing ---
  server.tool(
    "store_read_listing",
    "Read the local listing config (categories, age rating, pricing, availability, encryption)",
    StoreReadListingSchema.shape,
    async () => {
      try {
        const cfg = await readListing();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ listing: cfg }, null, 2) },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- store_write_listing ---
  server.tool(
    "store_write_listing",
    "Write the local listing config",
    StoreWriteListingSchema.shape,
    async ({ listing }) => {
      try {
        await writeListing(listing as any);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true }, null, 2) }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- store_read_privacy ---
  server.tool(
    "store_read_privacy",
    "Read the local App Privacy responses",
    StoreReadPrivacySchema.shape,
    async () => {
      try {
        const cfg = await readPrivacy();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ privacy: cfg }, null, 2) },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- store_write_privacy ---
  server.tool(
    "store_write_privacy",
    "Write the local App Privacy responses (validates against the taxonomy)",
    StoreWritePrivacySchema.shape,
    async ({ responses }) => {
      try {
        await writePrivacy(responses as any);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true }, null, 2) }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- store_read_review ---
  server.tool(
    "store_read_review",
    "Read the local App Review information",
    StoreReadReviewSchema.shape,
    async () => {
      try {
        const cfg = await readReview();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ review: cfg }, null, 2) },
          ],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );

  // --- store_write_review ---
  server.tool(
    "store_write_review",
    "Write the local App Review information (validates demo username/password)",
    StoreWriteReviewSchema.shape,
    async ({ review }) => {
      try {
        await writeReview(review as any);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ success: true }, null, 2) }],
        };
      } catch (e: any) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e.message}` }],
          isError: true,
        };
      }
    }
  );
```

Imports at the top of the file:

```ts
import { readListing, writeListing } from "../store/listing.js";
import { readPrivacy, writePrivacy } from "../store/privacy.js";
import { readReview, writeReview } from "../store/review.js";
import {
  StoreReadListingSchema,
  StoreWriteListingSchema,
  StoreReadPrivacySchema,
  StoreWritePrivacySchema,
  StoreReadReviewSchema,
  StoreWriteReviewSchema,
} from "./schemas.js";
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd servers/appstore-connect && npm test -- "tools/__tests__/store-tools"
```

Expected: `1 passed`.

- [ ] **Step 6: Build**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add servers/appstore-connect/src/tools/store-tools.ts servers/appstore-connect/src/tools/schemas.ts servers/appstore-connect/src/tools/__tests__/store-tools.test.ts
git commit -m "Add store_read/write tools for listing, privacy, review"
```

---

## Task 17: Update `/setup` Skill — Extended .gitignore + Git LFS Prompt

The setup skill is users' first interaction with the toolkit. Update its instructions so that on initial configuration it (a) writes the extended `.gitignore` (which `ensureAppstoreDir` now does automatically — this is just user-facing communication), (b) offers Git LFS initialization for `.appstore/assets/` if assets will hold large binaries, and (c) creates seed `listing.json`, `privacy.json`, `review.json` files with sane defaults.

**Files:**
- Modify: `skills/setup/SKILL.md`

- [ ] **Step 1: Read the current setup skill to understand the conversational flow**

```bash
cat /Users/vishal/work/personal/apple-app-store-assistant/skills/setup/SKILL.md
```

Identify where the wizard finishes — the new steps are appended after credentials are stored.

- [ ] **Step 2: Add a new "Listing seed" stage to the setup skill**

In `skills/setup/SKILL.md`, add a new section after the credentials stage. Use the same conversational style as the rest of the skill:

```markdown
## Stage: Seed listing.json, privacy.json, review.json

After credentials are saved, ask the user whether to seed the new local-store files with safe defaults.

Conversational beats:
1. "I'll create three new files in `.appstore/` so you can fill in the listing configuration as you go: `listing.json`, `privacy.json`, `review.json`. Each starts empty / safe-default. Sound good?" (yes/no)
2. If yes:
   - Use `store_write_listing` with the result of calling `defaultListingConfig()` (or supply the literal default JSON):
     ```json
     {
       "categories": { "primary": "PRODUCTIVITY" },
       "ageRating": { "answers": [] },
       "pricing": { "defaultTier": 0, "perTerritory": [] },
       "availability": { "territories": ["US"] },
       "encryption": { "usesEncryption": false, "exemptions": [] }
     }
     ```
   - Use `store_write_privacy` with `{ "collectsData": false, "tracking": { "enabled": false, "domains": [] }, "dataTypes": [] }`.
   - Use `store_write_review` with `{ "contact": { "firstName": "", "lastName": "", "email": "", "phone": "" }, "demo": { "required": false }, "notes": "" }`.
3. Confirm: "Seeded. You can edit these files directly in your editor or use the relevant skills (e.g., `/app-store-toolkit:privacy` to revisit privacy answers)."

## Stage: Git LFS prompt for .appstore/assets/

After seeding, ask:
1. "Will you store screenshots and App Preview videos in `.appstore/assets/`? (Recommended for git-tracking your listing assets.)" (yes/no)
2. If yes:
   - Check if Git LFS is installed: `git lfs version`. If the command fails, tell the user to install Git LFS (https://git-lfs.com/) and re-run setup.
   - If installed, run:
     ```bash
     git lfs install
     git lfs track "*.png" "*.mp4" "*.mov"
     git add .gitattributes
     ```
   - Confirm: "Git LFS configured for PNG, MP4, MOV files in this repo."

## Stage: .gitignore confirmation

`ensureAppstoreDir` automatically writes `.appstore/.gitignore` with `config.local.json` and `ship-state.json`. Tell the user this happened so they understand what's intentionally untracked.
```

- [ ] **Step 3: Commit**

```bash
git add skills/setup/SKILL.md
git commit -m "Setup skill: seed listing/privacy/review files and offer Git LFS init"
```

---

## Task 18: Update `/push` Skill — Sync new files to ASC

The push skill currently pushes per-locale metadata. Extend it to also push `listing.json` (categories, age rating, pricing, availability), `privacy.json` (full replace of App Privacy declarations), and `review.json` (App Review information). The skill orchestrates: read the local file → ensure required ASC ids are known → call the matching `asc_set_*` tool. Each tool already logs to `history/pushes.jsonl` so the skill doesn't need to log explicitly.

**Files:**
- Modify: `skills/push/SKILL.md`

- [ ] **Step 1: Read the current push skill**

```bash
cat /Users/vishal/work/personal/apple-app-store-assistant/skills/push/SKILL.md
```

- [ ] **Step 2: Add a "Push listing config" section**

In `skills/push/SKILL.md`, after the metadata-push section, add:

```markdown
## Pushing listing config (categories, age rating, pricing, availability, encryption)

Read `.appstore/listing.json` via `store_read_listing`. If the file doesn't exist, skip this stage with a note: "No listing.json found — run /app-store-toolkit:setup or create it manually."

Then for each section that needs pushing (offer the user a multi-select if running interactively):

### Categories
Look up `app_info_id` (the editable appInfo's id) via `asc_get_app_info` if not already cached. Then call:
```
asc_set_categories({
  app_info_id: "<id>",
  primary: listing.categories.primary,
  secondary: listing.categories.secondary,
})
```

### Age rating
Look up the `ageRatingDeclaration` id from the editable `appInfo` (Apple exposes it as a relationship). Then:
```
asc_set_age_rating({
  declaration_id: "<id>",
  answers: listing.ageRating.answers,
})
```

### Pricing
```
asc_set_pricing({
  app_id: "<id>",
  default_tier: listing.pricing.defaultTier,
  per_territory: listing.pricing.perTerritory.map(p => ({ territory: p.territory, price_tier: p.priceTier })),
})
```

### Availability
```
asc_set_availability({
  app_id: "<id>",
  territories: listing.availability.territories,
})
```

### Encryption (if a build is attached)
Get `build_id` from the version. Then:
```
asc_set_encryption_compliance({
  build_id: "<id>",
  uses_encryption: listing.encryption.usesEncryption,
  exemptions: listing.encryption.exemptions,
})
```

## Pushing App Privacy

Read `.appstore/privacy.json` via `store_read_privacy`. If absent, skip with note. Else:
```
asc_set_privacy_responses({ app_id: "<id>", responses: privacy })
```

## Pushing App Review information

Read `.appstore/review.json` via `store_read_review`. If absent, skip. Else look up the `reviewDetailId` from the version's `appStoreReviewDetail` relationship and call:
```
asc_set_review_info({
  review_detail_id: "<id>",
  contact: review.contact,
  demo: review.demo,
  notes: review.notes,
})
```

## Pushing per-locale URL fields

When pushing each locale's content via `asc_update_version_localization`, include `marketingUrl` and `supportUrl` if present in the local metadata. When pushing each locale's `asc_update_app_info`, include `privacyPolicyUrl` if present.
```

- [ ] **Step 3: Commit**

```bash
git add skills/push/SKILL.md
git commit -m "Push skill: sync listing.json, privacy.json, review.json, URL fields"
```

---

## Task 19: Update `/pull` Skill — Fetch new fields from ASC

`pull` is the symmetric inverse: given an authenticated ASC connection, fetch the listing config, App Privacy declarations, App Review info, and per-locale URL fields, and write them into the local store. After pull, `git diff .appstore/` shows what differs between local and remote.

**Files:**
- Modify: `skills/pull/SKILL.md`

- [ ] **Step 1: Read the current pull skill**

```bash
cat /Users/vishal/work/personal/apple-app-store-assistant/skills/pull/SKILL.md
```

- [ ] **Step 2: Add a "Pull listing/privacy/review" section**

In `skills/pull/SKILL.md`, append:

```markdown
## Pulling listing config

For each section, read from ASC and merge into a `ListingConfig` object, then write via `store_write_listing`.

- **Categories**: read `appInfos[].attributes.{primaryCategory, secondaryCategory}`.
- **Age rating**: read `appInfos[].relationships.ageRatingDeclaration → attributes.{...}` and convert each camelCase attribute back to UPPER_SNAKE question id (`violenceCartoonOrFantasy → VIOLENCE_CARTOON_OR_FANTASY`).
- **Pricing**: read the latest `appPriceSchedules` with `included=manualPrices` and reconstruct `{ defaultTier, perTerritory }`.
- **Availability**: read `appAvailabilities → availableTerritories` and convert alpha-3 → alpha-2.
- **Encryption**: read the editable build's `usesNonExemptEncryption` and `exportComplianceCode`.

Note: pulling pricing and availability requires API calls not yet wrapped (they're write-side in M1). For pull, hand-roll with `asc_get_*` style helpers as needed; the wrappers can be added in a follow-on. For M1 it's acceptable to pull only categories, age rating, encryption — and document that pricing/availability pull is a known gap.

## Pulling App Privacy

Call `GET /v1/apps/{appId}/dataUsages` (no wrapper exists yet — make the call inline using the existing `ascRequest` if needed, or skip with a note for M1). Reconstruct a `PrivacyResponses` object and write via `store_write_privacy`.

## Pulling App Review information

Read `appStoreReviewDetails` for the editable version. Map the attributes back into a `ReviewInfo` object and write via `store_write_review`.

## Pulling URL fields

For each locale, read `marketingUrl` and `supportUrl` from `appStoreVersionLocalizations` and `privacyPolicyUrl` from `appInfoLocalizations`. Write them into the per-locale metadata file alongside the existing fields.
```

- [ ] **Step 3: Commit**

```bash
git add skills/pull/SKILL.md
git commit -m "Pull skill: fetch listing, privacy, review, URL fields"
```

---

## Task 20: Update `/status` and `/list` Skills — Surface new files

`/status` shows drift between local and remote. `/list` enumerates what's in the local store. Both need to know about the new files.

**Files:**
- Modify: `skills/status/SKILL.md`
- Modify: `skills/list/SKILL.md`

- [ ] **Step 1: Update `/status` to include new files**

In `skills/status/SKILL.md`, add a section after the existing per-locale diff:

```markdown
## Listing config drift

Call `store_read_listing` to get the local `ListingConfig`. Compare against ASC by fetching:
- Categories from `appInfos[].attributes`
- Age rating from `ageRatingDeclarations`
- Encryption from the attached build

Show a per-section diff: ✓ in sync, ⚠ differs, ✗ remote missing local field.

## Privacy drift

Call `store_read_privacy` for the local `PrivacyResponses`. Compare against `GET /v1/apps/{appId}/dataUsages`. Show a per-data-type diff.

## Review info drift

Call `store_read_review` for the local `ReviewInfo`. Compare against `appStoreReviewDetails`. Diff each field.

## URL fields drift (per locale)

For each locale, compare local `marketingUrl`/`supportUrl`/`privacyPolicyUrl` against the corresponding ASC fields.
```

- [ ] **Step 2: Update `/list` to surface new files**

In `skills/list/SKILL.md`, extend the "Things you can list" section:

```markdown
- `listing` — show the contents of `.appstore/listing.json` (categories, age rating, pricing, availability, encryption)
- `privacy` — show `.appstore/privacy.json` (App Privacy responses)
- `review` — show `.appstore/review.json` (App Review information)
- `history pushes` — show recent entries from `.appstore/history/pushes.jsonl`
- `history audits` — show recent entries from `.appstore/history/audits.jsonl`
- `history submissions` — show recent entries from `.appstore/history/submissions.jsonl`
```

- [ ] **Step 3: Commit**

```bash
git add skills/status/SKILL.md skills/list/SKILL.md
git commit -m "Status and list skills: surface listing/privacy/review/history"
```

---

## Task 21: Bump Version to 0.2.0 and Update Documentation

M1 is feature-complete. Bump the plugin and server versions to 0.2.0. Update `CLAUDE.md` to document the new local-store files and the history audit log. Update `ROADMAP.md` to reflect M1 completion.

**Files:**
- Modify: `.claude-plugin/plugin.json` (version → `0.2.0`)
- Modify: `servers/appstore-connect/package.json` (version → `0.2.0`)
- Modify: `servers/appstore-connect/src/index.ts:18` (server version string → `0.2.0`)
- Modify: `CLAUDE.md` (Data Model section)
- Modify: `ROADMAP.md`

- [ ] **Step 1: Bump plugin.json version**

In `.claude-plugin/plugin.json`, change `"version": "0.1.0"` to `"version": "0.2.0"`.

- [ ] **Step 2: Bump package.json version**

In `servers/appstore-connect/package.json`, change `"version": "0.1.0"` to `"version": "0.2.0"`.

- [ ] **Step 3: Bump the server version in index.ts**

In `servers/appstore-connect/src/index.ts` line 18, change `version: "0.1.0"` to `version: "0.2.0"`.

- [ ] **Step 4: Document new files and history log in CLAUDE.md**

In `CLAUDE.md`, find the "Metadata Store" subsection of "Data Model" and replace it with:

```markdown
### Metadata Store

App-level decisions and per-locale content live in `.appstore/`. Every committed file is a single source of truth; ASC is the deploy target.

```
.appstore/
  config.json              ✅ committed — bundle id, locales, voice
  config.local.json        🚫 gitignored — credentials only
  listing.json             ✅ NEW — categories, age rating, pricing, availability, encryption defaults
  privacy.json             ✅ NEW — App Privacy questionnaire responses (taxonomy-validated)
  review.json              ✅ NEW — App Review information (contact, demo creds, notes)
  metadata/{locale}/...    ✅ per-locale content; URL fields live here
  history/                 ✅ NEW append-only audit log
    pushes.jsonl           # one line per ASC mutation: timestamp, tool, payload, result
    submissions.jsonl      # M3
    audits.jsonl           # M3
  ship-state.json          🚫 NEW gitignored transient — /ship checkpoint (M3)
```

Every mutating MCP tool (`asc_update_*`, `asc_set_*`) appends to `history/pushes.jsonl` automatically. `git log -p .appstore/history/` answers "what did we tell ASC and when."

All FieldWithHistory iteration sources, locale dirs, and platform splits work as before.
```

- [ ] **Step 5: Update ROADMAP.md**

Replace the "In Progress" / "Next Up" sections in `ROADMAP.md` with:

```markdown
## Completed

- [x] M1 — Toolkit can fill every required ASC field (v0.2.0)
  - listing.json (categories, age rating, pricing, availability, encryption)
  - privacy.json (App Privacy responses with taxonomy validation)
  - review.json (App Review information)
  - URL fields on existing tools (marketingUrl, supportUrl, privacyPolicyUrl)
  - history audit log (.appstore/history/*.jsonl)

## In Progress

- [ ] M2 — Toolkit handles assets (screenshot upload, App Preview upload, dimension catalog, light HTML templating)
- [ ] M3 — Toolkit submits (build attach, submit-for-review, /audit, /submit, /ship skills)

## Later

- [ ] Privacy depth (Privacy Manifest cross-check, Required Reason API audit)
- [ ] Post-launch ops (analytics pull, reviews intelligence, rejection triage)
- [ ] Multi-app / multi-account / multi-platform
- [ ] Marketing surface (Custom Product Pages, PPO A/B testing, In-App Events)

See `docs/superpowers/specs/2026-05-14-submission-readiness-design.md` for the M1/M2/M3 architecture and §12 for the post-M3 follow-on rounds.
```

- [ ] **Step 6: Run the full test suite once more**

```bash
cd servers/appstore-connect && npm test
```

Expected: all tests green.

- [ ] **Step 7: Build to confirm clean**

```bash
cd servers/appstore-connect && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add .claude-plugin/plugin.json servers/appstore-connect/package.json servers/appstore-connect/src/index.ts CLAUDE.md ROADMAP.md
git commit -m "Bump to v0.2.0 — M1 (fill every ASC field) complete"
```

---

## After M1 Lands

The next plan to write is M2: assets. The spec (§5.2 — M2 row) defines:

- `asc_upload_screenshot`, `asc_upload_app_preview`, list/delete pairs
- `assets_validate_dimensions` against a shipped catalog
- `assets_render_template` (Puppeteer-based, opt-in install)
- `.appstore/assets/{platform}/{locale}/{device}/` directory structure
- `metadata/{locale}/{platform}/screenshots.json` for templating headlines
- Updates to `/setup`, `/push`, `/pull`, `/status` for assets

After M2 lands, M3 (submit) covers `asc_list_builds`, `asc_attach_build`, `asc_set_release_strategy`, `asc_submit_for_review`, `asc_get_submission_state`, `asc_create_version`, plus the `/audit`, `/submit`, and `/ship` skills — including the headline vision-driven cross-surface consistency check.

Both M2 and M3 plans should be written following the same TDD-per-task structure as this plan, after M1 is real and we've learned what stuck and what didn't.
