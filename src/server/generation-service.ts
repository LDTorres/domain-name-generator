import type { Prisma } from "@prisma/client";
import { generateNames } from "@/lib/naming-engine";
import type { GenerationConfig } from "@/lib/naming-engine/schema";
import type { ConfigurationMetadata } from "@/lib/configuration/profiles";
import { prisma } from "@/server/db";
import { logger } from "@/server/logger";

export async function generateAndPersist(
  projectId: string,
  config: GenerationConfig,
  metadata: ConfigurationMetadata = {
    source: "local",
    model: null,
    promptVersion: null,
    summary: null
  }
) {
  const result = generateNames(config);
  const session = await prisma.generationSession.create({
    data: {
      projectId,
      seed: result.seed,
      engineVersion: result.engineVersion,
      configuration: JSON.stringify(config),
      configurationSource: metadata.source,
      optimizationModel: metadata.model,
      optimizationPromptVersion: metadata.promptVersion,
      optimizationSummary: metadata.summary,
      requestedCount: config.count,
      generatedCount: result.generatedCount,
      rejectedCount: result.rejectedCount
    }
  });

  const operations = result.candidates.map((candidate) =>
    prisma.candidate.create({
      data: {
        sessionId: session.id,
        name: candidate.name,
        normalized: candidate.normalized,
        strategy: candidate.strategy,
        roots: JSON.stringify(candidate.origin),
        configuration: JSON.stringify(config),
        meaning: candidate.meaning,
        pronunciation: candidate.pronunciation,
        syllableCount: candidate.syllableCount,
        explanation: JSON.stringify(candidate.scoreExplanation),
        score: {
          create: {
            total: candidate.score,
            ...candidate.scores,
            explanation: JSON.stringify(candidate.scoreExplanation)
          }
        },
        brandRisk: {
          create: {
            level: candidate.brandRisk.level,
            exactMatches: JSON.stringify(candidate.brandRisk.exactMatches),
            similar: JSON.stringify({
              similar: candidate.brandRisk.similar,
              phonetic: candidate.brandRisk.phoneticMatches
            }),
            explanation: `${candidate.brandRisk.explanation} ${candidate.brandRisk.disclaimer}`
          }
        }
      },
      include: { score: true, brandRisk: true, favorite: true, domainChecks: true }
    })
  );
  const candidates = await prisma.$transaction(operations as Prisma.PrismaPromise<unknown>[]);
  logger.info("generation.completed", {
    projectId,
    sessionId: session.id,
    seed: result.seed,
    generatedCount: result.generatedCount,
    persistedCount: candidates.length,
    rejectedCount: result.rejectedCount,
    configurationSource: metadata.source,
    optimizationModel: metadata.model
  });

  return { ...result, sessionId: session.id, candidates };
}
