import { describe, expect, it } from "vitest";
import { combineFragments } from "@/lib/naming-engine/generators";

describe("root combinations", () => {
  it("elides a repeated boundary letter", () => {
    expect(combineFragments("terra", "aro")).toBe("terraro");
    expect(combineFragments("loc", "casa")).toBe("locasa");
  });

  it("normalizes accents and symbols before combining", () => {
    expect(combineFragments("brío", "ora")).toBe("briora");
  });
});
