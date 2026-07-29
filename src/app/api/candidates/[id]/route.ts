import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";

const updateSchema = z.object({
  status: z.enum(["new", "finalist", "discarded"])
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  const candidate = await prisma.candidate.update({
    where: { id },
    data: { status: parsed.data.status }
  });
  return NextResponse.json({ candidate });
}
