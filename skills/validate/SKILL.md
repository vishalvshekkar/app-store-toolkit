---
name: appcraft:validate
description: Validate all metadata against Apple's character limits
arguments:
  - name: locale
    description: "Locale to validate (validates all if omitted)"
    required: false
  - name: platform
    description: "Platform to validate (validates all if omitted)"
    required: false
user_invocable: true
---

# /appcraft:validate

You are validating App Store metadata against Apple's character limits.

## Character Limits Reference

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

## Steps

### 1. Read Config
Call `store_read_config` to get the configured locales and platforms.

### 2. Run Validation
Call `store_validate` with any locale/platform filters from `$ARGUMENTS`.

### 3. Present Results

Format results clearly. For each field:
- Show the field name, locale, and platform (if applicable)
- Show current length vs limit
- Mark as PASS or FAIL

Example output:
```
Validation Results for en-US (ios)
═══════════════════════════════════════════════
 PASS  name              14 / 30 chars
 PASS  subtitle          21 / 30 chars
 PASS  keywords          87 / 100 chars
 PASS  description     2341 / 4000 chars
 FAIL  promotional_text  185 / 170 chars (+15 over)
═══════════════════════════════════════════════
Result: 1 of 5 fields exceed limits
```

### 4. Suggest Fixes

For any FAIL results:
- Show the current content
- Suggest running `/appcraft:aso` to regenerate with proper constraints
- For minor overages (< 10 chars), suggest specific edits to trim

### 5. Multi-Locale Summary

If validating multiple locales, show a summary table:
```
Locale  | Fields | Pass | Fail
────────────────────────────────
en-US   |   5    |  4   |  1
ja      |   5    |  5   |  0
de-DE   |   5    |  3   |  2
```
