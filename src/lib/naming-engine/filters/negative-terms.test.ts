import { describe, expect, it } from "vitest";
import { detectNegativeTerms } from "@/lib/naming-engine/filters/negative-terms";

describe("negative term detection", () => {
  it("marks exact negative terms as high risk", () => {
    expect(detectNegativeTerms("fraude").level).toBe("high");
  });

  it("finds accidental negative fragments without deleting the candidate", () => {
    const result = detectNegativeTerms("scamera");
    expect(result.level).toBe("medium");
    expect(result.fragments).toContain("scam");
  });

  it("keeps a neutral name clean", () => {
    expect(detectNegativeTerms("lumera").penalty).toBe(0);
  });
});
