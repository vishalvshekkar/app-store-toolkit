# Character limits reference

App Store Connect enforces strict character limits on every metadata field. The app-store-toolkit validates these limits at every step—generation, pull, validation, and push—to prevent invalid submissions.

## The 8 limits

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

### What these levels mean

**App-level** fields are shared across all platforms and versions. They appear in one place in `.appstore/metadata/{locale}/`.

- **App Name** (`name.json`) — your app's official title in the App Store
- **Subtitle** (`subtitle.json`) — a short tagline below the name; rarely updated

**Version-level** fields are per-version and can differ by platform. They live in `.appstore/metadata/{locale}/` and optionally `.appstore/metadata/{locale}/{platform}/` for platform-specific overrides.

- **Keywords** (`keywords.json`) — comma-separated search terms for discoverability
- **Promotional Text** (`promotional_text.json`) — time-sensitive marketing copy; updated without resubmission
- **Description** (`description.json`) — full listing copy (most important for ASO)
- **What's New** (`release_notes/{version}.json`) — version-specific release notes; one file per version

**IAP-level** fields are per in-app purchase. They live in `.appstore/metadata/{locale}/iap/{product_id}.json`.

- **IAP Display Name** — what customers see in the purchase dialog
- **IAP Description** — why they'd want to buy this

---

## How the toolkit enforces limits

### `store_validate` MCP tool

The core validation function lives in `servers/appstore-connect/src/validation/limits.ts`. It:
1. Counts Unicode code points in each field
2. Compares against the hard limit
3. Returns pass/fail + actual character count

**Output example:**
```
OK: name 18/30 chars
FAIL: description 4087/4000 chars (+87 over)
```

### `/app-store-toolkit:validate` skill

Thin wrapper over `store_validate`. Runs anytime you want to audit your local store:

```bash
/app-store-toolkit:validate
```

Shows a summary of all fields: which pass, which fail, and how many chars over.

### Generation skills auto-validate

Every content-generating skill (`/aso`, `/changelog`, `/iap`, `/localize`) validates its output **before** committing to the local store.

**If a field exceeds the limit:**

1. **First attempt fails** — the skill regenerates with an explicit character constraint
   - Example: "Generate description in ≤4000 Unicode characters"
2. **If regeneration still fails** (rare), the skill tries again with tighter guidance
3. **After 2 failed retries**, the skill warns you with exact counts and refuses to save

This ensures you never accidentally commit unpushable content.

### `/app-store-toolkit:push` is a hard blocker

Before pushing to App Store Connect, the push tool validates the entire local store. If **any field** exceeds its limit, the push aborts immediately — you cannot force-push invalid content.

**Example failure:**

```
VALIDATION BLOCKER: Cannot push with invalid metadata
  - description (en-US): 4150/4000 chars (+150 over)

Run /app-store-toolkit:validate to see all issues.
Use /app-store-toolkit:aso to regenerate.
```

---

## Character counting rules

Apple counts **Unicode code points**, not bytes or grapheme clusters. JavaScript's native `String.length` counts UTF-16 code units (an older standard), so the toolkit uses `[...str].length` for accurate point counting.

### Emoji handling

Emoji are composed of one or more code points:

- **Simple emoji:** `👋` = 1 code point = 1 character in the limit
- **Emoji with modifiers:** `👨‍👩‍👧` (family) = 5 code points (emoji + zero-width joiners) = 5 characters

If you're using emoji in descriptions or promotional text, remember they count toward the limit. A description with 10 complex emoji takes 50+ characters.

### Newlines

Line breaks in description or What's New count as 1 character each. Organize your description into paragraphs, but remember each newline consumes a slot in the 4000-character budget.

### Whitespace

Leading/trailing spaces are stripped by Apple before counting, but spaces within the content do count. The toolkit validates on the raw content you provide.

---

## Keywords field special rules

The Keywords field has unique treatment:

- **Total limit:** 100 characters for the entire comma-separated string
- **Commas don't count:** Apple strips commas before evaluation, so you can write `keyword1, keyword2, keyword3` without commas eating into your 100
- **Spaces do count:** `keyword1, keyword2` (with space after comma) uses characters for the space. Best practice: `keyword1,keyword2` (no spaces)

**Example:**

```
iphone,ipad,photography,photo editing,photo filters,social sharing
```

Better than:

```
iphone, ipad, photography, photo editing, photo filters, social sharing
```

The first version is tighter and gives you more room for additional keywords.

### Keywords strategy

With only 100 characters, prioritize:
1. **High-volume single-word terms** (e.g., `photography`, `editor`, `filters`)
2. **Hyphenated two-word terms** (e.g., `photo-editing`, `color-correction`)
3. **Avoid long phrases** — they eat character budget quickly

Use `/app-store-toolkit:score` to measure how keyword choices affect your ASO score, then iterate.

---

## What happens on overrun

### During generation

1. Skill generates content (with voice/tone applied)
2. Validates against limit
3. If over, regenerates with explicit constraint (e.g., "in ≤170 chars")
4. If still over after 1 retry, tries once more with tighter guidance
5. If still over, warns and asks what to do

**User prompt example:**

```
⚠️  Promotional text is 195 characters (limit: 170). 
Trimmed 2 times and still over by 25 characters. 
Would you like me to:
  a) Trim manually to fit the limit?
  b) Keep it as-is (won't be pushable)?
```

### During push

The push tool is unforgiving: **all or nothing**.

If you have even one field over, the entire push is rejected. You must:

1. Run `/app-store-toolkit:validate` to find which fields fail
2. Edit the offending file or use a generation skill to fix it
3. Commit the fix locally
4. Try `/push` again

This prevents partial/invalid submissions to Apple.

---

## Practical tips for hitting limits

### Description (4000 chars — most important)

Apple favors longer, well-structured descriptions. Use the full 4000 chars if you have content to fill it.

**Best structure:**
- Opening sentence (what your app does)
- 2–3 key features (with newlines for scanability)
- Social proof or highlight (if applicable)
- Call to action (e.g., "Download today")

Example that uses ~2500 chars and still feels complete:

```
MyApp helps photographers organize, edit, and share photos instantly.

KEY FEATURES:
• AI-powered organization — auto-sort by subject, location, date
• One-tap editing — filters, exposure, color grading
• Cloud sync — access your photos from any device
• Social sharing — post to Instagram, Twitter, TikTok

Join 500,000+ photographers who trust MyApp for their visual workflow.

Download free today and unlock 30 days of premium editing tools.
```

### Promotional Text (170 chars — high-impact, short-term)

This field is your "on sale now" banner. Update it without resubmitting the app.

**Use cases:**
- Time-sensitive discount: `50% off this week only! Upgrade to MyApp Pro.`
- New feature launch: `New: AI background removal. Try it free in v2.5.`
- Limited-time offer: `Free premium month for new users — no credit card.`

Keep it punchy; 170 chars is enough for 1–2 sentences.

### Keywords (100 chars total)

Every character matters here. Use `/score` to validate keyword choices. Longer keywords consume more budget but may be more specific to your audience.

Trade-offs:
- `photography` (11 chars) — high volume, low intent
- `wedding-photography` (19 chars) — low volume, high intent
- Both, if you have room: `photography,wedding-photography` (31 chars)

### What's New (4000 chars — per version)

Similar to description in structure. Highlight version-specific improvements:

```
Version 2.5 brings powerful new features:

• AI Background Removal — remove backgrounds in one tap
• Batch Editing — edit 100 photos at once
• Cloud Sync — seamless backup to iCloud
• Performance — 2x faster on older devices

Bug fixes: stability improvements, dark mode refinements.

Thanks for using MyApp! Rate us in the App Store to help.
```

---

## Edge cases and surprises

### HTML in description

If you copy description from a website and it contains HTML tags (e.g., `<b>bold</b>`), Apple strips the tags during submission but **counts the characters**. The toolkit counts the raw text you provide, so what you see locally matches what Apple will process.

**Never assume Apple will strip formatting** — validate on raw text.

### Trailing whitespace

The toolkit strips leading/trailing whitespace from your input before validation, matching Apple's behavior. But **internal spaces are preserved and counted.**

### Keyword commas are auto-stripped

You don't need to worry about comma formatting — the toolkit counts without commas. Just provide keywords comma-separated and you'll see accurate char counts.

### Surrogate pair discrepancy (rare)

In rare cases, you might see a 1–2 character discrepancy between the toolkit's count and the App Store web UI. This happens because the web UI may use a different counting method (UTF-16 code units vs Unicode code points). The toolkit uses the more accurate code-point count; trust it.

---

## Integration with other tools

### `/app-store-toolkit:status`

Shows sync status between local store and App Store Connect. Does not validate character limits directly, but highlights fields that differ from ASC.

### `/app-store-toolkit:score`

Scores your metadata for ASO quality (0–100). One of the scoring factors is keyword optimization; character efficiency is implicitly measured here.

### `/app-store-toolkit:aso`

Generates metadata with voice/tone applied. Built-in validation catches overruns and retries. You'll never get invalid content committed from this skill.

### `/app-store-toolkit:pull`

Fetches current metadata from App Store Connect into your local store. The pulled content is guaranteed to be valid (Apple enforces it), but the toolkit still validates to catch any edge cases.

---

## Debugging and support

### "Field exceeds limit" but you can't figure out why?

Run `/app-store-toolkit:validate` and check the exact character count:

```bash
/app-store-toolkit:validate
```

Output shows: `description: 4087/4000 chars (+87 over)`

Then:
1. **Trim manually** — open the file in `.appstore/metadata/{locale}/description.json`, edit, save
2. **Regenerate** — run `/app-store-toolkit:aso` to auto-generate replacement content
3. **Validate again** — confirm the fix worked

### Still seeing discrepancies?

Check for:
- **Hidden characters** — copy-pasted content sometimes includes invisible spaces or control characters
- **Complex emoji** — family emoji or flag sequences use multiple code points
- **Newline characters** — each `\n` counts as 1 char

Use the character-by-character view in your editor (most modern editors show char count at the bottom) to debug.

---

## Next steps

- [Commands reference](commands.md) — `/validate` and `/push` deep-dives
- [Local store guide](../concepts/local-store.md) — where each field lives
- [ASO guide](./commands.md#app-store-toolkitaso) — optimizing description and keywords for discoverability
