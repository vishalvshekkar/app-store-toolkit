import { describe, it, expect, vi, beforeEach } from "vitest";
import { setBuildEncryption } from "../encryption.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setBuildEncryption", () => {
  it("PATCHes usesNonExemptEncryption=false when no encryption", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "b_1", attributes: {} } });
    await setBuildEncryption("b_1", { usesEncryption: false, exemptions: [] });
    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.usesNonExemptEncryption).toBe(false);
    expect(body.data.attributes.exportComplianceCode).toBeUndefined();
  });

  it("includes exportComplianceCode when encryption + exemption code provided", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "b_1", attributes: {} } });
    await setBuildEncryption("b_1", { usesEncryption: true, exemptions: ["EXEMPT-CODE-123"] });
    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.usesNonExemptEncryption).toBe(true);
    expect(body.data.attributes.exportComplianceCode).toBe("EXEMPT-CODE-123");
  });
});
