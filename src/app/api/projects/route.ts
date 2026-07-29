import { NextResponse } from "next/server";
import { projectInputSchema } from "@/lib/naming-engine/schema";
import { prisma } from "@/server/db";

export async function POST(request: Request) {
  const parsed = projectInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Configuración de proyecto inválida.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const project = await prisma.project.create({ data: parsed.data });
  return NextResponse.json({ project }, { status: 201 });
}

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { _count: { select: { sessions: true } } }
  });
  return NextResponse.json({ projects });
}
