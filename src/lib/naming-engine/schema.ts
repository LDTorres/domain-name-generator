import { z } from "zod";
import { LANGUAGES } from "@/types/naming";
import { SOUND_PROFILES } from "@/lib/naming-engine/sound-profile";

const wordList = z.array(z.string().trim().min(1).max(40)).max(100);

export const generationConfigSchema = z
  .object({
    projectName: z.string().trim().min(2).max(100),
    description: z.string().trim().min(10).max(1000),
    industry: z.string().trim().min(2).max(80),
    concepts: wordList.min(1),
    keywords: wordList.min(1),
    languages: z.array(z.enum(LANGUAGES)).min(1),
    soundProfile: z.enum(SOUND_PROFILES).default("combined"),
    count: z.coerce.number().int().min(100).max(5000).default(1000),
    minLength: z.coerce.number().int().min(3).max(12).default(5),
    maxLength: z.coerce.number().int().min(4).max(20).default(10),
    maxSyllables: z.coerce.number().int().min(1).max(6).default(3),
    allowedPrefixes: wordList.default([]),
    allowedSuffixes: wordList.default([]),
    preferredEndings: wordList.default([]),
    forbiddenSequences: wordList.default([]),
    forbiddenWords: wordList.default([]),
    domainExtensions: z
      .array(z.enum([".com", ".io", ".co", ".app", ".ai", ".lat", ".com.ar"]))
      .min(1)
      .default([".com", ".io"]),
    seed: z.string().trim().min(1).max(100).default("brandforge")
  })
  .superRefine((value, context) => {
    if (value.minLength > value.maxLength) {
      context.addIssue({
        code: "custom",
        path: ["maxLength"],
        message: "La longitud máxima debe ser mayor o igual a la mínima."
      });
    }
  });

export type GenerationConfig = z.infer<typeof generationConfigSchema>;

export const projectInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1000),
  industry: z.string().trim().min(2).max(80)
});

export const favoriteInputSchema = z.object({
  candidateId: z.string().min(1),
  favorite: z.boolean().default(true),
  comment: z.string().max(1000).default(""),
  manualScore: z.number().int().min(0).max(100).nullable().default(null),
  status: z.enum(["new", "finalist", "discarded"]).default("new")
});

export const compareInputSchema = z.object({
  candidateIds: z.array(z.string().min(1)).min(2).max(5)
});

export const domainCheckInputSchema = z.object({
  candidateId: z.string().min(1),
  name: z.string().regex(/^[a-zA-Z]+$/),
  extensions: z
    .array(z.enum([".com", ".io", ".co", ".app", ".ai", ".lat", ".com.ar"]))
    .min(1)
    .max(7)
});

export const variationInputSchema = z.object({
  candidateId: z.string().min(1),
  count: z.number().int().min(5).max(50).default(20),
  seed: z.string().min(1).max(100)
});
