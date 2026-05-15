# Architecture

The app-store-toolkit is a Claude Code plugin with a clean three-layer architecture, plus specialized agents and hooks that automate workflows and validation.

## Three-layer architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Skills: Conversational workflows, user-facing slash commands │
│ (/aso, /push, /audit, /ship, /localize, etc.)               │
└────────────────────┬────────────────────────────────────────┘
                     │ (invoke)
┌────────────────────▼────────────────────────────────────────┐
│ MCP Server: Typed tools for App Store Connect API & local   │
│ store operations (51 tools: asc_*, store_*, audit_*, assets_*) │
└────────────────────┬────────────────────────────────────────┘
                     │ (read/write)
┌────────────────────▼────────────────────────────────────────┐
│ Local Store: JSON files in .appstore/, committed to git     │
│ (source of truth for listing state and audit trail)        │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1: Skills

**Location:** `skills/*/SKILL.md`

Skills are the user-facing interface. Each skill is a markdown file with frontmatter, a `/slash-command-name`, and prose instructions to Claude Code. When a user invokes `/app-store-toolkit:aso`, the skill is loaded, its instructions are sent to Claude, and Claude uses the MCP tools to accomplish the task.

Skills are conversational and leverage Claude's reasoning, multimodal capabilities (reading images), and the ability to ask clarifying questions. A skill doesn't expose all details of the MCP API; it orchestrates a focused workflow.

**Examples:**
- `/app-store-toolkit:aso` — generate ASO-optimized metadata for one locale
- `/app-store-toolkit:audit` — run a 7-phase submission readiness check
- `/app-store-toolkit:ship` — orchestrate the entire submission pipeline with checkpointing and resume

### Layer 2: MCP Server

**Location:** `servers/appstore-connect/src/`

The MCP (Model Context Protocol) server is a TypeScript/Node.js server that exposes 51 typed tools. Tools fall into four categories:

| Category | Count | Purpose | Tools |
|----------|-------|---------|-------|
| `asc_*` | 29 | App Store Connect API wrappers | get/list/update/set operations for version localizations, app info, pricing, age rating, privacy, review info, encryption, builds, release strategy, screenshots, app previews, submission |
| `store_*` | 18 | Local store helpers | read/write/validate operations for config, metadata, listing, privacy, review, assets |
| `audit_*` | 1 | Audit prompt preparation | prepare cross-surface vision check prompt + screenshots |
| `assets_*` | 3 | Asset validation & rendering | validate image/video dimensions, render templates via Puppeteer |

Tools are deterministic, type-safe, and testable. They expose data and primitive operations, not workflows. Most workflow intelligence lives in the skills layer, where Claude's reasoning applies.

**MCP tools are best-effort historians:** every successful `asc_*` or `store_*` mutator (tool that changes state) appends to `.appstore/history/pushes.jsonl` automatically. Failures writing to the history log never invert API success — the history write is best-effort and failures are logged separately.

### Layer 3: Local Store

**Location:** `.appstore/` in the user's project repo

The local store is the single source of truth for all listing state. It lives in the user's repository and is committed to git (except for credentials and transient state). This enables:

1. **Diff-reviewability** — a teammate can review the git diff before an App Store change ships
2. **Auditability** — `git log -p .appstore/` answers "when did we change this?" without touching App Store Connect
3. **Reversibility** — `git revert` rolls back a listing; ASC is the deploy target, not the source of truth

**Committed files (always in git):**
- `config.json` — bundle ID, platforms, locales, voice settings
- `listing.json` — categories, age rating, pricing, territories, encryption defaults
- `privacy.json` — App Privacy questionnaire responses
- `review.json` — App Review contact, demo credentials, notes
- `metadata/{locale}/...` — per-locale copy (description, keywords, promo, what's new, URLs)
- `metadata/{locale}/{platform}/screenshots.json` — headlines for renderer templates (optional)
- `assets/{platform}/{locale}/{device}/...` — screenshots (PNG) and app previews (MP4)
- `history/pushes.jsonl` — append-only log of every mutation (timestamp, tool, payload, result)
- `history/submissions.jsonl` — append-only log of submission attempts and build attachments

**Gitignored files:**
- `config.local.json` — App Store Connect API credentials (key_id, issuer_id, p8_key_path) — **never commit**
- `ship-state.json` — transient checkpoint for `/ship` resume; cleared on success

See [local-store.md](local-store.md) for the complete schema and [history-and-audit.md](history-and-audit.md) for how the audit trail works.

## Why this split?

**Skills (conversational, inside Claude Code)** handle workflows that benefit from reasoning, follow-up questions, and multimodal context. They orchestrate MCP tools but are not themselves API wrappers. Example: the `/audit` skill loads all listing state via MCP tools, then asks Claude to read screenshots and identify visual inconsistencies — something the server layer can't do well.

**MCP tools (typed, testable, in TypeScript)** wrap App Store Connect endpoints and local store operations. They are data-in, data-out, with no side effects beyond the immediate mutation. This makes tools cacheable, composable, and testable in isolation. When a skill needs to "get the app's current description," it calls `store_read_metadata` or `asc_get_version_localizations`, not a skill-specific function.

**Local store (JSON, git-tracked)** decouples the user's repo from the plugin's evolution. If the next version of the toolkit changes how metadata is stored internally, the user's `.appstore/` directory is still the source of truth. Diffs are human-readable. History is queryable via `git log`. The plugin becomes a smart client to the local store, not the store's owner.

## The git-tracking pillar

Every piece of listing state—copy, asset decisions, configuration, audit log—lives in `.appstore/` and is committed to git. Two exceptions:

1. **Credentials** (`config.local.json`) — API keys and secret auth material are gitignored and never appear in diffs.
2. **Transient state** (`ship-state.json`) — the `/ship` skill's checkpoint file is gitignored because it changes every run and isn't part of the listing itself.

This design choice has three consequences:

1. **Diff-reviewability**: A PR showing the git diff of listing changes is a complete audit trail. Teammates can review before shipping.

   ```bash
   git diff main...feature-branch -- .appstore/
   # Shows: name change in en-US, new Japanese description, age rating bump, etc.
   ```

2. **Auditability**: Questions like "when did we switch the German promo text?" are answered by git, not by logging into App Store Connect:

   ```bash
   git log -p .appstore/metadata/de-DE/ | grep promo
   ```

3. **Reversibility**: A bad metadata change is rolled back with `git revert`, not by manually editing App Store Connect. The local store is always the source of truth; ASC is the deploy target.

## MCP tool categories

All 51 MCP tools follow the Model Context Protocol and are registered in `servers/appstore-connect/src/index.ts`.

### asc_* tools (29 total)

Wrappers over the App Store Connect API. Each tool accepts the request payload, calls the appropriate endpoint, appends to `.appstore/history/pushes.jsonl`, and returns the API response.

**App/version metadata:**
- `asc_get_app`, `asc_get_app_info`, `asc_get_version`, `asc_get_version_localizations`
- `asc_update_app_info`, `asc_update_version_localization`

**Listing configuration (M1):**
- `asc_set_categories` — primary + secondary category
- `asc_set_age_rating` — Apple's age rating questionnaire
- `asc_set_pricing` — price tier per territory
- `asc_set_availability` — list of territories where app is available
- `asc_set_privacy_responses` — App Privacy nutrition labels (taxonomy-validated)
- `asc_set_review_info` — contact, demo credentials, notes for App Review
- `asc_set_encryption_compliance` — per-build encryption declaration

**In-app purchases:**
- `asc_get_iaps`, `asc_get_iap_localizations`, `asc_update_iap_localization`

**Customer reviews:**
- `asc_get_reviews`, `asc_post_review_response`

**Assets (M2):**
- `asc_upload_screenshot`, `asc_upload_app_preview`
- `asc_list_screenshots`, `asc_list_app_previews`
- `asc_delete_screenshot`, `asc_delete_app_preview`

**Builds and submission (M3):**
- `asc_list_builds` — TestFlight builds with processing state
- `asc_attach_build` — bind build to version
- `asc_set_release_strategy` — auto / manual / phased
- `asc_create_version` — create v1.1+ version, optionally copying metadata from previous
- `asc_submit_for_review` — submit for App Review (with dry_run support)
- `asc_get_submission_state` — check submission status

### store_* tools (18 total)

Helpers for reading and writing the local `.appstore/` store. They operate entirely locally and never touch App Store Connect.

**Configuration:**
- `store_read_config`, `store_write_config` — read/write `.appstore/config.json`

**Per-locale metadata:**
- `store_read_metadata`, `store_write_metadata` — read/write field-level content with iteration history (description, keywords, promo, what's new, etc.)

**Listing state (M1):**
- `store_read_listing`, `store_write_listing` — categories, age rating, pricing, territories
- `store_read_privacy`, `store_write_privacy` — privacy questionnaire responses
- `store_read_review`, `store_write_review` — app review information

**Validation:**
- `store_validate` — check character limits and required fields across all locales

**Assets (M2):**
- `store_list` — list metadata, locales, changelog, IAP definitions, history entries
- Implicit asset operations via `asc_upload_*` which update the assets lock

### audit_* tools (1 total)

- `audit_prepare_cross_surface` — prepare a vision-check prompt (description, promo, what's new, keywords, and screenshot paths) for the `/audit` skill to read images and flag inconsistencies

### assets_* tools (3 total)

Local-only operations for asset management. These never touch the API.

- `assets_validate_dimensions` — check PNG/MP4 files in `.appstore/assets/` against Apple's device catalog
- `assets_render_template` — invoke Puppeteer-based renderer (optional; installs on first use)
- No tool for asset hashing yet; part of the M2+ roadmap

## Skill anatomy

Skills are markdown files in `skills/{skill-name}/SKILL.md` with two parts:

1. **Frontmatter** — YAML metadata defining the command
2. **Instructions** — prose that Claude Code interprets and executes

Example structure:

```yaml
---
name: app-store-toolkit:aso
description: Generate ASO-optimized metadata for a locale
arguments:
  - name: locale
    description: "Target locale code (e.g., en-US, de-DE)"
    required: false
user_invocable: true
---

# /app-store-toolkit:aso

[Instructions to the model on how to generate metadata...]

1. Load configuration and existing metadata via store_read_metadata
2. Ask the user for context (app purpose, target keywords)
3. Generate copy using the voice/tone from config
4. Validate character limits via store_validate
5. If exceeded, regenerate with explicit constraints
6. Write to store via store_write_metadata
7. Confirm the result to the user
```

When the user types `/app-store-toolkit:aso ja`, Claude Code:
1. Loads the skill markdown
2. Parses frontmatter (`locale="ja"`)
3. Sends instructions + arguments to Claude as the model's system context
4. Claude uses MCP tools to read/write store, call APIs, validate output
5. Claude's responses are streamed back to the user

See [../reference/commands.md](../reference/commands.md) for all slash commands.

## The vision-audit split

A unique architectural feature of the toolkit is how image analysis works.

The MCP server layer is **not** responsible for analyzing screenshots. Instead:

1. **MCP tool** (`audit_prepare_cross_surface`) prepares a deterministic prompt: "Here are the description, keywords, promo text, and paths to the PNG files. What visual-to-text inconsistencies do you see?"

2. **Skill layer** (in `/audit`) uses Claude Code's native image reading to load the PNG files and passes them to the model along with the prompt.

3. **Claude model** (the host) analyzes the images and returns a JSON array of findings.

This design choice has two benefits:

- **Vision is not server-side**: The MCP server doesn't need vision API access, doesn't need to cache images, and doesn't need to handle multimodal costs. Vision decisions stay with the host model.
- **Prompts are testable**: The prompt prepared by `audit_prepare_cross_surface` is snapshot-testable in TypeScript. Changes to the prompt logic can be reviewed and versioned.

See [../reference/mcp-tools.md](../reference/mcp-tools.md) for tool documentation and [audit/SKILL.md](../../skills/audit/SKILL.md) for the full audit workflow.

## History audit log

Every successful mutation appends to `.appstore/history/pushes.jsonl`. This log is append-only (JSONL format, one JSON object per line) and is committed to git. It answers "what did we tell App Store Connect and when?"

Example entry:

```json
{
  "timestamp": "2026-05-15T18:42:00Z",
  "tool": "asc_update_version_localization",
  "locale": "en-US",
  "platform": "ios",
  "payload": {
    "description": "Track glucose with AI...",
    "keywords": "diabetes,cgm,blood sugar"
  },
  "result": {
    "success": true,
    "asc_response": {
      "data": {
        "id": "...",
        "attributes": { "description": "..." }
      }
    }
  }
}
```

Three important notes on history:

1. **Best-effort writes**: If writing to the history log fails, the API mutation is **not** inverted. History failures are logged separately. This ensures the plugin never silently loses an API change because of a write error.

2. **Per-milestone logs**: The `/submit` and `/audit` skills also append to `history/submissions.jsonl` and `history/audits.jsonl` respectively, with different schemas suited to their needs.

3. **Queryability**: `git log -p .appstore/history/` produces a complete diff-based audit trail that can be reviewed in PR context.

See [history-and-audit.md](history-and-audit.md) for detailed history schemas and examples.

## Three milestones in the architecture's evolution

The toolkit's architecture was designed to ship in three independent, shippable milestones. Each represents a leap in functionality and introduces new tool categories.

### M1: Fill every field

**Shipped:** v0.1.0

Goal: Every required field for a v1.0 iOS submission can be populated via the toolkit.

**New tools:** 15+ MCP tools (`asc_set_categories`, `asc_set_age_rating`, `asc_set_pricing`, `asc_set_availability`, `asc_set_privacy_responses`, `asc_set_review_info`, `asc_set_encryption_compliance`, plus local store helpers).

**New skills:** `/app-store-toolkit:setup` (configure credentials and voice), `/app-store-toolkit:validate` (character limit checking).

**Result:** A user can populate the entire listing in code. Submission still happens in the web UI.

### M2: Handle assets

**Shipped:** v0.2.0

Goal: Screenshots and app preview videos can be managed, validated, and uploaded via the toolkit.

**New tools:** 8 MCP tools (`asc_upload_screenshot`, `asc_upload_app_preview`, `asc_list_screenshots`, etc., plus `assets_validate_dimensions` and `assets_render_template`). New JSON file: `assets.lock` for idempotent re-runs.

**New data:** `.appstore/assets/` directory structure with optional Puppeteer-based screenshot renderer.

**Result:** Assets can be dropped into a directory, validated against Apple's device catalog, and uploaded. A light templating system is available for users without existing asset pipelines.

### M3: Submit end-to-end

**Shipped:** v0.3.0+

Goal: The entire submission pipeline—audit, metadata push, asset upload, build attachment, and review submission—can run in one `/ship` command.

**New tools:** 7 MCP tools (`asc_list_builds`, `asc_attach_build`, `asc_set_release_strategy`, `asc_create_version`, `asc_submit_for_review`, `asc_get_submission_state`).

**New skills:** `/app-store-toolkit:audit` (7-phase readiness check), `/app-store-toolkit:submit` (build attach → submit), `/app-store-toolkit:ship` (orchestrator with checkpointing).

**New data files:** `history/submissions.jsonl`, `history/audits.jsonl`, `ship-state.json` (transient).

**Result:** A developer can run `/ship` once, and the toolkit handles everything: validation, metadata sync, asset upload, build attachment, encryption declaration, and review submission. Failures at any step are resumable via `ship-state.json`.

---

## Cross-references

- **[local-store.md](local-store.md)** — complete `.appstore/` schema and rationale
- **[history-and-audit.md](history-and-audit.md)** — history log design and querying examples
- **[../reference/mcp-tools.md](../reference/mcp-tools.md)** — detailed MCP tool reference
- **[../reference/commands.md](../reference/commands.md)** — skill command documentation
- **[../../CLAUDE.md](../../CLAUDE.md)** — high-level plugin overview and tech stack
