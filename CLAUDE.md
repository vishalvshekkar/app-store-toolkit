# app-store-toolkit — Claude Code Plugin for App Store Connect

## What This Is

app-store-toolkit is a Claude Code plugin that manages App Store Connect metadata with AI. It provides slash commands for ASO-optimized copywriting, changelogs, IAP descriptions, localization, and two-way sync with the App Store Connect API.

**All commands use the `app-store-toolkit` prefix:** `/app-store-toolkit:setup`, `/app-store-toolkit:aso`, `/app-store-toolkit:push`, etc.

## Architecture

- **Skills** (`skills/*/SKILL.md`): Slash commands for user-facing workflows
- **MCP Server** (`servers/appstore-connect/`): TypeScript server providing tools for App Store Connect API and local metadata store
- **Agents** (`agents/`): Specialized agents for ASO copywriting and localization
- **Hooks** (`hooks/`): PostToolUse validation and SessionStart status display
- **Local Store** (`.appstore/`): JSON files tracking metadata with iteration history

## Data Model

### Config Split
- `.appstore/config.json` — committed: bundle_id, platforms, locales, voice settings
- `.appstore/config.local.json` — **gitignored**: key_id, issuer_id, p8_key_path (NEVER commit)

### Metadata Store
All content fields use `FieldWithHistory` — an append-only iteration log with a `latest` pointer:
```
.appstore/metadata/{locale}/app_info.json        — name, subtitle, keywords (app-level, shared across platforms)
.appstore/metadata/{locale}/{platform}/           — description, promotional_text (version-level, per-platform)
.appstore/metadata/{locale}/{platform}/release_notes/{version}.json
.appstore/metadata/{locale}/iap/{product_id}.json
```

### Iteration Sources
- `ai_generated` — created by ASO/changelog/IAP skills
- `user_edited` — manually modified by user
- `pulled_from_asc` — fetched from App Store Connect
- `translated` — created by localization agent

## Voice & Tone System

Configured during `/app-store-toolkit:setup`, stored in `config.json`. Applied to ALL generated content.

**Presets:** Professional, Casual, Playful, Technical, Minimal, Witty, Custom

Custom allows `style_notes` and `target_audience` freeform fields.

## Character Limits (CRITICAL)

| Field              | Limit | Level         |
|--------------------|-------|---------------|
| App Name           | 30    | App-level     |
| Subtitle           | 30    | App-level     |
| Keywords           | 100   | Version-level |
| Promotional Text   | 170   | Version-level |
| Description        | 4000  | Version-level |
| What's New         | 4000  | Version-level |
| IAP Display Name   | 30    | IAP-level     |
| IAP Description    | 45    | IAP-level     |

**Validation rule:** ALWAYS validate after EVERY generation. If limits exceeded, auto-regenerate with explicit char constraint (up to 2 retries). If still exceeded, warn user with exact counts.

## Context Sources for Generation

When generating content, gather context from (priority order):
1. User instructions (highest — whatever the user says in the command)
2. Existing metadata (current listing content)
3. CLAUDE.md in the user's project (app description, purpose)
4. README.md in the user's project (features, technical details)
5. Source code analysis (if needed for deeper understanding)

## Slash Commands

| Command                | Purpose                                      |
|------------------------|----------------------------------------------|
| `/app-store-toolkit:setup`      | Configure bundle ID, credentials, voice/tone |
| `/app-store-toolkit:aso`        | Generate ASO-optimized metadata              |
| `/app-store-toolkit:changelog`  | Generate release notes from git or manual    |
| `/app-store-toolkit:iap`        | Generate IAP display names and descriptions  |
| `/app-store-toolkit:localize`   | Translate metadata to configured locales     |
| `/app-store-toolkit:push`       | Sync local metadata to App Store Connect     |
| `/app-store-toolkit:pull`       | Fetch metadata from App Store Connect        |
| `/app-store-toolkit:validate`   | Validate all metadata against char limits    |
| `/app-store-toolkit:score`      | ASO quality score (0-100)                    |
| `/app-store-toolkit:list`       | List metadata, descriptions, changelogs, etc |
| `/app-store-toolkit:status`     | Show sync status (local vs remote diff)      |
| `/app-store-toolkit:competitors`| Analyze competitor App Store listings        |
| `/app-store-toolkit:reviews`    | List reviews, draft and post responses       |
| `/app-store-toolkit:privacy`    | Analyze code for App Privacy nutrition labels|

## Plugin & Marketplace Distribution

### Plugin Manifest
- `.claude-plugin/plugin.json` — defines the plugin: name, version, skills, agents, MCP servers, hooks
- `plugin.json` is the **authority** for version — if version is set in both `plugin.json` and `marketplace.json`, `plugin.json` wins silently

### Marketplace (separate repo)
- Marketplace name: **`appcraft-tools`** — lives in a separate repo: `vishalvshekkar/appcraft-tools`
- The marketplace references this plugin via GitHub source: `{"source": "github", "repo": "vishalvshekkar/app-store-toolkit"}`
- This repo contains NO `marketplace.json` — it is a pure plugin repo

### How Users Install
```
/plugin marketplace add vishalvshekkar/appcraft-tools
/plugin install app-store-toolkit@appcraft-tools
```

### Version Bumping
- **Always bump version in `plugin.json` first** — it is the authority
- Update `marketplace.json` version to match for clarity, but `plugin.json` controls what Claude Code sees
- If two refs/commits have the same manifest version, Claude Code skips the update

### Key Nuances
- `${CLAUDE_PLUGIN_ROOT}` in `plugin.json` resolves to the plugin's cached install location, not the repo path — used for MCP server args and hook paths
- Plugins are copied to `~/.claude/plugins/cache` on install — files outside the plugin directory are NOT copied (no `../` references)
- `strict` mode (default `true`): `plugin.json` is authority for components; marketplace can supplement. Set to `false` only if marketplace should fully control component definitions
- The marketplace repo (`appcraft-tools`) and plugin repos are fully separate — add new plugins to the marketplace by adding GitHub source entries in `appcraft-tools/.claude-plugin/marketplace.json`

## Tech Stack

- MCP Server: TypeScript + Node.js 18+
- Build: `cd servers/appstore-connect && npm install && npm run build`
- Dependencies: @modelcontextprotocol/sdk, zod, jsonwebtoken

## Key Constraints

- Auth is account-wide; plugin is scoped to a single bundle ID to prevent cross-app accidents
- No multi-app support for v1
- Single app can have multiple platforms (iOS, macOS) with separate version-level content
- App-level fields (name, subtitle) are shared across platforms
