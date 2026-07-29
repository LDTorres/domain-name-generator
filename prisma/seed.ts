import { PrismaClient } from "@prisma/client";
import { linguisticRoots, problematicTerms, presets } from "../src/data";
import { normalizeName } from "../src/lib/naming-engine/phonetics";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const root of linguisticRoots) {
    await prisma.linguisticRoot.upsert({
      where: {
        normalized_language: {
          normalized: root.normalized,
          language: root.language
        }
      },
      create: {
        value: root.value,
        normalized: root.normalized,
        language: root.language,
        meaning: root.meaning,
        categories: JSON.stringify(root.categories),
        pronunciation: root.pronunciation,
        sentiment: root.sentiment,
        canBePrefix: root.canBePrefix,
        canBeSuffix: root.canBeSuffix
      },
      update: {
        value: root.value,
        meaning: root.meaning,
        categories: JSON.stringify(root.categories),
        pronunciation: root.pronunciation,
        sentiment: root.sentiment,
        canBePrefix: root.canBePrefix,
        canBeSuffix: root.canBeSuffix
      }
    });
  }

  for (const term of problematicTerms) {
    const normalized = normalizeName(term);
    await prisma.blacklistedTerm.upsert({
      where: { term_language: { term: normalized, language: "multilingual" } },
      create: {
        term: normalized,
        language: "multilingual",
        severity: "medium",
        category: "problematic"
      },
      update: { active: true }
    });
  }

  const proptech = presets.find((preset) => preset.id === "proptech-global");
  if (proptech) {
    const existing = await prisma.project.findFirst({ where: { name: "NidoProps" } });
    if (!existing) {
      await prisma.project.create({
        data: {
          name: "NidoProps",
          description: proptech.description,
          industry: proptech.industry,
          keywords: {
            create: [
              ...proptech.concepts.map((value) => ({ value, type: "concept" })),
              ...proptech.keywords.map((value) => ({ value, type: "keyword" }))
            ]
          }
        }
      });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
