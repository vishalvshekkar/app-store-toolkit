# First submission: shipping your v1.0 iOS App Store release

This guide walks you through everything you need to ship a brand-new iOS app to the App Store using app-store-toolkit. From listing metadata to submission and review, this is the most critical workflow.

By the end, you'll have submitted your v1.0 to Apple, started the review process, and be ready to monitor for approval or rejection.

**Expected time:** 30–90 minutes depending on whether you already have copy and screenshots prepared.

---

## Prerequisites checklist

Before you start, verify you have all of the following in place:

- [ ] **App registered in App Store Connect** — You've created an app entry with the bundle ID matching your Xcode project
- [ ] **TestFlight build uploaded** — You've built your app in Xcode and uploaded a build to TestFlight; the build is in `VALID` state (not processing or failed)
- [ ] **App icon included** — Your app icon is properly sized and included in the Xcode build
- [ ] **Claude Code plugin installed** — You've run `/plugin install app-store-toolkit@appcraft-tools`
- [ ] **Plugin configured** — You've run `/app-store-toolkit:setup` and authenticated with your App Store Connect credentials
- [ ] **Credentials working** — You can run `/app-store-toolkit:status` and see "Authenticated ✓"
- [ ] **Optional: app description** — You have a CLAUDE.md or README.md in your project root describing what your app does, key features, and target audience

If any of these are incomplete, complete them before proceeding. See [Getting started](../getting-started.md) for help with plugin setup.

---

## Stage 1: Generate listing copy (description, keywords, promotional text)

Your App Store listing copy is the most important part of your v1.0 submission. It directly affects discoverability and conversion. You can either generate it with AI or write it manually.

### Option A: AI-generate listing copy (recommended for first submission)

Run the ASO skill:

```bash
/app-store-toolkit:aso
```

The skill will:
1. Read your CLAUDE.md, README.md, and optionally your source code
2. Generate ASO-optimized copy for:
   - App name (up to 30 chars)
   - Subtitle (up to 30 chars)
   - Keywords (up to 100 chars)
   - Full description (up to 4000 chars)
   - Promotional text (up to 170 chars)
3. Save all content to `.appstore/metadata/en-US/`
4. Validate against character limits automatically

The generated copy respects your configured voice/tone from `/setup`. If you chose "Professional" or "Casual," the copy will reflect that consistently.

### Option B: Edit listing copy manually

Skip `/aso` and instead edit the files directly:

```
.appstore/metadata/en-US/
  ├── name.json
  ├── subtitle.json
  ├── keywords.json
  ├── description.json
  └── promotional_text.json
```

Each file contains an iteration object. Update the `current` field with your content. See [Character limits](../reference/character-limits.md) for guidance on each field's purpose and character budget.

### Option C: Generate, then refine

Most teams generate with AI and then manually refine. Run `/aso`, review the output, edit the JSON files directly to improve, then run `/aso` again if you want to regenerate from a different prompt.

### Check your work

Validate that all copy fits within character limits:

```bash
/app-store-toolkit:validate
```

This tool shows:
- ✓ **OK fields** — Pass character count
- ✗ **FAIL fields** — Over the limit and need trimming

Fix any FAIL fields by editing the corresponding `.json` file or re-running `/aso` with additional instructions. Repeat validation until everything passes.

### Score your listing (optional but recommended)

Get an ASO quality score and specific improvement suggestions:

```bash
/app-store-toolkit:score
```

The score ranges from 0–100 and gives you targeted advice on:
- Keyword optimization for discoverability
- Description structure and clarity
- Competitive positioning vs. similar apps

Use this feedback to refine your description and keywords before moving to the next stage.

---

## Stage 2: Configure listing metadata (categories, pricing, availability, encryption)

Listing configuration is app-wide metadata: categories, age rating, pricing tier, which territories you're available in, and encryption compliance. This is committed in `.appstore/listing.json` and does not change per locale or version.

### Create or edit `.appstore/listing.json`

If the file doesn't exist, create it. Start with this template:

```json
{
  "categories": {
    "primary": "PRODUCTIVITY",
    "secondary": "UTILITIES"
  },
  "ageRating": {
    "answers": [
      { "questionId": "GAMBLING", "level": "NONE" },
      { "questionId": "MEDICAL", "level": "NONE" },
      { "questionId": "ALCOHOL_TOBACCO", "level": "NONE" },
      { "questionId": "GAMBLING", "level": "NONE" },
      { "questionId": "FREQUENT_INTENSE_VIOLENCE", "level": "NONE" },
      { "questionId": "PROFANITY_CRUDE_HUMOR", "level": "NONE" },
      { "questionId": "MATURE_SUGGESTIVE", "level": "NONE" },
      { "questionId": "HORROR", "level": "NONE" },
      { "questionId": "PROLONGED_GRAPHIC_SADISTIC_VIOLENCE", "level": "NONE" },
      { "questionId": "SEXUAL_CONTENT_NUDITY", "level": "NONE" },
      { "questionId": "ANIMAL_CRUELTY", "level": "NONE" },
      { "questionId": "CONTESTS_LOTTERIES", "level": "NONE" }
    ]
  },
  "pricing": {
    "defaultTier": 0
  },
  "availability": {
    "territories": ["WW"]
  },
  "encryption": {
    "usesEncryption": false,
    "exemptions": []
  }
}
```

### Fill in your app's details

**Primary category:** Pick one from Apple's list. Common choices:
- `PRODUCTIVITY` — task managers, note apps, utilities
- `LIFESTYLE` — health, fitness, home apps
- `GAMES` — game apps
- `UTILITIES` — tools and utilities
- `BUSINESS` — business and finance apps
- `EDUCATION` — educational content
- `SOCIAL_NETWORKING` — social apps

See the full list in [File schemas](../reference/file-schemas.md#listing-configuration).

**Secondary category (optional):** Pick a second category if your app fits. Many first submissions use only primary.

**Age rating:** Answer Apple's questionnaire about your app's content. Most apps answer `NONE` to all questions (no gambling, violence, alcohol, etc.). If your app has any content concerns, select the appropriate level. See [File schemas](../reference/file-schemas.md#age-rating-questionnaire) for the full question list and levels.

**Pricing:**
- Free app: `"defaultTier": 0`
- Paid app: Set to the tier ID (e.g., `1` for $0.99 USD, `2` for $1.99, etc.)

See [App Store pricing tiers](https://developer.apple.com/app-store/pricing/) for the full mapping.

**Availability:**
- Worldwide: `"territories": ["WW"]`
- Single country (e.g., US only): `"territories": ["US"]`
- Multiple specific territories: `"territories": ["US", "GB", "CA", "AU"]` (use ISO 3166-1 alpha-2 codes)

**Encryption:**
- No encryption (most apps): `"usesEncryption": false, "exemptions": []`
- Uses encryption: Set to `true` and add any export-compliance exemptions if applicable (rare for first submissions)

### Commit your listing.json

This file is committed to git and can go through PR review before submission:

```bash
git add .appstore/listing.json
git commit -m "Configure listing: categories, pricing, and availability"
```

---

## Stage 3: App Privacy (nutrition label)

Every app on the App Store must complete the App Privacy questionnaire. This is Apple's "nutrition label" for privacy. Users can see your answers before downloading.

### Run the privacy analyzer (optional but helpful)

The plugin can analyze your source code and propose privacy responses:

```bash
/app-store-toolkit:privacy
```

This tool scans your codebase for:
- Data collection (analytics, crash reporting, user accounts)
- Tracking (third-party ad networks, attribution)
- Common frameworks (Firebase, Segment, Mixpanel, etc.)

It then generates a draft `privacy.json` file with proposed answers.

### Review and edit `.appstore/privacy.json`

The privacy file structure is:

```json
{
  "collectsData": true,
  "tracking": {
    "enabled": true,
    "domains": [
      "analytics.example.com",
      "ads.example.com"
    ]
  },
  "dataTypes": [
    {
      "type": "USER_ID",
      "linkedToUser": true,
      "usedForTracking": false,
      "purposes": ["APP_FUNCTIONALITY", "ANALYTICS"]
    },
    {
      "type": "EMAIL",
      "linkedToUser": true,
      "usedForTracking": false,
      "purposes": ["DEVELOPER_MARKETING"]
    }
  ]
}
```

**Key fields:**

- **`collectsData`** — `true` if your app collects any user data, `false` if it's completely offline with no tracking
- **`tracking`** — Whether your app uses tracking (e.g., ad networks, attribution). Set `enabled: true` and list the domains you send data to
- **`dataTypes`** — Array of each data type your app collects. Each has:
  - `type` — User ID, email, name, photos, location, health data, etc. (see [File schemas](../reference/file-schemas.md#app-privacy-questionnaire) for full list)
  - `linkedToUser` — Is this data linked to a user's identity?
  - `usedForTracking` — Is this data used for tracking (ad targeting, cross-app profiling)?
  - `purposes` — Why you collect this data (app functionality, analytics, marketing, etc.)

**For a simple first submission** that doesn't collect user data:

```json
{
  "collectsData": false,
  "tracking": {
    "enabled": false,
    "domains": []
  },
  "dataTypes": []
}
```

If you use Firebase, Segment, or other analytics:

```json
{
  "collectsData": true,
  "tracking": {
    "enabled": false,
    "domains": []
  },
  "dataTypes": [
    {
      "type": "USER_ID",
      "linkedToUser": false,
      "usedForTracking": false,
      "purposes": ["ANALYTICS"]
    }
  ]
}
```

### Commit privacy.json

```bash
git add .appstore/privacy.json
git commit -m "Configure App Privacy questionnaire"
```

---

## Stage 4: App Review information

App Review is Apple's team of human reviewers. Tell them how to test your app and provide demo credentials if needed.

### Edit `.appstore/review.json`

Create or update this file:

```json
{
  "contact": {
    "firstName": "Your Name",
    "lastName": "Your Surname",
    "email": "you@example.com",
    "phone": "+1-555-0100"
  },
  "demo": {
    "required": false,
    "username": "",
    "password": ""
  },
  "notes": "This is our first release. We hope you enjoy our app!"
}
```

**Contact:** App Review will email this address if they have questions during review (rare, but it happens). Use your personal email or team support email.

**Demo credentials:** Only needed if your app requires sign-in:
- `required: true` — Set this if you have a login screen
- `username` — Test account username (e.g., `reviewer@example.com`)
- `password` — Test account password (e.g., `testpass123`)

If your app is sign-up-only (no login), use `"required": false`.

**Notes:** Brief instructions for the reviewer. Examples:
- "The app works offline; no network required."
- "Test account is included. Sign in with username 'test' and password 'test123'."
- "The in-app purchase requires a separate account setup; skip this for review."
- "We accept that your team will see our sample data (test@example.com) in the demo account."

### Commit review.json

```bash
git add .appstore/review.json
git commit -m "Configure App Review information"
```

---

## Stage 5: Configure per-locale URLs (marketing, support, privacy policy)

Apple requires support and privacy policy URLs for every app. Marketing URLs are optional but recommended.

### Edit each locale's metadata directory

For each locale you support (start with `en-US`), edit the metadata directory. URLs live in the locale's version metadata (with platform overrides available):

`.appstore/metadata/en-US/{platform}/` or `.appstore/metadata/en-US/`

Add or update the following fields (these are optional at the locale level, but recommended):

- **`supportUrl`** — REQUIRED by Apple. URL to your support page or help center
- **`privacyPolicyUrl`** — REQUIRED if `collectsData: true`. URL to your privacy policy
- **`marketingUrl`** — Optional. URL to your app's marketing website

Store these in a platform-specific or shared metadata structure. See [File schemas](../reference/file-schemas.md#url-fields) for exact placement.

**Example URLs:**

```json
{
  "supportUrl": "https://myapp.example.com/support",
  "privacyPolicyUrl": "https://myapp.example.com/privacy",
  "marketingUrl": "https://myapp.example.com"
}
```

### Verify all URLs are accessible

Before submission, test all three URLs by visiting them in a browser. Apple's reviewers will do the same.

---

## Stage 6: Screenshots and app preview video

App Store screenshots are critical for conversion. Most users decide whether to download based on seeing 2–3 compelling screenshots.

### Two paths: bring your own or render them

**Path A: Screenshots you've designed** (most common for v1.0)

1. Create 2–5 PNG screenshots (Apple's current required count is 2–5 per device)
2. Save them in:
   ```
   .appstore/assets/ios/en-US/{device}/01-home.png
   .appstore/assets/ios/en-US/{device}/02-features.png
   ```
3. Device types: `iphone-6-5-in` (6.5"), `iphone-5-8-in` (5.8"), `ipad-pro-2-gen` (iPad), etc.

**Path B: Render screenshots from templates** (advanced, skipped for first submission)

Create HTML templates in `.appstore/templates/`, populate metadata with headlines and content, then run `/render-screenshots`. This lazily installs Puppeteer (~280 MB) on first run. See [Assets pipeline](assets-pipeline.md) for the full workflow.

### For a first submission, bring your own

- Design or capture 3–5 high-quality PNG screenshots in Figma, Photoshop, or by screen recording your app
- Highlight 1 feature per screenshot (onboarding, main feature, secondary feature, settings, testimonial)
- Use consistent fonts, colors, and branding
- **iPhone 6.5" dimensions:** 1242×2688 pixels
- **iPhone 5.8" dimensions:** 1170×2532 pixels
- **iPad dimensions:** 2048×2732 pixels

See [Assets pipeline](assets-pipeline.md) for a full device dimension catalog.

### Upload screenshots

Place your PNGs in the asset directory:

```bash
mkdir -p .appstore/assets/ios/en-US/iphone-6-5-in
cp ~/my-screenshots/01.png .appstore/assets/ios/en-US/iphone-6-5-in/01-home.png
cp ~/my-screenshots/02.png .appstore/assets/ios/en-US/iphone-6-5-in/02-features.png
```

Then push assets during the ship phase (Stage 9).

### App preview video (optional for v1.0)

You can include a 15–30 second preview video. This is optional and can be skipped for your first submission. See [Assets pipeline](assets-pipeline.md) if you want to add one.

---

## Stage 7: Translate to other locales (optional for v1.0)

If you configured multiple locales in `/app-store-toolkit:setup`, translate your listing now. If you only set up English, skip this stage.

### Run the localization skill

```bash
/app-store-toolkit:localize
```

This skill:
1. Reads your primary locale (en-US) listing
2. Translates to each configured locale using a culture-aware transcreation agent
3. Saves translations to `.appstore/metadata/{locale}/`
4. Validates character limits in each locale

Languages naturally expand or contract. A 4000-character English description might be 5500 characters in German. The localizer watches for this and adjusts intelligently.

### Review translations

The plugin saves every iteration. Check the generated translations:

```bash
/app-store-toolkit:list history iap_description
```

Edit any translations that don't feel natural. You can edit `.appstore/metadata/{locale}/description.json` directly, and the localizer will respect your changes on the next run.

### For first submission, stay English-only

Most first submissions start with English. Translate after your first approval if you plan to go multilingual. This lets you get v1.0 live faster.

---

## Stage 8: Audit your submission

Before shipping, run a comprehensive audit to catch blockers.

### Run the audit tool

```bash
/app-store-toolkit:audit
```

This runs 7 validation phases:

1. **Locale parity** (BLOCKER) — Every locale has required fields (name, description, support URL)
2. **Character limits** (BLOCKER) — No field exceeds its limit
3. **Required-field presence** (BLOCKER) — All mandatory fields are filled in
4. **Asset dimensions** (BLOCKER) — Screenshots are correct pixel dimensions
5. **Voice drift** (QUALITY) — Generated copy maintains consistent tone
6. **Phrase risk** (varies) — Flags potentially problematic wording
7. **Cross-surface vision** (QUALITY) — Visual layout predictions for App Store display

### Fix all BLOCKERS

BLOCKER issues must be fixed before submission. The audit will tell you exactly what's wrong:

```
BLOCKER: Missing required field
  - en-US: supportUrl is missing
  
Fix by editing .appstore/metadata/en-US/version.json
```

**Address every BLOCKER** by editing the relevant file or re-running a generation skill.

### Address QUALITY warnings (optional)

QUALITY warnings are suggestions, not blockers. You can:
- Fix them if they make sense for your app
- Ignore them if you disagree
- Waive them with `--waive` flag during ship (Stage 9)

### Re-run audit until zero BLOCKERS

```bash
/app-store-toolkit:audit
```

Repeat until you see: `✓ All blockers resolved. Ready to ship.`

---

## Stage 9: Ship (submit to App Store Connect)

The ship command is your one-command orchestrator. It runs:

1. Audit → 2. Push metadata → 3. Finalize listing → 4. Push privacy → 5. Push review info → 6. Upload assets → 7. Attach build → 8. Submit

Each phase checkpoints. If any fail, fix and re-run `/ship` to resume.

### Run the ship command

```bash
/app-store-toolkit:ship
```

The command will:
1. Run a quick audit (catch any last-minute issues)
2. Show you a diff of what will change on App Store Connect
3. Ask for final confirmation before proceeding
4. Push everything in order
5. Attach the TestFlight build you uploaded earlier
6. Submit for review

### What to expect

- **Audit phase** takes 5–10 seconds
- **Push phases** take 10–30 seconds (network dependent)
- **Attach build** is ~5 seconds
- **Submit** is 1–2 seconds
- **Total time:** 30–60 seconds

### Handle any failures

If a phase fails (e.g., network error, build not found), fix the issue and re-run `/ship`. It will resume from where it stopped, not re-run previous phases.

Example issues and fixes:

| Issue | Fix |
|-------|-----|
| "Build not found" | Verify your TestFlight build is in VALID state; wait a few minutes if it's still processing |
| "Network error during push" | Check your internet; re-run `/ship` |
| "BLOCKER from audit" | Fix the issue, commit locally, re-run `/ship` |

### Waive audit warnings (rare)

If you disagree with an audit QUALITY warning and want to override:

```bash
/app-store-toolkit:ship --waive voice-drift:description --reason "We intentionally use casual tone here"
```

BLOCKERS cannot be waived; you must fix them.

### You're live!

Once `/ship` completes, your app is submitted to App Store Connect. You should see it in your ASC dashboard under **App Store** → **Version 1.0** → **Submitted for Review**.

---

## Stage 10: Wait for review

Apple's review process typically takes 24–48 hours, sometimes up to 72 hours.

### Monitor your submission

**Option A: Check App Store Connect web dashboard**

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Navigate to your app
3. Check **App Store** → **Version 1.0** status
4. Status will change from "Submitted for Review" → "In Review" → "Ready for Sale" or "Rejected"

**Option B: Use the plugin to poll (optional)**

```bash
/app-store-toolkit:submit --wait
```

This command polls App Store Connect every 2 minutes and notifies you when the status changes. Interrupt with Ctrl+C when done.

**Option C: Email notifications**

Apple will email you when review completes (approved or rejected). Check your inbox regularly.

### If approved

Status becomes "Ready for Sale." Your app is now live on the App Store. Congratulations on shipping v1.0!

You can:
- Share the App Store link: `https://apps.apple.com/app/{your-app-id}`
- Update your version metadata and push again anytime (e.g., promotional text, description)
- Start planning v1.1

### If rejected

Don't panic. Rejections are usually fixable. See [Handling rejections](handling-rejections.md) for the full workflow.

Common reasons:
- **Screenshot text too small** — Redo screenshots with larger text
- **Crash on launch** — Debug with TestFlight; upload a fixed build
- **Privacy policy URL broken** — Fix your privacy policy URL and resubmit
- **Missing support contact** — Add a support URL or email to your app

Read the rejection reason carefully, fix the issue, and resubmit. Most rejections are cleared on the second try.

---

## Time budget and next steps

A first-time submission with prepared copy and screenshots takes:
- 10 min — Setup and auth (if not done already)
- 15 min — Generate listing copy and refine
- 10 min — Configure listing, privacy, review info
- 5 min — Upload screenshots
- 5 min — Run audit
- 2 min — Ship
- **Total: 47 minutes**

If you're writing copy from scratch, add 30–60 minutes. If you're designing screenshots, add 1–2 hours.

### Next steps after approval

Once v1.0 is live:

1. **Celebrate** — You shipped! 🎉
2. **Gather user feedback** — Beta testers, early users, reviews
3. **Plan v1.1** — Bug fixes, feature requests, improvements
4. **Update release notes** — See [Shipping a release](shipping-a-release.md) for the update workflow

### Handling updates and new releases

For v1.1 and beyond, see [Shipping a release](shipping-a-release.md) for a faster workflow:

```bash
/app-store-toolkit:changelog  # auto-generate release notes from git
/app-store-toolkit:push       # push updated metadata
/app-store-toolkit:ship       # submit new build
```

This cycle is much faster (5–10 minutes) because your metadata is already set up.

---

## Troubleshooting

### "Build not found" during ship

Verify your build status in App Store Connect:
1. Go to TestFlight
2. Find your build
3. Check it's in "VALID" state (not processing, failed, or rejected)
4. Wait a few minutes if it's still processing
5. Try `/app-store-toolkit:ship` again

### "Network error" during push

Check your internet connection and try again. The ship command is idempotent; re-running will resume from where it stopped.

### "Validation failed" / BLOCKER in audit

Run `/app-store-toolkit:audit` to see the exact issue. Fix the field and re-run ship.

### "Character limit exceeded" on a field

Run `/app-store-toolkit:validate` to see counts. Edit the field in `.appstore/metadata/{locale}/` or re-run `/app-store-toolkit:aso` to regenerate.

### Screenshots not uploading

Verify PNG dimensions match the device requirements (see Stage 6). Use `/app-store-toolkit:validate` to check.

### App rejected by App Review

See [Handling rejections](handling-rejections.md) for detailed troubleshooting steps and common rejection reasons.

---

## Related documentation

- [Getting started](../getting-started.md) — Plugin setup and first metadata push
- [Commands reference](../reference/commands.md) — Every slash command
- [Character limits](../reference/character-limits.md) — Field-by-field limits and counting rules
- [File schemas](../reference/file-schemas.md) — JSON structure for all `.appstore/` files
- [Local store](../concepts/local-store.md) — How the plugin tracks metadata and audit logs
- [Locales](../concepts/locales.md) — Multi-language support
- [Assets pipeline](assets-pipeline.md) — Screenshots, preview videos, and app icons
- [Handling rejections](handling-rejections.md) — What to do if Apple rejects your submission
- [Shipping a release](shipping-a-release.md) — Faster workflow for v1.1, v1.2, etc.
