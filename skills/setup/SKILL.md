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

## CRITICAL: Multi-Turn Wizard Flow

This setup is a **conversational wizard**. You MUST present ONE step at a time and WAIT for the user's response before proceeding to the next step. Do NOT present multiple steps or questions in a single message.

After each step, end your message with a clear question and STOP. Do not continue to the next step until the user responds.

## Step 1: Check Existing Config + Detect Project Info

**Do all of the following in parallel**, then present results:

1. Call `store_read_config` MCP tool to check for existing config
2. Detect the bundle ID:
   - Search for `PRODUCT_BUNDLE_IDENTIFIER` in `*.pbxproj` files
   - If multiple values found, list ALL unique bundle IDs (excluding test targets — any containing `Tests`)
   - Also check `Package.swift` for `bundleIdentifier`
   - If `$ARGUMENTS` includes a bundle_id, use that instead of detection
3. Detect platforms:
   - In `.pbxproj`, search for `SUPPORTED_PLATFORMS` or `SDKROOT` values
   - Look for platform-specific SDK values: `iphoneos` (iOS), `macosx` (macOS), `appletvos` (tvOS), `xros` (visionOS)
   - Also check for `TARGETED_DEVICE_FAMILY`: 1 = iPhone, 2 = iPad, 1,2 = both
   - Check multiplatform destinations: look for `supportedDestinations` containing multiple platforms

**If existing config found:** Show current settings as a summary table and ask: "Want to update any of these, or start fresh?"

**STOP HERE and wait for the user's response.**

**If no existing config:** Present what you detected:

```
Detected from your Xcode project:
  Bundle ID:  [detected or "not found"]
  Platforms:  [detected list or "iOS (default)"]
```

If the bundle ID was detected, ask: "Does this look right? And are the platforms correct?"
If detection failed, ask: "What's your app's bundle identifier? (e.g., com.company.appname)"

**STOP HERE and wait for the user's response.**

## Step 2: Voice & Tone

Once bundle ID and platforms are confirmed, present the voice/tone options:

| Preset           | Style                                    |
|------------------|------------------------------------------|
| **Professional** | Clear, polished, business-appropriate    |
| **Casual**       | Friendly, conversational, approachable   |
| **Playful**      | Fun, energetic, creative language        |
| **Technical**    | Precise, feature-focused, detailed       |
| **Minimal**      | Short, direct, no fluff                  |
| **Witty**        | Clever, engaging, personality-driven     |
| **Custom**       | Define your own style notes              |

Ask: "Which voice/tone fits your app? And who's your target audience? (e.g., 'creative professionals who value simplicity')"

If the user's project has a CLAUDE.md, README.md, or other docs that hint at the app's personality, suggest the most fitting preset with a brief reason why.

If they choose **Custom**, follow up asking for `style_notes` and `target_audience`.

**STOP HERE and wait for the user's response.**

## Step 3: Locales

After voice/tone is set, ask about locales:

"Your primary locale will be **en-US**. Want to add other languages? Common choices:"

- **East Asian:** ja, ko, zh-Hans, zh-Hant
- **European:** de-DE, fr-FR, es-ES, it, pt-BR
- **Other:** ar-SA, hi, th, en-GB

"You can skip this and add locales anytime with `/app-store-toolkit:localize`."

**STOP HERE and wait for the user's response.**

## Step 4: API Credentials

Ask about App Store Connect API access:

"Do you have App Store Connect API credentials? This enables pulling/pushing metadata directly."

"If yes, you'll need:"
- **Key ID** — from App Store Connect → Users and Access → Integrations → Team Keys
- **Issuer ID** — at the top of that same page
- **Path to .p8 file** — the private key file

"Credentials stay local in `.appstore/config.local.json` (gitignored). You can skip this — features like `/app-store-toolkit:aso` work without API access."

**STOP HERE and wait for the user's response.**

## Step 5: Save & Confirm

Once all info is gathered:

1. Call `store_write_config` with the collected settings
2. If API credentials were provided, call `store_write_local_config`
3. Display a summary:

```
Setup complete!
  Bundle ID:    com.example.app
  Platforms:    iOS, macOS
  Locale:       en-US
  Voice:        Casual
  Audience:     [if provided]
  API Access:   ✓ configured / ✗ skipped
  Data dir:     .appstore/
```

4. Suggest next steps based on what was configured:
   - If API configured: "Run `/app-store-toolkit:pull` to fetch your current App Store metadata"
   - Always: "Run `/app-store-toolkit:aso` to generate ASO-optimized metadata"
