# File Schemas Reference

Every file stored in `.appstore/` has a typed JSON schema. This document describes the shape, validation rules, and purpose of each committed and gitignored file.

**Table of Contents:**
- [Config files](#config-files)
- [Listing & store configuration](#listing--store-configuration)
- [App Review information](#app-review-information)
- [Metadata with iteration history](#metadata-with-iteration-history)
- [Assets and media](#assets-and-media)
- [Submission and audit state](#submission-and-audit-state)
- [History logs](#history-logs)

---

## Config Files

### `.appstore/config.json`

**TypeScript Interface:** `AppConfig`

Committed to git. Bundle ID, platforms, locale list, and voice/tone settings. Single source of truth for the app's store-wide configuration.

```typescript
export interface VoiceConfig {
  tone: "professional" | "casual" | "playful" | "technical" | "minimal" | "witty" | "custom";
  style_notes?: string;
  target_audience?: string;
}

export interface ChangelogConfig {
  source: "git" | "manual" | "both";
  conventional_commits: boolean;
}

export interface AppConfig {
  bundle_id: string;
  app_id?: string;
  platforms: string[];
  primary_locale: string;
  locales: string[];
  voice: VoiceConfig;
  changelog?: ChangelogConfig;
}
```

**Minimal Example:**

```jsonc
{
  "bundle_id": "com.example.myapp",
  "app_id": "1234567890",                    // ASC numeric ID; optional but required for API calls
  "platforms": ["ios"],                      // Also supports "macos", "tvos", "visionos"
  "primary_locale": "en-US",
  "locales": ["en-US", "de", "ja", "fr"],
  "voice": {
    "tone": "professional",
    "style_notes": "Clear, user-focused, avoid jargon"
  },
  "changelog": {
    "source": "git",
    "conventional_commits": true
  }
}
```

**Validation Rules:**
- `bundle_id` must be non-empty and match Apple's bundle ID format (reverse domain notation).
- `platforms` array must not be empty.
- At least one locale must be configured; `primary_locale` must be in the `locales` list.
- `tone` must be one of the preset enum values; `custom` requires `style_notes` or `target_audience`.

**Written by:**
- `/app-store-toolkit:setup` skill (user-guided configuration)

---

### `.appstore/config.local.json`

**TypeScript Interface:** `LocalConfig`

**GITIGNORED.** Never commit. Contains App Store Connect API credentials.

```typescript
export interface LocalConfig {
  key_id: string;
  issuer_id: string;
  p8_key_path: string;
}
```

**Minimal Example:**

```jsonc
{
  "key_id": "ABC123DEF456",
  "issuer_id": "de305d54-75b4-431b-adb2-eb6b9e546013",
  "p8_key_path": "/absolute/path/to/AuthKey_ABC123DEF456.p8"
}
```

**Validation Rules:**
- `p8_key_path` must be an absolute path to a valid PKCS#8 .p8 private key file.
- The .p8 file is read at tool invocation; parse failures are surface immediately.
- `key_id` and `issuer_id` must match the credentials registered in App Store Connect.

**Written by:**
- `/app-store-toolkit:setup` skill (user pastes credentials)

---

## Listing & Store Configuration

### `.appstore/listing.json`

**TypeScript Interface:** `ListingConfig`

Committed to git. App Store listing metadata: categories, age rating, pricing tiers, territorial availability, and encryption compliance defaults.

```typescript
export type AppCategory =
  | "BUSINESS" | "DEVELOPER_TOOLS" | "EDUCATION" | "ENTERTAINMENT" | "FINANCE"
  | "FOOD_AND_DRINK" | "GAMES" | "GRAPHICS_AND_DESIGN" | "HEALTH_AND_FITNESS"
  | "LIFESTYLE" | "MAGAZINES_AND_NEWSPAPERS" | "MEDICAL" | "MUSIC" | "NAVIGATION"
  | "NEWS" | "PHOTO_AND_VIDEO" | "PRODUCTIVITY" | "REFERENCE" | "SHOPPING"
  | "SOCIAL_NETWORKING" | "SPORTS" | "STICKERS" | "TRAVEL" | "UTILITIES" | "WEATHER";

export interface AgeRatingAnswer {
  questionId: string;
  level: string; // e.g., "NONE", "INFREQUENT_OR_MILD", "FREQUENT_OR_INTENSE"
}

export interface PriceTierEntry {
  territory: string; // ISO 3166-1 alpha-2
  priceTier: number;
}

export interface ListingConfig {
  categories: {
    primary: AppCategory;
    secondary?: AppCategory;
  };
  ageRating: {
    answers: AgeRatingAnswer[];
    derivedRating?: string;
  };
  pricing: {
    defaultTier?: number; // When all territories share one tier
    perTerritory: PriceTierEntry[];
  };
  availability: {
    territories: string[]; // ISO 3166-1 alpha-2 codes
  };
  encryption: {
    usesEncryption: boolean;
    exemptions: string[];
  };
}
```

**Minimal Example:**

```jsonc
{
  "categories": {
    "primary": "PRODUCTIVITY",
    "secondary": "UTILITIES"
  },
  "ageRating": {
    "answers": [
      {"questionId": "VIOLENCE_CARTOON_OR_FANTASY", "level": "NONE"},
      {"questionId": "VIOLENCE_REALISTIC", "level": "NONE"}
    ],
    "derivedRating": "4+" // Optional; cached for diffing
  },
  "pricing": {
    "defaultTier": 0,                        // Tier 0 = free; 1-87 = paid
    "perTerritory": [                        // Overrides for specific regions
      {"territory": "JP", "priceTier": 250}
    ]
  },
  "availability": {
    "territories": ["US", "GB", "CA", "AU", "JP"]
  },
  "encryption": {
    "usesEncryption": false,
    "exemptions": []
  }
}
```

**Validation Rules:**
- `categories.primary` is required; `secondary` is optional.
- `ageRating.answers` is required but may be empty if no answers are configured.
- At least one territory must be in `availability.territories`.
- When `encryption.usesEncryption` is true, `exemptions` may contain exemption codes (e.g., `"ENCRYPTION_EXEMPT_FOR_SALES_REPORTING"`).

**Character Limits:** None (listing.json is config, not marketing copy).

**Written by:**
- `/app-store-toolkit:setup` skill
- MCP tools: `asc_set_categories`, `asc_set_age_rating`, `asc_set_pricing`, `asc_set_availability`, `asc_set_encryption_compliance`

---

## App Review Information

### `.appstore/review.json`

**TypeScript Interface:** `ReviewInfo`

Committed to git. App Review contact information, optional demo credentials, and notes for the reviewer. Required during submission.

```typescript
export interface ReviewContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface DemoAccount {
  required: boolean;
  username?: string;
  password?: string;
}

export interface ReviewInfo {
  contact: ReviewContact;
  demo: DemoAccount;
  notes: string;
}
```

**Minimal Example:**

```jsonc
{
  "contact": {
    "firstName": "Jane",
    "lastName": "Developer",
    "email": "jane@example.com",
    "phone": "+1-555-0123"
  },
  "demo": {
    "required": true,
    "username": "testuser@example.com",
    "password": "TestPassword123!"  // Note: consider storing securely
  },
  "notes": "Use the demo account to sign in. Test account is active through 2026-06-15. The app requires location services for full functionality. Please enable location in iOS settings during testing."
}
```

**Validation Rules:**
- All `contact` fields are required and must be non-empty.
- When `demo.required` is true, both `username` and `password` must be provided.
- When `demo.required` is false, `username` and `password` are optional and should be omitted.
- `notes` should include testing instructions, account validity dates, and any special setup required.

**Character Limits:**
- `contact.firstName`, `lastName`, `email`, `phone`: No explicit limits, but should be valid contact info.
- `notes`: Apple recommends keeping notes clear and concise (typically under 1000 characters).

**Written by:**
- `/app-store-toolkit:setup` skill (user-guided configuration)
- MCP tool: `asc_set_review_info`

---

### `.appstore/privacy.json`

**TypeScript Interface:** `PrivacyResponses`

Committed to git. App Privacy Nutrition Label responses per Apple's Data & Privacy taxonomy. Defines what data the app collects, whether it's linked to the user, and if it's used for tracking.

```typescript
export interface DeclaredDataType {
  type: DataField; // Taxonomy value: "EMAIL_ADDRESS", "USER_ID", "LOCATION", etc.
  linkedToUser: boolean;
  usedForTracking: boolean;
  purposes: Purpose[]; // Taxonomy values: "APP_FUNCTIONALITY", "ANALYTICS", "MARKETING", etc.
}

export interface PrivacyResponses {
  collectsData: boolean;
  tracking: {
    enabled: boolean;
    domains: string[]; // Third-party domains when tracking enabled
  };
  dataTypes: DeclaredDataType[];
}
```

**Minimal Example:**

```jsonc
{
  "collectsData": true,
  "tracking": {
    "enabled": true,
    "domains": ["analytics.example.com", "ads.example.com"]
  },
  "dataTypes": [
    {
      "type": "EMAIL_ADDRESS",
      "linkedToUser": true,
      "usedForTracking": false,
      "purposes": ["APP_FUNCTIONALITY", "ANALYTICS"]
    },
    {
      "type": "LOCATION",
      "linkedToUser": true,
      "usedForTracking": true,
      "purposes": ["APP_FUNCTIONALITY"]
    }
  ]
}
```

**Validation Rules:**
- When `collectsData` is false, `dataTypes` must be empty.
- When `tracking.enabled` is false, `tracking.domains` must be empty.
- Each declared data type must have **at least one purpose**.
- Data types and purposes are validated against the App Privacy taxonomy (defined in `src/data/privacy-taxonomy.ts`).
- Conflicts between `linkedToUser`, `usedForTracking`, and purposes are caught by Zod schema validation.

**Character Limits:** None (privacy.json is configuration, not copy).

**Written by:**
- `/app-store-toolkit:setup` skill
- `/app-store-toolkit:privacy` skill (code analysis → AI-drafted responses)
- MCP tool: `asc_set_privacy_responses`

---

## Metadata with Iteration History

Every piece of marketing copy — app name, subtitle, description, keywords, release notes, IAP names — is stored with full iteration history in `.appstore/metadata/`.

### Metadata Structure Overview

```
.appstore/metadata/
  {locale}/
    app_info.json                 # App name, subtitle, keywords (app-level)
    {platform}/
      description.json
      promotional_text.json
      release_notes/
        1.0.0.json
        1.1.0.json
        …
    iap/
      product_id_1.json
      product_id_2.json
      …
```

Each field is stored as a `FieldWithHistory`, which tracks all edits with source and timestamp.

### `FieldWithHistory` Shape

**TypeScript Interface:** `FieldWithHistory` and `Iteration`

```typescript
export type IterationSource =
  | "ai_generated"
  | "user_edited"
  | "pulled_from_asc"
  | "translated";

export interface Iteration {
  id: number;
  timestamp: string; // ISO 8601
  content: string;
  source: IterationSource;
  context: string; // Reason for the edit (e.g., "Updated per user feedback")
}

export interface FieldWithHistory {
  latest: number; // ID of the current iteration
  iterations: Iteration[];
}
```

**Minimal Example:**

```jsonc
{
  "latest": 3,
  "iterations": [
    {
      "id": 1,
      "timestamp": "2026-05-10T14:22:00Z",
      "content": "My Awesome App",
      "source": "user_edited",
      "context": "Initial setup"
    },
    {
      "id": 2,
      "timestamp": "2026-05-12T09:15:00Z",
      "content": "My Awesome Productivity App",
      "source": "user_edited",
      "context": "Added clarity per reviewer feedback"
    },
    {
      "id": 3,
      "timestamp": "2026-05-15T16:00:00Z",
      "content": "My Awesome Productivity App",
      "source": "ai_generated",
      "context": "ASO improvement pass (professional tone)"
    }
  ]
}
```

**Validation Rules:**
- `latest` must match the ID of one of the iterations in the array.
- `iterations` array is append-only; new edits append with `id = max(existing) + 1`.
- `timestamp` is ISO 8601 UTC, set server-side if omitted.
- `source` must be one of the four enum values.
- `context` should be a human-readable explanation (e.g., user edit, skill name, translation locale).

**Character Limits per Field:**

| Field             | Locale/Platform Scope | Limit |
|-------------------|----------------------|-------|
| `name`            | App-level (all locales) | 30    |
| `subtitle`        | App-level (all locales) | 30    |
| `keywords`        | Per-locale, version-level | 100   |
| `description`     | Per-locale, per-platform | 4000  |
| `promotional_text`| Per-locale, per-platform | 170   |
| `release_notes`   | Per-locale, per-platform, per-version | 4000  |
| `iap_display_name`| Per-locale, per-IAP | 30    |
| `iap_description` | Per-locale, per-IAP | 45    |

**Written by:**
- `/app-store-toolkit:aso` skill (AI-generated)
- `/app-store-toolkit:changelog` skill (release notes)
- `/app-store-toolkit:iap` skill (IAP copy)
- `/app-store-toolkit:localize` skill (translated content)
- `/app-store-toolkit:pull` skill (pulled from ASC)
- Manual edits via `store_write_metadata` MCP tool

---

### `.appstore/metadata/{locale}/app_info.json`

**TypeScript Interface:** `AppInfoData`

App-level content: name, subtitle, keywords. Shared across all platforms for a given locale.

```typescript
export interface AppInfoData {
  name: FieldWithHistory;
  subtitle: FieldWithHistory;
  keywords: FieldWithHistory;
}
```

**Example:** `.appstore/metadata/en-US/app_info.json`

```jsonc
{
  "name": {
    "latest": 2,
    "iterations": [
      {
        "id": 1,
        "timestamp": "2026-05-10T10:00:00Z",
        "content": "MyApp",
        "source": "user_edited",
        "context": "Initial app name"
      },
      {
        "id": 2,
        "timestamp": "2026-05-15T14:00:00Z",
        "content": "MyApp Pro",
        "source": "ai_generated",
        "context": "ASO: added Pro suffix for differentiation"
      }
    ]
  },
  "subtitle": {
    "latest": 1,
    "iterations": [
      {
        "id": 1,
        "timestamp": "2026-05-10T10:05:00Z",
        "content": "Track your productivity",
        "source": "user_edited",
        "context": "Initial subtitle"
      }
    ]
  },
  "keywords": {
    "latest": 1,
    "iterations": [
      {
        "id": 1,
        "timestamp": "2026-05-10T10:10:00Z",
        "content": "productivity, task management, planning",
        "source": "user_edited",
        "context": "Initial keywords"
      }
    ]
  }
}
```

---

### `.appstore/metadata/{locale}/{platform}/description.json` and `promotional_text.json`

**TypeScript Interface:** `VersionData` (per field)

Version-level content: description and promotional text. Scoped to a specific locale and platform.

```typescript
export interface VersionData {
  description: FieldWithHistory;
  promotional_text: FieldWithHistory;
}
```

**Example:** `.appstore/metadata/en-US/ios/description.json`

```jsonc
{
  "latest": 2,
  "iterations": [
    {
      "id": 1,
      "timestamp": "2026-05-10T11:00:00Z",
      "content": "MyApp helps you organize your tasks and stay productive...",
      "source": "user_edited",
      "context": "Initial description from product spec"
    },
    {
      "id": 2,
      "timestamp": "2026-05-15T15:30:00Z",
      "content": "MyApp Pro: organize tasks, set priorities, track progress...",
      "source": "ai_generated",
      "context": "Professional tone, ASO keywords integrated"
    }
  ]
}
```

---

### `.appstore/metadata/{locale}/{platform}/release_notes/{version}.json`

**TypeScript Interface:** `ReleaseNotesData`

Changelog for a specific app version. One file per version number.

```typescript
export interface ReleaseNotesData {
  version: string;
  notes: FieldWithHistory;
}
```

**Example:** `.appstore/metadata/en-US/ios/release_notes/1.0.0.json`

```jsonc
{
  "version": "1.0.0",
  "notes": {
    "latest": 1,
    "iterations": [
      {
        "id": 1,
        "timestamp": "2026-05-15T16:00:00Z",
        "content": "Initial release\n\n- Task creation and management\n- Priority levels\n- Dark mode support",
        "source": "ai_generated",
        "context": "Changelog generated from git commits (conventional commits)"
      }
    ]
  }
}
```

---

### `.appstore/metadata/{locale}/iap/{product_id}.json`

**TypeScript Interface:** `IAPData`

In-app purchase metadata: display name and description. One file per product ID.

```typescript
export interface IAPData {
  product_id: string;
  display_name: FieldWithHistory;
  description: FieldWithHistory;
}
```

**Example:** `.appstore/metadata/en-US/iap/com.example.myapp.pro.json`

```jsonc
{
  "product_id": "com.example.myapp.pro",
  "display_name": {
    "latest": 1,
    "iterations": [
      {
        "id": 1,
        "timestamp": "2026-05-10T12:00:00Z",
        "content": "MyApp Pro Upgrade",
        "source": "ai_generated",
        "context": "Generated by /iap skill"
      }
    ]
  },
  "description": {
    "latest": 1,
    "iterations": [
      {
        "id": 1,
        "timestamp": "2026-05-10T12:00:00Z",
        "content": "Unlock all premium features: unlimited tasks, advanced analytics, and priority support.",
        "source": "ai_generated",
        "context": "Generated by /iap skill"
      }
    ]
  }
}
```

---

## Assets and Media

### `.appstore/metadata/{locale}/{platform}/assets.json`

**File Format:** JSON (committed to git)

Human-authored asset metadata: screenshot headlines and video cover-frame timestamps. Drives the template renderer and video upload metadata.

See [M2 Assets Design — §3.1](../superpowers/specs/2026-05-15-m2-assets-design.md) for the full rationale.

```jsonc
{
  "screenshots": {
    "iphone-6.7": [
      {"file": "01-home.png", "headline": "Track every task"},
      {"file": "02-stats.png", "headline": "See your progress"}
    ],
    "ipad-pro-12.9": [
      {"file": "01-iPad.png", "headline": "Full-screen view on iPad"}
    ]
  },
  "previews": {
    "iphone-6.7": [
      {"file": "01-tour.mp4", "cover_frame_seconds": 2.5}
    ]
  }
}
```

**Validation Rules:**
- `file` must be the exact basename of a PNG/MP4 under `.appstore/assets/{platform}/{locale}/{device}/`.
- Device name (e.g., `iphone-6.7`) must match a device in the asset specs catalog.
- `headline` is optional; required only for screenshots being template-rendered by `/render-screenshots`.
- `cover_frame_seconds` is optional for videos; when absent, ASC uses the video's first frame.

**Written by:**
- User manually (or via `/render-screenshots` skill for generated headlines)

---

### `.appstore/metadata/{locale}/{platform}/assets.lock.json`

**TypeScript Interface:** `AssetsLock` and `AssetLockEntry`

Tool-controlled. Tracks file hashes, ASC IDs, dimensions, and upload timestamps. **Committed to git** for idempotent pushes across machines.

```typescript
export interface AssetLockEntry {
  file: string;
  sha256: string | null; // null when manifest-only pull (no local bytes)
  asc_id: string | null; // null when remote-deleted
  asc_checksum_md5: string | null; // ASC's sourceFileChecksum
  width: number;
  height: number;
  duration_seconds?: number; // previews only
  cover_frame_seconds?: number; // previews only
  uploaded_at: string; // ISO 8601
}

export interface AssetsLock {
  schema_version: 1;
  screenshots: Record<string, AssetLockEntry[]>;
  previews: Record<string, AssetLockEntry[]>;
}
```

**Example:** `.appstore/metadata/en-US/ios/assets.lock.json`

```jsonc
{
  "schema_version": 1,
  "screenshots": {
    "iphone-6.7": [
      {
        "file": "01-home.png",
        "sha256": "a1b2c3d4e5f6...",
        "asc_id": "60a9f1c2...",
        "asc_checksum_md5": "9f8e7d6c5b4a...",
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
        "sha256": "c3d4e5f6a7b8...",
        "asc_id": "70b0e2d3...",
        "asc_checksum_md5": "1a2b3c4d5e6f...",
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

**Validation Rules:**
- `sha256` is the local file's content hash; null only when `/pull --manifest-only` and no bytes have been downloaded.
- `asc_id` is null only when the asset has been deleted from ASC.
- Both hashes coexist: `sha256` powers skip-unchanged logic; `asc_checksum_md5` powers `/status` drift detection.
- Device groupings (e.g., `iphone-6.7`) must match the asset specs catalog.

**Written by:**
- MCP tools: `asc_upload_screenshot`, `asc_upload_app_preview`, `asc_delete_screenshot`, `asc_delete_app_preview`
- `/app-store-toolkit:pull` skill (manifest-only or with `--with-bytes`)

---

## Submission and Audit State

### `.appstore/ship-state.json`

**TypeScript Interface:** `ShipState`

**GITIGNORED (transient).** Created on first `/app-store-toolkit:ship` run; deleted on success. Tracks the progress of a multi-phase submission workflow.

See [M3 Submit Design — §5.1](../superpowers/specs/2026-05-15-m3-submit-design.md) for the full spec.

```typescript
export type ShipPhase =
  | "audit"
  | "push-metadata"
  | "push-listing"
  | "push-privacy"
  | "push-review"
  | "push-assets"
  | "attach-build"
  | "submit";

export interface ShipWaiver {
  check: string;
  target: string;
  reason?: string;
  waived_at: string;
}

export interface ShipState {
  schema_version: 1;
  version: string;
  started_at: string; // ISO 8601
  current_phase: ShipPhase;
  completed_phases: ShipPhase[];
  audit_findings_ref: string | null; // Pointer to audits.jsonl line (e.g., "audits.jsonl:42")
  waivers: ShipWaiver[];
}
```

**Example:**

```jsonc
{
  "schema_version": 1,
  "version": "1.0.0",
  "started_at": "2026-05-15T18:00:00Z",
  "current_phase": "push-assets",
  "completed_phases": ["audit", "push-metadata", "push-listing", "push-privacy", "push-review"],
  "audit_findings_ref": "audits.jsonl:42",
  "waivers": [
    {
      "check": "locale-parity",
      "target": "ja",
      "reason": "Shipping Japanese stub for legal hold",
      "waived_at": "2026-05-15T18:00:11Z"
    }
  ]
}
```

**Validation Rules:**
- `current_phase` must not be in `completed_phases`.
- Each phase runs in strict order: cannot skip a phase.
- `waivers` are matched against audit findings; unmatched waivers are silently ignored (no-op).
- On successful completion of all phases, this file is deleted.

**Written by:**
- `/app-store-toolkit:ship` skill (state machine)

---

## History Logs

History files are **append-only** logs stored in `.appstore/history/`. Each line is a complete JSON object (JSONL format).

### History Entry Shape

**TypeScript Interface:** `HistoryEntry`

```typescript
export type HistoryStream = "pushes" | "submissions" | "audits";

export interface HistoryEntry {
  timestamp?: string; // ISO 8601 UTC; set server-side if omitted
  tool: string; // Tool or skill name that produced the entry
  target: Record<string, unknown>; // Identifying context (app_id, version_id, locale, etc.)
  payload: Record<string, unknown>; // Sanitized data sent to ASC or computed locally
  result: "success" | "error" | "skipped";
  error?: string; // When result === "error"
  details?: Record<string, unknown>; // Optional per-locale or per-file breakdown
}
```

---

### `.appstore/history/pushes.jsonl`

**One line per mutating MCP tool invocation** (e.g., every `asc_update_app_info`, `asc_set_privacy_responses`, `asc_upload_screenshot`).

```jsonl
{"timestamp":"2026-05-15T14:00:00Z","tool":"asc_update_app_info","target":{"app_id":"1234567890","locale":"en-US"},"payload":{"name":"MyApp Pro","subtitle":"Track your tasks"},"result":"success"}
{"timestamp":"2026-05-15T14:05:00Z","tool":"asc_set_privacy_responses","target":{"app_id":"1234567890"},"payload":{"collectsData":true,"tracking":{"enabled":true,"domains":["analytics.example.com"]},"dataTypes":[]},"result":"success"}
{"timestamp":"2026-05-15T14:10:00Z","tool":"asc_upload_screenshot","target":{"app_id":"1234567890","version_id":"abc123","locale":"en-US","platform":"ios"},"payload":{"file":"01-home.png","asc_display_target":"APP_IPHONE_67"},"result":"success","details":{"sha256":"a1b2...","asc_id":"60a9f1c2...","dimensions":"1290x2796"}}
```

**Usage:** `git log -p .appstore/history/pushes.jsonl` to see every API mutation with timestamp and payload.

---

### `.appstore/history/audits.jsonl`

**One line per `/app-store-toolkit:audit` run.**

Each audit run produces a summary of findings (BLOCKER and QUALITY severity) across seven phases.

```jsonc
{
  "timestamp": "2026-05-15T18:00:00Z",
  "version": "1.0.0",
  "blocker_count": 2,
  "quality_count": 3,
  "findings": [
    {
      "check": "locale-parity",
      "severity": "blocker",
      "locale": "ja",
      "field": "description",
      "message": "missing value",
      "fix": "Run /aso for locale ja"
    },
    {
      "check": "char-limits",
      "severity": "blocker",
      "locale": "en-US",
      "platform": "ios",
      "field": "description",
      "message": "exceeds 4000 character limit (4521 chars)",
      "fix": "Shorten or regenerate"
    },
    {
      "check": "cross-surface",
      "severity": "quality",
      "locale": "en-US",
      "screenshot": "iphone-6.7/02-stats.png",
      "type": "contradiction",
      "copy_field": "promotional_text",
      "copy_says": "Try free for 7 days",
      "screen_text_extracted": "Free 30-day trial",
      "fix": "Align the promo text with the screenshot"
    }
  ],
  "waivers": [
    {
      "check": "locale-parity",
      "target": "ja",
      "reason": "Shipping Japanese stub for legal hold",
      "waived_at": "2026-05-15T18:00:11Z"
    }
  ]
}
```

**Phases Captured:**
1. Locale parity (BLOCKER)
2. Character limits (BLOCKER)
3. Required-field presence (BLOCKER)
4. Asset dimensions (BLOCKER)
5. Voice drift (QUALITY)
6. Phrase risk (BLOCKER or QUALITY per rule)
7. Cross-surface vision check (QUALITY)

---

### `.appstore/history/submissions.jsonl`

**One line per successful `/app-store-toolkit:ship` run** (written at the very end, on success).

```jsonc
{
  "timestamp": "2026-05-15T18:43:00Z",
  "version": "1.0.0",
  "duration_seconds": 2580,
  "phases": [
    "audit",
    "push-metadata",
    "push-listing",
    "push-privacy",
    "push-review",
    "push-assets",
    "attach-build",
    "submit"
  ],
  "build_id": "abc123",
  "release_strategy": "AFTER_APPROVAL",
  "submission_id": "sub_xyz",
  "outcome": "submitted"
}
```

**Usage:** Quick audit trail of every submission to the App Store. `duration_seconds` shows end-to-end time.

---

## Related Documentation

- See [Concepts: Local Store](../concepts/local-store.md) for the conceptual model and directory layout.
- See [MCP Tools Reference](./mcp-tools.md) for the tools that read/write these files.
- See [Getting Started](../getting-started.md) to initialize `.appstore/` for a new app.
- See the M2 and M3 specs in `docs/superpowers/specs/` for the detailed design rationale behind assets, audit, and submission state.
