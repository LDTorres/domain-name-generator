import { z } from "zod";
import {
  generationConfigSchema,
  type GenerationConfig
} from "@/lib/naming-engine/schema";
import { LANGUAGES, type Language } from "@/types/naming";
import {
  SOUND_PROFILES,
  type SoundProfile
} from "@/lib/naming-engine/sound-profile";

export { SOUND_PROFILES };
export const BRAND_STYLES = [
  "minimal",
  "warm",
  "technology",
  "premium",
  "bold"
] as const;
export const CONFIGURATION_SOURCES = ["local", "openrouter", "custom"] as const;

export type { SoundProfile };
export type BrandStyle = (typeof BRAND_STYLES)[number];
export type ConfigurationSource = (typeof CONFIGURATION_SOURCES)[number];

export interface PresetDefinition {
  id: string;
  name: string;
  industry: string;
  description: string;
  concepts: string[];
  keywords: string[];
  languages: string[];
  endings: string[];
}

export const basicBriefSchema = z.object({
  projectName: z.string().trim().min(2).max(100),
  industry: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1000),
  soundProfile: z.enum(SOUND_PROFILES),
  brandStyle: z.enum(BRAND_STYLES)
});

export type BasicBrief = z.infer<typeof basicBriefSchema>;

export interface ConfigurationMetadata {
  source: ConfigurationSource;
  model: string | null;
  promptVersion: string | null;
  summary: string | null;
}

interface StyleProfile {
  minLength: number;
  maxLength: number;
  maxSyllables: number;
  endings: string[];
}

const SOUND_LANGUAGES: Record<SoundProfile, Language[]> = {
  spanish: ["spanish", "latin", "italian", "portuguese"],
  english: ["english", "nordic", "latin"],
  combined: ["spanish", "english", "latin", "italian", "nordic"]
};

const STYLE_PROFILES: Record<BrandStyle, StyleProfile> = {
  minimal: {
    minLength: 5,
    maxLength: 8,
    maxSyllables: 2,
    endings: ["a", "o", "io", "ia"]
  },
  warm: {
    minLength: 5,
    maxLength: 10,
    maxSyllables: 3,
    endings: ["a", "ia", "ora", "ena", "ela"]
  },
  technology: {
    minLength: 5,
    maxLength: 9,
    maxSyllables: 3,
    endings: ["io", "ai", "ix", "ly", "iva"]
  },
  premium: {
    minLength: 6,
    maxLength: 10,
    maxSyllables: 3,
    endings: ["eo", "ia", "ora", "aro", "iva"]
  },
  bold: {
    minLength: 4,
    maxLength: 8,
    maxSyllables: 2,
    endings: ["o", "a", "ix", "ar", "on"]
  }
};

const CONCEPT_ALIASES: Record<string, string[]> = {
  hogar: ["home", "belonging", "haven"],
  casa: ["home", "place", "belonging"],
  propiedad: ["place", "terra", "trust"],
  vivienda: ["home", "nest", "community"],
  viaje: ["journey", "path", "discover"],
  turismo: ["journey", "discover", "arrive"],
  salud: ["life", "care", "trust"],
  educación: ["clarity", "growth", "community"],
  aprendizaje: ["growth", "clarity", "journey"],
  dinero: ["value", "trust", "growth"],
  pagos: ["flow", "trust", "clarity"],
  logística: ["route", "move", "flow"],
  inteligencia: ["innovation", "clarity", "discovery"],
  comunidad: ["community", "belonging", "trust"],
  sostenible: ["growth", "terra", "community"],
  global: ["international", "journey", "community"],
  simple: ["clarity", "flow", "trust"],
  seguro: ["trust", "haven", "clarity"],
  home: ["home", "belonging", "haven"],
  property: ["place", "terra", "trust"],
  travel: ["journey", "path", "discover"],
  health: ["life", "care", "trust"],
  learning: ["growth", "clarity", "journey"],
  payment: ["flow", "trust", "value"],
  community: ["community", "belonging", "trust"],
  sustainable: ["growth", "terra", "community"],
  secure: ["trust", "haven", "clarity"]
};

const FALLBACK_CONCEPTS = ["clarity", "trust", "growth", "community", "discovery"];
const FALLBACK_KEYWORDS = ["nova", "path", "flow", "core", "place"];
const DESCRIPTION_STOPWORDS = new Set([
  "para",
  "como",
  "esta",
  "este",
  "estos",
  "estas",
  "desde",
  "entre",
  "sobre",
  "that",
  "this",
  "with",
  "from",
  "into",
  "your"
]);

function unique(values: readonly string[], limit: number): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].slice(
    0,
    limit
  );
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function descriptionTokens(description: string): string[] {
  return unique(
    normalizeText(description)
      .split(/[^a-z]+/)
      .filter(
        (token) => token.length >= 4 && !DESCRIPTION_STOPWORDS.has(token)
      ),
    8
  );
}

function conceptsFromDescription(description: string): string[] {
  const normalized = normalizeText(description);
  const matches = Object.entries(CONCEPT_ALIASES).flatMap(([term, concepts]) =>
    normalized.includes(normalizeText(term)) ? concepts : []
  );
  return unique(matches, 12);
}

function seedFromProject(projectName: string): string {
  const slug = normalizeText(projectName).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "brandforge"}-v1`;
}

export function languagesForSoundProfile(soundProfile: SoundProfile): Language[] {
  return [...SOUND_LANGUAGES[soundProfile]];
}

export function resolveBasicConfiguration(
  input: BasicBrief,
  preset?: PresetDefinition
): GenerationConfig {
  const brief = basicBriefSchema.parse(input);
  const style = STYLE_PROFILES[brief.brandStyle];
  const concepts = unique(
    [
      ...(preset?.concepts ?? []),
      ...conceptsFromDescription(brief.description),
      ...FALLBACK_CONCEPTS
    ],
    20
  );
  const keywords = unique(
    [...(preset?.keywords ?? []), ...descriptionTokens(brief.description), ...FALLBACK_KEYWORDS],
    12
  );

  return generationConfigSchema.parse({
    projectName: brief.projectName,
    description: brief.description,
    industry: brief.industry,
    concepts,
    keywords,
    languages: languagesForSoundProfile(brief.soundProfile),
    soundProfile: brief.soundProfile,
    count: 1000,
    minLength: style.minLength,
    maxLength: style.maxLength,
    maxSyllables: style.maxSyllables,
    allowedPrefixes: [],
    allowedSuffixes: [],
    preferredEndings: unique([...style.endings, ...(preset?.endings ?? [])], 16),
    forbiddenSequences: [],
    forbiddenWords: [],
    domainExtensions: [".com", ".io", ".co"],
    seed: seedFromProject(brief.projectName)
  });
}

export function isLanguage(value: string): value is Language {
  return LANGUAGES.includes(value as Language);
}
