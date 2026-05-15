# Slash Command Reference

This is the complete reference for all 18 user-invocable slash commands in app-store-toolkit. Each command is scoped to a single bundle ID (configured once during setup) and manages metadata locally before pushing to App Store Connect.

**All commands use the prefix:** `/app-store-toolkit:<name>`

## Quick Summary

| Command | Purpose | Added in |
|---------|---------|----------|
| [`help`](#app-store-toolkithelp) | Answer questions, state-aware "what's next" recommendations, docs-grounded answers | v0.4.1 |
| [`setup`](#app-store-toolkitsetup) | Configure bundle ID, credentials, voice/tone, locales, LFS | M1 |
| [`status`](#app-store-toolkitstatus) | Show sync drift between local and ASC | M1 |
| [`validate`](#app-store-toolkitvalidate) | Validate metadata against character limits and asset dimensions | M1 |
| [`aso`](#app-store-toolkitaso) | Generate ASO-optimized metadata (name, subtitle, keywords, description, promo) | M1 |
| [`changelog`](#app-store-toolkitchangelog) | Generate release notes from git history or manual input | M1 |
| [`iap`](#app-store-toolkitiap) | Generate in-app purchase display names and descriptions | M1 |
| [`localize`](#app-store-toolkitlocalize) | Translate metadata to configured locales | M1 |
| [`privacy`](#app-store-toolkitprivacy) | Analyze code to generate App Privacy nutrition labels | M1 |
| [`score`](#app-store-toolkitscore) | ASO quality score (0–100) with improvement suggestions | M1 |
| [`competitors`](#app-store-toolkitcompetitors) | Analyze competitor App Store listings for ASO insights | M1 |
| [`push`](#app-store-toolkitpush) | Sync local metadata, listing config, privacy, review, URLs, assets to ASC | M1 |
| [`pull`](#app-store-toolkitpull) | Fetch metadata, listing config, privacy, review, URLs, assets from ASC | M1 |
| [`list`](#app-store-toolkitlist) | List metadata, descriptions, changelogs, IAPs, locales, or history | M1 |
| [`reviews`](#app-store-toolkitreviews) | View customer reviews and draft/post developer responses | M1 |
| [`audit`](#app-store-toolkitaudit) | 7-phase submission readiness check (char limits, assets, voice, App Review phrases, cross-surface) | M1 |
| [`submit`](#app-store-toolkitsubmit) | Build-attach-and-submit pipeline (pick TestFlight build, dry-run, submit) | M1 |
| [`ship`](#app-store-toolkitship) | Full submission orchestrator (audit → push → build → submit with checkpointing) | M1 |
| [`render-screenshots`](#app-store-toolkitrender-screenshots) | Render screenshots from HTML templates using Puppeteer | M1 |

---

## Help & Discovery

### `/app-store-toolkit:help`

Answer free-form questions about the plugin and get state-aware "what's next" recommendations. Reads `.appstore/` state and relevant doc pages to give personalized guidance.

**Command syntax:**
```
/app-store-toolkit:help [question]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `question` | No | Free-form question. If omitted, the skill gives a state-aware "what's next" recommendation. |

**What it does:**

When called with no arguments, analyzes your local `.appstore/` state and recommends the concrete next command (e.g., "run `/app-store-toolkit:aso`" if you haven't generated metadata yet). When called with a question, reads the relevant doc page and gives a 3-6 sentence answer grounded in the documentation. Routes your question to the appropriate doc page based on topic keywords (setup, architecture, commands, workflows, etc.).

**Typical workflow:**

- Right after install — `/app-store-toolkit:help` confirms the first step
- Mid-flow — `/app-store-toolkit:help what's next` for the concrete next command
- Anytime — `/app-store-toolkit:help how do screenshots work` for a docs-grounded answer

**Side effects:**

Read-only. Reads `.appstore/` state and `docs/` files, then responds. Does not modify any files or make API calls.

**Related:**

- The [SessionStart hook](../concepts/architecture.md) also prints a one-line `→ Next: ...` recommendation at the start of every session (zero-effort discovery)
- [Documentation index](../README.md)

---

## Setup & Config

### `/app-store-toolkit:setup`

Configure app-store-toolkit for a new app: bundle ID detection, API credentials, voice/tone, locales, and optional Git LFS for assets.

**Command syntax:**
```
/app-store-toolkit:setup [bundle_id]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `bundle_id` | No | Bypass autodetection; specify bundle ID directly (e.g., `com.company.app`) |

**What it does:**

This is a multi-turn wizard that guides you through initial configuration. It detects your app's bundle ID and platforms from Xcode project files, walks you through voice/tone selection, collects locales you want to support, and sets up App Store Connect API credentials if you have them. Optionally configures Git LFS for storing screenshots and previews in git. Seeds three new files (`.appstore/listing.json`, `privacy.json`, `review.json`) with safe defaults so you can fill in details as you go.

**Typical workflow:**

First-time setup for a new app. Run once, then use `/app-store-toolkit:aso` to generate metadata, `/app-store-toolkit:push` to sync to ASC.

**Side effects:**

- Creates/updates `.appstore/config.json` (committed)
- Creates/updates `.appstore/config.local.json` (gitignored, contains credentials)
- Writes `.appstore/listing.json`, `privacy.json`, `review.json` if seeding new
- Runs `git lfs install` and updates `.gitattributes` if LFS is chosen
- Writes `.appstore/.gitignore` to protect credentials

**Related:**

See [Getting Started](../getting-started.md), [Architecture](../concepts/architecture.md)

---

### `/app-store-toolkit:status`

Show sync drift between local and App Store Connect across metadata, listing config, privacy, and review info.

**Command syntax:**
```
/app-store-toolkit:status [locale] [platform]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `locale` | No | Specific locale to check; checks all if omitted |
| `platform` | No | Specific platform to check; checks all if omitted |

**What it does:**

Compares your local metadata (in `.appstore/`) with what's currently live on App Store Connect. Reports which fields are in sync, which are locally newer, which are remotely newer, and which are in conflict. Also checks listing config (categories, age rating, pricing, availability, encryption), App Privacy responses, App Review info, and per-locale URLs. Counts unchanged vs. modified assets if present.

**Typical workflow:**

Run after `/app-store-toolkit:pull` or `/app-store-toolkit:push` to verify sync state. Helpful before committing changes or when deciding whether to push.

**Side effects:**

Read-only. Makes API calls to fetch remote state; does not modify anything.

**Related:**

[`push`](#app-store-toolkitpush), [`pull`](#app-store-toolkitpull), [Workflows: Sync Workflows](../reference/commands.md)

---

### `/app-store-toolkit:validate`

Validate all metadata against Apple's character limits and asset dimensions.

**Command syntax:**
```
/app-store-toolkit:validate [locale] [platform]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `locale` | No | Locale to validate; validates all if omitted |
| `platform` | No | Platform to validate; validates all if omitted |

**What it does:**

Checks every metadata field (name, subtitle, keywords, description, promotional text, release notes, IAP fields) against Apple's character limits. Also validates asset dimensions for screenshots and previews if present. Reports PASS/FAIL for each field with exact char counts. Suggests fixes for minor overages or recommends regenerating with `/app-store-toolkit:aso`.

**Character limits reference:**

| Field | Limit |
|-------|-------|
| App Name | 30 |
| Subtitle | 30 |
| Keywords | 100 |
| Promotional Text | 170 |
| Description | 4000 |
| What's New | 4000 |
| IAP Display Name | 30 |
| IAP Description | 45 |

**Typical workflow:**

Run before every `/app-store-toolkit:push` to catch limit violations early. Also useful after `/app-store-toolkit:aso` to verify generation stayed within bounds.

**Side effects:**

Read-only. Validates files in `.appstore/` and asset directory; does not modify anything.

**Related:**

[`aso`](#app-store-toolkitaso), [`push`](#app-store-toolkitpush), [Concept: Character Limits](../reference/character-limits.md)

---

## Content Creation

### `/app-store-toolkit:aso`

Generate ASO-optimized App Store metadata (name, subtitle, keywords, description, promotional text) using your app's voice/tone and contextual information.

**Command syntax:**
```
/app-store-toolkit:aso [fields] [instructions]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `fields` | No | Specific fields to generate (e.g., `name subtitle` or `description`); generates all if omitted |
| `instructions` | No | Additional instructions for content generation (e.g., `"emphasize privacy features"`) |

**What it does:**

Intelligently generates ASO-optimized metadata for your app using your configured voice/tone. Reads your project's CLAUDE.md and README.md for context, applies your voice/tone, and respects all character limits. Generates content that balances keyword optimization with readability and brand fit. After generation, shows you each field for review; you can approve all, approve some, request changes, or edit manually.

**Typical workflow:**

After `/app-store-toolkit:setup`. Also run when features change or to refresh ASO strategy. Follow with `/app-store-toolkit:localize` to translate to other locales.

**Side effects:**

- Reads `.appstore/config.json` and metadata files
- Writes new iteration to `.appstore/metadata/{locale}/...` for each approved field
- Appends iteration source `ai_generated` with context notes

**Related:**

[`localize`](#app-store-toolkitlocalize), [`validate`](#app-store-toolkitvalidate), [ASO Copywriter Agent](../../agents/aso-copywriter.md), [Workflows: Content Creation](../reference/commands.md)

---

### `/app-store-toolkit:changelog`

Generate release notes (What's New) from git commit history or manual input.

**Command syntax:**
```
/app-store-toolkit:changelog [range] [instructions]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `range` | No | Git version range (e.g., `v1.0..v2.0`) or version number for manual entry |
| `instructions` | No | Additional instructions for release notes style (e.g., `"focus on user-facing changes"`) |

**What it does:**

Intelligently summarizes app changes into user-friendly release notes. If you provide a git range, it parses commits (including conventional commit prefixes if configured), categorizes them (Features, Fixes, Performance), and writes engaging copy. If you specify a version number, it prompts you to describe changes manually. Respects your configured voice/tone and the 4000-char limit. Asks for approval before saving.

**Typical workflow:**

Run before each release to generate What's New text. Feed the git range of commits since the last version (e.g., `v1.0..HEAD`), review the output, and approve.

**Side effects:**

- Reads git log (if range-based) or accepts manual input
- Writes new iteration to `.appstore/metadata/{locale}/.../release_notes` for each platform
- Appends iteration source `ai_generated` with git range or manual context

**Related:**

[`localize`](#app-store-toolkitlocalize), [`push`](#app-store-toolkitpush), [Workflows: Release](../workflows/shipping-a-release.md)

---

### `/app-store-toolkit:iap`

Generate or manage in-app purchase display names and descriptions.

**Command syntax:**
```
/app-store-toolkit:iap [product_id] [instructions]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `product_id` | No | IAP product ID to generate for; lists all IAPs if omitted |
| `instructions` | No | Additional instructions for IAP copy (e.g., `"emphasize unlimited access"`) |

**What it does:**

Generates or improves copy for in-app purchases. If you specify a product ID, it generates a Display Name (max 30 chars) and Description (max 45 chars) for that IAP. If you don't specify, it lists all existing IAPs and prompts you to pick one or create a new entry. Uses your configured voice/tone and project context to craft compelling copy that fits the tight character limits.

**Typical workflow:**

After creating new IAPs in App Store Connect, or when refining existing IAP messaging. Follow with `/app-store-toolkit:localize` to translate to other locales.

**Side effects:**

- Reads existing IAP metadata from `.appstore/`
- Writes new iterations for `iap_display_name` and `iap_description` fields
- Appends iteration source `ai_generated` with context

**Related:**

[`localize`](#app-store-toolkitlocalize), [`list`](#app-store-toolkitlist), [Workflows: Monetization](../reference/commands.md)

---

### `/app-store-toolkit:localize`

Translate metadata to configured locales using culturally-aware transcreation (not literal translation).

**Command syntax:**
```
/app-store-toolkit:localize [locale] [field]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `locale` | No | Specific target locale (e.g., `ja` or `de-DE`); localizes all configured locales if omitted |
| `field` | No | Specific field to localize (e.g., `description`); localizes all fields if omitted |

**What it does:**

Transcreates (culturally adapts, not literally translates) your metadata to all configured locales. Uses the primary locale's content as source material and adapts for each target language's voice, keywords, and cultural context. For keywords, researches locale-specific terms rather than translating. Validates all locales against character limits. Asks for approval per locale before saving.

**Typical workflow:**

After generating or updating metadata in the primary locale (usually en-US). Run once to localize to all configured locales, or target specific locales/fields for incremental updates.

**Side effects:**

- Reads primary locale metadata from `.appstore/`
- Writes new iterations for each target locale and field
- Appends iteration source `translated` with source locale context

**Related:**

[`aso`](#app-store-toolkitaso), [`changelog`](#app-store-toolkitchangelog), [Localization Specialist Agent](../../agents/localizer.md), [Workflows: Localization](../concepts/locales.md)

---

### `/app-store-toolkit:privacy`

Analyze source code to detect data collection and generate App Privacy nutrition labels.

**Command syntax:**
```
/app-store-toolkit:privacy [path]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `path` | No | Path to source code directory to analyze (defaults to project root) |

**What it does:**

Scans your source code for patterns indicating data collection: SDKs (Firebase, Sentry, Facebook), framework usage (CoreLocation, HealthKit, Contacts), permission strings, and API calls. Categorizes findings into Apple's privacy categories (Contact Info, Location, Identifiers, Usage Data, Diagnostics, etc.). Reports findings as a punch list with high-confidence detections, likely purposes, and whether data is linked to identity. Includes a strong disclaimer that findings are automated and must be manually verified before submission.

**Typical workflow:**

Run early in development or before submission to understand your app's privacy footprint. Review the findings, discuss with your team, then manually fill in `.appstore/privacy.json` with your actual data practices (or use this output to inform that file).

**Side effects:**

Read-only analysis. Does not modify files or make API calls.

**Related:**

[`.appstore/privacy.json`](../concepts/architecture.md#data-model), [Apple's App Privacy Guide](https://developer.apple.com/app-privacy-description/), [Workflows: Privacy](../reference/commands.md#app-store-toolkitprivacy)

---

### `/app-store-toolkit:score`

Get an ASO quality score (0–100) with actionable improvement suggestions.

**Command syntax:**
```
/app-store-toolkit:score [locale]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `locale` | No | Locale to score (defaults to primary) |

**What it does:**

Scores your metadata across five dimensions: Keyword Optimization (25 pts), Name & Subtitle Quality (20 pts), Description Quality (25 pts), Completeness (15 pts), and Localization Coverage (15 pts). Reports your total score and breaks down performance per dimension. Provides specific, actionable improvements ranked by potential impact.

**Typical workflow:**

Run after generating initial metadata to understand gaps, then run again after addressing recommendations to track improvement.

**Side effects:**

Read-only. Reads metadata from `.appstore/` and config; does not modify anything.

**Related:**

[`aso`](#app-store-toolkitaso), [`competitors`](#app-store-toolkitcompetitors), [ASO Concepts](../reference/commands.md#app-store-toolkitaso)

---

### `/app-store-toolkit:competitors`

Analyze competitor App Store listings to identify keyword gaps and ASO opportunities.

**Command syntax:**
```
/app-store-toolkit:competitors <query>
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `query` | Yes | Search term or competitor app name to analyze (e.g., `"productivity timer"` or `"Forest"`) |

**What it does:**

Searches the App Store for competitors matching your query and analyzes their listings. Extracts app names, subtitles, and inferred keywords from descriptions. Compares competitors' keyword strategies with your own metadata (if configured locally). Reports gaps (keywords competitors use that you don't), unique angles, and rating/review counts. Provides actionable recommendations for keyword additions or positioning adjustments.

**Typical workflow:**

Run during ASO strategy planning to understand the competitive landscape. Use insights to inform `/app-store-toolkit:aso` regeneration or to adjust your keyword and messaging strategy.

**Side effects:**

Read-only. Makes web searches and reads App Store pages; does not modify local files or ASC.

**Related:**

[`aso`](#app-store-toolkitaso), [`score`](#app-store-toolkitscore), [ASO Concepts](../reference/commands.md#app-store-toolkitaso)

---

## Sync

### `/app-store-toolkit:push`

Sync local metadata, listing config, App Privacy, App Review info, per-locale URLs, and assets to App Store Connect. Every mutation is logged to `.appstore/history/pushes.jsonl`.

**Command syntax:**
```
/app-store-toolkit:push [locale] [field] [force]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `locale` | No | Specific locale to push; pushes all changed locales if omitted |
| `field` | No | Specific field to push; pushes all changed fields if omitted |
| `force` | No | Skip diff preview and push immediately |

**What it does:**

Validates all local metadata against character limits, computes the delta between local and remote, previews changes (unless `force` is set), and asks for confirmation. Pushes app-level fields (name, subtitle) via `asc_update_app_info`, version-level fields (description, keywords, promo, what's new) via `asc_update_version_localization`, and IAP fields via `asc_update_iap_localization`. Also pushes listing config (categories, age rating, pricing, availability, encryption), App Privacy responses, App Review info, and per-locale URL fields. If assets exist, uploads changed screenshots and previews in parallel. Every mutation is appended to the audit log.

**Typical workflow:**

After generating or editing metadata locally, after every change you want live. Run `/app-store-toolkit:validate` first to catch limit violations. Follow with `/app-store-toolkit:status` to confirm remote state matches.

**Side effects:**

- Reads `.appstore/` metadata, listing, privacy, review, assets
- **Modifies live App Store Connect data** (this is irreversible without re-submitting)
- Appends every change to `.appstore/history/pushes.jsonl` with timestamp, tool call, and result
- Uploads assets (screenshots, previews) if present

**Related:**

[`pull`](#app-store-toolkitpull), [`validate`](#app-store-toolkitvalidate), [`status`](#app-store-toolkitstatus), [Workflows: Sync Workflows](../reference/commands.md)

---

### `/app-store-toolkit:pull`

Fetch metadata, listing config, App Privacy, App Review info, per-locale URLs, and asset manifest from App Store Connect into the local store.

**Command syntax:**
```
/app-store-toolkit:pull [locale] [platform] [with-bytes]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `locale` | No | Specific locale to pull; pulls all configured locales if omitted |
| `platform` | No | Specific platform to pull; pulls all configured platforms if omitted |
| `with-bytes` | No | Download actual screenshot/preview image bytes to disk (large download, optional) |

**What it does:**

Fetches everything from App Store Connect: app-level fields (name, subtitle) per locale, version-level fields (description, keywords, promo, what's new) per locale and platform, IAP metadata, listing config (categories, age rating, pricing, availability, encryption), App Privacy responses, App Review info, and per-locale URL fields. Asset manifest (screenshots and previews) is always pulled; actual image/video bytes are optional (use `--with-bytes` to download). All pulled data is saved to `.appstore/` with source `pulled_from_asc`, creating a local copy you can then edit.

**Typical workflow:**

First time setting up a new app: run `/app-store-toolkit:setup`, then immediately run `/app-store-toolkit:pull` to fetch your existing ASC data into local store. Also run periodically to sync remote changes (e.g., after another team member pushes changes).

**Side effects:**

- Fetches data from App Store Connect API
- Writes metadata iterations to `.appstore/metadata/{locale}/...`
- Writes listing, privacy, review files to `.appstore/`
- Writes asset manifest to `.appstore/assets.lock.json` (or downloads actual bytes if `--with-bytes`)
- Does **not** overwrite local edits; instead marks pulled data as a new iteration source

**Related:**

[`push`](#app-store-toolkitpush), [`status`](#app-store-toolkitstatus), [Workflows: Sync Workflows](../reference/commands.md)

---

## Inspection

### `/app-store-toolkit:list`

List metadata, descriptions, changelogs, IAPs, locales, assets, or push/audit/submission history from the local store.

**Command syntax:**
```
/app-store-toolkit:list <type> [locale] [platform] [field]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `type` | No | What to list: `metadata`, `description`, `changelog`, `iap`, `locales`, `assets`, `history`, `listing`, `privacy`, `review` (defaults to `metadata`) |
| `locale` | No | Locale to list (defaults to primary) |
| `platform` | No | Platform to list (defaults to first configured) |
| `field` | No | Field name for `history` (e.g., `description`) |

**What it does:**

Displays various views into your local metadata store. `metadata` shows all fields for a locale with content preview and char counts. `description` shows full description text. `changelog` lists release note versions. `iap` lists in-app purchases with display names and descriptions. `locales` shows which locales have complete metadata. `assets` shows screenshot and preview counts per locale and device. `history <field>` shows the full iteration history for a field (every version, source, timestamp). `listing`, `privacy`, `review` show the raw config files.

**Typical workflow:**

Run anytime to inspect local state. Useful for previewing before push, checking completion status, or reviewing iteration history to understand what changed and why.

**Side effects:**

Read-only. Displays data from `.appstore/`; does not modify anything.

**Related:**

[`status`](#app-store-toolkitstatus), [Local Store](../concepts/architecture.md#data-model)

---

### `/app-store-toolkit:reviews`

View customer reviews from App Store Connect and draft/post developer responses.

**Command syntax:**
```
/app-store-toolkit:reviews [action] [sort] [limit]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `action` | No | Action to perform: `list` (default), `respond`, or `analyze` |
| `sort` | No | Sort order: `newest`, `oldest`, `highest`, `lowest` |
| `limit` | No | Number of reviews to fetch (default 20) |

**What it does:**

Fetches customer reviews from App Store Connect. `list` displays reviews sorted by your preference with star ratings and timestamps. `respond` picks a review and drafts a response following your configured voice/tone, then posts it with your approval. `analyze` summarizes feedback across recent reviews: rating distribution, common praise, common complaints, sentiment trends, and actionable suggestions for the product roadmap.

**Typical workflow:**

Run regularly to stay on top of user feedback. `list` for quick browsing, `analyze` for insights that inform `/app-store-toolkit:aso` or `/app-store-toolkit:changelog` decisions, `respond` to engage with users, especially to address bugs or acknowledge feature requests.

**Side effects:**

- Fetches reviews from App Store Connect API (read-only unless `respond` action)
- If `respond`: posts developer response to ASC under your app (visible to users)
- Does not write to local store

**Related:**

[Workflows: Community](../reference/commands.md#app-store-toolkitreviews)

---

## Submission Flow

### `/app-store-toolkit:audit`

Single-pass App Store submission readiness check across seven phases: locale parity, character limits, required fields, asset dimensions, voice drift, App Review phrase risk, and cross-surface consistency. Output is a ranked punch list (BLOCKERS first) plus a JSON log entry in `.appstore/history/audits.jsonl`.

**Command syntax:**
```
/app-store-toolkit:audit [locale]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `locale` | No | Specific locale to audit; audits all configured locales if omitted |

**What it does:**

Runs a comprehensive pre-submission checklist:

1. **Locale Parity** — All required fields present in all locales
2. **Char Limits** — No field exceeds Apple's limits
3. **Required Fields** — Categories, privacy declaration, review contact info set
4. **Asset Dimensions** — Screenshots match expected resolutions per device
5. **Voice Drift** — Description/promo/release notes match configured voice/tone
6. **App Review Phrase Risk** — Scans for problematic phrases (e.g., "diagnose", "guarantee") that may trigger App Review concerns
7. **Cross-Surface Consistency** — Screenshots and copy align visually and textually

Returns a punch list ranked by severity (BLOCKERS abort submission, QUALITY warnings are worth fixing). Saves audit results to `.appstore/history/audits.jsonl` for tracking.

**Typical workflow:**

Run right before `/app-store-toolkit:submit` or `/app-store-toolkit:ship`. If blockers appear, fix them or use `--waive` to override (with documented reason). QUALITY issues are optional but improve submission chances.

**Side effects:**

- Reads metadata, listing, privacy, review, and assets from `.appstore/`
- Reads screenshots via vision if cross-surface check runs
- Appends one JSON line to `.appstore/history/audits.jsonl`
- Does not modify ASC

**Related:**

[`ship`](#app-store-toolkitship), [`submit`](#app-store-toolkitsubmit), [Workflows: Submission](../workflows/first-submission.md)

---

### `/app-store-toolkit:submit`

Build-attach-and-submit pipeline: picks a TestFlight build, confirms encryption compliance, release strategy, and review info, runs a dry-run validation, and submits the version to App Review.

**Command syntax:**
```
/app-store-toolkit:submit [new-version] [copy-from] [release-strategy] [wait]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `new-version` | No | Create a new version first (e.g., `1.1.0`) |
| `copy-from` | No | When creating a new version, copy metadata from this version string |
| `release-strategy` | No | Override release strategy: `AFTER_APPROVAL`, `MANUAL`, `SCHEDULED`, or `PHASED` |
| `wait` | No | Poll submission state every 30 seconds until terminal (useful for CI/CD) |

**What it does:**

Manages the final submission steps. Optionally creates a new version (or uses your current one). Lists valid TestFlight builds and asks you to pick one to attach. Confirms encryption compliance from `listing.json` (or asks you). Sets release strategy (typically `AFTER_APPROVAL` — release immediately after approval). Confirms App Review contact info from `review.json`. Runs a dry-run to catch any remaining issues, then on your confirmation, posts the real submission. Optionally polls the submission state until it reaches a terminal state (useful for automation). Logs submission to `.appstore/history/submissions.jsonl`.

**Typical workflow:**

Run after all content is pushed and audit passes. Pick a build, confirm encryption and review info, watch the dry-run, then approve the real submission. If automating, use `--wait` to block until submission is processed.

**Side effects:**

- Lists and attaches TestFlight build to App Store Connect version
- **Submits the version to App Review** (irreversible without re-submitting)
- Reads `listing.json` and `review.json` from `.appstore/`
- Appends submission record to `.appstore/history/submissions.jsonl`

**Related:**

[`ship`](#app-store-toolkitship), [`audit`](#app-store-toolkitaudit), [Workflows: Submission](../workflows/first-submission.md)

---

### `/app-store-toolkit:ship`

Full submission orchestrator: runs audit → pushes metadata/listing/privacy/review/assets → attaches build → submits. Checkpoints state in `.appstore/ship-state.json` so failures resume mid-flight. Audit blockers abort unless waived with `--waive <check>:<target> --reason "..."`.

**Command syntax:**
```
/app-store-toolkit:ship [waive] [reason] [release-strategy]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `waive` | No | Waive a specific audit blocker: `--waive <check>:<target>`. Repeatable (e.g., `--waive char-limit:keywords --waive phrase-risk:description`) |
| `reason` | No | Reason for waivers (required when `--waive` is used; recorded in audit log) |
| `release-strategy` | No | Release strategy: `AFTER_APPROVAL`, `MANUAL`, `SCHEDULED`, or `PHASED` |

**What it does:**

Runs eight sequential phases, checkpointing after each:

1. **Audit** — Full readiness check; aborts if unwaived blockers exist
2. **Push Metadata** — Syncs name, subtitle, keywords, description, promo, release notes
3. **Push Listing** — Syncs categories, age rating, pricing, availability, encryption
4. **Push Privacy** — Syncs App Privacy responses
5. **Push Review** — Syncs App Review contact info and demo account
6. **Push Assets** — Uploads screenshots and previews
7. **Attach Build** — Lists and attaches TestFlight build
8. **Submit** — Dry-runs and submits to App Review

If any phase fails, state is preserved in `.appstore/ship-state.json`. Re-run `/ship` to resume at the same phase. On success, state is cleared and submission is logged to `.appstore/history/submissions.jsonl`.

**Typical workflow:**

This is your main release command. Run once with metadata ready (via `/app-store-toolkit:aso`, `/app-store-toolkit:localize`, etc.). `/ship` handles everything: validation, syncing, build attachment, and submission in one go. If interrupted, simply re-run to resume.

**Side effects:**

- Reads all config, metadata, listing, privacy, review, assets from `.appstore/`
- **Modifies live App Store Connect** (pushes metadata, privacy, review, assets)
- **Submits version to App Review** (terminal action)
- Checkpoints progress to `.appstore/ship-state.json` (gitignored)
- Logs all submissions to `.appstore/history/submissions.jsonl`

**Related:**

[`audit`](#app-store-toolkitaudit), [`submit`](#app-store-toolkitsubmit), [`push`](#app-store-toolkitpush), [Workflows: Submission](../workflows/first-submission.md)

---

## Assets

### `/app-store-toolkit:render-screenshots`

Render screenshots from HTML templates in `.appstore/templates/` using bundled Puppeteer (installs Chromium ~280 MB on first call).

**Command syntax:**
```
/app-store-toolkit:render-screenshots [locale] [device]
```

**Arguments:**

| Name | Required | Description |
|------|----------|-------------|
| `locale` | No | Specific locale to render (renders all configured locales if omitted) |
| `device` | No | Specific device to render (renders all configured devices if omitted) |

**What it does:**

Renders template-based screenshots using Puppeteer. Looks for `.appstore/templates/screenshot-{device}.html` files, renders them at the correct resolution for each device (e.g., iPhone 6.7", iPad Pro 12.9"), and writes PNGs to `.appstore/assets/{platform}/{locale}/{device}/screenshots/`. On first use, downloads and caches Chromium (~280 MB). Useful if you have a design system or template-driven screenshot pipeline instead of manually crafted images.

**Typical workflow:**

Optional. If you use templated screenshots, run after updating your templates or marketing copy. Follow with `/app-store-toolkit:validate` to confirm dimensions, then `/app-store-toolkit:push --assets` to upload.

**Side effects:**

- Downloads Chromium (~280 MB) on first call, cached thereafter
- Reads HTML templates from `.appstore/templates/`
- Writes PNG screenshots to `.appstore/assets/{platform}/{locale}/{device}/screenshots/`
- Does not modify ASC

**Related:**

[`validate`](#app-store-toolkitvalidate), [`push`](#app-store-toolkitpush), [Assets Guide](../workflows/assets-pipeline.md)

---

## Command Categories Summary

### By Phase

**Setup & Configuration:**
- [`setup`](#app-store-toolkitsetup) — Initial configuration
- [`status`](#app-store-toolkitstatus) — Monitor sync state

**Content Development:**
- [`aso`](#app-store-toolkitaso) — Generate metadata
- [`changelog`](#app-store-toolkitchangelog) — Generate release notes
- [`iap`](#app-store-toolkitiap) — Generate IAP copy
- [`localize`](#app-store-toolkitlocalize) — Translate to locales
- [`privacy`](#app-store-toolkitprivacy) — Analyze privacy practices
- [`score`](#app-store-toolkitscore) — Grade ASO quality
- [`competitors`](#app-store-toolkitcompetitors) — Benchmark competitors

**Validation & Inspection:**
- [`validate`](#app-store-toolkitvalidate) — Check limits and dimensions
- [`list`](#app-store-toolkitlist) — Browse local metadata
- [`reviews`](#app-store-toolkitreviews) — Read and respond to feedback

**Synchronization:**
- [`pull`](#app-store-toolkitpull) — Fetch from ASC
- [`push`](#app-store-toolkitpush) — Sync to ASC
- [`status`](#app-store-toolkitstatus) — Monitor drift

**Submission:**
- [`audit`](#app-store-toolkitaudit) — Pre-submission checklist
- [`submit`](#app-store-toolkitsubmit) — Attach build and submit
- [`ship`](#app-store-toolkitship) — Full end-to-end submission

**Assets:**
- [`render-screenshots`](#app-store-toolkitrender-screenshots) — Generate from templates

### By Frequency

**Every Release:**
`changelog`, `validate`, `audit`, `ship`

**Regularly:**
`status`, `list`, `reviews`, `score`

**Once Per App:**
`setup`, `pull`

**Periodic:**
`aso`, `localize`, `privacy`, `competitors`

**Optional:**
`render-screenshots`, `iap`

---

## Tips

- **Run `/app-store-toolkit:validate` before every `/app-store-toolkit:push`** — catch limit violations early.
- **Use `/app-store-toolkit:status` to understand sync state** — know what's local vs. remote before deciding your next step.
- **Use `/app-store-toolkit:audit` before submitting** — catch blockers 7 phases before ASC rejects you.
- **Use `/app-store-toolkit:ship` for releases** — orchestrates everything (push, build, submit) in one command with checkpointing.
- **Check `/app-store-toolkit:reviews` regularly** — user feedback informs better metadata and features.
- **Run `/app-store-toolkit:localize` after every ASO update** — keep all locales in sync.

---

## See Also

- [Getting Started](../getting-started.md)
- [Architecture & Data Model](../concepts/architecture.md)
- [Workflows](../workflows/)
- [MCP Tools Reference](mcp-tools.md)
