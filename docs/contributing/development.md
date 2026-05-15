# Development Guide

This guide is for contributors developing the **app-store-toolkit** plugin itself (not users of the plugin).

## Repository Structure

```
app-store-toolkit/
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest, version, MCP server config
├── agents/
│   ├── aso-copywriter.md           # AI agent persona for ASO copywriting
│   └── localizer.md                # AI agent persona for localization
├── docs/
│   ├── concepts/                   # Architecture, local store, voice/tone, locales
│   ├── contributing/               # Development guides
│   ├── reference/                  # API reference, tools, etc.
│   ├── workflows/                  # User workflows
│   └── superpowers/
│       ├── specs/                  # M1/M2/M3 design specs
│       └── plans/                  # TDD implementation plans (task lists)
├── hooks/
│   ├── hooks.json                  # Hook definitions
│   ├── validate-metadata.sh        # PostToolUse validation hook
│   └── session-status.sh           # SessionStart sync status hook
├── scripts/
│   └── *.sh                        # Build and utility scripts
├── servers/
│   └── appstore-connect/           # MCP server (TypeScript/Node.js)
│       ├── src/
│       │   ├── api/                # ASC HTTP API wrappers
│       │   ├── auth/               # JWT authentication
│       │   ├── data/               # Static catalogs (privacy taxonomy, asset specs)
│       │   ├── store/              # Local store readers/writers
│       │   ├── tools/              # MCP tool registrations & schemas
│       │   ├── util/               # Utilities (PNG/MP4 parsers, etc.)
│       │   ├── validation/         # Character limits, schema validation
│       │   ├── cli-validate.ts     # CLI entry for `npm run validate`
│       │   └── index.ts            # MCP server entry
│       ├── __tests__/
│       ├── dist/                   # Built output (after `npm run build`)
│       ├── package.json
│       ├── tsup.config.ts
│       ├── vitest.config.ts
│       └── tsconfig.json
├── skills/
│   ├── aso/SKILL.md                # ASO copywriting skill
│   ├── changelog/SKILL.md           # Release notes generation
│   ├── iap/SKILL.md                # In-app purchase descriptions
│   ├── localize/SKILL.md           # Multi-locale translation
│   ├── push/SKILL.md               # Sync local → App Store Connect
│   ├── pull/SKILL.md               # Fetch from App Store Connect
│   ├── validate/SKILL.md           # Validate metadata
│   ├── score/SKILL.md              # ASO quality scoring
│   ├── list/SKILL.md               # List metadata/history
│   ├── status/SKILL.md             # Sync status
│   ├── setup/SKILL.md              # Initial configuration
│   ├── privacy/SKILL.md            # App Privacy analysis
│   ├── reviews/SKILL.md            # Review management
│   └── competitors/SKILL.md        # Competitor ASO analysis
├── .git/
├── .github/                        # GitHub Actions workflows
├── CONTRIBUTING.md                 # Quick-start for contributors
├── CLAUDE.md                       # Project orientation for Claude Code
├── README.md                       # User-facing overview
└── package.json                    # Root (usually minimal)
```

## Prerequisites

- **Node.js 18+** (for TypeScript/MCP server)
- **npm 9+**
- **Git**
- **macOS/Linux** (for Puppeteer-based asset rendering, if you work on screenshot/preview tools)

## Local Development Workflow

### 1. Clone and Install

```bash
git clone https://github.com/vishalvshekkar/app-store-toolkit.git
cd app-store-toolkit
cd servers/appstore-connect
npm install
```

### 2. Build the MCP Server

```bash
npm run build
```

This compiles TypeScript to `dist/index.js`, which is referenced in `plugin.json` via `${CLAUDE_PLUGIN_ROOT}`.

### 3. Run Tests

```bash
npm test              # One-shot test run
npm run test:watch   # Watch mode (re-run on file changes)
npm run test:coverage # Coverage report (HTML in `coverage/`)
```

Tests are located inline alongside code (e.g., `src/api/availability.ts` has `src/api/__tests__/availability.test.ts`).

### 4. Test the Plugin in Claude Code

Use one of the following approaches:

**Option A: Install from local path** (if your Claude Code version supports it)
```bash
/plugin install /path/to/app-store-toolkit
```

**Option B: Push to a branch and install from GitHub**
```bash
git push origin your-feature-branch
/plugin install app-store-toolkit@github:vishalvshekkar/app-store-toolkit#your-feature-branch
```

Then test slash commands in Claude Code:
```
/app-store-toolkit:setup
/app-store-toolkit:aso
```

### 5. Iterative Development

For rapid iteration on the MCP server:

```bash
npm run dev    # Watch mode; rebuilds on src/ changes
```

Then reload the plugin in Claude Code (if there's a reload command) or restart the session.

## Code Style and Conventions

### TypeScript

- **Strict mode** (enforced in `tsconfig.json`)
- **ES modules** with `.js` file extensions on imports (Node.js ESM requirement)
- **No default exports** — use named exports for clarity
- **No inline comments** unless the invariant is non-obvious

Example:
```typescript
// Good: self-explanatory
export async function setAppAvailability(appId: string, territories: string[]) {
  const normalized = territories.map(t => normalizeTerritoryCode(t));
  return ascRequest("/v2/appAvailabilities", { ... });
}

// Avoid: obvious comment noise
// Convert territories to uppercase
const normalized = territories.toUpperCase();
```

### MCP Tools

Every tool is registered inside `registerAscTools(server)` or `registerStoreTools(server)` in `src/tools/`.

- **Tool schema**: defined in `src/tools/schemas.ts`
- **Tool handler**: takes `InputType` and returns `OutputType` (Zod-validated)
- **API wrappers**: call functions in `src/api/` (not direct HTTP from tools)
- **Error handling**: throw `McpError` with user-friendly messages; let caller decide on retry

Example structure:
```typescript
// src/tools/schemas.ts
export const setAvailabilitySchema = z.object({
  appId: z.string(),
  territories: z.array(z.string()),
});
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;

// src/tools/asc-tools.ts
server.tool(
  "asc_set_availability",
  "Set app availability in specific territories",
  setAvailabilitySchema,
  async (input) => {
    try {
      const result = await setAppAvailability(input.appId, input.territories);
      appendHistoryEntry("asc_set_availability", input, result);
      return { success: true, data: result };
    } catch (error) {
      throw new McpError(...);
    }
  }
);
```

### History Append (Best Effort)

Every successful mutator wraps `appendHistoryEntry` in try/catch (see commit 506d943):

```typescript
try {
  const result = await setAppAvailability(appId, territories);
  appendHistoryEntry("asc_set_availability", { appId, territories }, result);
  return { success: true, data: result };
} catch (error) {
  // History append failure should not block the main operation
  console.warn("Failed to log to history:", error);
  return { success: true, data: result };
}
```

### API Wrappers

One file per ASC resource family under `src/api/` (e.g., `availability.ts`, `pricing.ts`). Each wrapper:
- Takes domain-specific inputs (e.g., app ID, territories)
- Calls `ascRequest(endpoint, options)` with ASC API details
- Returns parsed JSON or throws `AscApiError`
- Does NOT format for MCP tools — leaves that to the tool handler

### Testing Patterns

| Scenario | Pattern |
|----------|---------|
| **Pure function** | Import directly; call with inputs; assert on output/thrown errors |
| **API wrapper** | Mock `../client.js` at top of test; mock `ascRequest`; assert HTTP call shape |
| **Store helper** | Use `process.chdir(tempDir)` to redirect `.appstore/`; clean up with `mkdtemp` + `rm` |
| **MCP tool** | Register fake `McpServer`; intercept `server.tool()` calls; invoke handler directly with test inputs |
| **History resilience** | Mock `../../store/history.js` to reject; assert tool still returns success |

Example: **API wrapper test** (from `availability.test.ts`):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAppAvailability } from "../availability.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAppAvailability", () => {
  it("posts an availability with the supplied territories (alpha-3)", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "av_1" } });

    await setAppAvailability("app_1", ["US", "GB", "DE"]);

    const call = (ascRequest as any).mock.calls[0];
    expect(call[0]).toBe("/v2/appAvailabilities");
    expect(call[1].method).toBe("POST");
  });
});
```

## Adding a New MCP Tool

The **full TDD walkthrough** is in `docs/contributing/adding-tools.md`. Quick summary:

1. Define the schema in `src/tools/schemas.ts`
2. Write the handler in `src/tools/asc-tools.ts` (or `store-tools.ts`)
3. Call an API wrapper from `src/api/` (or store helper from `src/store/`)
4. Implement the API wrapper with minimal tests first (mock the HTTP layer)
5. Write integration tests for the full MCP tool
6. Run `npm test` and ensure all pass
7. Update tool documentation in `docs/reference/tools.md`

## Adding a New Skill

Skills are markdown files with YAML frontmatter and natural-language instructions. To add a new slash command:

1. Create `skills/<name>/SKILL.md`
2. Add frontmatter:
   ```yaml
   ---
   name: app-store-toolkit:<name>
   description: What this skill does
   arguments:
     - name: arg1
       description: Explanation
       required: false
   user_invocable: true
   ---
   ```
3. Write the skill body in markdown — instruct the Claude Code model which MCP tools to call and what to do
4. Reference MCP tools by name; Claude Code invokes them via the protocol
5. Test by running the skill in a Claude Code session with the plugin installed

See `skills/aso/SKILL.md` for a detailed example.

## Updating Static Data Files

Three data files in `src/data/` are bundled and versioned:

- **`privacy-taxonomy.json`** — Apple's App Privacy questionnaire taxonomy
- **`asc-asset-specs.json`** — Device screen dimensions for screenshots/preview videos
- **`review-phrase-rules.json`** — Phrase-risk scores for App Review submission hints

To update:
1. Edit the JSON file
2. Run `npm test` — the snapshot test will fail with a diff
3. Review the diff; if correct, update the snapshot
4. Commit the JSON and the updated snapshot

## Versioning

The **source of truth** for version is `plugin.json`:
- Bump `version` in `.claude-plugin/plugin.json` first
- Keep `servers/appstore-connect/package.json` in sync (for reference)
- Tag the commit: `git tag v0.4.0 && git push --tags`

**Semver**: MAJOR for breaking tool-shape changes, MINOR for new features, PATCH for fixes.

## Commit Conventions

- **Imperative present tense**: "Add X" (not "Added" or "Adds")
- **One concern per commit**: separate refactoring, feature work, and fixes
- **For multi-task feature work**: follow M1/M2/M3 pattern (spec → plan → 15–20 TDD tasks → version bump)

Example:
```
Feat: Add asc_set_encryption_compliance tool

- Validate uses_encryption boolean
- Support exemption codes per ASC docs
- Tests for all exemption combinations
- Appends to history.pushes.jsonl
```

## Pull Requests

1. Create a branch off `main`
2. Make changes; test locally with `npm test && npm run build`
3. Open PR against `main` with a clear description
4. Reference any GitHub issues (e.g., "Fixes #42")
5. Await one approval before merging

## Releases

1. Bump version in `plugin.json` (and reference in `package.json`)
2. Update `CHANGELOG.md` with changes (if it exists; otherwise create it)
3. Commit: `git commit -am "Bump to v0.x.y"`
4. Tag: `git tag v0.x.y && git push --tags`
5. Push to `main`: `git push origin main`

The marketplace at `vishalvshekkar/appcraft-tools` references this repo via GitHub source. Claude Code picks up new versions on `/plugin install --update`.

## Design Resources

Understanding the design behind any feature:

- **`CLAUDE.md`** — Project orientation for Claude Code
- **`docs/concepts/architecture.md`** — Three-layer architecture (skills → MCP → API → local store)
- **`docs/concepts/local-store.md`** — Full data model for metadata storage
- **`docs/concepts/voice-and-tone.md`** — How voice/tone is applied across generations
- **`docs/superpowers/specs/*.md`** — M1, M2, M3 design specs (rationale for any major feature)
- **`docs/superpowers/plans/*.md`** — Implementation task lists (find context on *why* something was built a certain way)

## Reporting Bugs

- Use [GitHub Issues](https://github.com/vishalvshekkar/app-store-toolkit/issues)
- Include: plugin version (from `.claude-plugin/plugin.json`), reproduction steps, expected vs actual
- For API-layer bugs, include ASC error response if available

## Debugging Tips

### MCP Server Not Starting

Check that `dist/index.js` exists and is valid:
```bash
npm run build
ls -la dist/index.js
node dist/index.js --help  # Should list tools
```

### Tests Failing with "Cannot find module"

Ensure ESM imports have `.js` extensions:
```typescript
import { foo } from "./foo.js";  // ✓ correct
import { foo } from "./foo";     // ✗ fails in Node ESM
```

### Store Tests Using Wrong Directory

Use `process.chdir()` to redirect:
```typescript
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";

const tempDir = await mkdtemp(join(tmpdir(), "test-"));
process.chdir(tempDir);
try {
  // test code
} finally {
  await rm(tempDir, { recursive: true });
}
```

There is **no** `setAppstoreDir()` function — always use `chdir`.

### Coverage Report Not Generating

```bash
npm run test:coverage
open coverage/index.html
```

If coverage is missing, ensure vitest.config.ts has the right provider and reporter list.

## Next Steps

- Read `CONTRIBUTING.md` for the quick-start
- Explore `docs/concepts/architecture.md` to understand the three-layer design
- Check `docs/contributing/adding-tools.md` for a full TDD example
- Browse `docs/superpowers/plans/` for context on why things are built the way they are
