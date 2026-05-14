import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAgeRatingDeclaration } from "../age-rating.js";

vi.mock("../client.js", () => ({ ascRequest: vi.fn() }));

import { ascRequest } from "../client.js";

beforeEach(() => vi.clearAllMocks());

describe("setAgeRatingDeclaration", () => {
  it("converts UPPER_SNAKE question ids to camelCase attributes", async () => {
    (ascRequest as any).mockResolvedValue({ data: { id: "ar_1", attributes: {} } });

    await setAgeRatingDeclaration("ar_1", [
      { questionId: "VIOLENCE_CARTOON_OR_FANTASY", level: "NONE" },
      { questionId: "GAMBLING_AND_CONTESTS", level: "NONE" },
    ]);

    const body = (ascRequest as any).mock.calls[0][1].body;
    expect(body.data.type).toBe("ageRatingDeclarations");
    expect(body.data.attributes).toEqual({
      violenceCartoonOrFantasy: "NONE",
      gamblingAndContests: "NONE",
    });
  });

  it("returns the updated declaration", async () => {
    (ascRequest as any).mockResolvedValue({
      data: { id: "ar_1", attributes: { violenceCartoonOrFantasy: "NONE" } },
    });
    const out = await setAgeRatingDeclaration("ar_1", [
      { questionId: "VIOLENCE_CARTOON_OR_FANTASY", level: "NONE" },
    ]);
    expect(out.id).toBe("ar_1");
  });
});
