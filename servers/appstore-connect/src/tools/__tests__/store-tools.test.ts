import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStoreTools } from "../store-tools.js";

describe("registerStoreTools", () => {
  it("registers the new listing/privacy/review tools alongside existing ones", () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const toolSpy = vi.spyOn(server, "tool");
    registerStoreTools(server);
    const registeredNames = toolSpy.mock.calls.map((c) => c[0]);
    expect(registeredNames).toContain("store_read_listing");
    expect(registeredNames).toContain("store_write_listing");
    expect(registeredNames).toContain("store_read_privacy");
    expect(registeredNames).toContain("store_write_privacy");
    expect(registeredNames).toContain("store_read_review");
    expect(registeredNames).toContain("store_write_review");
  });
});
