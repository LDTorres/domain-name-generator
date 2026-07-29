import { NextResponse } from "next/server";
import { favoriteInputSchema } from "@/lib/naming-engine/schema";
import { prisma } from "@/server/db";

export async function PUT(request: Request) {
  const parsed = favoriteInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Favorito inválido." }, { status: 400 });
  }
  const { candidateId, favorite, comment, manualScore, status } = parsed.data;
  if (!favorite) {
    await prisma.favorite.deleteMany({ where: { candidateId } });
    return NextResponse.json({ favorite: null });
  }
  const saved = await prisma.favorite.upsert({
    where: { candidateId },
    create: { candidateId, comment, manualScore, status },
    update: { comment, manualScore, status }
  });
  return NextResponse.json({ favorite: saved });
}

export async function GET() {
  const favorites = await prisma.favorite.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      candidate: {
        include: { score: true, brandRisk: true, domainChecks: true }
      }
    }
  });
  return NextResponse.json({ favorites });
}
