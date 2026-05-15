---
name: app-store-toolkit:list
description: List metadata, descriptions, changelogs, IAPs, locales, listing/privacy/review config, or push/audit/submission history
arguments:
  - name: type
    description: "What to list: metadata, description, changelog, iap, locales, history"
    required: false
  - name: field
    description: "Field name for history (e.g., description, name, subtitle)"
    required: false
  - name: locale
    description: "Locale to list (defaults to primary locale)"
    required: false
  - name: platform
    description: "Platform to list (defaults to first configured platform)"
    required: false
user_invocable: true
---

# /app-store-toolkit:list

You are listing metadata from the local app-store-toolkit store.

## Parse Arguments

Parse `$ARGUMENTS` to determine what to list. The first word is the type:
- `metadata` — Show all fields for a locale with latest content and character counts
- `description` — Show full description text
- `changelog` or `release_notes` — List release note versions
- `iap` — List IAP products with display names and descriptions
- `locales` — Show configured locales with completion status
- `assets` — Show a summary of screenshots and previews across all locales and devices
- `history <field>` — Show full iteration history for a specific field
- `listing` — show the contents of `.appstore/listing.json` (categories, age rating, pricing, availability, encryption)
- `privacy` — show `.appstore/privacy.json` (App Privacy responses)
- `review` — show `.appstore/review.json` (App Review information)
- `history pushes` — show recent entries from `.appstore/history/pushes.jsonl`
- `history audits` — show recent entries from `.appstore/history/audits.jsonl`
- `history submissions` — show recent entries from `.appstore/history/submissions.jsonl`

If no type is given, default to `metadata`.

Additional arguments may include a locale (e.g., `ja`) or platform (e.g., `ios`).

## Execution

### For `metadata`:
Call `store_list` with `type: "metadata"` and the appropriate locale/platform.

Present results as a formatted table:
```
Field              | Content (preview)                    | Chars  | Limit
─────────────────────────────────────────────────────────────────────────
name               | My Amazing App                       | 14/30  | OK
subtitle           | Do cool things faster                | 21/30  | OK
keywords           | productivity,tasks,organize,plan...  | 87/100 | OK
description        | The best app for managing your...    | 2341/4000 | OK
promotional_text   | Now with dark mode support!          | 30/170 | OK
```

### For `description`:
Call `store_read_metadata` with `field: "description"` and show the full latest content.
Include character count at the bottom.

### For `changelog` / `release_notes`:
Call `store_list` with `type: "release_notes"` and show all versions.
For each version, show a preview of the release notes.

### For `iap`:
Call `store_list` with `type: "iap"` and show all IAP products.
Include display_name and description with character counts.

### For `locales`:
Call `store_list` with `type: "locales"`.
Show each locale and whether it has content for key fields (name, description, keywords).

### For `assets`:
Call `store_list` with `type: "metadata"` and iterate over all configured locales and platforms.
For each locale × device combination, read `assets.lock.json` via `store_read_assets_lock` and report the asset counts.

Present results as a table grouped by locale, then device:
```
Locale   Device              Screenshots  Previews
─────────────────────────────────────────────────
en-US    ios/iphone-6.7             3           1
         ios/iphone-6.5             3           0
         ios/ipad-7                 3           1
de-DE    ios/iphone-6.7             3           1
         ios/iphone-6.5             3           0
         ios/ipad-7                 3           1
ja       ios/iphone-6.7             3           1
         ios/iphone-6.5             0           0
         ios/ipad-7                 2           1
```

If no assets exist for a locale × device, omit or show 0/0.

### For `history`:
The second argument should be the field name (e.g., `history description`).
Call `store_list` with `type: "history"` and the field name.
Display all iterations with:
- Iteration ID
- Timestamp
- Source (ai_generated, user_edited, etc.)
- Content preview (first 100 chars)
- Whether it's the current `latest`

## Empty State

If no metadata exists yet, suggest:
- "Run `/app-store-toolkit:setup` to configure your app" (if no config)
- "Run `/app-store-toolkit:pull` to fetch existing metadata from App Store Connect"
- "Run `/app-store-toolkit:aso` to generate new metadata"

## Related

- `/app-store-toolkit:status` — see live sync drift between local and App Store Connect
- `/app-store-toolkit:history` — view push and audit history for any field
- See also: docs/reference/commands.md
