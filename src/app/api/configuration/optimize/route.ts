import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AIConfigurationError,
  configuredAIConfigurationOptimizer
} from "@/lib/ai-configuration-optimizer";
import { presets } from "@/data";
import {
  basicBriefSchema,
  resolveBasicConfiguration
} from "@/lib/configuration/profiles";
import { logger } from "@/server/logger";
import { consumeAIRateLimit } from "@/server/rate-limit";

const requestSchema = z.object({
  brief: basicBriefSchema
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Brief o configuración base inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local-client";
  const rate = consumeAIRateLimit(clientKey);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Límite local de optimizaciones alcanzado.",
        retryAfterSeconds: rate.retryAfterSeconds
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const preset = presets.find(
      (candidate) => candidate.industry === parsed.data.brief.industry
    );
    const baseConfig = resolveBasicConfiguration(parsed.data.brief, preset);
    const result = await configuredAIConfigurationOptimizer().optimize(
      parsed.data.brief,
      baseConfig
    );
    logger.info("configuration.optimized", {
      model: result.model,
      promptVersion: result.promptVersion
    });
    return NextResponse.json({ ...result, rateLimitRemaining: rate.remaining });
  } catch (error) {
    const known =
      error instanceof AIConfigurationError
        ? error
        : new AIConfigurationError("No se pudo completar la optimización.", 500);
    logger.warn("configuration.optimization_failed", {
      status: known.status,
      message: known.message
    });
    const responseInit: ResponseInit = known.retryAfterSeconds
      ? {
          status: known.status,
          headers: { "Retry-After": String(known.retryAfterSeconds) }
        }
      : { status: known.status };
    return NextResponse.json(
      {
        error: known.message,
        retryAfterSeconds: known.retryAfterSeconds
      },
      responseInit
    );
  }
}
