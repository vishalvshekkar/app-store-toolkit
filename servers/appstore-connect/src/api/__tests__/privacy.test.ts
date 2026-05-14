import { describe, it, expect, vi, beforeEach } from "vitest";
import { replaceAppDataUsages } from "../privacy.js";
import type { PrivacyResponses } from "../../store/types.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("replaceAppDataUsages", () => {
  it("deletes existing usages then posts new ones", async () => {
    (ascRequest as any).mockResolvedValueOnce({
      data: [{ id: "du_old1" }, { id: "du_old2" }],
    });
    (ascRequest as any).mockResolvedValue({ data: [] });

    const cfg: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        {
          type: "CRASH_DATA",
          linkedToUser: false,
          usedForTracking: false,
          purposes: ["ANALYTICS"],
        },
      ],
    };

    await replaceAppDataUsages("app_1", cfg);

    const calls = (ascRequest as any).mock.calls;
    expect(calls[0][0]).toBe("/v1/apps/app_1/dataUsages");
    const deletes = calls.filter((c: any) => c[1]?.method === "DELETE");
    expect(deletes).toHaveLength(2);
    const posts = calls.filter((c: any) => c[1]?.method === "POST");
    expect(posts.length).toBeGreaterThan(0);
    const post = posts[0][1].body.data;
    expect(post.type).toBe("appDataUsages");
    expect(post.relationships.app.data.id).toBe("app_1");
  });

  it("posts no usages when collectsData is false", async () => {
    (ascRequest as any).mockResolvedValueOnce({ data: [] });
    const cfg: PrivacyResponses = {
      collectsData: false,
      tracking: { enabled: false, domains: [] },
      dataTypes: [],
    };
    await replaceAppDataUsages("app_1", cfg);
    const calls = (ascRequest as any).mock.calls;
    const posts = calls.filter((c: any) => c[1]?.method === "POST");
    expect(posts).toHaveLength(0);
  });

  it("uses DATA_USED_TO_TRACK_YOU for data types flagged usedForTracking", async () => {
    (ascRequest as any).mockResolvedValueOnce({ data: [] });
    (ascRequest as any).mockResolvedValue({ data: [] });
    const cfg: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: false, domains: [] },
      dataTypes: [
        { type: "ADVERTISING_DATA", linkedToUser: true, usedForTracking: true, purposes: ["THIRD_PARTY_ADVERTISING"] },
      ],
    };
    await replaceAppDataUsages("app_1", cfg);
    const posts = (ascRequest as any).mock.calls.filter((c: any) => c[1]?.method === "POST");
    expect(posts[0][1].body.data.attributes.dataProtection).toBe("DATA_USED_TO_TRACK_YOU");
  });

  it("posts a tracking-domain usage for each domain when tracking.enabled", async () => {
    (ascRequest as any).mockResolvedValueOnce({ data: [] });
    (ascRequest as any).mockResolvedValue({ data: [] });
    const cfg: PrivacyResponses = {
      collectsData: true,
      tracking: { enabled: true, domains: ["analytics.example.com", "ads.example.com"] },
      dataTypes: [],
    };
    await replaceAppDataUsages("app_1", cfg);
    const calls = (ascRequest as any).mock.calls;
    const trackingPosts = calls.filter(
      (c: any) =>
        c[1]?.method === "POST" &&
        c[1]?.body?.data?.attributes?.dataProtection === "DATA_USED_TO_TRACK_YOU"
    );
    expect(trackingPosts).toHaveLength(2);
  });
});
