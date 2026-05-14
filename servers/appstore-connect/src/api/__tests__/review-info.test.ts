import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAppStoreReviewDetail } from "../review-info.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAppStoreReviewDetail", () => {
  it("PATCHes contact + demo + notes", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "rd_1", attributes: {} } });

    await setAppStoreReviewDetail("rd_1", {
      contact: { firstName: "V", lastName: "S", email: "v@example.com", phone: "+1" },
      demo: { required: true, username: "demo", password: "secret" },
      notes: "Use demo account",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.type).toBe("appStoreReviewDetails");
    expect(body.data.attributes.contactFirstName).toBe("V");
    expect(body.data.attributes.contactEmail).toBe("v@example.com");
    expect(body.data.attributes.demoAccountRequired).toBe(true);
    expect(body.data.attributes.demoAccountName).toBe("demo");
    expect(body.data.attributes.demoAccountPassword).toBe("secret");
    expect(body.data.attributes.notes).toBe("Use demo account");
  });

  it("omits demo username/password when not required", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "rd_1", attributes: {} } });

    await setAppStoreReviewDetail("rd_1", {
      contact: { firstName: "V", lastName: "S", email: "v@example.com", phone: "+1" },
      demo: { required: false },
      notes: "",
    });

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.attributes.demoAccountRequired).toBe(false);
    expect(body.data.attributes.demoAccountName).toBeUndefined();
    expect(body.data.attributes.demoAccountPassword).toBeUndefined();
  });
});
