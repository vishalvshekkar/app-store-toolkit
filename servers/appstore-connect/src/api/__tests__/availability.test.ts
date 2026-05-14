import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAppAvailability } from "../availability.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));
import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAppAvailability", () => {
  it("posts an availability with the supplied territories (alpha-3)", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "av_1", attributes: {} } });

    await setAppAvailability("app_1", ["US", "GB", "DE"]);

    const call = (ascRequest as any).mock.calls[0];
    expect(call[0]).toBe("/v2/appAvailabilities");
    expect(call[1].method).toBe("POST");
    const territories = call[1].body.data.relationships.availableTerritories.data;
    expect(territories.map((t: any) => t.id)).toEqual(["USA", "GBR", "DEU"]);
  });
});
