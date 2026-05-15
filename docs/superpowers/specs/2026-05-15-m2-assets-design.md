# M2 — Assets: Design

**Date:** 2026-05-15
**Status:** Approved for implementation
**Parent spec:** [2026-05-14-submission-readiness-design.md](2026-05-14-submission-readiness-design.md) — this document refines and supersedes §5.1, §5.2, and §5.5 of the parent for everything M2-scoped.

This design closes the gaps left for "M2 — the toolkit handles assets" in the parent spec. After M2, a developer can drop screenshots and App Preview videos into `.appstore/assets/`, run `/app-store-toolkit:push`, and have the toolkit validate, upload, and track them. The web UI is no longer needed for asset management on a v1.0 submission. Submission itself (the "Submit for Review" click) is still M3.

---

## 1. Scope

In:

- Asset directory layout under `.appstore/assets/`, strict per-locale, Git LFS-friendly.
- Eight new MCP tools: six ASC wrappers (`asc_upload_screenshot`, `asc_upload_app_preview`, `asc_list_screenshots`, `asc_list_app_previews`, `asc_delete_screenshot`, `asc_delete_app_preview`) and two local-only tools (`assets_validate_dimensions`, `assets_render_template`).
- Two store tools: `store_read_assets_lock`, `store_write_assets_lock`.
- Asset dimension catalog (`asc-asset-specs.json`) as the single source of truth for sizes and ASC display target enums.
- Skill extensions: `/setup`, `/push`, `/pull`, `/status`, `/validate`.
- One new skill: `/render-screenshots` (thin wrapper over `assets_render_template`).
- Per-file metadata file `assets.json` (headlines, cover frames) and tool-written cache `assets.lock.json` (sha256s, ASC ids).
- Skip-unchanged semantics on `/push`, driven by sha256 comparison against `assets.lock.json`.

Out (deferred to parent spec §12 follow-on rounds):

- App Preview *video rendering* (we only validate + upload).
- Asset hashing/dedup across locales (Git LFS already provides content-addressed storage).
- Alternate icons.
- Localized rendering beyond a starter template set.

## 2. Refinements from the parent spec

This design refines the parent spec on six points. Each is a deliberate choice from brainstorming; the parent spec stays the higher-level reference but is superseded on these specifics.

1. **Strict per-locale asset layout.** Parent spec showed `.appstore/assets/{platform}/{locale}/{device}/...`. M2 keeps that shape literally — no `_default/` folder, no fallback resolution. If 9 locales share PNGs, the bytes live in 9 folders. Git LFS deduplicates by content hash, so the on-disk cost is one blob, nine pointers. Push iterates locale-by-locale with no resolution logic.

2. **`/pull` is manifest-only by default.** Bytes only download with `--with-bytes`. The manifest (`assets.lock.json`) entries carry `{asc_id, sha256, dimensions, uploaded_at}` and are enough to power `/status` drift detection, `/audit` parity, and lock-driven skip-unchanged pushes — without forcing every fresh clone to pull ~100 MB.

3. **Renderer is an MCP tool with lazy install.** Parent spec §5.2 listed `assets_render_template` as an MCP tool; §5.5 described it as a Bash-invoked Node script. M2 resolves the contradiction: the MCP tool is the public boundary; internally it imports a Node module. On first call the tool checks for Puppeteer and, if missing, runs `npm install puppeteer` inside the server's package with a one-time "installing Chromium (~280 MB)" notice. Users who never call it pay nothing.

4. **Sorted filename = ASC display position.** Sort by basename; first sorted name → slot 1, second → slot 2, etc. Filenames are conventional (`01-home.png`, `02-stats.png`) but anything sortable works. No magic renumbering on delete; if the user deletes `02-stats.png`, slot 2 simply becomes the next sorted file. `/audit` flags suspicious gaps (e.g., `01` `01b` `02`) as a quality warning.

5. **Single `assets.json` per locale+platform.** Parent spec §5.1 called this `metadata/{locale}/{platform}/screenshots.json`. M2 renames to `assets.json` and folds App Preview metadata (cover-frame timestamp) into the same file. One schema to validate, one file to find, smaller PR diffs.

6. **Lock-driven skip-unchanged.** `/push` reads `assets.lock.json` (committed), hashes each local asset, and skips uploads whose sha256 matches the lock entry's sha256 *and* whose `asc_id` is non-null. `--force` re-uploads everything. The lock is the cache; committing it makes pushes idempotent across machines.

---

## 3. Local store layout

```
.appstore/
  assets/                                     ✅ committed (Git LFS recommended)
    {platform}/                               e.g. ios/
      {locale}/                               e.g. en-US/  (strict per-locale, no _default)
        {device}/                             e.g. iphone-6.7/
          screenshots/
            01-home.png
            02-stats.png
            …
          previews/
            01-tour.mp4
            …
  metadata/{locale}/{platform}/
    assets.json                               ✅ committed — per-file metadata, human-authored
    assets.lock.json                          ✅ committed — sha/asc_id cache, tool-written
  templates/                                  ✅ committed (optional)
    screenshot-iphone-6.7.html
    …
```

Both manifest files are committed — see §5 for the rationale on `assets.lock.json`.

### 3.1 `assets.json` shape

Human-authored. Headlines drive the template renderer (when used); cover frames drive video upload metadata.

```jsonc
{
  "screenshots": {
    "iphone-6.7": [
      {"file": "01-home.png", "headline": "Track every meal"},
      {"file": "02-stats.png", "headline": "See your trends"}
    ]
  },
  "previews": {
    "iphone-6.7": [
      {"file": "01-tour.mp4", "cover_frame_seconds": 2.5}
    ]
  }
}
```

Every field except `file` is optional. The renderer needs `headline` only for screenshots it renders; non-renderer users (bring-your-own PNGs) leave the field absent. `cover_frame_seconds` is optional — when absent, ASC uses the video's first frame.

### 3.2 `assets.lock.json` shape

Tool-controlled. Every successful upload, delete, or pull updates this file. Diffable in PR review so reviewers can see "1 new screenshot uploaded, 2 changed."

```jsonc
{
  "schema_version": 1,
  "screenshots": {
    "iphone-6.7": [
      {
        "file": "01-home.png",
        "sha256": "a1b2…",              // null when manifest-only pull (no local bytes hashed yet)
        "asc_id": "60a9f1c2…",          // null when remote-deleted; non-null after successful upload
        "asc_checksum_md5": "9f8e…",    // populated from ASC's sourceFileChecksum
        "width": 1290,
        "height": 2796,
        "uploaded_at": "2026-05-15T14:32:11Z"
      }
    ]
  },
  "previews": {
    "iphone-6.7": [
      {
        "file": "01-tour.mp4",
        "sha256": "c3d4…",
        "asc_id": "70b0e2d3…",
        "asc_checksum_md5": "1a2b…",
        "width": 886,
        "height": 1920,
        "duration_seconds": 28.4,
        "cover_frame_seconds": 2.5,
        "uploaded_at": "2026-05-15T14:35:02Z"
      }
    ]
  }
}
```

**Two hashes by design.** `sha256` is content-addressed and locally computed from file bytes — it powers `/push` skip-unchanged. `asc_checksum_md5` mirrors ASC's `sourceFileChecksum` (MD5, set by Apple's API) and powers `/status` drift detection when local bytes are absent. Local upload computes both; manifest-only pull populates only `asc_checksum_md5` and leaves `sha256` null until `--with-bytes` runs.

### 3.3 Device directory names

Human-readable. Internal mapping to ASC enums lives in `asc-asset-specs.json` (§4.2). Initial set for iOS:

- `iphone-6.7` → `APP_IPHONE_67`
- `iphone-6.5` → `APP_IPHONE_65`
- `iphone-5.5` → `APP_IPHONE_55`
- `ipad-pro-12.9` → `APP_IPAD_PRO_129`
- `ipad-pro-11` → `APP_IPAD_PRO_11`

macOS / tvOS / watchOS / visionOS device names are out of scope for M2 (parent spec §3 confines M2 to iOS).

---

## 4. New MCP tools

All eight new tools sit in `servers/appstore-connect/src/tools/` and follow the existing `asc_*` and `store_*` naming conventions.

### 4.1 Tool table

| Tool | Mode | Purpose |
|---|---|---|
| `asc_upload_screenshot` | ASC mutator | Reserve → PUT bytes → PATCH commit for one PNG; computes sha256, writes lock entry, appends history |
| `asc_upload_app_preview` | ASC mutator | Same 3-step + commit for one MP4; supports optional `cover_frame_seconds` |
| `asc_list_screenshots` | ASC reader | List screenshots for a version-localization, optionally filtered by device |
| `asc_list_app_previews` | ASC reader | Same for previews |
| `asc_delete_screenshot` | ASC mutator | Delete by ASC id; nulls the matching lock entry's `asc_id`; appends history |
| `asc_delete_app_preview` | ASC mutator | Same for previews |
| `assets_validate_dimensions` | Local | Scan `.appstore/assets/`, validate against catalog; returns per-file `{file, expected, actual, ok}` |
| `assets_render_template` | Local | Render screenshots from `templates/*.html` + `assets.json`; lazy-installs Puppeteer on first call |
| `store_read_assets_lock` | Store | Read `assets.lock.json` for a given locale+platform |
| `store_write_assets_lock` | Store | Write `assets.lock.json`; merges with existing entries (does not blow away unrelated devices) |

### 4.2 Asset dimension catalog

`servers/appstore-connect/src/data/asc-asset-specs.json` — the single source of truth.

```jsonc
{
  "ios": {
    "iphone-6.7": {
      "asc_display_target": "APP_IPHONE_67",
      "screenshot_dimensions": [
        {"width": 1290, "height": 2796},
        {"width": 2796, "height": 1290}
      ],
      "preview_dimensions": [{"width": 886, "height": 1920}]
    },
    "iphone-6.5": { /* … */ },
    "iphone-5.5": { /* … */ },
    "ipad-pro-12.9": { /* … */ },
    "ipad-pro-11": { /* … */ }
  }
}
```

A typed TypeScript module loads this at build time and exposes:

```ts
type DeviceKey = "iphone-6.7" | "iphone-6.5" | ... ;
function getSpec(platform: "ios", device: DeviceKey): DeviceSpec;
function inferDeviceFromDimensions(width: number, height: number): DeviceKey | null;
```

`asc_upload_screenshot` uses `inferDeviceFromDimensions` to detect device class from the PNG header — the caller can pass `device` explicitly, but the tool double-checks and rejects mismatches.

A snapshot test (`asc-asset-specs.snapshot.test.ts`) locks the catalog content so any Apple-side change is a visible diff.

### 4.3 Upload atomicity

`asc_upload_screenshot` does the full 3-step ASC protocol internally:

1. **Reserve** — `POST /v1/appScreenshots` with `{fileSize, fileName, appScreenshotSet}`. Returns the asset record + upload operations (one or more PUT URLs with headers).
2. **PUT bytes** — for each upload operation, PUT the corresponding byte range to the URL with the headers ASC supplied.
3. **Commit** — `PATCH /v1/appScreenshots/{id}` with `{uploaded: true, sourceFileChecksum: md5(fileBytes)}`. ASC validates the checksum and transitions the asset to `COMPLETE`.

The tool computes **two hashes** at upload time: MD5 for the ASC commit (Apple's protocol requires it), and SHA256 for the lock entry (our content-addressed change detection — see §3.2). Both go into `assets.lock.json`.

Failures at any step return:

```ts
{
  code: "ASC_RESERVE_FAILED" | "ASC_PUT_FAILED" | "ASC_COMMIT_FAILED" | "DIMENSION_MISMATCH" | "FILE_NOT_FOUND" | "AUTH_FAILED",
  field: "screenshot",
  locale: string,
  device: string,
  file: string,
  step?: "reserve" | "upload" | "commit",
  message: string,
  remediation: string,
  asc_response?: unknown
}
```

`asc_upload_app_preview` follows the same protocol against `/v1/appPreviews`, with the additional `previewFrameTimeCode` field set from `cover_frame_seconds` during the commit step.

### 4.4 Local-only tools

**`assets_validate_dimensions`** walks `.appstore/assets/{platform}/{locale}/{device}/{screenshots|previews}/*` and validates each file's actual dimensions against `asc-asset-specs.json`. Returns:

```ts
{
  results: Array<{
    file: string,                  // path relative to .appstore/
    expected: {width: number, height: number}[],
    actual: {width: number, height: number},
    ok: boolean,
    reason?: string                // when ok=false
  }>,
  summary: {total: number, ok: number, failed: number}
}
```

PNG dimension detection uses the IHDR chunk (first 24 bytes); MP4 dimension detection reads the `tkhd` box. No external image library dependency.

**`assets_render_template`** loads each `templates/screenshot-{device}.html`, injects `{headline, subheadline, screenImage, locale, deviceWidth, deviceHeight}` for each screenshot from `assets.json`, opens it in Puppeteer at the device's native resolution, and writes the PNG to `.appstore/assets/{platform}/{locale}/{device}/screenshots/{file}`. First call installs Puppeteer:

```
$ /app-store-toolkit:render-screenshots
  ℹ Installing Chromium (~280 MB, one-time) …
  ✓ Installed in 84s
  ✓ Rendered 36 screenshots across 9 locales
```

Subsequent calls skip the install check after verifying `node_modules/puppeteer/package.json` exists.

---

## 5. Skill changes

### 5.1 `/app-store-toolkit:setup` — extended

Adds three questions during setup (or `--upgrade`):

1. *"Use Git LFS for `.appstore/assets/`?"* If yes, runs `git lfs install` and writes `.gitattributes` with `*.png filter=lfs diff=lfs merge=lfs -text` and `*.mp4 filter=lfs diff=lfs merge=lfs -text`.
2. *"Seed starter template HTML in `.appstore/templates/`?"* If yes, copies a minimal HTML/CSS scaffold per supported device.
3. **Warning:** if `.appstore/assets/` is gitignored (rare, but some users come from BYO-pipeline projects), setup warns: "Assets are not git-tracked — this violates the toolkit's pillar that every listing change is git-reviewable. Consider removing the gitignore entry."

### 5.2 `/app-store-toolkit:push` — extended

Adds asset push as a default phase (existing locale-text push still happens first; assets run after). Skip-unchanged logic:

```
for each locale, platform, device:
  for each file in assets/{platform}/{locale}/{device}/screenshots/:
    local_sha = sha256(file bytes)
    lock_entry = assets.lock.json["screenshots"][device].find(e => e.file == file.name)
    if lock_entry && lock_entry.sha256 == local_sha && lock_entry.asc_id:
      mark as unchanged, continue
    else:
      asc_upload_screenshot(...)
      write new lock entry with {sha256: local_sha, asc_id, uploaded_at: now}
  repeat for previews/
```

Output:

```
$ /app-store-toolkit:push --assets
  en-US/ios/iphone-6.7/01-home.png       unchanged
  en-US/ios/iphone-6.7/02-stats.png      CHANGED, uploading … 1.2 MB → done
  en-US/ios/iphone-6.7/03-onboarding.png NEW, uploading … 1.4 MB → done
  de-DE/ios/iphone-6.7/01-home.png       unchanged
  …
  Summary: 143 unchanged, 1 changed, 0 failed
```

Flags:
- `--force` re-uploads even when sha matches.
- `--assets-only` skips the locale-text push phase.
- `--no-assets` skips the asset push phase.

### 5.3 `/app-store-toolkit:pull` — extended

Default: manifest-only. After fetching, prints a one-line suggestion if bytes are absent:

```
$ /app-store-toolkit:pull
  … listing, privacy, review, metadata pulled
  → assets: manifest only (9 locales × 4 devices = 144 entries, 12 KB)
  → Run /app-store-toolkit:pull --with-bytes to download ~87 MB of screenshots.
```

With `--with-bytes`, downloads each asset to its `.appstore/assets/...` path and computes the local sha256, populating the previously-null `sha256` field in the lock entry. `asc_checksum_md5` was already filled at manifest-only-pull time.

### 5.4 `/app-store-toolkit:status` — extended

Adds an "assets" section. Classifies each lock entry against the local filesystem:

| Classification | Condition |
|---|---|
| `unchanged` | local file exists, lock `sha256` is non-null and matches local file hash |
| `local-changed` | local file exists, lock `sha256` is non-null and differs from local file hash |
| `local-new` | local file exists, no lock entry |
| `manifest-only` | lock entry exists with non-null `asc_id`, but `sha256` is null and local file is absent (state after manifest-only pull) |
| `remote-deleted` | lock entry has null `asc_id` |
| `local-missing` | lock entry has non-null `asc_id` and non-null `sha256`, but file is absent on disk (suspicious — bytes were here, now gone) |

Output:

```
assets:
  143 unchanged
  1 local-changed: en-US/ios/iphone-6.7/02-stats.png
  0 local-new
  0 remote-deleted
  0 local-missing
```

### 5.5 `/app-store-toolkit:validate` — extended

Adds a dimension-check phase via `assets_validate_dimensions`. Surfaces:

```
assets validation:
  ✓ 144 of 144 files match expected dimensions
  (or)
  ✗ en-US/ios/iphone-6.7/02-stats.png — 1290×2796 expected, got 1242×2688
    → resize or move to iphone-5.5 device folder
```

### 5.6 `/app-store-toolkit:render-screenshots` — new

Thin wrapper over `assets_render_template`. Per-locale rendering. First call triggers Puppeteer install with a one-time notice. Reads `assets.json` for headlines.

---

## 6. Error handling

Continues M1's §7 pattern (parent spec). Every upload tool returns structured per-asset errors:

```ts
{
  code: "DIMENSION_MISMATCH" | "ASC_RESERVE_FAILED" | "ASC_PUT_FAILED" | "ASC_COMMIT_FAILED"
      | "FILE_NOT_FOUND" | "FILE_TOO_LARGE" | "AUTH_FAILED",
  field: "screenshot" | "preview",
  locale: string,
  device: string,
  file: string,
  step?: "reserve" | "upload" | "commit",
  message: string,
  remediation: string,
  asc_response?: unknown
}
```

Batch operations (driven by skills, not MCP tools) accumulate results and never abort on first failure. The push skill's summary is the user-facing failure surface.

**History audit.** Every successful `asc_upload_*` and `asc_delete_*` appends one line to `.appstore/history/pushes.jsonl`, with the same best-effort try/catch wrapper M1 established in commit `506d943`: history-write failures log to stderr but do not invert the primary result's success.

---

## 7. Backwards compatibility

- All eight new MCP tools are additive — no changes to existing tool signatures.
- The new manifest files (`assets.json`, `assets.lock.json`) are created on first write. Their absence is a "no assets configured yet" state, not an error.
- Existing skills (`/push`, `/pull`, `/status`, `/validate`, `/setup`) gain new phases. Behavior on pre-M2 projects (no `assets/` directory) is "skip asset phase silently."
- Plugin and server bump to **v0.3.0** at end of M2. `plugin.json` is the version authority per CLAUDE.md.

---

## 8. Testing

- **Unit tests** per new MCP tool, with mocked `fetch`/JWT, mirroring the existing pattern in `src/tools/__tests__/*.test.ts`.
- **History-resilience tests** for every new mutator (`asc_upload_screenshot`, `asc_upload_app_preview`, `asc_delete_screenshot`, `asc_delete_app_preview`), mirroring `src/tools/__tests__/history-resilience.test.ts`.
- **3-step upload flow test** for `asc_upload_screenshot` and `asc_upload_app_preview`: assert the tool calls reserve, PUT, and commit in order with correct payloads and computes `sourceFileChecksum` correctly. Use a fake fetch that records calls.
- **Dimension catalog snapshot test** (`asc-asset-specs.snapshot.test.ts`) locks the file content; any change requires explicit review.
- **PNG/MP4 dimension parser tests** with fixture files in `__fixtures__/assets/` of varying sizes.
- **`assets_validate_dimensions` test** that asserts per-file structured results and overall summary.
- **Lock-driven skip-unchanged test** for the push helper: given a directory of files and a lock with matching shas, verify the helper marks all as `unchanged` and makes zero ASC calls.
- **Puppeteer renderer integration test** gated behind `ASC_INTEGRATION=1` (mirrors the M1 ASC integration gate), since it pulls 280 MB. Default CI does not run it.

Target: full test suite stays under 5 seconds on a clean machine, gated tests excluded.

---

## 9. Out of scope reminder

- App Preview *video rendering* (M2 only validates and uploads).
- Asset hashing/dedup across locales beyond what LFS provides.
- Alternate icons.
- macOS / tvOS / watchOS / visionOS — M2 targets iOS only; the data model is platform-aware so future rounds extend rather than rewrite.
- Custom Product Pages, PPO A/B variants, In-App Events promotional assets.
- Vision-driven cross-surface consistency check — that's the headline of M3's `/audit`.

These remain on the parent spec's §12 roadmap.

---

## 10. Implementation order

A separate implementation plan ([2026-05-15-m2-assets.md](../plans/2026-05-15-m2-assets.md)) decomposes this into TDD'd tasks. Rough order:

1. Asset dimension catalog (`asc-asset-specs.json`) + typed module + snapshot test.
2. PNG/MP4 dimension parsers + tests.
3. `assets_validate_dimensions` tool + tests.
4. `assets.lock.json` schema + `store_read_assets_lock` / `store_write_assets_lock` tools + tests.
5. `asc_upload_screenshot` (3-step protocol) + tests + history-resilience test.
6. `asc_upload_app_preview` + tests + history-resilience test.
7. `asc_list_screenshots` + `asc_list_app_previews` + tests.
8. `asc_delete_screenshot` + `asc_delete_app_preview` + tests + history-resilience tests.
9. `/push` skill extension (lock-driven skip-unchanged).
10. `/pull` skill extension (manifest by default, `--with-bytes`).
11. `/status` skill extension (assets diff).
12. `/validate` skill extension (dimension check).
13. `/setup` skill extension (LFS, templates seed, gitignore warning).
14. `assets_render_template` + Puppeteer lazy-install + tests.
15. `/render-screenshots` skill.
16. Docs (`README.md`, `CLAUDE.md` updates).
17. Version bump to 0.3.0 (plugin.json + servers/appstore-connect/package.json).
