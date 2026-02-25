---
name: app-store-toolkit:localize
description: Translate metadata to configured locales with culturally-aware transcreation
arguments:
  - name: locale
    description: "Specific target locale (e.g., 'ja' or 'de-DE'). Localizes all configured locales if omitted."
    required: false
  - name: field
    description: "Specific field to localize (e.g., 'description'). Localizes all fields if omitted."
    required: false
user_invocable: true
---

# /app-store-toolkit:localize

You are localizing App Store metadata into target locales. Use the **Localization Specialist** agent persona from `agents/localizer.md`.

## Steps

### 1. Load Configuration

Call `store_read_config` to get:
- Primary locale (source for translations)
- Configured locales (targets)
- Voice/tone settings
- Platforms

### 2. Determine Targets

- If `$ARGUMENTS` specifies a locale, only localize to that locale
- If `$ARGUMENTS` specifies a field, only localize that field
- Otherwise, localize all fields to all non-primary locales

### 3. Load Source Content

Read all metadata in the primary locale:
- `store_read_metadata` for name, subtitle, keywords
- `store_read_metadata` for description, promotional_text (per platform)

If the primary locale has no content for a field, skip it and warn the user.

### 4. Localize Each Target Locale

For EACH target locale, for EACH field:

**Apply the Localization Specialist agent approach:**
- Transcreate (not literal translate) the content
- For keywords: research locale-specific keywords rather than translating
- Adapt voice/tone for the locale's cultural expectations
- Stay within character limits

**Character Limits (same as source):**
| Field | Limit |
|---|---|
| Name | 30 |
| Subtitle | 30 |
| Keywords | 100 |
| Promotional Text | 170 |
| Description | 4000 |
| Release Notes | 4000 |
| IAP Display Name | 30 |
| IAP Description | 45 |

### 5. Validate Each Localization

After generating each localized field, validate against character limits.
If exceeded, regenerate with explicit constraint (up to 2 retries).

### 6. Present Results

Show a locale-by-locale summary:

```
Localization Results:
═════════════════════════════════════════
Target: ja (Japanese)
  name:             "マイアプリ" (5/30 chars)
  subtitle:         "素早くクールに" (7/30 chars)
  keywords:         "生産性,タスク,整理,計画..." (82/100 chars)
  description:      2156/4000 chars
  promotional_text: 28/170 chars

Target: de-DE (German)
  name:             "Meine App" (9/30 chars)
  subtitle:         "Dinge schneller erledigen" (25/30 chars)
  keywords:         "produktivität,aufgaben,organisieren..." (91/100 chars)
  description:      2879/4000 chars
  promotional_text: 45/170 chars
═════════════════════════════════════════
```

Ask the user to review and approve each locale. They can:
- Approve all
- Approve specific locales
- Request changes for specific locales
- Skip a locale

### 7. Save Approved Localizations

For each approved field, call `store_write_metadata` with:
- `locale`: the target locale
- `source`: `"translated"`
- `context`: "Transcreated from {primary_locale}"

### 8. Suggest Next Steps

- "Run `/app-store-toolkit:validate` to verify all locales pass limits"
- "Run `/app-store-toolkit:list locales` to see completion status across locales"
- "Run `/app-store-toolkit:push` to sync localized metadata to App Store Connect"
