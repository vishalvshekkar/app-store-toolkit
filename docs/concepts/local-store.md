# Local store

The **`.appstore/` directory** is the single source of truth for all App Store Connect metadata in your project. Every file has a purpose, a clear commitment status (committed to git or gitignored), and a well-defined schema. Understanding the local store is essential to using the toolkit effectively.

## The principle: everything listing-related lives in `.appstore/`

In app-store-toolkit, App Store Connect is the **deployment target**, not the source of truth. Your team edits files locally (in `.appstore/`), review changes in pull requests, and then run `/app-store-toolkit:push` to sync to ASC.

This means:
- **All metadata is versioned** in git. You can see who changed what, when, and why.
- **Pull requests are the review gate.** Before shipping, reviewers see the exact copy, screenshots, and metadata that will go live.
- **App Store Connect stays in sync** via the toolkit, not the other way around. When you run `/pull`, you're **fetching** ASC's current state into your local store, not making it the authority.
- **Iteration history is preserved.** Every change to a field is logged with its source (AI-generated, user-edited, pulled from ASC, translated) and context.

This architecture is why the toolkit enforces a strict `.appstore/` structure: it enables reliable diffing, audit trails, and deterministic pushes.

---

## The full directory tree

```
.appstore/
  config.json                          ✅ committed
    → bundle_id, platforms, locales, voice/tone, changelog config
  
  config.local.json                    🚫 gitignored
    → API credentials only (key_id, issuer_id, p8_key_path)
  
  listing.json                         ✅ committed
    → app-level decisions: categories, age rating, pricing, availability, encryption defaults
  
  privacy.json                         ✅ committed
    → App Privacy questionnaire: data collection, tracking, data types (taxonomy-validated)
  
  review.json                          ✅ committed
    → App Review info: contact person, demo account, reviewer notes
  
  metadata/
    {locale}/                          e.g., en-US/
      name.json                        ✅ app name (app-level, same across platforms)
      subtitle.json                    ✅ app subtitle (app-level, same across platforms)
      keywords.json                    ✅ searchable keywords (version-level, per-platform)
      description.json                 ✅ long description (version-level, per-platform)
      promotional_text.json            ✅ promotional text (version-level, per-platform)
      release_notes/
        1.0.0.json                     ✅ What's New for version 1.0.0
        1.0.1.json                     ✅ What's New for version 1.0.1
        …
      assets.json                      ✅ asset metadata: headlines, cover frames (M2)
      assets.lock.json                 ✅ asset cache: sha256, ASC ids (M2, committed for idempotency)
      {platform}/                      (rare) per-platform overrides
        keywords.json                  ✅ if keywords differ per platform
        description.json               ✅ if description differs per platform
        …
  
  assets/                              ✅ committed (Git LFS recommended)
    {platform}/                        e.g., ios/
      {locale}/                        e.g., en-US/ (strict per-locale, no fallback)
        {device}/                      e.g., iphone-6.7/
          screenshots/
            01-home.png                # sorted filenames = ASC display order
            02-stats.png
            …
          previews/
            01-tour.mp4
            …
  
  templates/                           ✅ committed (optional, M2)
    screenshot-iphone-6.7.html        # Puppeteer template for rendering screenshots
    screenshot-ipad-12.9.html
    …
  
  history/                             ✅ committed
    pushes.jsonl                       # append-only: one line per ASC mutation
                                       # logged by every asc_update_* or asc_set_* tool
    audits.jsonl                       # append-only: one line per /audit run (M3)
    submissions.jsonl                  # append-only: one line per /submit run (M3)
  
  ship-state.json                      🚫 gitignored, transient
    → checkpoint for /ship orchestration (M3)
    → deleted after successful submission or on user abort
  
  .gitignore                           ✅ committed
    → auto-managed; lists what to skip (e.g., ship-state.json, config.local.json)
```

**Legend:**
- `✅ committed` — should be checked into git; part of your review workflow
- `🚫 gitignored` — never committed; credentials or transient state
- `(M2)` — added in Milestone 2 (assets support)
- `(M3)` — added in Milestone 3 (submission/audit support)

---

## What each file does

### `config.json` — ✅ committed

**Created by:** `/app-store-toolkit:setup`  
**Updated by:** user edits, `/setup` re-run  
**Purpose:** Defines your app's bundle ID, supported platforms, active locales, voice/tone, and changelog strategy.

**Example minimal content:**
```json
{
  "bundle_id": "com.example.MyApp",
  "app_id": "1234567890",
  "platforms": ["ios", "macos"],
  "primary_locale": "en-US",
  "locales": ["en-US", "fr", "de"],
  "voice": {
    "tone": "professional",
    "style_notes": "friendly, accessible"
  },
  "changelog": {
    "source": "git",
    "conventional_commits": true
  }
}
```

**See:** [File schemas reference](../reference/file-schemas.md) for the full `AppConfig` shape.

---

### `config.local.json` — 🚫 gitignored

**Created by:** `/app-store-toolkit:setup`  
**Updated by:** user edits only  
**Purpose:** Stores sensitive App Store Connect API credentials. **NEVER commit this file.**

**Example:**
```json
{
  "key_id": "ABC123DEF456",
  "issuer_id": "12345678-1234-1234-1234-123456789012",
  "p8_key_path": "/Users/you/.appstore/keys/AuthKey_ABC123DEF456.p8"
}
```

The `.p8` file itself should live **outside** your git repository (e.g., in `~/.appstore/keys/` or a secure credential manager). Never check it in.

---

### `listing.json` — ✅ committed

**Created by:** `/app-store-toolkit:setup` (empty) or `/app-store-toolkit:pull`  
**Updated by:** `/app-store-toolkit:push` (mutating tools append to history/pushes.jsonl)  
**Purpose:** Holds app-level listing settings: primary and secondary categories, age rating answers, pricing tiers, territories, and encryption compliance defaults.

**Example minimal content:**
```json
{
  "categories": {
    "primary": "PRODUCTIVITY"
  },
  "ageRating": {
    "answers": [
      {"questionId": "VIOLENCE_CARTOON_OR_FANTASY", "level": "NONE"},
      {"questionId": "VIOLENCE_REALISTIC", "level": "NONE"}
    ]
  },
  "pricing": {
    "defaultTier": 0
  },
  "availability": {
    "territories": ["US", "GB", "DE", "FR"]
  },
  "encryption": {
    "usesEncryption": false,
    "exemptions": []
  }
}
```

**See:** [File schemas reference](../reference/file-schemas.md) for the full `ListingConfig` shape.

---

### `privacy.json` — ✅ committed

**Created by:** `/app-store-toolkit:privacy` (from code analysis) or `/app-store-toolkit:pull`  
**Updated by:** user edits or skill-driven mutations  
**Purpose:** Stores your App Privacy nutrition label: whether you collect data, what data types, tracking behavior, and purposes.

**Example minimal content:**
```json
{
  "collectsData": true,
  "tracking": {
    "enabled": false,
    "domains": []
  },
  "dataTypes": [
    {
      "type": "user_id",
      "linkedToUser": true,
      "usedForTracking": false,
      "purposes": ["app_functionality"]
    }
  ]
}
```

Data types and purposes are validated against Apple's official taxonomy. Invalid entries are rejected at push time.

**See:** [File schemas reference](../reference/file-schemas.md) for the full `PrivacyResponses` shape and valid taxonomy values.

---

### `review.json` — ✅ committed

**Created by:** `/app-store-toolkit:setup` (empty) or `/app-store-toolkit:pull`  
**Updated by:** user edits or `/app-store-toolkit:push`  
**Purpose:** Stores App Review submission metadata: contact person, demo account (if required), and reviewer notes.

**Example minimal content:**
```json
{
  "contact": {
    "firstName": "Alice",
    "lastName": "Developer",
    "email": "alice@example.com",
    "phone": "+1-555-123-4567"
  },
  "demo": {
    "required": false
  },
  "notes": "App uses App Tracking Transparency for ad targeting. See Settings > Privacy > Tracking."
}
```

If your app requires sign-in, set `demo.required` to `true` and populate `demo.username` and `demo.password`.

**See:** [File schemas reference](../reference/file-schemas.md) for the full `ReviewInfo` shape.

---

### `metadata/{locale}/{field}.json` — ✅ committed

**Created by:** `/app-store-toolkit:aso` or `/app-store-toolkit:pull`  
**Updated by:** generation skills, user edits, API pulls, translation agent  
**Purpose:** Stores versioned content for one field in one locale.

**Fields:**
- `name.json` — app name (app-level, same across platforms)
- `subtitle.json` — app subtitle (app-level, same across platforms)
- `keywords.json` — searchable keywords
- `description.json` — full description
- `promotional_text.json` — promotional text (170 char limit)

**Schema: `FieldWithHistory`**

All metadata fields follow the `FieldWithHistory` pattern:
```json
{
  "latest": 2,
  "iterations": [
    {
      "id": 1,
      "timestamp": "2025-09-15T14:30:00Z",
      "content": "Old description",
      "source": "pulled_from_asc",
      "context": "Initial pull from App Store Connect"
    },
    {
      "id": 2,
      "timestamp": "2025-09-16T10:15:00Z",
      "content": "Improved description with better keywords",
      "source": "ai_generated",
      "context": "/app-store-toolkit:aso run, professional tone"
    }
  ]
}
```

**Iteration sources:**
- `ai_generated` — created by ASO, changelog, IAP, or localization skills
- `user_edited` — manually edited by a developer
- `pulled_from_asc` — fetched from App Store Connect via `/pull`
- `translated` — generated by the localization agent from English

The `latest` field is an index into the `iterations` array (0-indexed), pointing to the current version. This makes it trivial to revert: just decrement `latest` or update it to an earlier id.

---

### `metadata/{locale}/release_notes/{version}.json` — ✅ committed

**Created by:** `/app-store-toolkit:changelog`  
**Updated by:** changelog skill, user edits  
**Purpose:** Stores "What's New" text for a specific app version.

**Example:**
```json
{
  "latest": 1,
  "iterations": [
    {
      "id": 1,
      "timestamp": "2025-09-20T09:00:00Z",
      "content": "- Fixed crash in Settings tab\n- Improved performance on older devices\n- UI polish",
      "source": "ai_generated",
      "context": "/app-store-toolkit:changelog from git history"
    }
  ]
}
```

One file per version. When you ship v1.0.1, create `release_notes/1.0.1.json`.

---

### `metadata/{locale}/{platform}/` — ✅ committed (rare)

**Created by:** user, when field content differs per platform  
**Purpose:** Override a field for a specific platform.

**Example use case:**
Your app runs on iOS and macOS. The iOS description emphasizes "pocket app" benefits; the macOS description emphasizes "desktop power." Instead of duplicating the locale in both platforms, you create:
- `metadata/en-US/description.json` (shared version-level content)
- `metadata/en-US/ios/description.json` (iOS override)
- `metadata/en-US/macos/description.json` (macOS override)

When pushing, the toolkit applies iOS overrides for iOS builds and macOS overrides for macOS builds.

---

### `metadata/{locale}/assets.json` — ✅ committed (M2)

**Created by:** user (manual edit) or generated by screenshot templates  
**Purpose:** Stores per-file asset metadata: headlines for screenshots and cover-frame timestamps for App Previews.

**Example:**
```json
{
  "screenshots": {
    "iphone-6.7": [
      {"file": "01-home.png", "headline": "Track every meal"},
      {"file": "02-stats.png", "headline": "See your trends"},
      {"file": "03-settings.png"}
    ]
  },
  "previews": {
    "iphone-6.7": [
      {"file": "01-tour.mp4", "cover_frame_seconds": 2.5}
    ]
  }
}
```

Fields are optional. The renderer needs `headline` only if rendering the screenshot from a template; users who bring PNG files don't need headlines. `cover_frame_seconds` is optional for App Previews — ASC defaults to frame 0 if absent.

---

### `metadata/{locale}/assets.lock.json` — ✅ committed (M2)

**Created by:** `/app-store-toolkit:push` or `/app-store-toolkit:pull`  
**Updated by:** asset mutation tools  
**Purpose:** Caches asset metadata (SHA256 hashes, ASC IDs, dimensions) to enable skip-unchanged semantics and idempotent pushes across machines.

**Example:**
```json
{
  "schema_version": 1,
  "screenshots": {
    "iphone-6.7": [
      {
        "file": "01-home.png",
        "sha256": "a1b2c3d4e5f6...",
        "asc_id": "asset-abc-123",
        "asc_checksum_md5": "xyz789...",
        "width": 1170,
        "height": 2532,
        "uploaded_at": "2025-09-20T15:30:00Z"
      }
    ]
  },
  "previews": {
    "iphone-6.7": [
      {
        "file": "01-tour.mp4",
        "sha256": "b2c3d4e5f6g7...",
        "asc_id": "preview-def-456",
        "asc_checksum_md5": "uvw123...",
        "width": 1170,
        "height": 2532,
        "duration_seconds": 15.0,
        "cover_frame_seconds": 2.5,
        "uploaded_at": "2025-09-20T16:00:00Z"
      }
    ]
  }
}
```

**Why committed?** The lock file is committed so that `/push` can be idempotent across machines. When you clone the repo and run `/push`, the toolkit reads the lock, hashes each local asset, and skips re-uploading files whose hash matches the lock's `sha256` *and* whose `asc_id` is non-null.

**Dual-hash design:** Each entry carries both `sha256` (local file hash) and `asc_checksum_md5` (ASC's MD5). When local bytes are unavailable (e.g., after `/pull --manifest-only`), the toolkit uses `asc_checksum_md5` to detect remote drift.

---

### `assets/{platform}/{locale}/{device}/screenshots/` — ✅ committed (Git LFS recommended)

**Created by:** user (copy PNGs or render from templates)  
**Purpose:** Stores screenshot PNG files for a specific platform, locale, and device type.

**Layout:**
```
assets/ios/en-US/iphone-6.7/screenshots/
  01-home.png
  02-stats.png
  03-settings.png
```

**Sorted filename = ASC display order.** Screenshots appear in the App Store in alphabetical order of filename. If you delete `02-stats.png`, the next sorted file becomes slot 2 automatically (no renumbering required).

**Recommendation: Use Git LFS.** PNG and MP4 files are binary and large. Committing them to a standard git repo inflates your repository size. During `/setup`, the toolkit offers to initialize Git LFS and configure `.gitattributes` to track `*.png` and `*.mp4` files via LFS. Git LFS is transparent: you still `git add` and `git commit` as normal, but the bytes are stored on an LFS server (GitHub, GitLab, Gitea) instead of your git history.

---

### `assets/{platform}/{locale}/{device}/previews/` — ✅ committed (Git LFS recommended)

**Created by:** user (copy MP4 files)  
**Purpose:** Stores App Preview video files (MP4) for a specific platform, locale, and device type.

**Layout:**
```
assets/ios/en-US/iphone-6.7/previews/
  01-tour.mp4
  02-features.mp4
```

App Previews are optional but powerful: up to 30 seconds of video per device type. Sorted by filename, just like screenshots.

---

### `templates/` — ✅ committed (optional, M2)

**Created by:** user or generated by `/app-store-toolkit:render-screenshots`  
**Purpose:** Optional Puppeteer-based HTML/CSS templates for rendering screenshots programmatically.

**Example:**
```
templates/
  screenshot-iphone-6.7.html
  screenshot-ipad-12.9.html
```

The template is a standard HTML file with JavaScript that renders a design to a PNG. The toolkit uses Puppeteer to load the HTML, execute the JS, and capture a PNG at the target device's resolution (e.g., 1170×2532 for iPhone 6.7).

**Lazy install:** Puppeteer is a large dependency (~280 MB when it downloads Chromium). The toolkit only installs it on first use of `/app-store-toolkit:render-screenshots`. If you never use the feature, you pay zero cost.

---

### `history/pushes.jsonl` — ✅ committed

**Created by:** auto-appended by every ASC mutation tool  
**Purpose:** Append-only audit log of all changes pushed to App Store Connect.

**Format:** One JSON object per line (JSONL).

**Example lines:**
```json
{"timestamp":"2025-09-20T10:15:00Z","tool":"asc_update_app_info","locale":"en-US","payload":{"name":"My App"},"result":{"success":true,"app_info_localization_id":"abc-123"}}
{"timestamp":"2025-09-20T10:16:00Z","tool":"asc_set_categories","app_id":"1234567890","payload":{"primary":"PRODUCTIVITY","secondary":"UTILITIES"},"result":{"success":true}}
```

**Why JSONL?** One line per mutation is diffable in git. You can review a PR and see exactly which ASC mutations were made, in order, with their full payloads and results.

**How to review:** Use `git log -p .appstore/history/pushes.jsonl` to see the audit trail. Or use the `/app-store-toolkit:list history pushes` command to print recent entries.

---

### `history/audits.jsonl` — ✅ committed (M3)

**Created by:** `/app-store-toolkit:audit`  
**Purpose:** Append-only log of submission-readiness audit runs.

**Format:** One JSON object per line (JSONL).

**Example line:**
```json
{"timestamp":"2025-09-20T11:00:00Z","version":"1.0.0","locales":["en-US","fr","de"],"findings":[{"severity":"BLOCKER","phase":"metadata","check":"missing-description","target":"fr","remediation":"Add French description"}],"cross_surface_enabled":true}
```

Each audit run is one JSON object. Reviewers can see what checks passed and failed before attempting submission.

---

### `history/submissions.jsonl` — ✅ committed (M3)

**Created by:** `/app-store-toolkit:submit` or `/app-store-toolkit:ship`  
**Purpose:** Append-only log of submission attempts: which build was attached, what the dry-run reported, and the final result.

**Format:** One JSON object per line (JSONL).

**Example line:**
```json
{"timestamp":"2025-09-20T12:00:00Z","version":"1.0.0","build_id":"build-abc-123","dry_run_blockers":[],"submitted":true,"submission_id":"sub-xyz-789"}
```

---

### `ship-state.json` — 🚫 gitignored, transient (M3)

**Created by:** `/app-store-toolkit:ship` on first run  
**Updated by:** `/app-store-toolkit:ship` after each completed phase  
**Deleted by:** `/app-store-toolkit:ship` on successful submission or user abort  
**Purpose:** Checkpoint state for orchestrating a full `ship` workflow (audit → push → attach → submit).

**Example:**
```json
{
  "schema_version": 1,
  "version": "1.0.0",
  "started_at": "2025-09-20T12:00:00Z",
  "current_phase": "push-metadata",
  "completed_phases": ["audit"],
  "audit_findings_ref": "history/audits.jsonl:line-5",
  "waivers": [
    {
      "check": "promo-text-keywords-mismatch",
      "target": "en-US",
      "reason": "Promo is intentionally different for marketing campaign",
      "waived_at": "2025-09-20T12:05:00Z"
    }
  ]
}
```

**Lifecycle:**
1. User runs `/app-store-toolkit:ship`
2. `ship-state.json` is created with `current_phase: "audit"`
3. Each phase completes and `current_phase` advances
4. On success, `ship-state.json` is deleted
5. If the user re-runs `/ship` with state present, it resumes from the last incomplete phase

**Why gitignored?** The state file is transient: it lives only while a ship is in progress. Once submission succeeds, it's deleted. Re-running the flow starts fresh. Committing it would clutter your git history with temporary state.

---

### `.gitignore` — ✅ committed

**Created by:** `/app-store-toolkit:setup`  
**Purpose:** Lists files that should never be committed.

**Example content:**
```
.appstore/config.local.json
.appstore/ship-state.json
.appstore/keys/
node_modules/
```

The toolkit auto-manages this file: `/setup` writes it and future tools update it if new gitignored files are introduced.

---

## The iteration-history pattern

Almost every content field in the metadata store uses the `FieldWithHistory` schema:

```typescript
interface FieldWithHistory {
  latest: number;           // index of current iteration
  iterations: Iteration[];  // all past and present versions
}

interface Iteration {
  id: number;              // unique incrementing id
  timestamp: string;       // ISO 8601 UTC
  content: string;         // the actual field value
  source: IterationSource; // how it was created
  context: string;         // why (optional human note or auto-generated context)
}
```

**Sources:**
- `ai_generated` — created by an AI skill (ASO, changelog, localization)
- `user_edited` — manually edited by a developer
- `pulled_from_asc` — fetched from App Store Connect (represents ASC's current state)
- `translated` — generated by the localization agent

**Why keep history?** You can:
- **Revert** by setting `latest` to an earlier iteration's id
- **Review** how copy evolved (useful when reviewers ask "why did we change this?")
- **Audit** compliance and traceability (who generated it and when)
- **Compare** your local version against a previous ASC pull

---

## The lock-file pattern (M2)

`assets.lock.json` is a special kind of metadata cache.

**Committed to git** — Unlike typical build artifacts or caches, this file is committed. Why?

Because `/push` uses it to detect unchanged assets and skip re-uploading. On a clean clone (by a new developer), if `assets.lock.json` exists, the toolkit reads it, hashes each local PNG/MP4, and skips uploads for files whose hash matches the lock entry. This makes the push **idempotent across machines**: the same set of assets won't re-upload on every developer's machine.

**Dual-hash design:**
- `sha256` — local file's SHA-256 hash (used when bytes are present)
- `asc_checksum_md5` — ASC's MD5 checksum (used when local bytes are absent, e.g., after `--manifest-only` pull)

When comparing for equality, the toolkit prefers `sha256` but falls back to `asc_checksum_md5` when bytes aren't available. This supports workflows where designers pull metadata + lock but not gigabytes of images.

---

## The ship-state lifecycle (M3)

The `/app-store-toolkit:ship` command orchestrates a full release pipeline: audit → push metadata → push listing → push privacy → push review → push assets → attach build → submit. It does this in phases.

**State file:** `ship-state.json` (gitignored)

**Phases:**
1. `audit` — Run submission-readiness checks (vision + field validation)
2. `push-metadata` — Push name, subtitle, keywords, description, promo text
3. `push-listing` — Push categories, age rating, pricing, availability
4. `push-privacy` — Push App Privacy answers
5. `push-review` — Push App Review contact and notes
6. `push-assets` — Push screenshots and App Preview videos
7. `attach-build` — Attach TestFlight build to version
8. `submit` — Submit for App Store Review

**Checkpoint & resume:**
- On first `/ship` run, state is created with `current_phase: "audit"`
- After audit passes, `completed_phases` includes "audit" and `current_phase` advances
- If the user re-runs `/ship` while state exists, it resumes from where it left off (idempotent)
- If a phase fails, the user fixes the issue and re-runs `/ship` again — same state is reused
- On success, state is deleted

**Waivers:**
If a phase reports a blocker (e.g., "description is missing in French"), you can re-run with `--waive check:target --reason "..."`:
```bash
/app-store-toolkit:ship --waive missing-description:fr --reason "French description pending localization"
```

Each waiver is recorded in the state file and logged to `history/audits.jsonl` for compliance.

---

## Git LFS for assets

Binary files like screenshots and App Preview videos can inflate your repository if stored as raw git objects. The toolkit recommends **Git LFS** for `assets/`.

**During `/setup`:**
The toolkit detects if LFS is installed and offers to configure your project:
```bash
? Set up Git LFS for images and videos? (y/n)
```

If yes, the toolkit:
1. Initializes LFS (if not already done)
2. Creates/updates `.gitattributes`:
   ```
   *.png filter=lfs diff=lfs merge=lfs -text
   *.mp4 filter=lfs diff=lfs merge=lfs -text
   ```
3. Tells you to commit `.gitattributes`

**Transparent to you:** Once configured, `git add`, `git commit`, and `git push` work as normal. Git LFS automatically handles the heavy lifting behind the scenes.

---

## What's NOT in the store

Some data deliberately lives **outside** `.appstore/`:

- **`.p8` private key** — Your App Store Connect API key must never be in git. Store it in a secure location (e.g., `~/.appstore/keys/`) and reference it in `config.local.json`.
- **Build binaries** — `.ipa` and `.app` files belong in Xcode's build cache or a CI/CD artifact store, not git.
- **Sales and financial data** — Revenue, refunds, and analytics are out of scope for v1. (Potential future feature.)
- **TestFlight tester lists** — Out of scope for v1. (Potential future feature.)
- **Private credentials in metadata** — Never include passwords, API keys, or secrets in description, release notes, or review notes. If you need to share a demo account, do so via a secure out-of-band channel, not git.

---

## Summary

The `.appstore/` directory is your App Store metadata as code:

| File | Status | Purpose |
|------|--------|---------|
| `config.json` | ✅ committed | App config, bundle ID, locales, voice |
| `config.local.json` | 🚫 gitignored | Credentials only |
| `listing.json` | ✅ committed | Categories, pricing, availability, encryption |
| `privacy.json` | ✅ committed | App Privacy taxonomy responses |
| `review.json` | ✅ committed | App Review contact, demo, notes |
| `metadata/{locale}/{field}.json` | ✅ committed | Versioned content with iteration history |
| `metadata/{locale}/release_notes/{ver}.json` | ✅ committed | "What's New" per version |
| `assets.json` | ✅ committed | Asset headlines, cover frames |
| `assets.lock.json` | ✅ committed | Asset cache (sha256, ASC IDs) |
| `assets/{platform}/{locale}/{device}/screenshots/` | ✅ committed | PNG files (Git LFS) |
| `assets/{platform}/{locale}/{device}/previews/` | ✅ committed | MP4 files (Git LFS) |
| `templates/` | ✅ committed | Puppeteer screenshot templates |
| `history/pushes.jsonl` | ✅ committed | Audit log of ASC mutations |
| `history/audits.jsonl` | ✅ committed | Audit log of submission readiness checks |
| `history/submissions.jsonl` | ✅ committed | Audit log of submission attempts |
| `ship-state.json` | 🚫 gitignored | Transient orchestration state |
| `.gitignore` | ✅ committed | List of gitignored files |

By understanding the structure, you can review pull requests with confidence, debug sync issues, and collaborate with your team on App Store metadata as part of your normal development workflow.

**Next steps:**
- Read [File schemas](../reference/file-schemas.md) for the exact JSON shapes and validation rules.
- Read [History and audit](history-and-audit.md) for details on the audit trail and compliance logging.
- Read [Architecture](architecture.md) for how the local store fits into the three-layer plugin design.
