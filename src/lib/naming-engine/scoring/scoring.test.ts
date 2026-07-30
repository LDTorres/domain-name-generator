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

  it("penalizes an exact generic word against a brandable construction", () => {
    const base = {
      origin: [
        {
          root: "casa",
          meaning: "home",
          language: "spanish" as const,
          categories: ["home"],
          preferredEndings: ["ora"]
        }
      ],
      concepts: ["home", "belonging"],
      minLength: 5,
      maxLength: 10,
      syllableCount: 3,
      soundProfile: "combined" as const,
      strategy: "keyword-suffix" as const,
      negativeRisk: { level: "none" as const, matches: [], fragments: [], penalty: 0 }
    };
    const generic = scoreCandidate({
      ...base,
      name: "Casera",
      brandRisk: assessBrandRisk("Casera")
    });
    const brandable = scoreCandidate({
      ...base,
      name: "Casora",
      brandRisk: assessBrandRisk("Casora")
    });
    expect(brandable.scores.distinctiveness).toBeGreaterThan(generic.scores.distinctiveness);
    expect(brandable.total).toBeGreaterThan(generic.total);
  });
});
