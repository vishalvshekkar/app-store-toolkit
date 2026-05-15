# Adding a New MCP Tool: TDD Walkthrough

Adding a new MCP tool to app-store-toolkit follows a consistent five-step TDD pattern. This guide walks you through a complete worked example, then covers variations for different tool types.

**Quick ref:** The pattern is (1) add schema, (2) write API wrapper, (3) write failing MCP test, (4) register tool, (5) write resilience test for mutators.

## The Five-Step Pattern

```
┌─────────────────────────────────────────────┐
│ 1. Zod schema in schemas.ts                 │
└──────────────┬──────────────────────────────┘
               │ (TypeScript type safety + JSON schema)
               ▼
┌─────────────────────────────────────────────┐
│ 2. API wrapper in src/api/<resource>.ts    │
│    (if it talks to App Store Connect)      │
└──────────────┬──────────────────────────────┘
               │ (with unit tests)
               ▼
┌─────────────────────────────────────────────┐
│ 3. Failing MCP tool test                    │
│    in src/tools/__tests__/<name>.test.ts   │
└──────────────┬──────────────────────────────┘
               │ (red → green)
               ▼
┌─────────────────────────────────────────────┐
│ 4. Register tool in asc-tools.ts or        │
│    store-tools.ts                           │
└──────────────┬──────────────────────────────┘
               │ (test goes green)
               ▼
┌─────────────────────────────────────────────┐
│ 5. History-resilience test (mutators only) │
│    in src/tools/__tests__/<name>-resilience.test.ts │
└─────────────────────────────────────────────┘
```

See [../concepts/architecture.md](../concepts/architecture.md) for how MCP tools fit into the three-layer model.

---

## Worked Example: Adding `asc_get_app_news`

We'll add a hypothetical `asc_get_app_news` tool that reads from a fictional `/v1/apps/{id}/news` App Store Connect endpoint. This tool is **not real**; it's purely pedagogical.

### Step 1: Add the Zod Schema

In `servers/appstore-connect/src/tools/schemas.ts`, append a new schema object:

```typescript
export const AscGetAppNewsSchema = z.object({
  app_id: z.string().describe("The app's App Store Connect ID"),
  limit: z.number().int().min(1).max(200).default(50).describe("Max entries to return"),
});
```

**Why Zod?**

- **Runtime validation:** The MCP protocol passes JSON arguments; Zod validates them at runtime.
- **Type safety:** `z.infer<typeof AscGetAppNewsSchema>` gives you a TypeScript type automatically.
- **Self-documenting:** `.describe()` becomes part of the MCP tool's JSON schema, visible to Claude.

### Step 2: Write the API Wrapper

For tools that talk to App Store Connect, create an API wrapper module. Create `servers/appstore-connect/src/api/news.ts`:

```typescript
import { ascRequest } from "./client.js";

export interface NewsItem {
  id: string;
  title: string;
  published_at: string;
}

export async function listAppNews(appId: string, limit: number): Promise<NewsItem[]> {
  const res = await ascRequest<{ title: string; publishedDate: string }>(
    `/v1/apps/${appId}/news`,
    { params: { limit: String(limit) } }
  );
  
  // App Store Connect API returns { data: [...] } or { data: {...} }
  const data = Array.isArray(res.data) ? res.data : [res.data];
  
  // Flatten the API response into a clean interface
  return data.map((r) => ({
    id: (r as any).id,
    title: (r as any).attributes.title,
    published_at: (r as any).attributes.publishedDate,
  }));
}
```

**Pattern notes:**

- Import `ascRequest` from `./client.js` — it handles JWT auth, error retries, and rate limiting.
- Define a clean output interface (`NewsItem`) separate from the raw API shape.
- The `.map()` step flattens the JSONAPI structure (id + attributes) into a flat object.

#### Step 2a: Test the API Wrapper

Create `servers/appstore-connect/src/api/__tests__/news.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
}));

import { ascRequest } from "../client.js";
import { listAppNews } from "../news.js";

beforeEach(() => vi.clearAllMocks());

describe("listAppNews", () => {
  it("GETs /v1/apps/{id}/news with limit param and flattens the response", async () => {
    (ascRequest as any).mockResolvedValue({
      data: [
        {
          id: "n_1",
          attributes: { title: "New Features", publishedDate: "2026-05-15T00:00:00Z" },
        },
      ],
    });

    const news = await listAppNews("app_1", 10);

    expect(ascRequest).toHaveBeenCalledWith("/v1/apps/app_1/news", {
      params: { limit: "10" },
    });
    expect(news[0]).toEqual({
      id: "n_1",
      title: "New Features",
      published_at: "2026-05-15T00:00:00Z",
    });
  });

  it("handles single-item response (not an array)", async () => {
    (ascRequest as any).mockResolvedValue({
      data: {
        id: "n_1",
        attributes: { title: "Hello", publishedDate: "2026-05-15T00:00:00Z" },
      },
    });

    const news = await listAppNews("app_1", 50);
    expect(news).toHaveLength(1);
  });
});
```

Run the test:

```bash
npm --prefix servers/appstore-connect test -- src/api/__tests__/news.test.ts
```

Expect **FAIL** (module not found) → implement → expect **PASS**.

### Step 3: Write the Failing MCP Tool Test

Create `servers/appstore-connect/src/tools/__tests__/asc-news.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/news.js", () => ({
  listAppNews: vi.fn(),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("token"),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";
import { listAppNews } from "../../api/news.js";

let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(() => {
  vi.clearAllMocks();
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registry = new Map();
  
  // Intercept server.tool() calls to capture the handler
  const o = (server.tool as any).bind(server);
  (server.tool as any) = (name: string, ...rest: any[]) =>
    (registry.set(name, { handler: rest[rest.length - 1] }), o(name, ...rest));
  
  registerAscTools(server);
});

describe("asc_get_app_news", () => {
  it("returns the news list from the API", async () => {
    (listAppNews as any).mockResolvedValue([
      { id: "n_1", title: "New Features", published_at: "2026-05-15T00:00:00Z" },
      { id: "n_2", title: "Bug Fixes", published_at: "2026-05-10T00:00:00Z" },
    ]);

    const tool = registry.get("asc_get_app_news")!;
    const res = await tool.handler({ app_id: "app_1", limit: 50 });

    const parsed = JSON.parse(res.content[0].text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].title).toBe("New Features");
    expect(listAppNews).toHaveBeenCalledWith("app_1", 50);
  });

  it("uses the default limit if not provided", async () => {
    (listAppNews as any).mockResolvedValue([]);

    const tool = registry.get("asc_get_app_news")!;
    const res = await tool.handler({ app_id: "app_1" });

    expect(listAppNews).toHaveBeenCalledWith("app_1", 50); // default
  });

  it("returns an error if credentials are missing", async () => {
    (listAppNews as any).clearMocks();
    const original = require("../../auth/jwt.js");
    original.hasCredentials.mockResolvedValueOnce(false);

    const tool = registry.get("asc_get_app_news")!;
    const res = await tool.handler({ app_id: "app_1", limit: 50 });

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("API credentials");
    expect(listAppNews).not.toHaveBeenCalled();
  });
});
```

Run the test:

```bash
npm --prefix servers/appstore-connect test -- src/tools/__tests__/asc-news.test.ts
```

Expect **FAIL** — the tool isn't registered yet.

### Step 4: Register the Tool

In `servers/appstore-connect/src/tools/asc-tools.ts`, add the import near the top (with the other API imports):

```typescript
import { listAppNews } from "../api/news.js";
import { AscGetAppNewsSchema } from "./schemas.js";
```

Then, inside the `registerAscTools` function, append the tool registration:

```typescript
export function registerAscTools(server: McpServer): void {
  // ... existing tools ...

  // --- asc_get_app_news ---
  server.tool(
    "asc_get_app_news",
    "List recent news entries for an app",
    AscGetAppNewsSchema.shape,
    async ({ app_id, limit }) => {
      try {
        if (!(await hasCredentials())) return noCredentialsError();

        const news = await listAppNews(app_id, limit);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(news, null, 2),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching news: ${e.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
```

**Pattern:**

- Check `hasCredentials()` first — every ASC tool must verify auth.
- Call the API wrapper with validated arguments.
- Return `{ content: [{ type: "text", text: JSON.stringify(...) }] }` on success.
- Return `{ content: [...], isError: true }` on failure.

Run the MCP test again:

```bash
npm --prefix servers/appstore-connect test -- src/tools/__tests__/asc-news.test.ts
```

Expect **PASS**.

### Step 5: History-Resilience Test (Mutators Only)

The `asc_get_app_news` tool is a **reader** — it doesn't mutate state. Readers don't need a resilience test.

However, if you're adding a **mutator** (a tool that changes App Store Connect state), you must write a resilience test to verify that the API call succeeds even if the history log write fails.

**Example: if you were adding `asc_update_app_news`** (hypothetical mutator), you'd create `src/tools/__tests__/asc-update-news-resilience.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../../api/news.js", () => ({
  updateAppNews: vi.fn().mockResolvedValue({ id: "n_1", title: "Updated" }),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("token"),
}));
vi.mock("../../store/history.js", () => ({
  appendHistoryEntry: vi.fn().mockRejectedValue(new Error("disk full")),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";

let tempDir: string;
let originalCwd: string;
let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(async () => {
  originalCwd = process.cwd();
  tempDir = await mkdtemp(join(tmpdir(), "news-res-"));
  process.chdir(tempDir);
  await mkdir(join(tempDir, ".appstore"), { recursive: true });

  const server = new McpServer({ name: "test", version: "0.0.0" });
  registry = new Map();
  const o = (server.tool as any).bind(server);
  (server.tool as any) = (n: string, ...r: any[]) =>
    (registry.set(n, { handler: r[r.length - 1] }), o(n, ...r));
  registerAscTools(server);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
});

describe("asc_update_app_news history resilience", () => {
  it("returns success even when history append throws", async () => {
    const tool = registry.get("asc_update_app_news")!;
    const res = await tool.handler({
      app_id: "app_1",
      news_id: "n_1",
      title: "Updated Title",
    });

    expect(res.isError).not.toBe(true);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.title).toBe("Updated");
  });
});
```

**Why resilience tests?** If a mutator fails to append to the history log (disk full, permission denied, etc.), the tool should still return the API success to the user. The history is best-effort. See [../concepts/history-and-audit.md](../concepts/history-and-audit.md) for the design rationale.

In the actual tool registration, wrap the history append in try/catch:

```typescript
server.tool("asc_update_app_news", "Update a news entry", /*...*/, async ({ app_id, news_id, title }) => {
  try {
    if (!(await hasCredentials())) return noCredentialsError();

    const updated = await updateAppNews(app_id, news_id, title);

    // Best-effort history; don't fail the API call if this fails
    try {
      await appendHistoryEntry("pushes", {
        tool: "asc_update_app_news",
        target: { app_id, news_id },
        payload: { title },
        result: "success",
      });
    } catch {
      // Logged separately, not fatal
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(updated, null, 2) }],
    };
  } catch (e: any) {
    return {
      content: [{ type: "text" as const, text: `Error: ${e.message}` }],
      isError: true,
    };
  }
});
```

---

## Variations: Tools That Don't Talk to ASC

Some tools are **local-only** — they read from `.appstore/` without calling App Store Connect. Examples:

- `assets_validate_dimensions` — checks PNG/MP4 dimensions against the device catalog
- `audit_prepare_cross_surface` — builds a prompt from local store contents
- `store_read_metadata` — reads a field from the local store

For local-only tools, **skip Step 2** (no API wrapper). The implementation can live in:

1. **A helper module** (if it's complex logic), e.g. `src/tools/assets-validate.ts`
2. **Inline in the registration** (if it's simple), directly in `asc-tools.ts` or `store-tools.ts`

Then follow Steps 3–4 normally: write the test, register the tool.

**Example: `assets_validate_dimensions` (local-only, complex logic)**

1. Create `src/tools/assets-validate.ts` with the validation logic
2. Write tests in `src/tools/__tests__/assets-validate.test.ts`
3. Register in `registerAscTools()`, importing from the helper module
4. No API wrapper, no resilience test (readers don't need resilience)

---

## Common Operations: Quick Reference

### New App Store Connect Endpoint

1. Add schema in `schemas.ts` → 
2. Create wrapper in `src/api/<resource>.ts` with tests →
3. Write MCP tool test in `__tests__/<name>.test.ts` →
4. Register in `asc-tools.ts` →
5. If mutator, add `<name>-resilience.test.ts`

### New Store File (Local Data)

1. Define types in `src/store/types.ts`
2. Create helper in `src/store/<file>.ts` (read/write functions)
3. Write tests
4. Register tool(s) in `store-tools.ts`
5. Document in `metadata/{locale}/...` structure if user-facing

### New Audit Phase

1. Extend `audit_prepare_cross_surface` in `src/tools/audit-prepare.ts`
2. Update `src/tools/__tests__/audit-prepare.test.ts`
3. Update `skills/audit/SKILL.md` with the new phase

### New Asset Specification

1. Add entry to `src/data/asc-asset-specs.json`
2. Update the inline snapshot in `src/data/__tests__/asc-asset-specs.test.ts` (run `npm test -- -u`)
3. Update the human-readable device name in documentation

### New Privacy or Review Phrase Rule

1. Add JSON entry to `src/data/privacy-taxonomy.json` or `review-phrase-rules.json`
2. Update the snapshot test (run `npm test -- -u`)
3. Commit both the data file and the snapshot diff

---

## Naming Conventions

Follow these naming patterns for clarity:

| Pattern | Purpose | Examples |
|---------|---------|----------|
| `asc_<verb>_<resource>` | App Store Connect API wrappers | `asc_get_app`, `asc_list_builds`, `asc_set_pricing` |
| `store_<verb>_<file>` | Local store helpers | `store_read_metadata`, `store_write_listing` |
| `assets_<verb>_<noun>` | Asset validation/manipulation | `assets_validate_dimensions`, `assets_render_template` |
| `audit_<verb>_<noun>` | Audit-phase tools | `audit_prepare_cross_surface` |

**Verbs:** `get` (single read), `list` (multiple read), `set` (overwrite), `update` (patch), `upload`, `attach`, `delete`, `submit`, `create`, `read`, `write`, `validate`, `render`, `prepare`, `clear`.

---

## Full Test Run

Once you've completed all steps, run the full test suite:

```bash
npm --prefix servers/appstore-connect test
```

All tests should pass. Then:

1. **Commit the changes:**

```bash
git add src/tools/schemas.ts \
        src/api/news.ts src/api/__tests__/news.test.ts \
        src/tools/asc-tools.ts \
        src/tools/__tests__/asc-news.test.ts
git commit -m "Add asc_get_app_news MCP tool"
```

2. **Update documentation** (if the tool is user-facing):

- Add an entry to `docs/reference/mcp-tools.md` under the appropriate category
- Update the tool count in `docs/concepts/architecture.md` if needed
- If a skill uses this tool, update `docs/reference/commands.md`

---

## Reference: Test Patterns

### Mocking ascRequest (API Wrapper Tests)

```typescript
vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
}));
import { ascRequest } from "../client.js";

(ascRequest as any).mockResolvedValue({
  data: [ /* JSONAPI response */ ],
});
```

### Mocking API Wrapper (MCP Tool Tests)

```typescript
vi.mock("../../api/news.js", () => ({
  listAppNews: vi.fn(),
}));
import { listAppNews } from "../../api/news.js";

(listAppNews as any).mockResolvedValue([ /* clean interface */ ]);
```

### Mocking Auth (Every MCP Tool Test)

```typescript
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("token"),
}));
```

### Capturing Tool Handlers (MCP Tool Tests)

```typescript
const registry = new Map();
const server = new McpServer({ name: "t", version: "0.0.0" });
const o = (server.tool as any).bind(server);
(server.tool as any) = (name: string, ...rest: any[]) =>
  (registry.set(name, { handler: rest[rest.length - 1] }), o(name, ...rest));

registerAscTools(server);
const tool = registry.get("asc_get_app_news")!;
const res = await tool.handler({ app_id: "app_1", limit: 50 });
```

### History Resilience (Mutator Tests)

```typescript
vi.mock("../../store/history.js", () => ({
  appendHistoryEntry: vi.fn().mockRejectedValue(new Error("disk full")),
}));
// ... set up temp dir, register tools ...
// Call the tool, expect success despite history failure
expect(res.isError).not.toBe(true);
```

---

## See Also

- [../concepts/architecture.md](../concepts/architecture.md) — Three-layer model and tool categories
- [../concepts/history-and-audit.md](../concepts/history-and-audit.md) — Why history is best-effort
- [../reference/mcp-tools.md](../reference/mcp-tools.md) — Full list of 51 tools
- [../contributing/development.md](development.md) — Setup, build, and test commands
