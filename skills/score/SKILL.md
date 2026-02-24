---
name: appcraft:score
description: Get an ASO quality score (0-100) with improvement suggestions
arguments:
  - name: locale
    description: "Locale to score (defaults to primary)"
    required: false
user_invocable: true
---

# /appcraft:score

You are scoring the ASO quality of the app's metadata and providing actionable improvement suggestions.

## Steps

### 1. Load All Metadata

Call `store_read_config` and then read all metadata for the target locale (primary if not specified):
- name, subtitle, keywords (app-level)
- description, promotional_text (per platform)

### 2. Score Each Category (0-100)

Calculate scores across these dimensions:

**Keyword Optimization (25 points):**
- Keywords field fully utilized (close to 100 chars)? [10 pts]
- No duplicate words across name + subtitle + keywords? [5 pts]
- Keywords are relevant and specific (not too broad)? [5 pts]
- Singular forms used (no plurals that waste chars)? [5 pts]

**Name & Subtitle Quality (20 points):**
- Name includes primary keyword? [5 pts]
- Name is memorable/brandable? [5 pts]
- Subtitle adds unique value (not repeating name)? [5 pts]
- Both near (but within) character limits? [5 pts]

**Description Quality (25 points):**
- First 3 lines are compelling (pre-"Read More")? [8 pts]
- Uses bullet points or scannable formatting? [4 pts]
- Includes keywords naturally? [5 pts]
- Has clear call to action? [4 pts]
- Good length (1000+ chars for depth, under 4000)? [4 pts]

**Completeness (15 points):**
- All fields populated? [5 pts]
- Promotional text set? [5 pts]
- Release notes present? [5 pts]

**Localization Coverage (15 points):**
- Number of locales configured vs recommended? [8 pts]
- All locales have complete metadata? [7 pts]

### 3. Present Score

```
ASO Score: 73/100
═══════════════════════════════════════════
Keyword Optimization:    18/25
Name & Subtitle:         16/20
Description Quality:     19/25
Completeness:            12/15
Localization Coverage:    8/15
═══════════════════════════════════════════

Top Improvements:
1. Keywords field is only 67/100 chars — add more relevant terms (+5 pts)
2. Missing localizations: ja, de-DE, fr-FR are high-value markets (+4 pts)
3. Description lacks bullet points for scanability (+3 pts)
4. Subtitle repeats words from name — use different keywords (+2 pts)
```

### 4. Provide Specific Suggestions

For each improvement, give concrete actionable advice:
- Which keywords to add
- How to restructure the description
- Which locales to prioritize
- Specific wording improvements

### 5. Suggest Next Steps

- "Run `/appcraft:aso` to regenerate improved metadata"
- "Run `/appcraft:localize` to add missing locale support"
