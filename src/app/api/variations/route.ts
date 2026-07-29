import { NextResponse } from "next/server";
import { variationInputSchema, generationConfigSchema } from "@/lib/naming-engine/schema";
import { prisma } from "@/server/db";
import { generateAndPersist } from "@/server/generation-service";

export async function POST(request: Request) {
  const parsed = variationInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const candidate = await prisma.candidate.findUnique({
    where: { id: parsed.data.candidateId },
    include: { session: true }
  });
  if (!candidate) return NextResponse.json({ error: "Candidato no encontrado." }, { status: 404 });
  const previous = generationConfigSchema.parse(JSON.parse(candidate.configuration));
  const config = generationConfigSchema.parse({
    ...previous,
    keywords: [candidate.normalized, ...previous.keywords],
    count: Math.max(100, parsed.data.count * 10),
    seed: parsed.data.seed
  });
  const result = await generateAndPersist(candidate.session.projectId, config);
  return NextResponse.json({
    ...result,
    candidates: result.candidates.slice(0, parsed.data.count)
  });
}
