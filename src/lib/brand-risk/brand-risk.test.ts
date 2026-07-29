import { describe, expect, it } from "vitest";
import { assessBrandRisk, levenshtein } from "@/lib/brand-risk";

describe("brand risk", () => {
  it("calculates Levenshtein distance", () => {
    expect(levenshtein("notion", "notian")).toBe(1);
    expect(levenshtein("casa", "casa")).toBe(0);
  });

  it("marks a known brand collision as high risk", () => {
    expect(assessBrandRisk("Spotify").level).toBe("high");
  });

  it("always includes the legal disclaimer", () => {
    expect(assessBrandRisk("Lumera").disclaimer).toContain("no confirma");
  });
});
