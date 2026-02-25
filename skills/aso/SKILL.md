---
name: app-store-toolkit:aso
description: Generate ASO-optimized App Store metadata (name, subtitle, keywords, description, promotional text)
arguments:
  - name: fields
    description: "Specific fields to generate (e.g., 'name subtitle' or 'description'). Generates all if omitted."
    required: false
  - name: instructions
    description: "Additional instructions for content generation"
    required: false
user_invocable: true
---

# /app-store-toolkit:aso

You are generating ASO-optimized App Store metadata. Use the **ASO Copywriter** agent persona from `agents/aso-copywriter.md`.

## Steps

### 1. Load Configuration

Call `store_read_config` to get:
- Bundle ID, app_id, platforms
- Primary locale
- Voice/tone settings (CRITICAL — all content must match the configured voice)

If no config exists, tell the user to run `/app-store-toolkit:setup` first.

### 2. Load Existing Metadata

Call `store_read_metadata` for each field in the primary locale to understand current state:
- name, subtitle, keywords (app-level)
- description, promotional_text (per-platform, use first platform)

### 3. Gather Context

Read the user's project files for context (these are in the USER'S project directory, not the plugin directory):
- Read `CLAUDE.md` if it exists — this describes the app
- Read `README.md` if it exists — this has features and details
- Use any user instructions from `$ARGUMENTS`

Combine all context sources. User instructions have highest priority.

### 4. Determine Fields to Generate

Parse `$ARGUMENTS` for specific field requests:
- If user specified fields (e.g., "description" or "name subtitle"), only generate those
- If no fields specified, generate ALL: name, subtitle, keywords, description, promotional_text

### 5. Generate Content

For each field, generate content following ASO Copywriter agent guidelines:
- Apply the configured voice/tone
- Respect character limits strictly:
  - name: 30 chars
  - subtitle: 30 chars
  - keywords: 100 chars
  - promotional_text: 170 chars
  - description: 4000 chars
- Use context from all sources
- For keywords: exclude words already in name/subtitle, use commas without spaces, singular forms

### 6. Validate Content

After generating, check EVERY field against its character limit.

If ANY field exceeds its limit:
1. Regenerate that specific field with explicit instruction: "Must be under X characters. Currently Y characters."
2. Retry up to 2 times
3. If still over after 2 retries, warn the user with exact counts

### 7. Present to User

Show all generated content in a clear format:

```
App Name (14/30 chars):
  My Amazing App

Subtitle (21/30 chars):
  Do cool things faster

Keywords (87/100 chars):
  productivity,tasks,organize,planning,schedule,reminder,workflow,goals

Promotional Text (42/170 chars):
  Now featuring dark mode and widget support!

Description (2341/4000 chars):
  [full description text]
```

Ask the user to review. They can:
- **Approve all** — save everything
- **Approve some** — save specific fields they like
- **Request changes** — regenerate specific fields with additional instructions
- **Edit manually** — modify text directly

### 8. Save Approved Content

For each approved field, call `store_write_metadata` with:
- `locale`: primary locale
- `field`: the field name
- `platform`: first platform (for version-level fields)
- `content`: the generated text
- `source`: `"ai_generated"`
- `context`: Brief description of what context was used (e.g., "Generated from README + user instructions about dark mode feature")

### 9. Suggest Next Steps

After saving:
- "Run `/app-store-toolkit:validate` to double-check all limits"
- "Run `/app-store-toolkit:localize` to translate to your other configured locales"
- "Run `/app-store-toolkit:push` to sync to App Store Connect"
- "Run `/app-store-toolkit:list metadata` to see the full metadata summary"
