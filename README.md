# app-store-toolkit

AI-powered App Store Connect metadata management for Claude Code.

Generate ASO-optimized app names, descriptions, keywords, changelogs, and IAP copy — then sync it all to App Store Connect with a single command.

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- Node.js 18+
- App Store Connect API key ([create one here](https://appstoreconnect.apple.com/access/integrations/api))
  - Role: **App Manager** recommended
  - Download the `.p8` private key file

## Installation

### From the Marketplace (recommended)

```bash
# Add the appcraft-tools marketplace
/plugin marketplace add vishalvshekkar/appcraft-tools

# Install the plugin
/plugin install app-store-toolkit@appcraft-tools
```

### Direct install

```bash
claude plugin install https://github.com/vishalvshekkar/app-store-toolkit
```

## Quick Start

```bash
# 1. Configure your app and credentials
/app-store-toolkit:setup

# 2. Pull existing metadata from App Store Connect
/app-store-toolkit:pull

# 3. Generate ASO-optimized metadata
/app-store-toolkit:aso

# 4. Preview what changed
/app-store-toolkit:status

# 5. Push to App Store Connect (each mutation is appended to .appstore/history/pushes.jsonl)
/app-store-toolkit:push
```

## Commands

### Setup & Configuration

| Command | Description |
|---------|-------------|
| `/app-store-toolkit:setup` | Configure bundle ID, API credentials, voice/tone, and locales |

### Content Generation

| Command | Description |
|---------|-------------|
| `/app-store-toolkit:aso` | Generate ASO-optimized name, subtitle, keywords, description, and promo text |
| `/app-store-toolkit:changelog` | Generate release notes from git history or manual input |
| `/app-store-toolkit:iap` | Generate in-app purchase display names and descriptions |
| `/app-store-toolkit:localize` | Translate metadata to all configured locales |

### Sync & Status

| Command | Description |
|---------|-------------|
| `/app-store-toolkit:push` | Push local metadata to App Store Connect |
| `/app-store-toolkit:pull` | Pull metadata from App Store Connect |
| `/app-store-toolkit:status` | Show sync status between local and remote |

### Analysis & Review

| Command | Description |
|---------|-------------|
| `/app-store-toolkit:validate` | Validate all metadata against Apple's character limits |
| `/app-store-toolkit:score` | Get an ASO quality score (0-100) with improvement suggestions |
| `/app-store-toolkit:competitors` | Analyze competitor App Store listings |
| `/app-store-toolkit:reviews` | View customer reviews and draft responses |
| `/app-store-toolkit:privacy` | Analyze code to help generate App Privacy nutrition labels |

### Browsing & History

| Command | Description |
|---------|-------------|
| `/app-store-toolkit:list` | List metadata, descriptions, changelogs, IAPs, locales, listing/privacy/review, or history (pushes) |

## Configuration

After running `/app-store-toolkit:setup`, two config files are created:

**`.appstore/config.json`** (committed to git):
```json
{
  "bundle_id": "com.yourcompany.yourapp",
  "app_id": "123456789",
  "platforms": ["IOS"],
  "primary_locale": "en-US",
  "locales": ["en-US"],
  "voice": {
    "tone": "professional",
    "style_notes": "Clear and concise",
    "target_audience": "General audience"
  }
}
```

**`.appstore/config.local.json`** (gitignored — never committed):
```json
{
  "key_id": "YOUR_KEY_ID",
  "issuer_id": "YOUR_ISSUER_ID",
  "p8_key_path": "/path/to/AuthKey.p8"
}
```

## What lives in `.appstore/`

The plugin keeps everything it knows about your listing in `.appstore/`. Commit this directory (minus `config.local.json`) so your repo is the source of truth for what's on App Store Connect.

```
.appstore/
├── config.json              # bundle_id, platforms, locales, voice (committed)
├── config.local.json        # API credentials (gitignored)
├── listing.json             # categories, age rating, pricing, availability, encryption
├── privacy.json             # App Privacy questionnaire responses
├── review.json              # App Review contact, demo creds, notes
├── metadata/                # Per-locale name, subtitle, keywords, description, etc.
├── assets/                  # Screenshots, app previews (use Git LFS for large files)
└── history/
    └── pushes.jsonl         # Append-only audit log of every ASC mutation
```

### Listing config (`listing.json`)
Primary and secondary App Store categories, age rating questionnaire answers, pricing tier (with per-territory overrides), territory availability, and the default encryption-compliance answer for new builds. Edited via `/app-store-toolkit:setup` or directly, then synced with `/app-store-toolkit:push`.

### App Privacy (`privacy.json`)
Your App Privacy "nutrition label" answers — whether you collect data, which data types, the purposes for each, and tracking/domain disclosures. Validated at write time against Apple's taxonomy: every declared data type needs at least one purpose, `collectsData=false` forbids declared types, and `tracking.enabled=false` forbids domains. Use `/app-store-toolkit:privacy` to generate a draft from your source code.

### App Review info (`review.json`)
The contact, demo credentials, and reviewer notes that App Store Connect requires for review. Passwords are redacted from the audit log on push.

### Audit log (`.appstore/history/pushes.jsonl`)
Every mutating call to App Store Connect appends one JSON line to `pushes.jsonl` — tool name, inputs, result or error, and timestamp. Because the file is committed, `git log -p .appstore/history/pushes.jsonl` answers "what did we tell ASC, and when?" Audit writes are best-effort and never mask the underlying API result. (`submissions.jsonl` and `audits.jsonl` are reserved for a later milestone.)

### Voice Presets

Choose a tone during setup that applies to all generated content:

| Preset | Style |
|--------|-------|
| Professional | Clear, polished, business-appropriate |
| Casual | Friendly, conversational, approachable |
| Playful | Fun, energetic, uses creative language |
| Technical | Precise, feature-focused, detailed |
| Minimal | Short, direct, no fluff |
| Witty | Clever, engaging, personality-driven |
| Custom | Define your own style_notes and target_audience |

## Supported Platforms

- iOS
- macOS
- tvOS
- visionOS

Multi-platform apps are supported — each platform gets its own version-level metadata (description, promo text, keywords, release notes) while app-level fields (name, subtitle) are shared.

## Localization

39 App Store Connect locales supported. Content generation follows an English-first workflow:
1. Generate content in your primary locale
2. Run `/app-store-toolkit:localize` for culturally-aware transcreation (not literal translation)
3. Keywords are researched per-locale, not just translated

## How Authentication Works

1. Create an API key in App Store Connect (Users and Access > Integrations > Team Keys)
2. Download the `.p8` private key file
3. Run `/app-store-toolkit:setup` and provide your Key ID, Issuer ID, and path to the `.p8` file
4. The plugin generates short-lived JWT tokens (refreshed every 10 minutes) for API calls
5. Credentials are stored locally in `.appstore/config.local.json` (automatically gitignored)

## Troubleshooting

**"Authentication failed"**: Verify your Key ID and Issuer ID match what's shown in App Store Connect. Ensure the `.p8` file path is correct and the file is readable.

**"App not found"**: Check that your bundle ID matches exactly. The API key must have access to the app's team.

**"Rate limited"**: The App Store Connect API allows ~300 requests per minute. The plugin handles 429 responses with automatic backoff. Wait a moment and retry.

**Character limit errors**: Run `/app-store-toolkit:validate` to see which fields exceed limits. Use `/app-store-toolkit:aso` to regenerate with proper constraints.

**ASC rejected my privacy submission**: Open `.appstore/privacy.json` and confirm every declared `dataType` lists at least one `purpose`, that you haven't mixed `collectsData=false` with a non-empty `dataTypes`, and that `tracking.enabled=false` keeps `domains` empty. All data type and purpose strings must come from Apple's taxonomy (see `servers/appstore-connect/privacy-taxonomy.json`); the local store rejects unknown values at write time.

**"What did we send to App Store Connect?"**: Inspect `.appstore/history/pushes.jsonl` for the recent entries, or run `git log -p .appstore/history/pushes.jsonl` for a chronological diff of every mutation the plugin made.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for what's planned.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

MIT
