import { genericWords, patterns } from "@/data";
import {
  normalizeName,
  phoneticPattern,
  pronunciationAnalysis
} from "@/lib/naming-engine/phonetics";
import type { SoundProfile } from "@/lib/naming-engine/sound-profile";
import type {
  BrandRiskResult,
  CandidateOrigin,
  CandidateScores,
  NegativeRisk,
  StrategyId
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

const CONCEPT_RELATIONS: Record<string, string[]> = {
  access: ["door", "key", "entry", "porta", "clavis"],
  belonging: ["home", "nest", "community", "union", "bond", "refuge"],
  clarity: ["clear", "light", "guidance", "truth", "flow"],
  community: ["belonging", "bond", "union", "neighborhood", "together"],
  discovery: ["find", "search", "journey", "path", "arrive"],
  growth: ["life", "new", "rise", "bloom", "value"],
  home: ["belonging", "nest", "house", "refuge", "place", "haven"],
  innovation: ["new", "clarity", "discovery", "technology"],
  journey: ["path", "route", "way", "move", "arrive", "direction"],
  place: ["home", "earth", "location", "community", "belonging"],
  trust: ["clarity", "truth", "confidence", "refuge", "key"],
  value: ["trust", "growth", "premium"]
};

function conceptVocabulary(concepts: string[]): Set<string> {
  const normalized = concepts.map(normalizeName).filter(Boolean);
  return new Set(
    normalized.flatMap((concept) => [
      concept,
      ...(CONCEPT_RELATIONS[concept] ?? []).map(normalizeName)
    ])
  );
}

function conceptualMatches(origin: CandidateOrigin, vocabulary: Set<string>): boolean {
  const originTokens = [
    origin.root,
    origin.meaning,
    ...(origin.categories ?? [])
  ]
    .flatMap((value) => normalizeName(value).split(/[^a-z]+/))
    .filter((value) => value.length >= 3);
  return originTokens.some((token) =>
    [...vocabulary].some(
      (concept) => token === concept || token.includes(concept) || concept.includes(token)
    )
  );
}

export function scoreCandidate(input: {
  name: string;
  origin: CandidateOrigin[];
  concepts: string[];
  minLength: number;
  maxLength: number;
  syllableCount: number;
  soundProfile?: SoundProfile;
  strategy?: StrategyId;
  negativeRisk: NegativeRisk;
  brandRisk: BrandRiskResult;
}): { total: number; scores: CandidateScores; explanation: string[] } {
  const normalized = normalizeName(input.name);
  const pattern = phoneticPattern(normalized);
  const soundProfile = input.soundProfile ?? "combined";
  const vocabulary = conceptVocabulary(input.concepts);
  const matchCount = input.origin.filter((origin) =>
    conceptualMatches(origin, vocabulary)
  ).length;
  const meaningfulOrigins = input.origin.filter(
    (origin) => origin.language || (origin.categories?.length ?? 0) > 0
  ).length;
  const pronunciation = pronunciationAnalysis(normalized, soundProfile);
  const knownPattern = patterns.includes(pattern);
  const rareLetters = (normalized.match(/[qxwyj]/g) ?? []).length;
  const repeated = (normalized.match(/(.)\1/g) ?? []).length;
  const brandPenalty =
    input.brandRisk.level === "high" ? 55 : input.brandRisk.level === "medium" ? 25 : 0;
  const genericWordCollision = genericWords.includes(normalized);
  const originEndings =
    input.origin.find((origin) => (origin.preferredEndings?.length ?? 0) > 0)
      ?.preferredEndings ?? [];
  const preferredEndingRank = originEndings.findIndex((ending) =>
    normalized.endsWith(normalizeName(ending))
  );
  const endingCompatibilityBonus =
    preferredEndingRank < 0 ? 0 : Math.max(2, 7 - preferredEndingRank);

  const strategySoundAdjustment =
    input.strategy === "root-root" || input.strategy === "edge-fragments"
      ? -18
      : input.strategy === "syllable-fusion"
        ? -16
        : input.strategy === "keyword-suffix"
          ? 6
          : input.strategy === "indirect-concept"
            ? 4
            : input.strategy === "prefix-keyword"
              ? -16
              : input.strategy === "phonetic-invention"
                ? -5
                : 0;
  const strategyDistinctivenessAdjustment =
    input.strategy === "keyword-suffix" || input.strategy === "indirect-concept"
      ? 5
      : input.strategy === "root-root" ||
          input.strategy === "edge-fragments" ||
          input.strategy === "syllable-fusion"
        ? -12
        : 0;

  const scores: CandidateScores = {
    memorability: clamp(
      78 -
        Math.abs(normalized.length - 7) * 5 -
        repeated * 10 +
        (pronunciation.sound - 70) * 0.22
    ),
    spanishPronunciation: pronunciation.spanish,
    englishPronunciation: pronunciation.english,
    spelling: pronunciation.spelling,
    length: lengthScore(normalized.length, input.minLength, input.maxLength),
    sound: clamp(
      pronunciation.sound + strategySoundAdjustment + endingCompatibilityBonus
    ),
    distinctiveness: clamp(
      78 -
        repeated * 12 -
        brandPenalty -
        (genericWordCollision ? 35 : 0) -
        Math.max(0, rareLetters - 1) * 5 -
        (/^(home|casa|nova|meta|pro)/.test(normalized) ? 7 : 0) +
        strategyDistinctivenessAdjustment +
        Math.round(endingCompatibilityBonus * 0.7)
    ),
    conceptualFit: clamp(
      36 + Math.min(1, matchCount) * 24 + Math.min(1, meaningfulOrigins) * 8 +
        Math.max(0, Math.min(2, matchCount) - 1) * 5 +
        endingCompatibilityBonus
    ),
    internationalFit: clamp(
      Math.min(pronunciation.spanish, pronunciation.english) -
        rareLetters * 2 -
        Math.max(0, input.syllableCount - 2) * 4 +
        8
    ),
    confusionRisk: clamp(
      96 -
        brandPenalty -
        (genericWordCollision ? 22 : 0) -
        (pronunciation.spelling < 70 ? 18 : 0) -
        repeated * 8
    ),
    negativeMeaningRisk: clamp(100 - input.negativeRisk.penalty),
    domainAvailability: 50
  };

  const weightedTotal = clamp(
    (Object.keys(scores) as Array<keyof CandidateScores>).reduce(
      (sum, key) => sum + scores[key] * WEIGHTS[key],
      0
    )
  );
  const relevantPronunciation =
    soundProfile === "spanish"
      ? scores.spanishPronunciation
      : soundProfile === "english"
        ? scores.englishPronunciation
        : Math.min(scores.spanishPronunciation, scores.englishPronunciation);
  const qualityFloor = Math.min(
    relevantPronunciation,
    scores.spelling,
    scores.sound,
    scores.conceptualFit
  );
  const total = clamp(Math.min(weightedTotal, qualityFloor + 18));
  const explanation = [
    `Longitud de ${normalized.length} caracteres y ${input.syllableCount} sílabas aproximadas.`,
    knownPattern
      ? `Patrón fonético ${pattern} presente en el catálogo válido.`
      : `Patrón fonético ${pattern} evaluado por alternancia.`,
    matchCount > 0
      ? `${matchCount} origen(es) se relacionan con el brief mediante categorías o significado.`
      : "La relación conceptual es indirecta.",
    `Pronunciación estimada: ${scores.spanishPronunciation}/100 en español y ${scores.englishPronunciation}/100 en inglés.`,
    input.negativeRisk.penalty > 0
      ? `Penalización de ${input.negativeRisk.penalty} por connotaciones problemáticas.`
      : "Sin connotaciones problemáticas locales detectadas.",
    genericWordCollision
      ? "Coincide con una palabra genérica y pierde distintividad."
      : "No coincide exactamente con el léxico genérico local.",
    "La disponibilidad de dominio permanece neutral hasta una consulta bajo demanda."
  ];

  return { total, scores, explanation };
}
