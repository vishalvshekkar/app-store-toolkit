# Getting started with app-store-toolkit

Welcome! This guide will walk you through setup and your first metadata push to App Store Connect in under 10 minutes.

By the end, you'll have:
- The plugin installed and authenticated
- A local metadata store tracking your App Store listing
- Your first generated or edited listing content
- Confidence to push changes to App Store Connect

## Prerequisites

Before you start, make sure you have:

- **Claude Code** installed (with your API key configured)
- **Node.js 18+** running on your machine (the plugin's MCP server requires it; check with `node --version`)
- **App Store Connect** access via your Apple Developer account
- A **git repository** for your app's project (the plugin tracks state in `.appstore/`, so version control is essential)

If you don't have an App Store Connect account, create one at [developer.apple.com/account](https://developer.apple.com/account).

## Step 1: Install the plugin

In Claude Code, run:

```bash
/plugin marketplace add vishalvshekkar/appcraft-tools
/plugin install app-store-toolkit@appcraft-tools
```

This installs the plugin and its bundled MCP server (TypeScript/Node.js, ~80 KB). Claude Code will handle the rest — no manual server setup needed.

Verify installation:
```bash
/plugin list
```

You should see `app-store-toolkit` marked as **installed**.

## Step 2: Generate App Store Connect API credentials

The plugin communicates with App Store Connect using a private API key. Here's how to create one:

1. **Go to App Store Connect**: [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Navigate to Users and Access** → **Keys** (under the "App Manager" section)
3. **Click the "+" button** to create a new key
4. **Give it a name** (e.g., "app-store-toolkit")
5. **Select the role**: Choose **App Manager** (or higher, if needed for your workflow)
6. **Click Generate**
7. **Download the `.p8` file immediately** — this is your only chance to download it

While you're on the Keys page, note two important values:
- **Key ID**: Displayed next to your newly created key (e.g., `AB12CD34EF`)
- **Issuer ID**: Displayed at the top of the page (e.g., `12345678-1234-1234-1234-123456789012`)

### Where to store the `.p8` file

Store the key file outside your project repo, in a secure location with restricted permissions:

```bash
mkdir -p ~/.appstore-keys
cp ~/Downloads/AuthKey_*.p8 ~/.appstore-keys/
chmod 600 ~/.appstore-keys/AuthKey_*.p8
```

This prevents accidental commits of your private key to version control.

## Step 3: Run setup

In Claude Code, run:

```bash
/app-store-toolkit:setup
```

The plugin will ask you for:

1. **Bundle ID** — Your app's identifier (e.g., `com.example.myapp`)
2. **Path to your `.p8` key** — The full path (e.g., `/Users/yourname/.appstore-keys/AuthKey_AB12CD34EF.p8`)
3. **Key ID** — From Step 2 (e.g., `AB12CD34EF`)
4. **Issuer ID** — From Step 2 (e.g., `12345678-1234-1234-1234-123456789012`)
5. **Locales to support** — Start with `en-US`; you can add more later (French, German, etc.)
6. **Voice preset** — Choose one:
   - **Professional** — formal, business-focused
   - **Casual** — friendly, conversational
   - **Playful** — fun, lighthearted
   - **Technical** — detailed, developer-oriented
   - **Minimal** — concise, no frills
   - **Witty** — clever, humorous
   - **Custom** — provide your own style notes

The setup creates:
- `.appstore/config.json` — committed to git (bundle ID, locales, voice settings)
- `.appstore/config.local.json` — **NOT committed** (your credentials, safely gitignored)
- `.appstore/.gitignore` — auto-managed; don't edit manually

Verify everything worked:
```bash
/app-store-toolkit:status
```

You should see the plugin is authenticated and ready.

## Step 4: Pull existing state (optional, but recommended)

If your app already exists on App Store Connect, download the current listing:

```bash
/app-store-toolkit:pull
```

This fetches and saves locally:
- App name, subtitle, keywords
- Description, promotional text, and what's new
- Categories, pricing, and availability
- App Privacy responses
- App Review information

**If this is a brand-new app**, skip this step. The plugin will create starter templates in Step 5.

## Step 5: Generate or edit listing copy

### Option A: Use AI to generate (fastest)

Run:
```bash
/app-store-toolkit:aso
```

The plugin reads your app's documentation (CLAUDE.md, README.md) and source code, then generates:
- App name (up to 30 characters)
- Subtitle (up to 30 characters)
- Keyword list (up to 100 characters)
- Full description (up to 4000 characters)
- Promotional text (up to 170 characters)

All content follows your configured voice and tone. If you'd like to refine the output, edit the JSON files and run `/app-store-toolkit:aso` again with additional instructions.

### Option B: Edit manually

If you prefer to write content yourself, edit the JSON files directly:

```
.appstore/metadata/en-US/
  name.json
  subtitle.json
  keywords.json
  description.json
  promotional_text.json
```

Each file contains an object with `current` and `iterations` fields. Update `current` with your content.

### Option C: Mix both

Generate with AI, then manually refine. You can do this as many times as you like — the plugin tracks all iterations.

## Step 6: Validate and push

Before pushing to App Store Connect, validate that all fields fit within character limits:

```bash
/app-store-toolkit:validate
```

If any field exceeds limits, the plugin will tell you exactly how many characters to cut. Edit the files and re-validate.

Once validation passes, push your changes:

```bash
/app-store-toolkit:push
```

The plugin will:
1. Show a diff of what will change on App Store Connect
2. Ask for confirmation
3. Send the changes to ASC and confirm success

Your metadata is now live in App Store Connect. Check the web dashboard to confirm — changes appear immediately.

## Common workflows

### Updating for a new release

When you're ready to ship version 2.0:

```bash
/app-store-toolkit:changelog  # auto-generate what's new from git
/app-store-toolkit:push       # confirm and publish
```

### Adding a second language

1. Edit `.appstore/config.json` and add a new locale (e.g., `fr`)
2. Run `/app-store-toolkit:localize` to translate everything
3. Review and adjust translations as needed
4. Run `/app-store-toolkit:push` to publish

### Checking sync status

Forgot what's changed locally? Run:

```bash
/app-store-toolkit:status
```

This shows a summary of local changes vs. what's live on App Store Connect.

## What's next?

- **Shipping your first release?** Read [First submission](workflows/first-submission.md) for the complete end-to-end workflow.
- **Want to localize to more languages?** See [Locales and localization](concepts/locales.md).
- **Need to add screenshots and preview videos?** Jump to [Assets pipeline](workflows/assets-pipeline.md).
- **Looking for a specific command?** Check the [Commands reference](reference/commands.md).

## Troubleshooting

**"Cannot authenticate"**
- Verify the `.p8` file path is correct and the file is readable
- Double-check your Key ID and Issuer ID match App Store Connect
- Try running `/app-store-toolkit:setup` again to update credentials

**"Node.js version too old"**
- Install Node.js 18 or later from [nodejs.org](https://nodejs.org)
- Verify with `node --version`

**"Character limit exceeded"**
- Run `/app-store-toolkit:validate` to see exact counts
- Edit the field in `.appstore/metadata/{locale}/` to fit the limit
- Re-run validate and push

**Plugin not appearing in `/plugin list`**
- Ensure you ran both commands: `marketplace add` followed by `install`
- Restart Claude Code if needed

## Need help?

- File an issue: [github.com/vishalvshekkar/app-store-toolkit/issues](https://github.com/vishalvshekkar/app-store-toolkit/issues)
- Read the full documentation: [app-store-toolkit docs](README.md)
