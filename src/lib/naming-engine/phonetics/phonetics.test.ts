import { describe, expect, it } from "vitest";
import {
  countSyllables,
  pronunciationAnalysis,
  removeRepeatedLetters,
  validatePhonetics
} from "@/lib/naming-engine/phonetics";

const options = {
  minLength: 5,
  maxLength: 10,
  maxSyllables: 3,
  forbiddenSequences: [],
  forbiddenWords: []
};

describe("phonetic rules", () => {
  it("counts approximate syllables", () => {
    expect(countSyllables("havora")).toBe(3);
    expect(countSyllables("nestara")).toBe(3);
    expect(countSyllables("clar")).toBe(1);
  });

  it("removes unnecessary repeated letters", () => {
    expect(removeRepeatedLetters("OrigiNNNing")).toBe("origining");
  });

  it.each([
    "belonenessness",
    "officeshomethis",
    "originning",
    "2012livestream",
    "7homemorehomeif"
  ])("rejects pathological candidate %s", (candidate) => {
    expect(validatePhonetics(candidate, options).valid).toBe(false);
  });

  it("rejects difficult consonant clusters and explicit bans", () => {
    expect(validatePhonetics("abxqera", options).valid).toBe(false);
    expect(
      validatePhonetics("casora", { ...options, forbiddenSequences: ["sor"] }).valid
    ).toBe(false);
  });

  it.each(["havora", "nidora", "locavia", "doreva"])(
    "rates a pronounceable bilingual construction %s consistently",
    (candidate) => {
      const analysis = pronunciationAnalysis(candidate, "combined");
      expect(analysis.spanish).toBeGreaterThanOrEqual(80);
      expect(analysis.english).toBeGreaterThanOrEqual(80);
      expect(analysis.spelling).toBeGreaterThanOrEqual(75);
      expect(analysis.sound).toBeGreaterThanOrEqual(75);
    }
  );
});
