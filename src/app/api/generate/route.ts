import { NextResponse } from "next/server";
import { z } from "zod";
import { generationConfigSchema } from "@/lib/naming-engine/schema";
import { generateAndPersist } from "@/server/generation-service";
import { logger } from "@/server/logger";
import { CONFIGURATION_SOURCES } from "@/lib/configuration/profiles";

const requestSchema = z.object({
  projectId: z.string().min(1),
  config: generationConfigSchema,
  configurationMeta: z
    .object({
      source: z.enum(CONFIGURATION_SOURCES),
      model: z.string().max(200).nullable(),
      promptVersion: z.string().max(100).nullable(),
      summary: z.string().max(500).nullable()
    })
    .default({
      source: "local",
      model: null,
      promptVersion: null,
      summary: null
    })
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Configuración de generación inválida.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const result = await generateAndPersist(
      parsed.data.projectId,
      parsed.data.config,
      parsed.data.configurationMeta
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("generation.failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return NextResponse.json(
      { error: "No se pudo completar la generación." },
      { status: 500 }
    );
  }
}
