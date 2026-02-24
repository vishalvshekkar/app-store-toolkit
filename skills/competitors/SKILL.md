---
name: appcraft:competitors
description: Analyze competitor App Store listings for ASO insights
arguments:
  - name: query
    description: "Search term or competitor app name to analyze"
    required: true
user_invocable: true
---

# /appcraft:competitors

You are analyzing competitor App Store listings to provide ASO insights.

## Steps

### 1. Understand the Request

Parse `$ARGUMENTS` to determine what competitors to analyze. The user might provide:
- A search term (e.g., "productivity timer")
- A specific app name (e.g., "Forest")
- A category (e.g., "Productivity")

### 2. Research Competitors

Use web search to find competitor App Store listings. Search for:
- `site:apps.apple.com "{query}"` to find specific apps
- `"{query}" app store top apps` for category research
- Look at Apple's App Store search results for the query

For each competitor (analyze 3-5 top competitors):
- App name and subtitle
- Key features highlighted in description
- Keywords used (inferred from name, subtitle, description)
- Rating and review count
- Category and ranking position

### 3. Keyword Gap Analysis

Compare competitors' keyword strategies with the user's current metadata:
- Read user's current metadata via `store_read_config` and `store_read_metadata`
- Identify keywords competitors use that the user doesn't
- Identify unique keywords the user has that competitors don't
- Suggest high-value keywords to add

### 4. Present Analysis

```
Competitor Analysis: "productivity timer"
═══════════════════════════════════════════════════

1. Forest — Stay Focused (4.8 stars, 500K+ ratings)
   Name Strategy: Brand + clear benefit
   Keywords observed: focus, study, timer, productivity, pomodoro
   Strength: Strong emotional branding, gamification angle

2. Focus Timer — Pomodoro (4.6 stars, 100K+ ratings)
   Name Strategy: Feature-first + technique name
   Keywords observed: pomodoro, focus, timer, study, concentration
   Strength: Direct keyword match in name

3. Be Focused — Focus Timer (4.5 stars, 50K+ ratings)
   Name Strategy: Action verb + feature
   Keywords observed: focus, timer, productivity, work, break
   Strength: Action-oriented naming

Keyword Gaps (terms competitors use that you don't):
  - pomodoro (3/3 competitors)
  - study (2/3 competitors)
  - concentration (2/3 competitors)

Your Unique Keywords:
  - organize, planning, goals

Recommendations:
  1. Add "pomodoro" to keywords — high search volume, all competitors use it
  2. Consider "study" — captures student demographic
  3. Your name could benefit from a clearer benefit descriptor
═══════════════════════════════════════════════════
```

### 5. Suggest Next Steps

- "Run `/appcraft:aso` to regenerate metadata with competitive insights"
- "Run `/appcraft:score` to see your updated ASO score"
