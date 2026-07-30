import { describe, expect, it } from "vitest";
import {
  BRAND_STYLES,
  SOUND_PROFILES,
  languagesForSoundProfile,
  resolveBasicConfiguration
} from "@/lib/configuration/profiles";
import { generationConfigSchema } from "@/lib/naming-engine/schema";
import { generateNames } from "@/lib/naming-engine";

const baseBrief = {
  projectName: "NidoProps",
  industry: "PropTech",
  description: "Plataforma segura y global para encontrar una vivienda.",
  soundProfile: "combined" as const,
  brandStyle: "warm" as const
};

describe("basic configuration profiles", () => {
  it("builds a valid deterministic configuration for all 15 combinations", () => {
    for (const soundProfile of SOUND_PROFILES) {
      for (const brandStyle of BRAND_STYLES) {
        const brief = { ...baseBrief, soundProfile, brandStyle };
        const first = resolveBasicConfiguration(brief);
        const second = resolveBasicConfiguration(brief);
        expect(generationConfigSchema.safeParse(first).success).toBe(true);
        expect(second).toEqual(first);
        expect(first.count).toBe(1000);
        expect(first.domainExtensions).toEqual([".com", ".io", ".co"]);
      }
    }
  });

  it("keeps the selected sound profile as a hard language boundary", () => {
    expect(languagesForSoundProfile("spanish")).toEqual([
      "spanish",
      "latin",
      "italian",
      "portuguese"
    ]);
    expect(languagesForSoundProfile("english")).toEqual(["english", "nordic", "latin"]);
    expect(languagesForSoundProfile("combined")).toEqual([
      "spanish",
      "english",
      "latin",
      "italian",
      "nordic"
    ]);
  });

  it("generates 1,000 local candidates and returns the top 100 without AI", () => {
    const result = generateNames(resolveBasicConfiguration(baseBrief));
    expect(result.generatedCount).toBeGreaterThanOrEqual(1000);
    expect(result.candidates).toHaveLength(100);
  });
});
