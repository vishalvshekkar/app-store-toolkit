import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));

import { ascRequest } from "../client.js";
import { setReleaseStrategy, createVersion } from "../release.js";

beforeEach(() => vi.clearAllMocks());

describe("setReleaseStrategy", () => {
  it("PATCHes releaseType=AFTER_APPROVAL", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "v_1", attributes: {} } });
    await setReleaseStrategy("v_1", { type: "AFTER_APPROVAL" });
    expect(ascRequest).toHaveBeenCalledWith("/v1/appStoreVersions/v_1", {
      method: "PATCH",
      body: {
        data: {
          type: "appStoreVersions",
          id: "v_1",
          attributes: { releaseType: "AFTER_APPROVAL" },
        },
      },
    });
  });

  it("PATCHes releaseType=SCHEDULED with earliestReleaseDate", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "v_1", attributes: {} } });
    await setReleaseStrategy("v_1", { type: "SCHEDULED", earliestReleaseDate: "2026-06-01T00:00:00Z" });
    const call = (ascRequest as any).mock.calls[0][1];
    expect(call.body.data.attributes).toEqual({
      releaseType: "SCHEDULED",
      earliestReleaseDate: "2026-06-01T00:00:00Z",
    });
  });

  it("PATCHes releaseType=MANUAL without earliestReleaseDate", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "v_1", attributes: {} } });
    await setReleaseStrategy("v_1", { type: "MANUAL" });
    const call = (ascRequest as any).mock.calls[0][1];
    expect(call.body.data.attributes).not.toHaveProperty("earliestReleaseDate");
  });
});

describe("createVersion", () => {
  it("POSTs /v1/appStoreVersions with the right relationships", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "v_2", attributes: { versionString: "1.1.0" } } });
    const out = await createVersion({ appId: "app_1", versionString: "1.1.0", platform: "IOS" });
    expect(ascRequest).toHaveBeenCalledWith("/v1/appStoreVersions", {
      method: "POST",
      body: {
        data: {
          type: "appStoreVersions",
          attributes: { versionString: "1.1.0", platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: "app_1" } } },
        },
      },
    });
    expect(out.id).toBe("v_2");
  });
});
