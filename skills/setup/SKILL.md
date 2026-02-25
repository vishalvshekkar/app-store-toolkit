---
name: app-store-toolkit:setup
description: Configure app-store-toolkit with your app's bundle ID, API credentials, voice/tone preferences, and locale settings
arguments:
  - name: bundle_id
    description: Your app's bundle identifier (e.g., com.company.app)
    required: false
user_invocable: true
---

# /app-store-toolkit:setup

You are setting up the app-store-toolkit plugin for App Store Connect metadata management.

## Steps

### 1. Check for Existing Config

Call the `store_read_config` MCP tool. If a config already exists, show the current settings and ask the user if they want to reconfigure or update specific settings.

### 2. Gather Bundle ID

If `$ARGUMENTS` includes a bundle_id, use that. Otherwise, try to detect it:
- Look for `*.xcodeproj` or `*.xcworkspace` files in the project
- Check for `PRODUCT_BUNDLE_IDENTIFIER` in `.pbxproj` files
- Check for `bundleIdentifier` in `Package.swift`

If auto-detection fails, ask the user for their bundle ID.

### 3. Configure Platforms

Ask the user which platforms their app supports:
- iOS
- macOS
- tvOS
- visionOS

Most apps are iOS-only. Default to `["IOS"]` if the user doesn't specify.

### 4. Configure Primary Locale

Ask the user for their primary locale. Default to `en-US`. Explain that this is the locale used as the source for all translations.

### 5. Configure Additional Locales

Ask if they want to add additional locales beyond the primary. Show a list of commonly used locales:
- en-US, en-GB, en-AU, en-CA (English variants)
- ja, ko, zh-Hans, zh-Hant (East Asian)
- de-DE, fr-FR, es-ES, it, pt-BR (European/Latin American)
- ar-SA, hi, th (Other)

They can always add more later with `/app-store-toolkit:localize`.

### 6. Configure Voice & Tone

Present the voice/tone presets and ask the user to choose:

| Preset | Style |
|--------|-------|
| **Professional** | Clear, polished, business-appropriate |
| **Casual** | Friendly, conversational, approachable |
| **Playful** | Fun, energetic, creative language |
| **Technical** | Precise, feature-focused, detailed |
| **Minimal** | Short, direct, no fluff |
| **Witty** | Clever, engaging, personality-driven |
| **Custom** | Define your own style notes |

If they choose Custom, ask for:
- `style_notes`: How should the copy sound? (e.g., "Active voice, avoid buzzwords, conversational but authoritative")
- `target_audience`: Who is this app for? (e.g., "Developers aged 25-40 who value productivity")

For presets, still ask for an optional `target_audience`.

### 7. Configure API Credentials

Ask the user for their App Store Connect API credentials:
1. **Key ID**: Found in App Store Connect > Users and Access > Integrations > Team Keys
2. **Issuer ID**: Found at the top of the same page
3. **Path to .p8 file**: The private key file they downloaded when creating the key

Explain:
- These are stored locally in `.appstore/config.local.json` which is automatically gitignored
- The recommended API key role is **App Manager**
- They can skip this step and add credentials later (some features like `/app-store-toolkit:aso` work without API access)

If they provide credentials, save them with `store_write_local_config`.

### 8. Save Configuration

Use `store_write_config` to save the configuration with all gathered settings.

### 9. Confirm Setup

Display a summary of what was configured:
- Bundle ID
- Platforms
- Primary locale + additional locales
- Voice/tone preset
- API credentials status (configured / not configured)
- Data directory: `.appstore/`

Suggest next steps:
- If API configured: "Run `/app-store-toolkit:pull` to fetch your existing App Store metadata"
- If no existing metadata: "Run `/app-store-toolkit:aso` to generate ASO-optimized metadata"
- "Run `/app-store-toolkit:list metadata` to see your current metadata"
