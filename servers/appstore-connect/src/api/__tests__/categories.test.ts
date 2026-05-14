import { describe, it, expect, vi, beforeEach } from "vitest";
import { setCategories } from "../categories.js";

vi.mock("../client.js", () => ({
  ascRequest: vi.fn(),
}));

import { ascRequest } from "../client.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setCategories", () => {
  it("sends a PATCH with primary and secondary in attributes", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ai_1", attributes: { primaryCategory: "PRODUCTIVITY", secondaryCategory: "UTILITIES" } },
    });

    const out = await setCategories("ai_1", { primary: "PRODUCTIVITY", secondary: "UTILITIES" });

    expect(ascRequest).toHaveBeenCalledWith("/v1/appInfos/ai_1", {
      method: "PATCH",
      body: {
        data: {
          type: "appInfos",
          id: "ai_1",
          attributes: {
            primaryCategory: "PRODUCTIVITY",
            secondaryCategory: "UTILITIES",
          },
        },
      },
    });
    expect(out.attributes.primaryCategory).toBe("PRODUCTIVITY");
  });

  it("omits secondaryCategory when not provided", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ai_1", attributes: { primaryCategory: "PRODUCTIVITY" } },
    });

    await setCategories("ai_1", { primary: "PRODUCTIVITY" });

    const call = (ascRequest as any).mock.calls[0][1];
    expect(call.body.data.attributes).toEqual({ primaryCategory: "PRODUCTIVITY" });
    expect(call.body.data.attributes).not.toHaveProperty("secondaryCategory");
  });
});
