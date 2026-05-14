import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateVersionLocalization } from "../versions.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("updateVersionLocalization", () => {
  it("forwards marketingUrl and supportUrl in the PATCH body", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "vl_1", attributes: { locale: "en-US" } },
    });

    await updateVersionLocalization("vl_1", {
      marketingUrl: "https://example.com",
      supportUrl: "https://example.com/support",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.marketingUrl).toBe("https://example.com");
    expect(body.data.attributes.supportUrl).toBe("https://example.com/support");
  });

  it("still supports the existing description/keywords/promo/whatsNew fields", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "vl_1", attributes: { locale: "en-US" } } });

    await updateVersionLocalization("vl_1", {
      description: "desc",
      keywords: "k1,k2",
      promotionalText: "promo",
      whatsNew: "new",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.description).toBe("desc");
    expect(body.data.attributes.keywords).toBe("k1,k2");
  });
});
