import { NextResponse } from "next/server";
import {
  checkDomains,
  configuredDomainProviders,
  domainProviderStatuses
} from "@/lib/domain-providers";
import { isReusableDomainCache } from "@/lib/domain-providers/cache";
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

  const providers = configuredDomainProviders();
  const providerIds = providers.map((provider) => provider.id);
  const providerOrder = new Map(providers.map((provider, index) => [provider.id, index]));
  const now = new Date();
  const ttlSeconds = Number(process.env.DOMAIN_CACHE_TTL_SECONDS ?? 86400);
  const domains = parsed.data.extensions.map(
    (extension) => `${parsed.data.name.toLowerCase()}${extension}`
  );
  const extensionByDomain = new Map(
    parsed.data.extensions.map((extension) => [
      `${parsed.data.name.toLowerCase()}${extension}`,
      extension
    ])
  );
  const cachedRows = await prisma.domainCheck.findMany({
    where: {
      domain: { in: domains },
      expiresAt: { gt: now }
    },
    orderBy: { checkedAt: "desc" }
  });
  const cachedByDomain = new Map<string, (typeof cachedRows)[number]>();
  for (const domain of domains) {
    const matches = cachedRows
      .filter((row) => row.domain === domain)
      .filter((row) => isReusableDomainCache(row, providerIds))
      .sort(
        (left, right) =>
          (providerOrder.get(left.provider) ?? 999) -
          (providerOrder.get(right.provider) ?? 999)
      );
    if (matches[0]) cachedByDomain.set(domain, matches[0]);
  }
  const missingDomains = domains.filter((domain) => !cachedByDomain.has(domain));
  const checked = await checkDomains(missingDomains);
  const savedByDomain = new Map<string, (typeof cachedRows)[number]>();

  for (const result of checked) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const extension = extensionByDomain.get(result.domain) ?? "";
    const saved = await prisma.domainCheck.create({
      data: {
        candidateId: parsed.data.candidateId,
        domain: result.domain,
        extension,
        status: result.status,
        price: result.price,
        renewalPrice: result.renewalPrice,
        currency: result.currency,
        provider: result.provider,
        attemptedProviders: JSON.stringify(result.attemptedProviders),
        secondarySignal: result.secondarySignal,
        message: result.message,
        checkedAt: new Date(result.checkedAt),
        expiresAt
      }
    });
    savedByDomain.set(result.domain, saved);
  }

  const results = domains.flatMap((domain) => {
    const cached = cachedByDomain.get(domain);
    if (cached) {
      return [{ ...cached, cached: true, configured: true }];
    }
    const saved = savedByDomain.get(domain);
    return saved ? [{ ...saved, cached: false, configured: true }] : [];
  });

  logger.info("domains.checked", {
    candidateId: parsed.data.candidateId,
    providers: providers.map((provider) => provider.id),
    count: results.length
  });
  return NextResponse.json({
    results,
    providers: domainProviderStatuses(),
    rateLimitRemaining: rate.remaining
  });
}
