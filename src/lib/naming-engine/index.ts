import { linguisticRoots } from "@/data";
import { assessBrandRisk } from "@/lib/brand-risk";
import { detectNegativeTerms } from "@/lib/naming-engine/filters/negative-terms";
import {
  buildCuratedCandidates,
  buildGeneratorContext,
  generationStrategies
} from "@/lib/naming-engine/generators";
import { normalizeName, validatePhonetics } from "@/lib/naming-engine/phonetics";
import { SeededRandom } from "@/lib/naming-engine/random/seeded-random";
import { generationConfigSchema, type GenerationConfig } from "@/lib/naming-engine/schema";
import { scoreCandidate } from "@/lib/naming-engine/scoring";
import type { GeneratedCandidate, GenerationResult } from "@/types/naming";

export const ENGINE_VERSION = "2";

function meetsDisplayQuality(
  candidate: GeneratedCandidate,
  soundProfile: GenerationConfig["soundProfile"]
): boolean {
  const primaryPronunciation =
    soundProfile === "spanish"
      ? candidate.scores.spanishPronunciation
      : soundProfile === "english"
        ? candidate.scores.englishPronunciation
        : Math.min(
            candidate.scores.spanishPronunciation,
            candidate.scores.englishPronunciation
          );
  const secondaryPronunciation =
    soundProfile === "spanish"
      ? candidate.scores.englishPronunciation
      : soundProfile === "english"
        ? candidate.scores.spanishPronunciation
        : primaryPronunciation;

  return (
    candidate.score >= 72 &&
    primaryPronunciation >= 72 &&
    secondaryPronunciation >= 52 &&
    candidate.scores.spelling >= 68 &&
    candidate.scores.sound >= 68 &&
    candidate.scores.conceptualFit >= 60 &&
    candidate.scores.negativeMeaningRisk >= 65
  );
}

function selectDiverseCandidates(candidates: GeneratedCandidate[]): GeneratedCandidate[] {
  const selected: GeneratedCandidate[] = [];
  const selectedNames = new Set<string>();
  const rootCounts = new Map<string, number>();
  const strategyCounts = new Map<string, number>();

  for (const candidate of candidates) {
    const primaryRoot = normalizeName(candidate.origin.find((origin) => origin.language)?.root ?? "");
    const rootCount = rootCounts.get(primaryRoot) ?? 0;
    const strategyCount = strategyCounts.get(candidate.strategy) ?? 0;
    if (rootCount >= 4 || strategyCount >= 35) continue;

    selected.push(candidate);
    selectedNames.add(candidate.normalized);
    rootCounts.set(primaryRoot, rootCount + 1);
    strategyCounts.set(candidate.strategy, strategyCount + 1);
    if (selected.length === 100) return selected;
  }

  for (const candidate of candidates) {
    if (selectedNames.has(candidate.normalized)) continue;
    selected.push(candidate);
    if (selected.length === 100) break;
  }
  return selected;
}

export function generateNames(input: GenerationConfig): GenerationResult {
  const config = generationConfigSchema.parse(input);
  const random = new SeededRandom(config.seed);
  const context = buildGeneratorContext(config, linguisticRoots, random);
  const candidates = new Map<string, GeneratedCandidate>();
  let rejectedCount = 0;
  let duplicateCount = 0;
  const poolTarget = Math.min(15_000, config.count * 3);
  const maxAttempts = poolTarget * 120;

  const consider = (raw: ReturnType<(typeof generationStrategies)[number]["generate"]>): void => {
    const normalized = normalizeName(raw.name);
    const phonetics = validatePhonetics(raw.name, {
      minLength: config.minLength,
      maxLength: config.maxLength,
      maxSyllables: config.maxSyllables,
      forbiddenSequences: config.forbiddenSequences,
      forbiddenWords: config.forbiddenWords,
      soundProfile: config.soundProfile
    });

    if (!phonetics.valid) {
      rejectedCount += 1;
      return;
    }
    if (candidates.has(normalized)) {
      duplicateCount += 1;
      return;
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
      soundProfile: config.soundProfile,
      strategy: raw.strategy,
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
  };

  for (const raw of buildCuratedCandidates(context)) {
    consider(raw);
  }

  for (let attempt = 0; attempt < maxAttempts && candidates.size < poolTarget; attempt += 1) {
    const strategy = generationStrategies[attempt % generationStrategies.length]!;
    consider(strategy.generate(context));
  }

  const sorted = [...candidates.values()].sort(
    (left, right) =>
      right.score - left.score ||
      right.scores.distinctiveness - left.scores.distinctiveness ||
      left.name.localeCompare(right.name)
  );
  const qualified = sorted.filter((candidate) =>
    meetsDisplayQuality(candidate, config.soundProfile)
  );
  const qualityRejectedCount = sorted.length - qualified.length;

  return {
    seed: config.seed,
    engineVersion: ENGINE_VERSION,
    generatedCount: sorted.length,
    rejectedCount: rejectedCount + qualityRejectedCount,
    duplicateCount,
    candidates: selectDiverseCandidates(qualified)
  };
}

export type { GenerationConfig } from "@/lib/naming-engine/schema";
export type {
  GeneratedCandidate,
  GenerationResult,
  CandidateScores
} from "@/types/naming";
