import { linguisticRoots } from "@/data";
import { assessBrandRisk } from "@/lib/brand-risk";
import { detectNegativeTerms } from "@/lib/naming-engine/filters/negative-terms";
import {
  buildGeneratorContext,
  generationStrategies
} from "@/lib/naming-engine/generators";
import { normalizeName, validatePhonetics } from "@/lib/naming-engine/phonetics";
import { SeededRandom } from "@/lib/naming-engine/random/seeded-random";
import { generationConfigSchema, type GenerationConfig } from "@/lib/naming-engine/schema";
import { scoreCandidate } from "@/lib/naming-engine/scoring";
import type { GeneratedCandidate, GenerationResult } from "@/types/naming";

export const ENGINE_VERSION = "1";

export function generateNames(input: GenerationConfig): GenerationResult {
  const config = generationConfigSchema.parse(input);
  const random = new SeededRandom(config.seed);
  const context = buildGeneratorContext(config, linguisticRoots, random);
  const candidates = new Map<string, GeneratedCandidate>();
  let rejectedCount = 0;
  let duplicateCount = 0;
  const maxAttempts = config.count * 100;

  for (let attempt = 0; attempt < maxAttempts && candidates.size < config.count; attempt += 1) {
    const strategy = generationStrategies[attempt % generationStrategies.length]!;
    const raw = strategy.generate(context);
    const normalized = normalizeName(raw.name);
    const phonetics = validatePhonetics(raw.name, {
      minLength: config.minLength,
      maxLength: config.maxLength,
      maxSyllables: config.maxSyllables,
      forbiddenSequences: config.forbiddenSequences,
      forbiddenWords: config.forbiddenWords
    });

    if (!phonetics.valid) {
      rejectedCount += 1;
      continue;
    }
    if (candidates.has(normalized)) {
      duplicateCount += 1;
      continue;
    }

    const negativeRisk = detectNegativeTerms(normalized);
    const brandRisk = assessBrandRisk(normalized);
    const scoring = scoreCandidate({
      name: raw.name,
      origin: raw.origin,
      concepts: config.concepts,
      minLength: config.minLength,
      maxLength: config.maxLength,
      syllableCount: phonetics.syllableCount,
      negativeRisk,
      brandRisk
    });
    candidates.set(normalized, {
      name: raw.name,
      normalized,
      score: scoring.total,
      scores: scoring.scores,
      scoreExplanation: scoring.explanation,
      meaning: raw.meaning,
      origin: raw.origin,
      pronunciation: raw.pronunciation,
      syllableCount: phonetics.syllableCount,
      strategy: raw.strategy,
      negativeRisk,
      brandRisk
    });
  }

  const sorted = [...candidates.values()].sort(
    (left, right) =>
      right.score - left.score ||
      right.scores.distinctiveness - left.scores.distinctiveness ||
      left.name.localeCompare(right.name)
  );

  return {
    seed: config.seed,
    engineVersion: ENGINE_VERSION,
    generatedCount: sorted.length,
    rejectedCount,
    duplicateCount,
    candidates: sorted.slice(0, 100)
  };
}

export type { GenerationConfig } from "@/lib/naming-engine/schema";
export type {
  GeneratedCandidate,
  GenerationResult,
  CandidateScores
} from "@/types/naming";
