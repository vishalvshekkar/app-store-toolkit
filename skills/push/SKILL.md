---
name: appcraft:push
description: Push local metadata to App Store Connect
arguments:
  - name: locale
    description: "Specific locale to push (pushes all changed locales if omitted)"
    required: false
  - name: field
    description: "Specific field to push (pushes all changed fields if omitted)"
    required: false
  - name: force
    description: "Skip diff preview and push immediately"
    required: false
user_invocable: true
---

# /appcraft:push

You are pushing local metadata to App Store Connect. This modifies live App Store data.

## Steps

### 1. Load Configuration

Call `store_read_config` to get app_id, locales, and platforms.

If no config or no app_id, tell the user to run `/appcraft:setup` or `/appcraft:pull` first.

### 2. Validate Before Push

Call `store_validate` to check all fields against character limits.

If ANY field exceeds its limit, **stop and warn the user**. Do not push invalid data.
Suggest running `/appcraft:validate` and fixing issues first.

### 3. Compute Changes

For each locale and platform, compare local latest content with what's currently on App Store Connect:

1. Call `asc_get_app_info` for app-level fields (name, subtitle)
2. Call `asc_get_version` then `asc_get_version_localizations` for version-level fields
3. Compare each field's local latest content with the remote value
4. Build a list of changes (fields where local != remote)

If `$ARGUMENTS` includes a specific locale or field filter, only include those.

### 4. Preview Changes

Unless `$ARGUMENTS` includes "force", show a preview table:

```
Changes to push to App Store Connect:
═════════════════════════════════════════════════════════
Field              | Locale | Platform | Change
─────────────────────────────────────────────────────────
name               | en-US  | —        | "Old Name" → "New Name"
description        | en-US  | ios      | Updated (2341 → 2567 chars)
keywords           | en-US  | —        | Updated (87 → 95 chars)
promotional_text   | ja     | ios      | New (was empty)
═════════════════════════════════════════════════════════
Total: 4 changes across 2 locales
```

**Ask the user to confirm** before proceeding. This is a critical step — pushing updates live App Store data.

### 5. Push Changes

For each change:

**App-level fields (name, subtitle):**
- Use `asc_update_app_info` with the localization ID and new values

**Version-level fields (description, keywords, promo, what's new):**
- Use `asc_update_version_localization` with the localization ID and new values

**IAP fields:**
- Use `asc_update_iap_localization` with the localization ID and new values

Report progress as each field is pushed.

### 6. Report Results

```
Push complete:
═══════════════════
  4 fields pushed successfully
  0 errors

  name (en-US): pushed
  description (en-US, ios): pushed
  keywords (en-US): pushed
  promotional_text (ja, ios): pushed
```

### 7. Suggest Next Steps

- "Run `/appcraft:status` to verify sync state"
- "Run `/appcraft:pull` to confirm remote matches local"
