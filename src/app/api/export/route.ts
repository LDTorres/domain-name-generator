import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { exportCsv, exportMarkdown } from "@/server/export";

const schema = z.object({
  candidateIds: z.array(z.string().min(1)).min(1).max(100),
  format: z.enum(["csv", "json", "markdown"])
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Exportación inválida." }, { status: 400 });
  const candidates = await prisma.candidate.findMany({
    where: { id: { in: parsed.data.candidateIds } },
    include: { score: true, brandRisk: true, domainChecks: true }
  });
  const ordered = parsed.data.candidateIds.flatMap((id) => {
    const candidate = candidates.find((item) => item.id === id);
    return candidate ? [candidate] : [];
  });
  const content =
    parsed.data.format === "csv"
      ? exportCsv(ordered)
      : parsed.data.format === "markdown"
        ? exportMarkdown(ordered)
        : JSON.stringify(ordered, null, 2);
  const contentType =
    parsed.data.format === "json"
      ? "application/json"
      : parsed.data.format === "csv"
        ? "text/csv; charset=utf-8"
        : "text/markdown; charset=utf-8";
  const extension = parsed.data.format === "markdown" ? "md" : parsed.data.format;
  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="brandforge-export.${extension}"`
    }
  });
}
