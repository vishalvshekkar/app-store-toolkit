import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAppPriceSchedule } from "../pricing.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));

import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAppPriceSchedule", () => {
  it("creates a manual schedule with a base USA tier when no overrides", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "sch_1", attributes: {} } });

    await setAppPriceSchedule("app_1", { defaultTier: 0, perTerritory: [] });

    const call = (ascRequest as any).mock.calls[0];
    expect(call[0]).toBe("/v1/appPriceSchedules");
    expect(call[1].method).toBe("POST");
    expect(call[1].body.data.type).toBe("appPriceSchedules");
    expect(call[1].body.data.relationships.app.data.id).toBe("app_1");
    const manualPrices = call[1].body.data.relationships.manualPrices.data;
    expect(manualPrices).toHaveLength(1);
    expect(manualPrices[0].id).toContain("0_USA");
  });

  it("includes per-territory overrides", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "sch_1", attributes: {} } });

    await setAppPriceSchedule("app_1", {
      defaultTier: 0,
      perTerritory: [
        { territory: "GB", priceTier: 1 },
        { territory: "DE", priceTier: 2 },
      ],
    });

    const manualPrices = (ascRequest as any).mock.calls[0][1].body.data.relationships.manualPrices.data;
    const ids = manualPrices.map((p: any) => p.id);
    expect(ids).toContain("0_USA");
    expect(ids).toContain("1_GBR");
    expect(ids).toContain("2_DEU");
  });
});
