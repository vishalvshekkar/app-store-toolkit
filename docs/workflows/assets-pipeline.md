# Assets Pipeline: Screenshots and App Previews

This guide walks you through managing App Store screenshots and preview videos with the app-store-toolkit. Whether you bring finished PNGs/MP4s from your design pipeline or render them with HTML templates, the toolkit handles validation, uploading, and tracking changes across all locales and devices.

## Overview: Two Paths

The assets pipeline supports two workflows:

### Path 1: Bring Your Own (BYO) — Most Users

You create screenshots and preview videos in your existing pipeline (Figma, Photoshop, Final Cut Pro, Remotion, etc.) at the required dimensions, drop them into the `.appstore/assets/` directory structure, and run `/app-store-toolkit:push`. The toolkit validates dimensions, uploads to App Store Connect, and tracks which assets have changed.

**When to use:** You want full control over design and are comfortable managing files outside the toolkit.

**Time:** ~10 minutes to organize existing assets into the right folders.

### Path 2: Template Renderer — Consistent Localized Layouts

You define an HTML template per device (e.g., `screenshot-iphone-6.7.html`), populate a `assets.json` file with headlines, and run `/app-store-toolkit:render-screenshots`. The toolkit uses Puppeteer to render the template at the correct resolution for each locale, generating PNGs automatically. First run lazy-installs Chromium (~280 MB).

**When to use:** You want consistent text overlays across devices and locales without managing separate design files per variant.

**Time:** 1–2 hours to design templates + populate headlines; then ~5 minutes per new version.

**Trade-off:** Rendering takes 60–90 seconds for a full set of locales; design flexibility is constrained by HTML/CSS.

---

## Required Dimensions

All screenshots and preview videos must match the exact dimensions for their device class. The toolkit has a built-in catalog of Apple-approved dimensions.

### Dimension Table

| Device | Screenshot (portrait) | Screenshot (landscape) | App Preview |
|---|---|---|---|
| **iPhone 6.7"** | 1290×2796 px | 2796×1290 px | 886×1920 px |
| **iPhone 6.5"** | 1284×2778 px | 2778×1284 px | 886×1920 px |
| **iPhone 5.5"** | 1242×2208 px | 2208×1242 px | 1080×1920 px |
| **iPad Pro 12.9"** | 2048×2732 px | 2732×2048 px | 2732×2048 px |
| **iPad Pro 11"** | 1668×2388 px | 2388×1668 px | 2388×1668 px |

**Notes:**
- Dimensions are in pixels at 1x scale (standard resolution for each device).
- Internally, the toolkit maps friendly names like `iphone-6.7` to App Store Connect enums like `APP_IPHONE_67`.
- The authoritative catalog lives in `servers/appstore-connect/src/data/asc-asset-specs.json` — Apple updates device classes periodically; we bump this file as needed.
- Run `/app-store-toolkit:validate` after placing files to check dimensions automatically.

---

## Directory Layout

Assets live in a strict per-locale directory structure under `.appstore/assets/`:

```
.appstore/
  assets/
    ios/
      en-US/
        iphone-6.7/
          screenshots/
            01-home.png
            02-stats.png
            03-onboarding.png
          previews/
            01-tour.mp4
      de-DE/
        iphone-6.7/
          screenshots/
            01-home.png
            02-stats.png
            03-onboarding.png
          previews/
            01-tour.mp4
      fr-FR/
        iphone-6.7/
          screenshots/
            ...
```

### Key Principles

1. **Strict per-locale, no fallback.** Each locale must have its own asset files. There is no `_default/` folder or cascading resolution. If 9 locales share identical bytes, Git LFS deduplicates them (one blob, nine pointer files), but all nine folders must exist.

2. **Filename sort order = display order.** The toolkit sorts filenames alphabetically. The first sorted filename becomes slot 1 in App Store Connect, the second becomes slot 2, etc.
   - Example: `01-home.png`, `02-stats.png`, `03-onboarding.png` → slots 1, 2, 3.
   - Conventional naming (`01-`, `02-`, etc.) is recommended but not required; any sortable names work.
   - If you delete `02-stats.png`, slot 2 automatically becomes the next sorted file (no renumbering).

3. **One device per folder.** Separate subfolders for each device (`iphone-6.7/`, `iphone-6.5/`, etc.). Do not mix device sizes in one folder.

---

## Per-File Metadata: `assets.json`

Alongside your assets in the `.appstore/assets/` directory, place a human-authored metadata file at `metadata/{locale}/{platform}/assets.json`. This file describes each asset:

### Example `assets.json`

```json
{
  "screenshots": {
    "iphone-6.7": [
      {
        "file": "01-home.png",
        "headline": "Track every meal"
      },
      {
        "file": "02-stats.png",
        "headline": "See your trends"
      }
    ]
  },
  "previews": {
    "iphone-6.7": [
      {
        "file": "01-tour.mp4",
        "cover_frame_seconds": 2.5
      }
    ]
  }
}
```

### Field Reference

**For screenshots:**
- `file` (required): Name of the PNG in `.appstore/assets/{platform}/{locale}/{device}/screenshots/`.
- `headline` (optional): Text overlay or caption displayed in App Store Connect. Used by the template renderer to inject text; ignored if you bring your own PNGs.

**For previews (videos):**
- `file` (required): Name of the MP4 in `.appstore/assets/{platform}/{locale}/{device}/previews/`.
- `cover_frame_seconds` (optional): Timestamp (seconds) of the still frame to show before the video plays. If omitted, App Store Connect uses the first frame (0.0).

**Notes:**
- This file can be minimal. If you bring your own PNGs and aren't using the renderer, you only need `file` and optionally `cover_frame_seconds`.
- For each locale+platform, create one `assets.json` file in `metadata/{locale}/{platform}/`.
- Validate this file's structure during `/app-store-toolkit:validate`.

---

## The Lock File: `assets.lock.json`

After every successful upload or deletion, the toolkit writes `assets.lock.json`. This file is **tool-controlled** (you don't edit it directly) but is **committed to git** for change tracking and skip-unchanged logic.

### Example `assets.lock.json`

```json
{
  "schema_version": 1,
  "screenshots": {
    "iphone-6.7": [
      {
        "file": "01-home.png",
        "sha256": "a1b2c3d4e5f6...",
        "asc_id": "60a9f1c2-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
        "asc_checksum_md5": "9f8e7d6c5b4a3f2e1d0c",
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
        "sha256": "b2c3d4e5f6...",
        "asc_id": "70b0e2d3-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
        "asc_checksum_md5": "1a2b3c4d5e6f",
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

### Why Two Hashes?

The lock file stores **two hash algorithms** by design:

- **`sha256`:** Computed locally from file bytes. Powers `/push` skip-unchanged logic — if the local file hasn't changed since the last upload (same SHA256), the toolkit skips the upload.
- **`asc_checksum_md5`:** Mirrors App Store Connect's own checksum (MD5). Powers `/status` drift detection when local bytes are absent (e.g., after a manifest-only pull).

Both are necessary because:
1. The toolkit uses SHA256 for its own change detection (faster, more resilient).
2. Apple uses MD5 internally, so we track what Apple has for parity checks.

### `sha256` is null After Manifest-Only Pull

When you run `/app-store-toolkit:pull` without `--with-bytes`, the toolkit fetches the manifest (asset metadata: IDs, dimensions, dates) but not the file bytes. In this case:
- `asc_checksum_md5` is populated (from App Store Connect).
- `sha256` is null (file bytes were not downloaded).

Run `/app-store-toolkit:pull --with-bytes` to download the actual PNG/MP4 files and populate `sha256`.

### Committing the Lock

The lock file is committed to git so that:
1. **Reviewers can see what assets changed** in a PR without downloading megabytes.
2. **Pushes are idempotent** — another machine with the same lock file skips unchanged assets.
3. **Audit trails are clear** — git log shows when each asset was uploaded.

---

## Workflow 1: Bring Your Own PNGs and MP4s

This is the simplest path if you already have finished assets from Figma, Photoshop, or a video editor.

### Steps

#### 1. Organize Assets by Device and Locale

Create the directory structure and place your files:

```bash
mkdir -p .appstore/assets/ios/en-US/iphone-6.7/screenshots
mkdir -p .appstore/assets/ios/en-US/iphone-6.7/previews

cp ~/Designs/screenshots/iphone-6.7/*.png .appstore/assets/ios/en-US/iphone-6.7/screenshots/
cp ~/Videos/iphone-6.7-tour.mp4 .appstore/assets/ios/en-US/iphone-6.7/previews/
```

Use semantic filenames for sorting: `01-home.png`, `02-stats.png`, etc.

#### 2. Create `assets.json` Metadata

```bash
# Create directory for metadata
mkdir -p .appstore/metadata/en-US/ios

# Write assets.json
cat > .appstore/metadata/en-US/ios/assets.json <<'EOF'
{
  "screenshots": {
    "iphone-6.7": [
      {"file": "01-home.png"},
      {"file": "02-stats.png"}
    ]
  },
  "previews": {
    "iphone-6.7": [
      {"file": "01-tour.mp4", "cover_frame_seconds": 2.5}
    ]
  }
}
EOF
```

Or use a text editor to create the file. For bring-your-own workflows, only `file` and optionally `cover_frame_seconds` are needed.

#### 3. Validate Dimensions

```bash
/app-store-toolkit:validate
```

The toolkit checks each file's actual dimensions against the catalog and reports:

```
assets validation:
  ✓ 5 of 5 files match expected dimensions
```

Or, if there's a mismatch:

```
✗ en-US/ios/iphone-6.7/02-stats.png — 1290×2796 expected, got 1242×2688
  → Resize to 1290×2796 or move to iphone-5.5 device folder
```

Fix any mismatches before pushing.

#### 4. Push Assets

```bash
/app-store-toolkit:push --assets-only
```

The toolkit uploads each asset and writes lock entries:

```
en-US/ios/iphone-6.7/01-home.png       NEW, uploading … 1.2 MB → done
en-US/ios/iphone-6.7/02-stats.png      NEW, uploading … 1.4 MB → done
en-US/ios/iphone-6.7/01-tour.mp4       NEW, uploading … 24 MB → done
Summary: 0 unchanged, 3 new, 0 failed
```

#### 5. Repeat for Other Locales

If you have localized screenshots, repeat steps 1–2 for each locale (`de-DE/`, `fr-FR/`, etc.) and push again. Each locale is independent.

#### 6. On Future Pushes

The toolkit compares file SHA256s against the lock:

```bash
/app-store-toolkit:push --assets-only
```

```
en-US/ios/iphone-6.7/01-home.png       unchanged (same bytes)
en-US/ios/iphone-6.7/02-stats.png      CHANGED, uploading … 1.4 MB → done
```

If `sha256` matches the lock entry and `asc_id` is non-null, the asset is skipped. Only changed files are uploaded, saving bandwidth and time.

---

## Workflow 2: Template Renderer — HTML + Headlines

Use this path if you want consistent text overlays across locales without managing separate design files per variant.

### Prerequisites

- Basic HTML and CSS knowledge (templates are simple single-page designs).
- Puppeteer installed (happens automatically on first render).

### Steps

#### 1. Seed Templates (Optional but Recommended)

During `/app-store-toolkit:setup`, the toolkit offers to seed starter templates:

```
Use Git LFS for .appstore/assets/? yes
Seed starter template HTML in .appstore/templates/? yes
```

If you accept, the toolkit creates minimal HTML templates:

```
.appstore/templates/
  screenshot-iphone-6.7.html
  screenshot-iphone-6.5.html
  screenshot-iphone-5.5.html
  screenshot-ipad-pro-12.9.html
  screenshot-ipad-pro-11.html
```

Each template is a basic HTML scaffold:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screenshot</title>
  <style>
    body { 
      margin: 0; 
      padding: 0;
      width: {{deviceWidth}}px;
      height: {{deviceHeight}}px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .content {
      text-align: center;
      color: white;
    }
    h1 {
      font-size: 48px;
      margin: 0 20px;
    }
  </style>
</head>
<body>
  <div class="content">
    <h1>{{headline}}</h1>
  </div>
</body>
</html>
```

#### 2. Customize Templates

Edit the templates in `.appstore/templates/` to match your app's branding. Use these variables:

- `{{headline}}` — injected from `assets.json` (required in template if used).
- `{{subheadline}}` — optional secondary text.
- `{{deviceWidth}}` — width in pixels (e.g., 1290 for iPhone 6.7).
- `{{deviceHeight}}` — height in pixels (e.g., 2796 for iPhone 6.7).
- `{{locale}}` — current locale (e.g., "en-US", "de-DE").

Example:

```html
<style>
  .content {
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 80%;
  }
  h1 {
    font-size: 48px;
    color: #333;
    margin-bottom: 20px;
  }
  p {
    font-size: 24px;
    color: #666;
  }
</style>
<div class="content">
  <h1>{{headline}}</h1>
  <p>{{subheadline}}</p>
</div>
```

#### 3. Populate `assets.json` with Headlines

For each locale, create `metadata/{locale}/{platform}/assets.json` with headlines:

```bash
cat > .appstore/metadata/en-US/ios/assets.json <<'EOF'
{
  "screenshots": {
    "iphone-6.7": [
      {"file": "01-home.png", "headline": "Track every meal"},
      {"file": "02-stats.png", "headline": "See your trends"},
      {"file": "03-onboarding.png", "headline": "Get started in seconds"}
    ]
  }
}
EOF
```

And German:

```bash
cat > .appstore/metadata/de-DE/ios/assets.json <<'EOF'
{
  "screenshots": {
    "iphone-6.7": [
      {"file": "01-home.png", "headline": "Verfolge jede Mahlzeit"},
      {"file": "02-stats.png", "headline": "Sieh deine Trends"},
      {"file": "03-onboarding.png", "headline": "Beginne in Sekunden"}
    ]
  }
}
EOF
```

#### 4. Render Screenshots

```bash
/app-store-toolkit:render-screenshots
```

On the first call, the toolkit installs Puppeteer and Chromium (~280 MB):

```
ℹ Installing Chromium (~280 MB, one-time) …
✓ Installed in 84s
✓ Rendered 36 screenshots across 9 locales
  en-US/ios/iphone-6.7/01-home.png ✓
  en-US/ios/iphone-6.7/02-stats.png ✓
  …
  de-DE/ios/iphone-5.5/03-onboarding.png ✓
```

Subsequent renders (no install) take 60–90 seconds for a full set of locales.

#### 5. Validate Dimensions

```bash
/app-store-toolkit:validate
```

The renderer ensures all PNGs are at the correct dimensions, so validation should pass:

```
assets validation:
  ✓ 36 of 36 files match expected dimensions
```

#### 6. Push Assets

```bash
/app-store-toolkit:push --assets-only
```

Same as Workflow 1 — the toolkit uploads the rendered PNGs and writes lock entries.

#### 7. On Future Versions

Update the headlines in `assets.json`, then re-render and push:

```bash
# Edit headlines for new version
vim .appstore/metadata/en-US/ios/assets.json

# Render (skips Puppeteer install, ~80 seconds)
/app-store-toolkit:render-screenshots

# Push (skips unchanged, uploads only new/modified PNGs)
/app-store-toolkit:push --assets-only
```

---

## Git LFS: Optional But Recommended

Screenshots and preview videos inflate your git repository. Git LFS (Large File Storage) is optional but recommended:

### Enable LFS During Setup

During `/app-store-toolkit:setup`:

```
Use Git LFS for .appstore/assets/? yes
```

If you accept, the toolkit:
1. Runs `git lfs install` (one-time per machine).
2. Creates `.gitattributes`:
   ```
   .appstore/assets/**/*.png filter=lfs diff=lfs merge=lfs -text
   .appstore/assets/**/*.mp4 filter=lfs diff=lfs merge=lfs -text
   ```

### How LFS Saves Space

Without LFS, each locale's assets are stored as full blobs in git. With LFS:
- Content is addressed by SHA256.
- If 9 locales have identical `01-home.png` bytes, LFS stores one blob + nine tiny pointer files.
- Cloning is faster; only pointers are fetched unless you run `git lfs pull`.

### Enable LFS Later

If you didn't enable LFS during setup, you can do it manually:

```bash
git lfs install
cat >> .gitattributes <<'EOF'
.appstore/assets/**/*.png filter=lfs diff=lfs merge=lfs -text
.appstore/assets/**/*.mp4 filter=lfs diff=lfs merge=lfs -text
EOF
git add .gitattributes
git commit -m "Enable Git LFS for assets"
```

---

## Pulling Assets Back

The toolkit distinguishes between **manifest-only** pulls (fast) and **full pulls** (slower, downloads bytes).

### Manifest-Only Pull (Default)

```bash
/app-store-toolkit:pull
```

Fetches metadata from App Store Connect:

```
… metadata and listing config pulled
→ assets: manifest only (9 locales × 4 devices = 144 entries, 12 KB)
→ Run /app-store-toolkit:pull --with-bytes to download ~87 MB of screenshots.
```

The toolkit writes `assets.lock.json` entries with:
- `asc_id` (populated from App Store Connect)
- `asc_checksum_md5` (populated from App Store Connect)
- `sha256` (null — bytes not downloaded)
- `width`, `height`, `uploaded_at` (populated from App Store Connect)

This is sufficient to power `/app-store-toolkit:status` drift detection and `/push` skip-unchanged logic without downloading gigabytes of assets.

**Use case:** Fresh clone, you only need to know what's on App Store Connect, not re-download existing assets.

### Full Pull with Bytes

```bash
/app-store-toolkit:pull --with-bytes
```

Downloads each asset's PNG/MP4 bytes to `.appstore/assets/{platform}/{locale}/{device}/screenshots/` or `previews/`. Also computes and populates `sha256` in the lock.

**Use case:** You need the actual asset files locally (e.g., to edit and re-push).

---

## Status: Understanding Asset Drift

`/app-store-toolkit:status` includes an assets section that classifies each lock entry:

### Status Classifications

| Classification | Meaning |
|---|---|
| `unchanged` | Local file exists, SHA256 matches lock entry |
| `local-changed` | Local file differs from what's recorded in the lock |
| `local-new` | Local file exists, no lock entry yet |
| `manifest-only` | Lock entry from manifest-only pull; SHA256 is null, file bytes not downloaded |
| `remote-deleted` | Lock entry has `asc_id` = null (deleted via App Store Connect web UI or `/delete` commands) |
| `local-missing` | Lock entry has SHA256 recorded, but file is gone from disk (suspicious — something was deleted) |

### Example Output

```bash
/app-store-toolkit:status
```

```
assets:
  143 unchanged
  1 local-changed: en-US/ios/iphone-6.7/02-stats.png (local file is newer)
  2 local-new: en-US/ios/iphone-5.5/01-home.png, de-DE/ios/iphone-6.7/01-home.png
  1 manifest-only: de-DE/ios/iphone-6.7/02-stats.png (manifest pulled, bytes not downloaded yet)
  0 remote-deleted
  0 local-missing
```

**How to read it:**
- `unchanged`: Safe to skip on next push.
- `local-changed`: Will re-upload on next push.
- `local-new`: Will upload on next push.
- `manifest-only`: Run `pull --with-bytes` if you need the local files.
- `remote-deleted`: Safe to ignore; asset was already deleted from App Store.
- `local-missing`: Run `pull --with-bytes` to restore the file, or manually delete the lock entry if you don't need it.

---

## Validation and Error Handling

### Dimension Validation

Run `/app-store-toolkit:validate` to check that every PNG and MP4 matches its device's required dimensions:

```bash
/app-store-toolkit:validate
```

Example output (success):

```
assets validation:
  ✓ 144 of 144 files match expected dimensions
```

Example output (failure):

```
assets validation:
  ✗ en-US/ios/iphone-6.7/02-stats.png — 1290×2796 expected, got 1242×2688
    → Resize to 1290×2796 or move to iphone-5.5 device folder
  ✗ de-DE/ios/ipad-pro-12.9/01-home.png — 2048×2732 expected, got 2048×2048
    → Resize or move to a different device folder
  Summary: 142 ok, 2 failed
```

**Fix dimension mismatches before pushing.** Run `/app-store-toolkit:validate` again to confirm.

### Common Issues

#### DIMENSION_MISMATCH Errors

**Problem:** The PNG or MP4 dimensions don't match the device folder.

**Solution:**
1. Check the file's actual dimensions (right-click → Get Info, or `file filename.png`, or `ffprobe filename.mp4`).
2. Either resize the file to the expected dimensions or move it to the correct device folder.
3. Run `/app-store-toolkit:validate` again.

Dimension specs are non-negotiable — App Store Connect will reject mismatched sizes.

#### Puppeteer Install Hung (Template Renderer)

**Problem:** First `render-screenshots` started downloading Chromium but got interrupted (Ctrl+C, network timeout, etc.).

**Solution:**
```bash
rm -rf servers/appstore-connect/node_modules/puppeteer
/app-store-toolkit:render-screenshots
```

This removes the partial install and re-runs from scratch.

#### Git LFS Not Installed

**Problem:** `.gitattributes` specifies LFS, but `git lfs` is not installed on your machine.

**Solution:**
```bash
# macOS
brew install git-lfs

# Or visit https://git-lfs.com for other OS
git lfs install
```

Per-repo LFS setup (`.git/config` hooks) happens automatically during `/setup` if you answered yes to the LFS question.

#### Lock Entry Mismatch

**Problem:** `/status` reports `local-missing` for multiple assets — file bytes were recorded but now gone.

**Possible causes:**
- Accidental deletion.
- Incomplete pull (manifest-only pull followed by folder deletion).
- Stale lock from a previous version.

**Solution:**
1. If you need the files, run `/app-store-toolkit:pull --with-bytes` to re-download.
2. If you don't need them, manually remove the lock entries from `.appstore/metadata/{locale}/{platform}/assets.lock.json`.
3. Re-run `/app-store-toolkit:status` to verify.

---

## Reference: Dimension Catalog

The authoritative dimension catalog is at `servers/appstore-connect/src/data/asc-asset-specs.json`. If Apple adds new devices or changes dimensions, we update this file. You can inspect it directly:

```bash
cat servers/appstore-connect/src/data/asc-asset-specs.json
```

Or check which devices are supported:

```bash
/app-store-toolkit:validate
```

The validation output lists all supported device classes and their dimensions.

---

## Architecture: How It Works Under the Hood

This section is for reference; you don't need to understand it to use the toolkit.

### Upload Protocol (3 Steps)

When you run `/app-store-toolkit:push`, the toolkit performs a 3-step upload protocol for each asset:

1. **Reserve:** POST to App Store Connect, reserve a slot for the asset, get upload URLs.
2. **Upload bytes:** PUT the PNG/MP4 bytes to the upload URLs.
3. **Commit:** PATCH to App Store Connect, confirm the upload, set the MD5 checksum.

If any step fails, the toolkit stops, reports the error, and rolls back (deletes the partial asset entry on App Store Connect).

### SHA256 vs. MD5

- **SHA256:** Computed locally, stored in `assets.lock.json`, powers skip-unchanged logic.
- **MD5:** Computed locally, sent to App Store Connect, stored in their `sourceFileChecksum` field, powered their integrity checks.

The toolkit uses both so that skip-unchanged logic is independent of Apple's internal format.

### Lock-Driven Skip Logic

On `/push`, for each file:

1. Compute local SHA256.
2. Look up the lock entry for that file (by name).
3. If lock entry exists AND lock `sha256` == local SHA256 AND lock `asc_id` is non-null:
   - Skip upload (mark as "unchanged").
4. Else:
   - Upload and write/update lock entry with new SHA256 and asc_id.

The `--force` flag re-uploads everything, ignoring the lock.

### Manifest-Only Pull

When you run `/pull` without `--with-bytes`:

1. The toolkit fetches asset metadata from App Store Connect (IDs, dimensions, timestamps).
2. Writes lock entries with `asc_id`, `asc_checksum_md5`, `width`, `height`, `uploaded_at` — but leaves `sha256` null.
3. Does NOT fetch the file bytes.

This means the lock is valid for skip-unchanged logic (future pushes can compare `asc_id`), but you can't run skip-unchanged without the local bytes.

When you run `/push` and encounter a lock entry with `sha256` null, the toolkit re-uploads (safe — it can't compute skip-unchanged without the bytes).

---

## Related Documentation

- [Local Store Concepts](../concepts/local-store.md) — how metadata, listing config, and assets live in `.appstore/`.
- [File Schemas Reference](../reference/file-schemas.md) — detailed specs for `assets.json`, `assets.lock.json`, and other files.
- [Commands Reference](../reference/commands.md) — full documentation for `/push`, `/pull`, `/status`, `/validate`, `/render-screenshots`.
- [Character Limits](../reference/character-limits.md) — limits for text fields (headlines, descriptions, etc.).

---

## Quick Reference: Cheat Sheet

### Bring Your Own

```bash
# 1. Place files in the right folders
mkdir -p .appstore/assets/ios/en-US/iphone-6.7/screenshots
cp my-screenshot.png .appstore/assets/ios/en-US/iphone-6.7/screenshots/01-home.png

# 2. Create assets.json
cat > .appstore/metadata/en-US/ios/assets.json <<'EOF'
{"screenshots": {"iphone-6.7": [{"file": "01-home.png"}]}}
EOF

# 3. Validate
/app-store-toolkit:validate

# 4. Push
/app-store-toolkit:push --assets-only
```

### Template Renderer

```bash
# 1. Seed templates (or do this during /setup)
/app-store-toolkit:setup  # Answer "yes" to seed templates

# 2. Edit templates and populate headlines in assets.json
vim .appstore/templates/screenshot-iphone-6.7.html
vim .appstore/metadata/en-US/ios/assets.json

# 3. Render
/app-store-toolkit:render-screenshots

# 4. Validate and push
/app-store-toolkit:validate
/app-store-toolkit:push --assets-only
```

### Sync Status

```bash
# Show what's changed locally vs. remote
/app-store-toolkit:status

# Pull manifest (fast)
/app-store-toolkit:pull

# Pull with bytes (slow)
/app-store-toolkit:pull --with-bytes
```

---

**Last updated:** May 15, 2026  
**M2 Specification:** [2026-05-15-m2-assets-design.md](../superpowers/specs/2026-05-15-m2-assets-design.md)
