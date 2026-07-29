import { patterns } from "@/data";
import {
  normalizeName,
  phoneticPattern,
  pronunciationPredictability
} from "@/lib/naming-engine/phonetics";
import type {
  BrandRiskResult,
  CandidateOrigin,
  CandidateScores,
  NegativeRisk
} from "@/types/naming";

const WEIGHTS: Record<keyof CandidateScores, number> = {
  memorability: 0.12,
  spanishPronunciation: 0.1,
  englishPronunciation: 0.1,
  spelling: 0.09,
  length: 0.08,
  sound: 0.1,
  distinctiveness: 0.1,
  conceptualFit: 0.1,
  internationalFit: 0.08,
  confusionRisk: 0.06,
  negativeMeaningRisk: 0.04,
  domainAvailability: 0.03
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function lengthScore(length: number, minimum: number, maximum: number): number {
  const center = (minimum + maximum) / 2;
  const distance = Math.abs(length - center);
  return clamp(100 - distance * 11);
}

export function scoreCandidate(input: {
  name: string;
  origin: CandidateOrigin[];
  concepts: string[];
  minLength: number;
  maxLength: number;
  syllableCount: number;
  negativeRisk: NegativeRisk;
  brandRisk: BrandRiskResult;
}): { total: number; scores: CandidateScores; explanation: string[] } {
  const normalized = normalizeName(input.name);
  const pattern = phoneticPattern(normalized);
  const alternatingRatio =
    normalized.length <= 1
      ? 0
      : pattern
          .slice(1)
          .split("")
          .filter((character, index) => character !== pattern[index]).length /
        (pattern.length - 1);
  const conceptualTokens = new Set(input.concepts.map(normalizeName));
  const conceptualMatches = input.origin.filter((origin) =>
    [...conceptualTokens].some(
      (concept) =>
        normalizeName(origin.meaning).includes(concept) ||
        concept.includes(normalizeName(origin.meaning))
    )
  ).length;
  const predictability = pronunciationPredictability(normalized);
  const knownPattern = patterns.includes(pattern);
  const rareLetters = (normalized.match(/[qxwyj]/g) ?? []).length;
  const repeated = (normalized.match(/(.)\1/g) ?? []).length;
  const brandPenalty =
    input.brandRisk.level === "high" ? 55 : input.brandRisk.level === "medium" ? 25 : 0;

  const scores: CandidateScores = {
    memorability: clamp(88 - Math.abs(normalized.length - 7) * 6 - repeated * 8),
    spanishPronunciation: clamp(predictability - (normalized.match(/[wky]/g) ?? []).length * 5),
    englishPronunciation: clamp(predictability - (normalized.match(/[ñj]/g) ?? []).length * 8),
    spelling: clamp(predictability - rareLetters * 3),
    length: lengthScore(normalized.length, input.minLength, input.maxLength),
    sound: clamp(55 + alternatingRatio * 40 + (/[aeiou]$/.test(normalized) ? 5 : 0)),
    distinctiveness: clamp(78 + rareLetters * 4 - repeated * 10 - brandPenalty),
    conceptualFit: clamp(58 + conceptualMatches * 16 + Math.min(18, input.origin.length * 5)),
    internationalFit: clamp(
      92 - rareLetters * 5 - Math.max(0, input.syllableCount - 2) * 6
    ),
    confusionRisk: clamp(100 - brandPenalty - (predictability < 70 ? 15 : 0)),
    negativeMeaningRisk: clamp(100 - input.negativeRisk.penalty),
    domainAvailability: 50
  };

  if (knownPattern) scores.sound = clamp(scores.sound + 5);

  const total = clamp(
    (Object.keys(scores) as Array<keyof CandidateScores>).reduce(
      (sum, key) => sum + scores[key] * WEIGHTS[key],
      0
    )
  );
  const explanation = [
    `Longitud de ${normalized.length} caracteres y ${input.syllableCount} sílabas aproximadas.`,
    knownPattern
      ? `Patrón fonético ${pattern} presente en el catálogo válido.`
      : `Patrón fonético ${pattern} evaluado por alternancia.`,
    conceptualMatches > 0
      ? `${conceptualMatches} raíz(es) se relacionan directamente con los conceptos.`
      : "La relación conceptual es indirecta.",
    input.negativeRisk.penalty > 0
      ? `Penalización de ${input.negativeRisk.penalty} por connotaciones problemáticas.`
      : "Sin connotaciones problemáticas locales detectadas.",
    "La disponibilidad de dominio permanece neutral hasta una consulta bajo demanda."
  ];

  return { total, scores, explanation };
}
