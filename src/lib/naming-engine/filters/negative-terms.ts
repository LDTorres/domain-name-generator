import { problematicTerms } from "@/data";
import { normalizeName } from "@/lib/naming-engine/phonetics";
import type { NegativeRisk } from "@/types/naming";

export function detectNegativeTerms(
  value: string,
  extraTerms: readonly string[] = []
): NegativeRisk {
  const normalized = normalizeName(value);
  const terms = [...problematicTerms, ...extraTerms]
    .map(normalizeName)
    .filter((term) => term.length >= 3);
  const exactMatches = terms.filter((term) => normalized === term);
  const fragments = terms.filter(
    (term) => normalized !== term && normalized.includes(term) && term.length >= 4
  );
  const uniqueFragments = [...new Set(fragments)].slice(0, 5);

  if (exactMatches.length > 0) {
    return { level: "high", matches: [...new Set(exactMatches)], fragments: [], penalty: 55 };
  }
  if (uniqueFragments.length > 0) {
    const penalty = Math.min(45, 20 + uniqueFragments.length * 5);
    return { level: "medium", matches: [], fragments: uniqueFragments, penalty };
  }
  return { level: "none", matches: [], fragments: [], penalty: 0 };
}
