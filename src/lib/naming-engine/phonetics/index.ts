import { patterns, phoneticProfiles } from "@/data";
import type { SoundProfile } from "@/lib/naming-engine/sound-profile";

const VOWELS = "aeiouy";
const STRICT_VOWELS = "aeiou";
const REPETITION_PATTERNS = ["nessness", "inging", "lyly", "tiontion", "nning"];
const COMMON_INTERNAL_CLUSTERS = new Set([
  "bl",
  "br",
  "ch",
  "cl",
  "cr",
  "dr",
  "fl",
  "fr",
  "gl",
  "gr",
  "ld",
  "lm",
  "lv",
  "mb",
  "mp",
  "nd",
  "ng",
  "nt",
  "pl",
  "pr",
  "rd",
  "rn",
  "rs",
  "rt",
  "sc",
  "sk",
  "sl",
  "sm",
  "sn",
  "sp",
  "st",
  "tr"
]);

interface PhoneticProfileDefinition {
  preferredPatterns: string[];
  allowedInitialClusters: string[];
  allowedFinals: string[];
  awkwardSequences: string[];
  ambiguousSequences: string[];
  syllables: string[];
  prefixes: string[];
  endings: string[];
  minimumPrimaryPronunciation: number;
  minimumSecondaryPronunciation: number;
}

export const soundProfiles = phoneticProfiles as Record<
  SoundProfile,
  PhoneticProfileDefinition
>;

export interface PhoneticValidation {
  valid: boolean;
  reasons: string[];
  pattern: string;
  syllableCount: number;
  spanishPronunciation: number;
  englishPronunciation: number;
  spelling: number;
  sound: number;
}

export interface PronunciationAnalysis {
  spanish: number;
  english: number;
  spelling: number;
  sound: number;
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function removeRepeatedLetters(value: string): string {
  return normalizeName(value).replace(/([a-z])\1+/g, "$1");
}

export function phoneticPattern(value: string): string {
  return normalizeName(value)
    .split("")
    .map((letter) => (VOWELS.includes(letter) ? "V" : "C"))
    .join("");
}

export function countSyllables(value: string): number {
  const normalized = normalizeName(value)
    .replace(/(?:e|es)$/i, "")
    .replace(/[^aeiouy]+/g, " ");
  const groups = normalized.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, groups.length);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function occurrences(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function repeatedBigramCount(value: string): number {
  const seen = new Set<string>();
  let repetitions = 0;
  for (let index = 0; index < value.length - 1; index += 1) {
    const bigram = value.slice(index, index + 2);
    if (seen.has(bigram)) repetitions += 1;
    seen.add(bigram);
  }
  return repetitions;
}

function hasUnexpectedCluster(value: string, profile: SoundProfile): boolean {
  const clusters = value.match(/[^aeiouy]{2,}/g) ?? [];
  return clusters.some((cluster, index) => {
    if (cluster.length > 2) return true;
    if (index === 0 && value.startsWith(cluster)) {
      return !soundProfiles[profile].allowedInitialClusters.includes(cluster);
    }
    return !COMMON_INTERNAL_CLUSTERS.has(cluster);
  });
}

export function pronunciationAnalysis(
  value: string,
  profile: SoundProfile = "combined"
): PronunciationAnalysis {
  const normalized = normalizeName(value);
  const definition = soundProfiles[profile];
  const vowelCount = [...normalized].filter((letter) => STRICT_VOWELS.includes(letter)).length;
  const vowelRatio = normalized.length === 0 ? 0 : vowelCount / normalized.length;
  const pattern = phoneticPattern(normalized);
  const awkwardCount = definition.awkwardSequences.filter((sequence) =>
    normalized.includes(sequence)
  ).length;
  const ambiguousCount = definition.ambiguousSequences.reduce(
    (sum, sequence) => sum + occurrences(normalized, new RegExp(sequence, "g")),
    0
  );
  const repeated = occurrences(normalized, /([a-z])\1/g);
  const repeatedBigrams = repeatedBigramCount(normalized);
  const unexpectedCluster = hasUnexpectedCluster(normalized, profile);
  const finalLetter = normalized.at(-1) ?? "";

  let spanish = 96;
  spanish -= occurrences(normalized, /[kw]/g) * 7;
  spanish -= occurrences(normalized, /y/g) * 4;
  spanish -= occurrences(normalized, /(?:th|sh|ph|ck|dge|ght|ough)/g) * 15;
  spanish -= occurrences(normalized, /q(?!u)/g) * 28;
  spanish -= occurrences(normalized, /(?:ce|ci|ge|gi)/g) * 4;
  if (/^s[^aeiouy]/.test(normalized)) spanish -= 8;
  if (unexpectedCluster) spanish -= 18;

  let english = 94;
  english -= occurrences(normalized, /j/g) * 8;
  english -= occurrences(normalized, /rr|ll/g) * 5;
  english -= occurrences(normalized, /(?:gue|gui)/g) * 6;
  english -= occurrences(normalized, /q(?!u)/g) * 25;
  english -= occurrences(normalized, /(?:eigh|ough)/g) * 18;
  if (unexpectedCluster) english -= 16;

  let spelling =
    94 -
    ambiguousCount * 5 -
    awkwardCount * 16 -
    repeated * 8 -
    repeatedBigrams * 7;
  if (unexpectedCluster) spelling -= 12;
  if (/[cqxy]/.test(normalized)) spelling -= 4;

  let sound = 70;
  if (definition.preferredPatterns.includes(pattern)) sound += 16;
  else if (patterns.includes(pattern)) sound += 8;
  if (vowelRatio >= 0.38 && vowelRatio <= 0.62) sound += 10;
  else if (vowelRatio < 0.28 || vowelRatio > 0.72) sound -= 20;
  if (definition.allowedFinals.includes(finalLetter)) sound += 5;
  else sound -= 12;
  if (definition.endings.some((ending) => normalized.endsWith(ending))) sound += 12;
  else if (normalized.length >= 6) sound -= 4;
  sound -= awkwardCount * 18 + repeated * 7 + repeatedBigrams * 9;
  if (unexpectedCluster) sound -= 18;

  return {
    spanish: clamp(spanish),
    english: clamp(english),
    spelling: clamp(spelling),
    sound: clamp(sound)
  };
}

export function validatePhonetics(
  value: string,
  options: {
    minLength: number;
    maxLength: number;
    maxSyllables: number;
    forbiddenSequences: string[];
    forbiddenWords: string[];
    soundProfile?: SoundProfile;
  }
): PhoneticValidation {
  const normalized = normalizeName(value);
  const soundProfile = options.soundProfile ?? "combined";
  const definition = soundProfiles[soundProfile];
  const reasons: string[] = [];
  const rawHasInvalidCharacters = /[^a-zA-ZÀ-ÿ]/.test(value);

  if (rawHasInvalidCharacters) reasons.push("Contiene números, espacios, guiones o símbolos.");
  if (normalized.length < options.minLength || normalized.length > options.maxLength) {
    reasons.push(`La longitud debe estar entre ${options.minLength} y ${options.maxLength}.`);
  }
  if (/[^aeiouy]{4}/.test(normalized)) reasons.push("Tiene más de tres consonantes consecutivas.");
  if (/([aeiou])\1{2}/.test(normalized)) reasons.push("Repite una vocal más de dos veces.");
  if (/([a-z])\1{2}/.test(normalized)) reasons.push("Repite una letra más de dos veces.");
  if (REPETITION_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    reasons.push("Contiene una terminación o sílaba repetida.");
  }
  if (/(.{2,4})\1/.test(normalized)) {
    reasons.push("Repite un fragmento completo.");
  }
  if (definition.awkwardSequences.some((sequence) => normalized.includes(sequence))) {
    reasons.push("Contiene una secuencia difícil en español o inglés.");
  }
  if (hasUnexpectedCluster(normalized, soundProfile)) {
    reasons.push("Contiene una unión de consonantes poco natural para la sonoridad elegida.");
  }
  const forbiddenSequences = options.forbiddenSequences.map(normalizeName).filter(Boolean);
  if (forbiddenSequences.some((sequence) => normalized.includes(sequence))) {
    reasons.push("Contiene una secuencia prohibida.");
  }
  const forbiddenWords = options.forbiddenWords.map(normalizeName).filter(Boolean);
  if (forbiddenWords.some((word) => normalized === word || normalized.includes(word))) {
    reasons.push("Contiene una palabra prohibida.");
  }

  const syllableCount = countSyllables(normalized);
  if (syllableCount > options.maxSyllables) {
    reasons.push(`Supera el máximo de ${options.maxSyllables} sílabas.`);
  }

  const pronunciation = pronunciationAnalysis(normalized, soundProfile);
  const primary =
    soundProfile === "spanish"
      ? pronunciation.spanish
      : soundProfile === "english"
        ? pronunciation.english
        : Math.min(pronunciation.spanish, pronunciation.english);
  const secondary =
    soundProfile === "spanish"
      ? pronunciation.english
      : soundProfile === "english"
        ? pronunciation.spanish
        : Math.min(pronunciation.spanish, pronunciation.english);
  if (primary < definition.minimumPrimaryPronunciation) {
    reasons.push("La pronunciación principal no alcanza el umbral de calidad.");
  }
  if (secondary < definition.minimumSecondaryPronunciation) {
    reasons.push("La pronunciación internacional es demasiado ambigua.");
  }
  if (pronunciation.sound < 58) {
    reasons.push("La estructura sonora no parece una marca pronunciable.");
  }

  return {
    valid: reasons.length === 0,
    reasons,
    pattern: phoneticPattern(normalized),
    syllableCount,
    spanishPronunciation: pronunciation.spanish,
    englishPronunciation: pronunciation.english,
    spelling: pronunciation.spelling,
    sound: pronunciation.sound
  };
}

export function pronunciationPredictability(value: string): number {
  const analysis = pronunciationAnalysis(value, "combined");
  return Math.round((analysis.spanish + analysis.english + analysis.spelling) / 3);
}
