import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/submission.js", () => ({
  submitForReview: vi.fn(),
  getSubmissionState: vi.fn(),
}));
vi.mock("../../auth/jwt.js", () => ({
  hasCredentials: vi.fn().mockResolvedValue(true),
  getToken: vi.fn().mockResolvedValue("t"),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAscTools } from "../asc-tools.js";
import { getSubmissionState } from "../../api/submission.js";

let registry: Map<string, { handler: (args: any) => Promise<any> }>;

beforeEach(() => {
  vi.clearAllMocks();
  const server = new McpServer({ name: "t", version: "0.0.0" });
  registry = new Map();
  const o = (server.tool as any).bind(server);
  (server.tool as any) = (name: string, ...rest: any[]) =>
    (registry.set(name, { handler: rest[rest.length - 1] }), o(name, ...rest));
  registerAscTools(server);
});

describe("asc_get_submission_state", () => {
  it("returns the appStoreState", async () => {
    (getSubmissionState as any).mockResolvedValue("WAITING_FOR_REVIEW");
    const tool = registry.get("asc_get_submission_state")!;
    const res = await tool.handler({ version_id: "v_1" });
    expect(res.content[0].text).toContain("WAITING_FOR_REVIEW");
  });
});
