import { describe, expect, it } from "vitest";
import {
  linguisticRoots,
  patterns,
  prefixes,
  presets,
  problematicTerms,
  suffixes
} from "@/data";

describe("initial datasets", () => {
  it("meets the minimum catalog sizes", () => {
    expect(linguisticRoots.length).toBeGreaterThanOrEqual(150);
    expect(suffixes.length).toBeGreaterThanOrEqual(50);
    expect(prefixes.length).toBeGreaterThanOrEqual(30);
    expect(problematicTerms.length).toBeGreaterThanOrEqual(100);
    expect(patterns.length).toBeGreaterThanOrEqual(50);
    expect(presets.length).toBeGreaterThanOrEqual(10);
  });

  it("contains roots for all eight requested language sources", () => {
    expect(new Set(linguisticRoots.map((root) => root.language)).size).toBe(8);
  });
});
