import { NextResponse } from "next/server";
import { checkDomain, configuredDomainProvider } from "@/lib/domain-providers";
import { domainCheckInputSchema } from "@/lib/naming-engine/schema";
import { prisma } from "@/server/db";
import { logger } from "@/server/logger";
import { consumeDomainRateLimit } from "@/server/rate-limit";

export async function POST(request: Request) {
  const parsed = domainCheckInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Consulta de dominio inválida." }, { status: 400 });
  }
  const clientKey =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local-client";
  const rate = consumeDomainRateLimit(clientKey);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Límite de consultas alcanzado.", retryAfterSeconds: rate.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: parsed.data.candidateId },
    select: { id: true }
  });
  if (!candidate) return NextResponse.json({ error: "Candidato no encontrado." }, { status: 404 });

  const provider = configuredDomainProvider();
  const now = new Date();
  const ttlSeconds = Number(process.env.DOMAIN_CACHE_TTL_SECONDS ?? 86400);
  const results = [];

  for (const extension of parsed.data.extensions) {
    const domain = `${parsed.data.name.toLowerCase()}${extension}`;
    const cached = await prisma.domainCheck.findFirst({
      where: { domain, provider: provider.id, expiresAt: { gt: now } },
      orderBy: { checkedAt: "desc" }
    });
    if (cached) {
      results.push({ ...cached, cached: true, configured: provider.configured });
      continue;
    }

    const result = await checkDomain(domain);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const saved = await prisma.domainCheck.create({
      data: {
        candidateId: parsed.data.candidateId,
        domain,
        extension,
        status: result.status,
        price: result.price,
        renewalPrice: result.renewalPrice,
        currency: result.currency,
        provider: result.provider,
        secondarySignal: result.secondarySignal,
        message: result.message,
        checkedAt: new Date(result.checkedAt),
        expiresAt
      }
    });
    results.push({ ...saved, cached: false, configured: result.configured });
  }

  logger.info("domains.checked", {
    candidateId: parsed.data.candidateId,
    provider: provider.id,
    count: results.length
  });
  return NextResponse.json({ results, rateLimitRemaining: rate.remaining });
}
