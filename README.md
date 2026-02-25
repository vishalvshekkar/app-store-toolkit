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

```bash
# From the Claude Code plugin marketplace
claude plugin marketplace add app-store-toolkit

# Or install directly from this repo
claude plugin install /path/to/apple-app-store-assistant
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

# 5. Push to App Store Connect
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
| `/app-store-toolkit:list` | List metadata, descriptions, changelogs, IAPs, locales, or history |

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

## License

MIT
