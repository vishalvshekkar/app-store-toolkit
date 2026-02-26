---
name: app-store-toolkit:iap
description: Generate or manage in-app purchase display names and descriptions
arguments:
  - name: product_id
    description: "IAP product ID to generate for (lists all if omitted)"
    required: false
  - name: instructions
    description: "Additional instructions for IAP copy"
    required: false
user_invocable: true
---

# /app-store-toolkit:iap

You are generating or managing in-app purchase (IAP) metadata.

## Steps

### 1. Load Configuration

Call `store_read_config` to get voice/tone settings and primary locale.

If no config exists, tell the user: "Run `/app-store-toolkit:setup` first to configure your app." and STOP.

### 2. Determine Mode

**If `$ARGUMENTS` includes a product_id:**
Generate copy for that specific IAP.

**If no product_id:**
1. Call `store_list` with `type: "iap"` to show existing IAPs
2. Ask the user if they want to:
   - Generate copy for an existing IAP
   - Create a new IAP entry (ask for product_id and what the IAP is)

### 3. Gather Context

For the target IAP, understand:
- What is the product? (subscription, consumable, non-consumable?)
- What does the user get?
- Any pricing or tier information?
- Existing copy to improve on?

Use user instructions from `$ARGUMENTS` as primary context.
Read project CLAUDE.md and README.md for app context.

### 4. Generate IAP Copy

For each IAP, generate:
- **Display Name** (max 30 chars): Clear, descriptive name for the IAP
- **Description** (max 45 chars): Brief explanation of what the user gets

Apply configured voice/tone. These are very tight limits, so every word counts:
- Display Name: Be descriptive but concise (e.g., "Premium Monthly", "100 Credits Pack")
- Description: Focus on the value proposition (e.g., "Unlock all features and remove ads")

### 5. Validate

Check both fields against limits:
- display_name: 30 chars
- description: 45 chars

If over, regenerate with explicit constraint. Retry up to 2 times.

### 6. Present to User

```
IAP: premium_monthly
───────────────────────────────────────
Display Name (18/30 chars):
  Premium Monthly

Description (38/45 chars):
  Unlock all features and priority support
───────────────────────────────────────
```

Ask for approval or changes.

### 7. Save

On approval, call `store_write_metadata` for each field:
- `field`: `"iap_display_name"` and `"iap_description"`
- `product_id`: the IAP product ID
- `source`: `"ai_generated"`
- `context`: description of what was generated and why

### 8. Suggest Next Steps

- "Run `/app-store-toolkit:localize` to translate IAP copy to other locales"
- "Run `/app-store-toolkit:list iap` to see all IAP products"
- "Run `/app-store-toolkit:push` to sync to App Store Connect"
