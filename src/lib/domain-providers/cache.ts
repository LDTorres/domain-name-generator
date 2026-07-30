import type { DomainStatus } from "@/lib/domain-providers/types";

const DEFINITIVE_STATUSES = new Set<DomainStatus>([
  "available",
  "registered",
  "premium"
]);

export interface CachedDomainResult {
  status: string;
  attemptedProviders: string;
}

export function isReusableDomainCache(
  result: CachedDomainResult,
  configuredProviderIds: readonly string[]
): boolean {
  if (DEFINITIVE_STATUSES.has(result.status as DomainStatus)) return true;
  try {
    const attempted: unknown = JSON.parse(result.attemptedProviders);
    return (
      Array.isArray(attempted) &&
      configuredProviderIds.every(
        (providerId) =>
          attempted.includes(providerId)
      )
    );
  } catch {
    return false;
  }
}
