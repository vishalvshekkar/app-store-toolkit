---
name: app-store-toolkit:status
description: Show sync status between local metadata and App Store Connect
arguments:
  - name: locale
    description: "Specific locale to check (checks all if omitted)"
    required: false
user_invocable: true
---

# /app-store-toolkit:status

You are showing the sync status between local metadata and App Store Connect.

## Steps

### 1. Load Configuration

Call `store_read_config` to get app_id, locales, and platforms.

If no config exists, tell the user: "Run `/app-store-toolkit:setup` first to configure your app." and STOP.

If no API credentials configured, show local-only status (what fields exist, completion %).

### 2. Fetch Remote State

For each configured locale:

1. Call `asc_get_app_info` to get remote name, subtitle
2. For each platform, call `asc_get_version` then `asc_get_version_localizations` to get remote description, keywords, promo, what's new

### 3. Compare with Local

For each field, read the local latest content using `store_read_metadata` and compare with remote:

- **In Sync** (`=`): Local latest matches remote
- **Local Newer** (`>`): Local has changes not pushed
- **Remote Newer** (`<`): Remote changed since last pull
- **Conflict** (`!`): Both changed since last sync
- **Local Only** (`+`): Exists locally but not remotely
- **Remote Only** (`-`): Exists remotely but not locally

### 4. Display Status

```
app-store-toolkit status — com.company.myapp (IOS)
═══════════════════════════════════════════════════════
Locale: en-US
  =  name                "My Amazing App"
  >  subtitle            "Do cool things faster" (local newer)
  =  keywords            87/100 chars
  >  description         2567/4000 chars (local newer)
  =  promotional_text    42/170 chars
  =  release_notes       v2.1.0 — 847/4000 chars

Locale: ja
  =  name                "マイアプリ"
  <  description         (remote newer — run /app-store-toolkit:pull)
  -  promotional_text    (remote only)

Summary: 8 in sync, 2 local newer, 1 remote newer, 0 conflicts
═══════════════════════════════════════════════════════
```

### 5. Suggest Actions

Based on the status:
- If local_newer exists: "Run `/app-store-toolkit:push` to sync your changes"
- If remote_newer exists: "Run `/app-store-toolkit:pull` to fetch remote updates"
- If conflicts exist: "Review conflicts and decide which version to keep"
- If all in sync: "Everything is in sync with App Store Connect"
