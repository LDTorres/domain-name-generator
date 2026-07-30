import { fragments, phoneticProfiles } from "@/data";
import {
  normalizeName,
  pronunciationAnalysis,
  removeRepeatedLetters
} from "@/lib/naming-engine/phonetics";
import type { GenerationConfig } from "@/lib/naming-engine/schema";
import type { SoundProfile } from "@/lib/naming-engine/sound-profile";
import { SeededRandom } from "@/lib/naming-engine/random/seeded-random";
import type {
  BrandFragment,
  CandidateOrigin,
  LinguisticRoot,
  RawCandidate,
  StrategyId
} from "@/types/naming";

interface PhoneticProfileData {
  prefixes: string[];
  endings: string[];
  syllables: string[];
}

const profileData = phoneticProfiles as Record<SoundProfile, PhoneticProfileData>;
const NATURAL_BOUNDARIES = new Set([
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
  "st",
  "tr"
]);

export interface GeneratorContext {
  config: GenerationConfig;
  random: SeededRandom;
  roots: LinguisticRoot[];
  startFragments: BrandFragment[];
  endFragments: BrandFragment[];
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

function fragmentOrigin(fragment: BrandFragment): CandidateOrigin {
  const origin: CandidateOrigin = {
    root: fragment.root,
    meaning: fragment.meaning,
    language: fragment.language,
    categories: fragment.categories
  };
  if (fragment.preferredEndings) origin.preferredEndings = fragment.preferredEndings;
  return origin;
}

function abstractOrigin(value: string, meaning: string): CandidateOrigin {
  return { root: value, meaning };
}

export function combineFragments(left: string, right: string): string {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  if (a.at(-1) === b[0]) return a + b.slice(1);
  if (/[aeiouy]$/.test(a) && /^[aeiouy]/.test(b)) {
    return a.slice(0, -1) + b;
  }
  const boundary = `${a.at(-1)}${b[0]}`;
  if (/^[^aeiouy]{2}$/.test(boundary) && !NATURAL_BOUNDARIES.has(boundary)) {
    return `${a}a${b}`;
  }
  return a + b;
}

function sharesCategory(left: BrandFragment, right: BrandFragment): boolean {
  return left.categories.some((category) => right.categories.includes(category));
}

function pickAnchor(context: GeneratorContext, position: "start" | "end"): BrandFragment {
  const pool = position === "start" ? context.startFragments : context.endFragments;
  const keyword = context.random.pick(context.keywordPool);
  const matching = pool.filter((fragment) => {
    const tokens = [fragment.root, fragment.meaning, ...fragment.categories].map(normalizeName);
    return tokens.some((token) => token.includes(keyword) || keyword.includes(token));
  });
  return context.random.pick(matching.length > 0 ? matching : pool);
}

function pickRelatedEnd(context: GeneratorContext, first: BrandFragment): BrandFragment {
  const related = context.endFragments.filter(
    (fragment) =>
      fragment.root !== first.root &&
      fragment.value !== first.value &&
      sharesCategory(first, fragment)
  );
  return context.random.pick(related.length > 0 ? related : context.endFragments);
}

function pickEnding(context: GeneratorContext, anchor: BrandFragment): string {
  const preferred = (anchor.preferredEndings ?? [])
    .map(normalizeName)
    .filter((ending) => context.suffixPool.includes(ending));
  return context.random.pick(preferred.length > 0 ? preferred : context.suffixPool);
}

function candidateFromFragments(
  strategy: StrategyId,
  first: BrandFragment,
  second: BrandFragment,
  label: string
): RawCandidate {
  return {
    name: titleCase(combineFragments(first.value, second.value)),
    strategy,
    origin: [fragmentOrigin(first), fragmentOrigin(second)],
    meaning: `${label}: ${first.meaning} + ${second.meaning}`,
    pronunciation: "Lectura fonética regular"
  };
}

const keywordSuffix: GenerationStrategy = {
  id: "keyword-suffix",
  generate(context) {
    const anchor = pickAnchor(context, "start");
    const suffix = pickEnding(context, anchor);
    return {
      name: titleCase(combineFragments(anchor.value, suffix)),
      strategy: this.id,
      origin: [fragmentOrigin(anchor), abstractOrigin(suffix, "terminación de marca")],
      meaning: `${anchor.meaning} con una terminación de marca`,
      pronunciation: "Lectura fonética regular"
    };
  }
};

const prefixKeyword: GenerationStrategy = {
  id: "prefix-keyword",
  generate(context) {
    const prefix = context.random.pick(context.prefixPool);
    const anchor = pickAnchor(context, "end");
    return {
      name: titleCase(combineFragments(prefix, anchor.value)),
      strategy: this.id,
      origin: [abstractOrigin(prefix, "prefijo de marca"), fragmentOrigin(anchor)],
      meaning: `${anchor.meaning} con un prefijo evocativo`,
      pronunciation: "Lectura fonética regular"
    };
  }
};

const rootRoot: GenerationStrategy = {
  id: "root-root",
  generate(context) {
    const first = pickAnchor(context, "start");
    return candidateFromFragments(
      this.id,
      first,
      pickRelatedEnd(context, first),
      "Raíces conceptualmente relacionadas"
    );
  }
};

const edgeFragments: GenerationStrategy = {
  id: "edge-fragments",
  generate(context) {
    const first = context.random.pick(context.startFragments);
    const second = pickRelatedEnd(context, first);
    return candidateFromFragments(this.id, first, second, "Fragmentos seguros");
  }
};

const syllableFusion: GenerationStrategy = {
  id: "syllable-fusion",
  generate(context) {
    const first = pickAnchor(context, "start");
    const second = pickRelatedEnd(context, first);
    const bridge = context.random.chance(0.35) ? context.random.pick(["a", "e", "i", "o"]) : "";
    return {
      ...candidateFromFragments(this.id, first, second, "Fusión silábica"),
      name: titleCase(combineFragments(combineFragments(first.value, bridge), second.value))
    };
  }
};

const repeatElision: GenerationStrategy = {
  id: "repeat-elision",
  generate(context) {
    const anchor = pickAnchor(context, "start");
    const suffix = pickEnding(context, anchor);
    return {
      name: titleCase(removeRepeatedLetters(combineFragments(anchor.value, suffix))),
      strategy: this.id,
      origin: [fragmentOrigin(anchor), abstractOrigin(suffix, "terminación compacta")],
      meaning: `${anchor.meaning} en una forma compacta`,
      pronunciation: "Lectura fonética regular"
    };
  }
};

const substitutions: ReadonlyArray<readonly [RegExp, string]> = [
  [/ph/g, "f"],
  [/qu/g, "k"],
  [/y/g, "i"],
  [/th/g, "t"],
  [/c(?=[aou])/g, "k"]
];

const phoneticSubstitution: GenerationStrategy = {
  id: "phonetic-substitution",
  generate(context) {
    const anchor = pickAnchor(context, "start");
    const [pattern, replacement] = context.random.pick(substitutions);
    const changed = anchor.value.replace(pattern, replacement);
    const ending = pickEnding(context, anchor);
    return {
      name: titleCase(combineFragments(changed, ending)),
      strategy: this.id,
      origin: [fragmentOrigin(anchor), abstractOrigin(ending, "terminación de marca")],
      meaning: `Variación fonética de ${anchor.meaning}`,
      pronunciation: "Lectura fonética regular"
    };
  }
};

const vowelVariation: GenerationStrategy = {
  id: "vowel-variation",
  generate(context) {
    const anchor = pickAnchor(context, "start");
    const source = normalizeName(anchor.value);
    const positions = [...source].flatMap((letter, index) =>
      /[aeiou]/.test(letter) ? [index] : []
    );
    const position = positions.length > 0 ? context.random.pick(positions) : 1;
    const current = source[position] ?? "a";
    const replacements = ["a", "e", "i", "o", "u"].filter((vowel) => vowel !== current);
    const changed = `${source.slice(0, position)}${context.random.pick(replacements)}${source.slice(
      position + 1
    )}`;
    const ending = pickEnding(context, anchor);
    return {
      name: titleCase(combineFragments(changed, ending)),
      strategy: this.id,
      origin: [fragmentOrigin(anchor), abstractOrigin(ending, "terminación de marca")],
      meaning: `Variación vocálica inspirada en ${anchor.meaning}`,
      pronunciation: "Lectura fonética regular"
    };
  }
};

const phoneticInvention: GenerationStrategy = {
  id: "phonetic-invention",
  generate(context) {
    const definition = profileData[context.config.soundProfile];
    const syllableTotal =
      context.config.maxSyllables <= 2 ? 2 : context.random.chance(0.72) ? 2 : 3;
    const syllables = Array.from({ length: syllableTotal }, () =>
      context.random.pick(definition.syllables)
    );
    const anchor = pickAnchor(context, "start");
    return {
      name: titleCase(syllables.join("")),
      strategy: this.id,
      origin: [fragmentOrigin(anchor), abstractOrigin(syllables.join("-"), "patrón fonético")],
      meaning: `Nombre inventado inspirado en ${anchor.meaning}`,
      pronunciation: syllables.join("-")
    };
  }
};

const indirectConcept: GenerationStrategy = {
  id: "indirect-concept",
  generate(context) {
    const anchor = context.random.pick(context.startFragments);
    const ending = pickEnding(context, anchor);
    return {
      name: titleCase(combineFragments(anchor.value, ending)),
      strategy: this.id,
      origin: [fragmentOrigin(anchor), abstractOrigin(ending, "terminación abstracta")],
      meaning: `Evoca ${anchor.meaning} sin describir directamente la industria`,
      pronunciation: "Lectura fonética regular"
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

export function buildCuratedCandidates(context: GeneratorContext): RawCandidate[] {
  const candidates = context.startFragments.flatMap((anchor) => {
    const endings = (anchor.preferredEndings ?? [])
      .map(normalizeName)
      .filter((ending) => context.suffixPool.includes(ending));
    return endings.map(
      (ending): RawCandidate => ({
        name: titleCase(combineFragments(anchor.value, ending)),
        strategy: "keyword-suffix",
        origin: [fragmentOrigin(anchor), abstractOrigin(ending, "terminación curada")],
        meaning: `${anchor.meaning} con una terminación compatible con la raíz`,
        pronunciation: "Lectura fonética regular"
      })
    );
  });
  return context.random.shuffle(candidates);
}

function uniqueNormalized(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeName).filter(Boolean))].sort();
}

export function buildGeneratorContext(
  config: GenerationConfig,
  roots: LinguisticRoot[],
  random: SeededRandom
): GeneratorContext {
  const selectedRoots = roots
    .filter((root) => config.languages.includes(root.language))
    .sort((left, right) => left.normalized.localeCompare(right.normalized));
  const concepts = new Set([...config.concepts, ...config.keywords].map(normalizeName));
  const selectedFragments = fragments
    .filter(
      (fragment) =>
        config.languages.includes(fragment.language) &&
        fragment.profiles.includes(config.soundProfile)
    )
    .sort((left, right) => left.value.localeCompare(right.value) || left.root.localeCompare(right.root));
  const relevantFragments = selectedFragments.filter((fragment) =>
    fragment.categories.some((category) => concepts.has(normalizeName(category)))
  );
  const usableFragments = relevantFragments.length >= 12 ? relevantFragments : selectedFragments;
  const startFragments = usableFragments.filter(
    (fragment) => fragment.position === "start" || fragment.position === "both"
  );
  const endFragments = usableFragments.filter(
    (fragment) => fragment.position === "end" || fragment.position === "both"
  );
  const definition = profileData[config.soundProfile];
  const requestedPrefixes =
    config.allowedPrefixes.length > 0 ? config.allowedPrefixes : definition.prefixes;
  const requestedSuffixes =
    config.allowedSuffixes.length > 0 ? config.allowedSuffixes : definition.endings;
  const preferredEndings =
    config.allowedSuffixes.length > 0
      ? config.preferredEndings
      : config.preferredEndings.filter((ending) =>
          definition.endings.includes(normalizeName(ending))
        );
  const suffixPool = uniqueNormalized([...requestedSuffixes, ...preferredEndings]).filter(
    (suffix) => pronunciationAnalysis(`n${suffix}`, config.soundProfile).sound >= 58
  );

  return {
    config,
    random,
    roots: selectedRoots,
    startFragments: startFragments.length > 0 ? startFragments : selectedFragments,
    endFragments: endFragments.length > 0 ? endFragments : selectedFragments,
    prefixPool: uniqueNormalized(requestedPrefixes),
    suffixPool: suffixPool.length > 0 ? suffixPool : uniqueNormalized(definition.endings),
    keywordPool: uniqueNormalized([...config.keywords, ...config.concepts])
  };
}
