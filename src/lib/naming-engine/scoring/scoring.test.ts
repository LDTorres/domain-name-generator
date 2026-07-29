import { describe, expect, it } from "vitest";
import { assessBrandRisk } from "@/lib/brand-risk";
import { scoreCandidate } from "@/lib/naming-engine/scoring";

describe("explainable scoring", () => {
  it("returns bounded sub-scores and a weighted total", () => {
    const result = scoreCandidate({
      name: "Lumera",
      origin: [{ root: "lux", meaning: "clarity", language: "latin" }],
      concepts: ["clarity", "trust"],
      minLength: 5,
      maxLength: 10,
      syllableCount: 3,
      negativeRisk: { level: "none", matches: [], fragments: [], penalty: 0 },
      brandRisk: assessBrandRisk("Lumera")
    });
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(Object.values(result.scores).every((value) => value >= 0 && value <= 100)).toBe(true);
    expect(result.explanation.length).toBeGreaterThan(3);
  });
});
