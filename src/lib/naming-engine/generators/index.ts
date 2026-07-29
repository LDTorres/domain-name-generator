import { patterns, prefixes, suffixes } from "@/data";
import { normalizeName, removeRepeatedLetters } from "@/lib/naming-engine/phonetics";
import type { GenerationConfig } from "@/lib/naming-engine/schema";
import { SeededRandom } from "@/lib/naming-engine/random/seeded-random";
import type {
  CandidateOrigin,
  LinguisticRoot,
  RawCandidate,
  StrategyId
} from "@/types/naming";

export interface GeneratorContext {
  config: GenerationConfig;
  random: SeededRandom;
  roots: LinguisticRoot[];
  prefixPool: string[];
  suffixPool: string[];
  keywordPool: string[];
}

export interface GenerationStrategy {
  id: StrategyId;
  generate(context: GeneratorContext): RawCandidate;
}

function titleCase(value: string): string {
  const normalized = normalizeName(value);
  return normalized.length === 0 ? "" : `${normalized[0]!.toUpperCase()}${normalized.slice(1)}`;
}

function keywordOrigin(keyword: string): CandidateOrigin {
  return { root: keyword, meaning: keyword };
}

function rootOrigin(root: LinguisticRoot): CandidateOrigin {
  return { root: root.value, meaning: root.meaning, language: root.language };
}

export function combineFragments(left: string, right: string): string {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  if (a.at(-1) === b[0]) return a + b.slice(1);
  if (/[aeiou]$/.test(a) && /^[aeiou]/.test(b)) return a.slice(0, -1) + b;
  return a + b;
}

function fragmentStart(value: string, random: SeededRandom): string {
  const normalized = normalizeName(value);
  const minimum = Math.min(2, normalized.length);
  const maximum = Math.max(minimum, Math.ceil(normalized.length * 0.7));
  return normalized.slice(0, minimum + random.integer(maximum - minimum + 1));
}

function fragmentEnd(value: string, random: SeededRandom): string {
  const normalized = normalizeName(value);
  const minimum = Math.min(2, normalized.length);
  const maximum = Math.max(minimum, Math.ceil(normalized.length * 0.65));
  const length = minimum + random.integer(maximum - minimum + 1);
  return normalized.slice(-length);
}

const keywordSuffix: GenerationStrategy = {
  id: "keyword-suffix",
  generate(context) {
    const keyword = context.random.pick(context.keywordPool);
    const suffix = context.random.pick(context.suffixPool);
    return {
      name: titleCase(combineFragments(fragmentStart(keyword, context.random), suffix)),
      strategy: this.id,
      origin: [keywordOrigin(keyword), { root: suffix, meaning: "brand suffix" }],
      meaning: `${keyword} con una terminación de marca`,
      pronunciation: "Lectura fonética directa"
    };
  }
};

const prefixKeyword: GenerationStrategy = {
  id: "prefix-keyword",
  generate(context) {
    const prefix = context.random.pick(context.prefixPool);
    const keyword = context.random.pick(context.keywordPool);
    return {
      name: titleCase(combineFragments(prefix, fragmentEnd(keyword, context.random))),
      strategy: this.id,
      origin: [{ root: prefix, meaning: "brand prefix" }, keywordOrigin(keyword)],
      meaning: `${prefix} y ${keyword}`,
      pronunciation: "Lectura fonética directa"
    };
  }
};

const rootRoot: GenerationStrategy = {
  id: "root-root",
  generate(context) {
    const first = context.random.pick(context.roots);
    const second = context.random.pick(context.roots);
    return {
      name: titleCase(
        combineFragments(fragmentStart(first.normalized, context.random), fragmentEnd(second.normalized, context.random))
      ),
      strategy: this.id,
      origin: [rootOrigin(first), rootOrigin(second)],
      meaning: `${first.meaning} + ${second.meaning}`,
      pronunciation: `${first.pronunciation} / ${second.pronunciation}`
    };
  }
};

const edgeFragments: GenerationStrategy = {
  id: "edge-fragments",
  generate(context) {
    const first = context.random.pick(context.roots);
    const second = context.random.pick(context.roots);
    const left = first.normalized.slice(0, Math.max(2, Math.ceil(first.normalized.length / 2)));
    const right = second.normalized.slice(Math.floor(second.normalized.length / 2));
    return {
      name: titleCase(combineFragments(left, right)),
      strategy: this.id,
      origin: [rootOrigin(first), rootOrigin(second)],
      meaning: `Fusión de ${first.meaning} y ${second.meaning}`,
      pronunciation: "Fusión de fragmentos"
    };
  }
};

const syllableFusion: GenerationStrategy = {
  id: "syllable-fusion",
  generate(context) {
    const first = context.random.pick(context.roots);
    const second = context.random.pick(context.roots);
    const firstParts = normalizeName(first.normalized).split(/(?<=[aeiou])(?=[^aeiou])/);
    const secondParts = normalizeName(second.normalized).split(/(?<=[aeiou])(?=[^aeiou])/);
    return {
      name: titleCase(combineFragments(firstParts[0] ?? first.normalized, secondParts.at(-1) ?? second.normalized)),
      strategy: this.id,
      origin: [rootOrigin(first), rootOrigin(second)],
      meaning: `Sílabas de ${first.meaning} y ${second.meaning}`,
      pronunciation: "Fusión silábica"
    };
  }
};

const repeatElision: GenerationStrategy = {
  id: "repeat-elision",
  generate(context) {
    const first = context.random.pick(context.roots);
    const suffix = context.random.pick(context.suffixPool);
    return {
      name: titleCase(removeRepeatedLetters(combineFragments(first.normalized, suffix))),
      strategy: this.id,
      origin: [rootOrigin(first), { root: suffix, meaning: "brand suffix" }],
      meaning: `${first.meaning} en forma compacta`,
      pronunciation: first.pronunciation
    };
  }
};

const substitutions: ReadonlyArray<readonly [RegExp, string]> = [
  [/c/g, "k"],
  [/ph/g, "f"],
  [/qu/g, "k"],
  [/v/g, "b"],
  [/y/g, "i"],
  [/z/g, "s"],
  [/th/g, "t"]
];

const phoneticSubstitution: GenerationStrategy = {
  id: "phonetic-substitution",
  generate(context) {
    const root = context.random.pick(context.roots);
    const [pattern, replacement] = context.random.pick(substitutions);
    const ending = context.random.pick(context.suffixPool);
    const changed = root.normalized.replace(pattern, replacement);
    return {
      name: titleCase(combineFragments(fragmentStart(changed, context.random), ending)),
      strategy: this.id,
      origin: [rootOrigin(root), { root: replacement, meaning: "phonetic substitution" }],
      meaning: `Variación fonética de ${root.meaning}`,
      pronunciation: root.pronunciation
    };
  }
};

const vowelVariation: GenerationStrategy = {
  id: "vowel-variation",
  generate(context) {
    const root = context.random.pick(context.roots);
    const vowels = ["a", "e", "i", "o", "u"] as const;
    const source = normalizeName(root.normalized);
    const vowelPositions = [...source].flatMap((letter, index) =>
      /[aeiou]/.test(letter) ? [index] : []
    );
    const position = vowelPositions.length > 0 ? context.random.pick(vowelPositions) : 1;
    const replacement = context.random.pick(vowels);
    const changed = `${source.slice(0, position)}${replacement}${source.slice(position + 1)}`;
    const ending = context.random.chance(0.65) ? context.random.pick(context.suffixPool) : "";
    return {
      name: titleCase(combineFragments(fragmentStart(changed, context.random), ending)),
      strategy: this.id,
      origin: [rootOrigin(root)],
      meaning: `Variación vocálica de ${root.meaning}`,
      pronunciation: root.pronunciation
    };
  }
};

const CONSONANTS = "bcdfghjklmnprstvz".split("");
const VOWELS = "aeiou".split("");

const phoneticInvention: GenerationStrategy = {
  id: "phonetic-invention",
  generate(context) {
    const suitablePatterns = patterns.filter(
      (pattern) =>
        pattern.length >= context.config.minLength && pattern.length <= context.config.maxLength
    );
    const pattern = context.random.pick(suitablePatterns.length > 0 ? suitablePatterns : patterns);
    const name = [...pattern]
      .map((kind) =>
        context.random.pick(kind === "V" ? VOWELS : CONSONANTS)
      )
      .join("");
    return {
      name: titleCase(name),
      strategy: this.id,
      origin: [{ root: pattern, meaning: "phonetic pattern" }],
      meaning: `Nombre inventado con patrón ${pattern}`,
      pronunciation: "Lectura regular por consonantes y vocales"
    };
  }
};

const indirectConcept: GenerationStrategy = {
  id: "indirect-concept",
  generate(context) {
    const root = context.random.pick(context.roots);
    const ending = context.random.pick(context.suffixPool);
    const source = context.random.chance(0.5)
      ? fragmentStart(root.normalized, context.random)
      : fragmentEnd(root.normalized, context.random);
    return {
      name: titleCase(combineFragments(source, ending)),
      strategy: this.id,
      origin: [rootOrigin(root), { root: ending, meaning: "abstract ending" }],
      meaning: `Evoca ${root.meaning} sin describir la industria`,
      pronunciation: root.pronunciation
    };
  }
};

export const generationStrategies: GenerationStrategy[] = [
  keywordSuffix,
  prefixKeyword,
  rootRoot,
  edgeFragments,
  syllableFusion,
  repeatElision,
  phoneticSubstitution,
  vowelVariation,
  phoneticInvention,
  indirectConcept
];

export function buildGeneratorContext(
  config: GenerationConfig,
  roots: LinguisticRoot[],
  random: SeededRandom
): GeneratorContext {
  const selectedRoots = roots
    .filter((root) => config.languages.includes(root.language))
    .sort((left, right) => left.normalized.localeCompare(right.normalized));
  const concepts = new Set(config.concepts.map(normalizeName));
  const relevantRoots = selectedRoots.filter((root) =>
    root.categories.some((category) => concepts.has(normalizeName(category)))
  );
  const usableRoots = relevantRoots.length >= 10 ? relevantRoots : selectedRoots;
  const keywordPool = [...config.keywords, ...config.concepts]
    .map(normalizeName)
    .filter((value) => value.length >= 2)
    .sort();

  return {
    config,
    random,
    roots: usableRoots,
    prefixPool: (config.allowedPrefixes.length > 0 ? config.allowedPrefixes : prefixes)
      .map(normalizeName)
      .filter(Boolean)
      .sort(),
    suffixPool: [
      ...(config.allowedSuffixes.length > 0 ? config.allowedSuffixes : suffixes),
      ...config.preferredEndings
    ]
      .map(normalizeName)
      .filter(Boolean)
      .sort(),
    keywordPool
  };
}
