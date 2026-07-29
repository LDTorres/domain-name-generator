import { NextResponse } from "next/server";
import { compareInputSchema } from "@/lib/naming-engine/schema";
import { prisma } from "@/server/db";

export async function POST(request: Request) {
  const parsed = compareInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Selecciona entre 2 y 5 candidatos." }, { status: 400 });
  }
  const candidates = await prisma.candidate.findMany({
    where: { id: { in: parsed.data.candidateIds } },
    include: { score: true, brandRisk: true, domainChecks: true, favorite: true }
  });
  const ordered = parsed.data.candidateIds.flatMap((id) => {
    const candidate = candidates.find((item) => item.id === id);
    return candidate ? [candidate] : [];
  });
  return NextResponse.json({ candidates: ordered });
}
