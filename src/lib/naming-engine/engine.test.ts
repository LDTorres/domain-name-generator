import { describe, expect, it } from "vitest";
import { generateNames } from "@/lib/naming-engine";
import { generationConfigSchema } from "@/lib/naming-engine/schema";

const config = generationConfigSchema.parse({
  projectName: "NidoProps",
  description: "A global property platform for Latin America.",
  industry: "PropTech",
  concepts: ["home", "belonging", "place", "trust", "journey", "clarity"],
  keywords: ["home", "nest", "haven", "key", "place"],
  languages: ["english", "spanish", "latin", "italian", "portuguese"],
  count: 1000,
  preferredEndings: ["ora", "ia", "io", "ly", "a", "o"],
  domainExtensions: [".com", ".io"],
  seed: "acceptance-seed"
});

describe("naming engine", () => {
  it("generates at least 1000 unique valid candidates and returns the top 100", () => {
    const result = generateNames(config);
    expect(result.generatedCount).toBeGreaterThanOrEqual(1000);
    expect(result.candidates).toHaveLength(100);
    expect(new Set(result.candidates.map((candidate) => candidate.normalized)).size).toBe(100);
  });

  it("is deterministic for the same config and seed", () => {
    const first = generateNames(config);
    const second = generateNames(config);
    expect(second.candidates).toEqual(first.candidates);
  });

  it("changes output when the seed changes", () => {
    const first = generateNames(config);
    const second = generateNames({ ...config, seed: "other-seed" });
    expect(second.candidates.map((item) => item.name)).not.toEqual(
      first.candidates.map((item) => item.name)
    );
  });

  it("never emits known pathological candidates", () => {
    const invalid = new Set([
      "belonenessness",
      "officeshomethis",
      "originning",
      "2012livestream",
      "7homemorehomeif"
    ]);
    const result = generateNames(config);
    expect(result.candidates.some((candidate) => invalid.has(candidate.normalized))).toBe(false);
    expect(result.candidates.every((candidate) => /^[a-z]+$/i.test(candidate.name))).toBe(true);
  });
});
