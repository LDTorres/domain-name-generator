ALTER TABLE "GenerationSession" ADD COLUMN "configurationSource" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "GenerationSession" ADD COLUMN "optimizationModel" TEXT;
ALTER TABLE "GenerationSession" ADD COLUMN "optimizationPromptVersion" TEXT;
ALTER TABLE "GenerationSession" ADD COLUMN "optimizationSummary" TEXT;

ALTER TABLE "DomainCheck" ADD COLUMN "attemptedProviders" TEXT NOT NULL DEFAULT '[]';
