# Locales

The toolkit manages metadata for 39 locales supported by the App Store. This guide explains how the toolkit models locales, how to add new ones, and how the localization workflow works.

## What the App Store Supports

Apple's App Store Connect supports **39 locales** across all major markets. Common ones include:

| Region | Locales |
|--------|---------|
| **English** | en-US, en-GB, en-AU, en-CA |
| **Western Europe** | de-DE, fr-FR, it, es-ES, nl-NL, sv, da, no, fi |
| **Southern Europe** | pt-PT, pt-BR, el, ro |
| **Eastern Europe** | pl, cs, hu, sk, ru, uk, hr |
| **CJK** | ja, ko, zh-Hans, zh-Hant |
| **South/Southeast Asia** | hi, th, id, vi, ms |
| **Middle East & North Africa** | ar-SA, tr, he, ca |

For the **complete list of 39 App Store Connect locales**, refer to [Apple's App Store Connect documentation](https://help.apple.com/app-store-connect/#/dev4e413177a).

## The Toolkit's Locale Model

The toolkit treats locales as a **primary + N translations** model:

- **Primary locale**: The source of truth for all metadata. This is the locale you develop and write marketing copy in first.
- **Other locales**: Translations of the primary locale, created via transcreation (culturally-aware adaptation, not literal translation).

### Configuration

Locales are configured in `.appstore/config.json`:

```json
{
  "bundle_id": "com.example.myapp",
  "platforms": ["ios"],
  "primary_locale": "en-US",
  "locales": ["en-US", "de-DE", "ja", "fr-FR"],
  "voice": {
    "tone": "professional",
    "target_audience": "Business professionals",
    "style_notes": "Clear, direct, value-driven"
  }
}
```

**Key fields:**

| Field | Description |
|-------|-------------|
| `primary_locale` | Source of truth. All translation happens from this locale. |
| `locales[]` | Array of target locales. Must include `primary_locale`. |
| `voice` | Voice/tone settings applied to generated content across all locales (adapted for cultural norms). |

### Per-Locale Directory Structure

Metadata for each locale lives in `metadata/{locale}/`:

```
.appstore/
  metadata/
    en-US/
      name.jsonl
      subtitle.jsonl
      keywords.jsonl
      description.jsonl
      promotional_text.jsonl
      release_notes.jsonl
      # URL fields: Apple stores these per-locale
      marketingUrl.jsonl
      supportUrl.jsonl
      privacyPolicyUrl.jsonl
    de-DE/
      name.jsonl
      subtitle.jsonl
      ... (same structure)
    ja/
      ... (same structure)
```

Each file is a **JSONL history** — one line per iteration. This allows you to see how a field evolved over time.

### URL Fields Are Per-Locale

Unlike app name and description, **URL fields are stored per-locale** in App Store Connect:

- Marketing URL
- Support URL
- Privacy Policy URL

This allows you to point users in each locale to the appropriate language version of your website. The toolkit stores these in `metadata/{locale}/marketingUrl.jsonl`, etc.

## Adding a New Locale

To add support for a new locale (e.g., Spanish):

### Step 1: Update Configuration

Edit `.appstore/config.json` and add the locale to the `locales` array:

```json
{
  "bundle_id": "com.example.myapp",
  "primary_locale": "en-US",
  "locales": ["en-US", "de-DE", "ja", "es-ES"]
  //                                    ^^^^^^ new
}
```

### Step 2: Run Localization

Translate all metadata to the new locale:

```
/app-store-toolkit:localize es-ES
```

This invokes the **Localization Specialist agent** (see below), which transcreates your primary locale metadata into Spanish. You'll see a summary of each translated field with character counts.

### Step 3: Review & Approve

The agent presents all translations for review. You can:

- **Approve all** — save all translations
- **Approve specific locales** — pick which ones to save
- **Request changes** — iterate on specific translations
- **Skip a locale** — add it to config but don't translate yet

### Validation & Parity

Once you've added and approved the locale, run:

```
/app-store-toolkit:validate
```

This checks that all configured locales pass character limits. If any locale is missing a required field, the validation will flag it as a **BLOCKER** and you'll need to run `/localize <locale>` to fill the gap.

See [**Locale Parity in Audit**](#locale-parity-in-audit) below for details.

## The Localization Specialist Agent

The `/app-store-toolkit:localize` skill uses a specialized **Localization Specialist** agent (defined in `agents/localizer.md`) to perform transcreation — culturally-aware adaptation, not literal translation.

### What Transcreation Means

Transcreation captures **intent and impact**, not just words. For example:

- A marketing tagline in English might be "Think different." Literal translation to Japanese would be awkward. Transcreation finds the local equivalent: something that resonates with Japanese audiences in the same way the English phrase does.
- Keywords are **never translated**. Instead, the agent researches what terms local users actually search for in that market. For example, "fitness" + "yoga" in English might become "フィットネス" + "ヨガ" + "瞑想" in Japanese, because Japanese users search for meditation differently.

### Localization Rules

The agent follows these rules for all locales:

1. **Respect character limits** — name (30), subtitle (30), keywords (100), promo (170), description (4000), release notes (4000)
2. **Maintain voice/tone** — adapt your configured voice for the locale's cultural norms (e.g., a "professional" tone in German might be more formal than in English)
3. **Use locally appropriate terminology** — idioms, phrasing, and cultural references that resonate locally
4. **Exclude locale-specific terms** — don't include the app name or subtitle in keywords; Apple's search already indexes those

### Special Cases by Language

#### CJK Languages (Chinese, Japanese, Korean)

- **Fewer keywords needed** — each character carries more meaning. Where English uses 5 keywords, Japanese might use 3-4.
- **Shorter paragraphs** — CJK readers prefer direct, punchy statements over long narrative prose.
- **Character width** — each character is visually heavier. A 100-character English keyword field might hold 50-60 Japanese characters.

#### RTL Languages (Arabic, Hebrew)

- **Content flows right-to-left** — the toolkit's MCP tools handle direction automatically, but review screenshots for mirrored layouts if relevant.
- **Cultural sensitivity** — ensure no offensive or culturally inappropriate content.

#### Regional Variants

Some languages have regional variants:

- **Spanish**: es-ES (Spain) vs es-MX (Mexico) — different formality, idioms, technical terms
- **French**: fr-FR (France) vs fr-CA (Canada) — Canadian French uses different terminology for tech
- **Portuguese**: pt-PT (Portugal) vs pt-BR (Brazil) — Brazilian Portuguese is more informal

The agent adapts for these differences when you specify them in the `voice` field or in explicit instructions.

### The Agent's Quality Checklist

Before saving a translation, the agent verifies:

- **Reads naturally** — not "translated," but written by a native speaker
- **Keywords are researched, not translated** — based on local search behavior
- **Character limits respected** — within the 30/100/170/4000 char limits
- **Culturally sensitive** — no offensive or inappropriate content for the region
- **Brand consistent** — app name and key terminology stay consistent across locales
- **Voice adapted** — the configured tone/style is preserved where culturally feasible

## Iteration Source Values

Every translated field is marked with an **iteration source** to distinguish how it was created:

| Source | Meaning |
|--------|---------|
| `ai_generated` | Created by `/app-store-toolkit:aso` in the primary locale |
| `user_edited` | Manually edited by you in the JSON or via a skill |
| `pulled_from_asc` | Fetched from App Store Connect via `/app-store-toolkit:pull` |
| `translated` | Created by `/app-store-toolkit:localize` from the primary locale |

The history of each field shows all iterations with their sources. This helps you understand whether a field was originally generated by the toolkit, translated from your English copy, or edited by hand.

## Locale-Aware Quality Factors

### Character Limits Across Languages

While character limits are the same (30/100/170/4000 chars), they hit differently across languages:

- **German**: Often longer than English for the same meaning. "Efficiently organize" → "Effizient organisieren und strukturieren" (more words, more characters).
- **CJK**: Often shorter. "Organize tasks, projects, and notes" → "タスク・プロジェクト・メモを整理" (fewer characters, more information density).
- **French**: Tends toward the English length.

### Keyword Field Behavior by Locale

The keyword field (100 chars) is locale-sensitive:

| Language | Strategy |
|----------|----------|
| **English** | Use singular forms; keywords are short, semantic units (e.g., "productivity,calendar,task") |
| **CJK** | Fewer keywords, each carrying more meaning. Japanese/Korean/Chinese search algorithms differ from English. Research local behavior. |
| **German** | Can use compound words; some long nouns count as one keyword but take many characters |
| **Accented languages** (French, Spanish, Portuguese) | Keywords should include accents and diacritics for proper search indexing |

### Cultural Sensitivity & Regional Norms

- **Formal vs. informal register** — German "Sie" vs "du"; Japanese keigo (formal speech) vs casual. Configure via voice preset or custom style_notes.
- **Color symbolism** — colors mean different things in different regions (e.g., white ≠ purity in all cultures).
- **Idioms & references** — what's clever wordplay in English might be meaningless in another language.
- **Emoji usage** — emoji interpretation varies by platform and region. Verify before using.

## Locale Parity in Audit

When you run `/app-store-toolkit:audit` (Phase 1: Locale Parity Check), the toolkit verifies that all configured locales have the required metadata:

- ✅ **PASS**: Every configured locale has name, subtitle, description, keywords, promotional_text, and release_notes (if applicable).
- ❌ **BLOCKER**: One or more configured locales are missing a required field.

If you get a BLOCKER, fix it by:

1. **For a missing locale entirely**: Run `/app-store-toolkit:localize <locale>` to translate all missing fields.
2. **For a missing field in a specific locale**: Run `/app-store-toolkit:localize <locale> --field description` to translate that field.

Once all locales have all required fields, the audit passes and you can proceed to submission.

## Workflow: Adding a Locale Start-to-Finish

Here's a typical workflow:

1. **Run `/app-store-toolkit:setup`** (if not already configured) and set your primary locale to `en-US`.
2. **Generate ASO-optimized English metadata** via `/app-store-toolkit:aso`.
3. **Add German** to `config.json` locales: `["en-US", "de-DE"]`.
4. **Run `/app-store-toolkit:localize de-DE`** and review the German translation.
5. **Approve or iterate** on the translations.
6. **Add Spanish** to `config.json`: `["en-US", "de-DE", "es-ES"]`.
7. **Run `/app-store-toolkit:localize es-ES`** and approve.
8. **Run `/app-store-toolkit:validate`** to ensure all locales pass character limits.
9. **Run `/app-store-toolkit:audit`** to verify locale parity and other readiness checks.
10. **Run `/app-store-toolkit:push`** to sync all locales to App Store Connect.

## See Also

- [**voice-and-tone.md**](./voice-and-tone.md) — how the toolkit applies voice/tone settings to generated content in all locales
- [**architecture.md**](./architecture.md) — the three-layer architecture and why locales are per-directory
- [**../reference/commands.md**](../reference/commands.md) — all slash commands, including `/localize`
- [**../workflows/assets-pipeline.md**](../workflows/assets-pipeline.md) — managing locale-specific screenshots and app previews
