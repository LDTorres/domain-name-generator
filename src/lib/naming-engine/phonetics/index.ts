const VOWELS = "aeiouy";
const DIFFICULT_SEQUENCES = [
  "btg",
  "ckl",
  "dth",
  "fth",
  "gth",
  "jth",
  "ksh",
  "pht",
  "qz",
  "schr",
  "sphl",
  "tchj",
  "thl",
  "wrt",
  "xq",
  "zth"
];
const REPETITION_PATTERNS = ["nessness", "inging", "lyly", "tiontion", "nning"];

export interface PhoneticValidation {
  valid: boolean;
  reasons: string[];
  pattern: string;
  syllableCount: number;
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

export function validatePhonetics(
  value: string,
  options: {
    minLength: number;
    maxLength: number;
    maxSyllables: number;
    forbiddenSequences: string[];
    forbiddenWords: string[];
  }
): PhoneticValidation {
  const normalized = normalizeName(value);
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
  if (DIFFICULT_SEQUENCES.some((sequence) => normalized.includes(sequence))) {
    reasons.push("Contiene una secuencia difícil en español o inglés.");
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

  return {
    valid: reasons.length === 0,
    reasons,
    pattern: phoneticPattern(normalized),
    syllableCount
  };
}

export function pronunciationPredictability(value: string): number {
  const normalized = normalizeName(value);
  let score = 100;
  if (/[cqwx]/.test(normalized)) score -= 8;
  if (/y/.test(normalized)) score -= 5;
  if (/(ough|eigh|tion|sion)/.test(normalized)) score -= 20;
  if (/[^aeiouy]{3}/.test(normalized)) score -= 12;
  if (/[aeiou]{2}/.test(normalized)) score -= 5;
  return Math.max(0, score);
}
