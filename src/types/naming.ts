export const LANGUAGES = [
  "english",
  "spanish",
  "latin",
  "italian",
  "portuguese",
  "french",
  "japanese",
  "nordic"
] as const;

export type Language = (typeof LANGUAGES)[number];
export type Sentiment = "positive" | "neutral" | "negative";

export interface LinguisticRoot {
  value: string;
  normalized: string;
  romanized: string;
  meaning: string;
  language: Language;
  categories: string[];
  pronunciation: string;
  sentiment: Sentiment;
  canBePrefix: boolean;
  canBeSuffix: boolean;
}

export interface BrandFragment {
  value: string;
  root: string;
  meaning: string;
  language: Language;
  categories: string[];
  position: "start" | "end" | "both";
  profiles: Array<"spanish" | "english" | "combined">;
  preferredEndings?: string[];
}

export const STRATEGY_IDS = [
  "keyword-suffix",
  "prefix-keyword",
  "root-root",
  "edge-fragments",
  "syllable-fusion",
  "repeat-elision",
  "phonetic-substitution",
  "vowel-variation",
  "phonetic-invention",
  "indirect-concept"
] as const;

export type StrategyId = (typeof STRATEGY_IDS)[number];

export interface CandidateOrigin {
  root: string;
  meaning: string;
  language?: Language;
  categories?: string[];
  preferredEndings?: string[];
}

export interface CandidateScores {
  memorability: number;
  spanishPronunciation: number;
  englishPronunciation: number;
  spelling: number;
  length: number;
  sound: number;
  distinctiveness: number;
  conceptualFit: number;
  internationalFit: number;
  confusionRisk: number;
  negativeMeaningRisk: number;
  domainAvailability: number;
}

export type BrandRiskLevel = "low" | "medium" | "high" | "unknown";

export interface BrandRiskResult {
  level: BrandRiskLevel;
  exactMatches: string[];
  similar: Array<{ brand: string; distance: number }>;
  phoneticMatches: string[];
  explanation: string;
  disclaimer: string;
}

export interface NegativeRisk {
  level: "none" | "low" | "medium" | "high";
  matches: string[];
  fragments: string[];
  penalty: number;
}

export interface GeneratedCandidate {
  name: string;
  normalized: string;
  score: number;
  scores: CandidateScores;
  scoreExplanation: string[];
  meaning: string;
  origin: CandidateOrigin[];
  pronunciation: string;
  syllableCount: number;
  strategy: StrategyId;
  negativeRisk: NegativeRisk;
  brandRisk: BrandRiskResult;
}

export interface GenerationResult {
  seed: string;
  engineVersion: string;
  generatedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  candidates: GeneratedCandidate[];
}

export interface RawCandidate {
  name: string;
  strategy: StrategyId;
  origin: CandidateOrigin[];
  meaning: string;
  pronunciation: string;
}
