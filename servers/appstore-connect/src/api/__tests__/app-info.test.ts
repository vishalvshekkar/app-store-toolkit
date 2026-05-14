import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateAppInfoLocalization } from "../app-info.js";

vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
  ascRequestAllPages: vi.fn(),
}));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("updateAppInfoLocalization", () => {
  it("forwards privacyPolicyUrl in the PATCH attributes", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ail_1", attributes: { locale: "en-US" } },
    });

    await updateAppInfoLocalization("ail_1", {
      privacyPolicyUrl: "https://example.com/privacy",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.privacyPolicyUrl).toBe("https://example.com/privacy");
  });

  it("still supports name and subtitle alongside the new field", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ail_1", attributes: { locale: "en-US" } },
    });

    await updateAppInfoLocalization("ail_1", {
      name: "Cool App",
      subtitle: "The cool one",
      privacyPolicyUrl: "https://example.com/privacy",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.name).toBe("Cool App");
    expect(body.data.attributes.subtitle).toBe("The cool one");
    expect(body.data.attributes.privacyPolicyUrl).toBe("https://example.com/privacy");
  });
});
