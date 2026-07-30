import { z } from "zod";
import {
  basicBriefSchema,
  languagesForSoundProfile,
  type BasicBrief
} from "@/lib/configuration/profiles";
import {
  generationConfigSchema,
  type GenerationConfig
} from "@/lib/naming-engine/schema";
import { logger } from "@/server/logger";
import { LANGUAGES, type Language } from "@/types/naming";

export const AI_OPTIMIZATION_PROMPT_VERSION = "configuration-v1";

const shortWordList = z.array(z.string().trim().min(1).max(40));

export const aiConfigurationOutputSchema = z
  .object({
    concepts: shortWordList.min(4).max(20),
    keywords: shortWordList.min(4).max(12),
    languages: z.array(z.enum(LANGUAGES)).min(1).max(5),
    preferredEndings: shortWordList.min(3).max(16),
    allowedPrefixes: shortWordList.max(10),
    allowedSuffixes: shortWordList.max(10),
    minLength: z.number().int().min(3).max(12),
    maxLength: z.number().int().min(4).max(20),
    maxSyllables: z.number().int().min(1).max(3),
    summary: z.string().trim().min(10).max(500)
  })
  .superRefine((value, context) => {
    if (value.minLength > value.maxLength) {
      context.addIssue({
        code: "custom",
        path: ["maxLength"],
        message: "maxLength debe ser mayor o igual a minLength."
      });
    }
  });

export type AIConfigurationOutput = z.infer<typeof aiConfigurationOutputSchema>;

export interface AIOptimizationResult {
  config: GenerationConfig;
  model: string;
  promptVersion: string;
  summary: string;
}

export interface AIConfigurationOptimizer {
  readonly configured: boolean;
  optimize(brief: BasicBrief, baseConfig: GenerationConfig): Promise<AIOptimizationResult>;
}

export class AIConfigurationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null = null
  ) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

const openRouterResponseSchema = z.object({
  model: z.string().min(1),
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1)
        })
      })
    )
    .min(1)
});

const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    concepts: { type: "array", minItems: 4, maxItems: 20, items: { type: "string" } },
    keywords: { type: "array", minItems: 4, maxItems: 12, items: { type: "string" } },
    languages: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string", enum: [...LANGUAGES] }
    },
    preferredEndings: {
      type: "array",
      minItems: 3,
      maxItems: 16,
      items: { type: "string" }
    },
    allowedPrefixes: { type: "array", maxItems: 10, items: { type: "string" } },
    allowedSuffixes: { type: "array", maxItems: 10, items: { type: "string" } },
    minLength: { type: "integer", minimum: 3, maximum: 12 },
    maxLength: { type: "integer", minimum: 4, maximum: 20 },
    maxSyllables: { type: "integer", minimum: 1, maximum: 3 },
    summary: { type: "string", minLength: 10, maxLength: 500 }
  },
  required: [
    "concepts",
    "keywords",
    "languages",
    "preferredEndings",
    "allowedPrefixes",
    "allowedSuffixes",
    "minLength",
    "maxLength",
    "maxSyllables",
    "summary"
  ]
} as const;

function buildOpenRouterRequestPayload(
  brief: BasicBrief,
  allowedLanguages: readonly Language[],
  model: string
) {
  return {
    model,
    temperature: 0.35,
    max_tokens: 1200,
    messages: [
      {
        role: "system",
        content:
          "Eres especialista en naming internacional. Ajusta parámetros para un motor local; no propongas nombres finales. Devuelve únicamente el JSON solicitado."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Optimizar configuración de generación de nombres de marca inventados.",
          brief,
          allowedLanguages,
          constraints: [
            "Los nombres deben ser cortos, memorables y pronunciables.",
            "No cambies seed, cantidad, dominios, blacklist ni puntuación.",
            "languages debe ser un subconjunto de allowedLanguages.",
            "Prefiere fragmentos y terminaciones fáciles en español e inglés."
          ]
        })
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "brandforge_configuration",
        strict: true,
        schema: outputJsonSchema
      }
    },
    provider: { require_parameters: true }
  } as const;
}

function normalizeList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function mergeOptimization(
  brief: BasicBrief,
  baseConfig: GenerationConfig,
  output: AIConfigurationOutput
): GenerationConfig {
  const allowedLanguages = new Set<Language>(languagesForSoundProfile(brief.soundProfile));
  const constrainedLanguages = output.languages.filter((language) =>
    allowedLanguages.has(language)
  );

  return generationConfigSchema.parse({
    ...baseConfig,
    concepts: normalizeList(output.concepts),
    keywords: normalizeList(output.keywords),
    languages:
      constrainedLanguages.length > 0
        ? constrainedLanguages
        : languagesForSoundProfile(brief.soundProfile),
    preferredEndings: normalizeList(output.preferredEndings),
    allowedPrefixes: normalizeList(output.allowedPrefixes),
    allowedSuffixes: normalizeList(output.allowedSuffixes),
    minLength: output.minLength,
    maxLength: output.maxLength,
    maxSyllables: output.maxSyllables
  });
}

export class OpenRouterConfigurationOptimizer implements AIConfigurationOptimizer {
  readonly configured: boolean;

  constructor(
    private readonly apiKey: string,
    private readonly model = "openrouter/free",
    private readonly timeoutMs = 20_000,
    private readonly logPayloads =
      process.env.OPENROUTER_LOG_PAYLOADS?.toLowerCase() === "true"
  ) {
    this.configured = apiKey.trim().length > 0;
  }

  async optimize(
    input: BasicBrief,
    baseConfig: GenerationConfig
  ): Promise<AIOptimizationResult> {
    const brief = basicBriefSchema.parse(input);
    if (!this.configured) {
      throw new AIConfigurationError(
        "OpenRouter no está configurado. Agrega OPENROUTER_API_KEY en el servidor.",
        503
      );
    }

    const allowedLanguages = languagesForSoundProfile(brief.soundProfile);
    const requestPayload = buildOpenRouterRequestPayload(
      brief,
      allowedLanguages,
      this.model
    );
    if (this.logPayloads) {
      logger.info("openrouter.request", {
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        payload: requestPayload
      });
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Brandforge"
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(this.timeoutMs),
      cache: "no-store"
    }).catch((error: unknown) => {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AIConfigurationError("OpenRouter excedió el tiempo máximo de respuesta.", 504);
      }
      throw new AIConfigurationError(
        "No se pudo contactar OpenRouter.",
        502
      );
    });

    if (!response.ok) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const status = response.status;
      const messages: Record<number, string> = {
        401: "La clave de OpenRouter no es válida.",
        402: "La cuenta de OpenRouter no tiene crédito disponible.",
        429: "OpenRouter alcanzó su límite de solicitudes gratuitas.",
        503: "No hay un modelo gratuito compatible disponible en este momento."
      };
      throw new AIConfigurationError(
        messages[status] ?? `OpenRouter respondió con estado HTTP ${status}.`,
        status,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
      );
    }

    const completion = openRouterResponseSchema.safeParse(await response.json());
    if (!completion.success) {
      throw new AIConfigurationError("OpenRouter devolvió una respuesta incompleta.", 502);
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(completion.data.choices[0]!.message.content);
    } catch {
      throw new AIConfigurationError("OpenRouter no devolvió JSON válido.", 502);
    }
    const output = aiConfigurationOutputSchema.safeParse(decoded);
    if (!output.success) {
      throw new AIConfigurationError(
        "La configuración propuesta por OpenRouter no pasó la validación.",
        502
      );
    }

    return {
      config: mergeOptimization(brief, baseConfig, output.data),
      model: completion.data.model,
      promptVersion: AI_OPTIMIZATION_PROMPT_VERSION,
      summary: output.data.summary
    };
  }
}

export function configuredAIConfigurationOptimizer(): AIConfigurationOptimizer {
  return new OpenRouterConfigurationOptimizer(
    process.env.OPENROUTER_API_KEY ?? "",
    process.env.OPENROUTER_MODEL ?? "openrouter/free",
    Number(process.env.OPENROUTER_TIMEOUT_MS ?? 20_000),
    process.env.OPENROUTER_LOG_PAYLOADS?.toLowerCase() === "true"
  );
}
