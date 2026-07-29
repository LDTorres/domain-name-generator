-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GenerationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL DEFAULT '1',
    "configuration" TEXT NOT NULL,
    "requestedCount" INTEGER NOT NULL,
    "generatedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GenerationSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Keyword_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LinguisticRoot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "categories" TEXT NOT NULL,
    "pronunciation" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "canBePrefix" BOOLEAN NOT NULL,
    "canBeSuffix" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "roots" TEXT NOT NULL,
    "configuration" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "pronunciation" TEXT NOT NULL,
    "syllableCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "explanation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Candidate_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GenerationSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CandidateScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "memorability" INTEGER NOT NULL,
    "spanishPronunciation" INTEGER NOT NULL,
    "englishPronunciation" INTEGER NOT NULL,
    "spelling" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,
    "sound" INTEGER NOT NULL,
    "distinctiveness" INTEGER NOT NULL,
    "conceptualFit" INTEGER NOT NULL,
    "internationalFit" INTEGER NOT NULL,
    "confusionRisk" INTEGER NOT NULL,
    "negativeMeaningRisk" INTEGER NOT NULL,
    "domainAvailability" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateScore_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DomainCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "price" REAL,
    "renewalPrice" REAL,
    "currency" TEXT,
    "provider" TEXT NOT NULL,
    "secondarySignal" TEXT,
    "message" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "DomainCheck_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "manualScore" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Favorite_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandRisk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "exactMatches" TEXT NOT NULL,
    "similar" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandRisk_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlacklistedTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "term" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "GenerationSession_projectId_createdAt_idx" ON "GenerationSession"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_projectId_value_type_key" ON "Keyword"("projectId", "value", "type");

-- CreateIndex
CREATE INDEX "LinguisticRoot_language_idx" ON "LinguisticRoot"("language");

-- CreateIndex
CREATE UNIQUE INDEX "LinguisticRoot_normalized_language_key" ON "LinguisticRoot"("normalized", "language");

-- CreateIndex
CREATE INDEX "Candidate_sessionId_status_idx" ON "Candidate"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_sessionId_normalized_key" ON "Candidate"("sessionId", "normalized");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateScore_candidateId_key" ON "CandidateScore"("candidateId");

-- CreateIndex
CREATE INDEX "DomainCheck_candidateId_extension_idx" ON "DomainCheck"("candidateId", "extension");

-- CreateIndex
CREATE INDEX "DomainCheck_domain_provider_expiresAt_idx" ON "DomainCheck"("domain", "provider", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_candidateId_key" ON "Favorite"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandRisk_candidateId_key" ON "BrandRisk"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistedTerm_term_language_key" ON "BlacklistedTerm"("term", "language");
