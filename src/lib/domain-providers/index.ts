import { cloudflareFromEnvironment } from "@/lib/domain-providers/cloudflare-provider";
import { DNSProvider } from "@/lib/domain-providers/dns-provider";
import { hostingerFromEnvironment } from "@/lib/domain-providers/hostinger-provider";
import { namecheapFromEnvironment } from "@/lib/domain-providers/namecheap-provider";
import { porkbunFromEnvironment } from "@/lib/domain-providers/porkbun-provider";
import { RDAPProvider } from "@/lib/domain-providers/rdap-provider";
import {
  baseResult,
  type DomainCheckResult,
  type DomainProvider
} from "@/lib/domain-providers/types";

export type {
  DomainCheckResult,
  DomainProvider,
  DomainStatus
} from "@/lib/domain-providers/types";

const DEFINITIVE_STATUSES = new Set(["available", "registered", "premium"]);

function providerRegistry(): Record<string, () => DomainProvider> {
  return {
    hostinger: hostingerFromEnvironment,
    cloudflare: cloudflareFromEnvironment,
    porkbun: porkbunFromEnvironment,
    namecheap: namecheapFromEnvironment,
    rdap: () => new RDAPProvider()
  };
}

export function configuredDomainProviders(): DomainProvider[] {
  const registry = providerRegistry();
  const requested = (
    process.env.DOMAIN_PROVIDER_ORDER ??
    process.env.DOMAIN_PROVIDER ??
    "hostinger,cloudflare,porkbun,namecheap,rdap"
  )
    .toLowerCase()
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const order = [...new Set([...requested, "rdap"])];
  return order
    .map((id) => registry[id]?.())
    .filter((provider): provider is DomainProvider => Boolean(provider))
    .filter((provider) => provider.configured || provider.id === "rdap");
}

export function domainProviderStatuses(): Array<{
  id: string;
  configured: boolean;
}> {
  const registry = providerRegistry();
  return Object.entries(registry).map(([id, factory]) => ({
    id,
    configured: factory().configured
  }));
}

export function configuredDomainProvider(): DomainProvider {
  return configuredDomainProviders()[0] ?? new RDAPProvider();
}

function fallbackResult(domain: string, attempts: string[]): DomainCheckResult {
  const rdap = new RDAPProvider();
  return {
    ...baseResult(rdap, domain),
    status: "unknown",
    attemptedProviders: attempts,
    message: "Ningún proveedor pudo confirmar el estado del dominio."
  };
}

export async function checkDomainsWithProviders(
  domains: readonly string[],
  providers: readonly DomainProvider[],
  dns: DomainProvider = new DNSProvider()
): Promise<DomainCheckResult[]> {
  if (domains.length === 0) return [];
  const normalized = [...new Set(domains.map((domain) => domain.toLowerCase()))];
  const unresolved = new Set(normalized);
  const attempts = new Map(normalized.map((domain) => [domain, [] as string[]]));
  const final = new Map<string, DomainCheckResult>();
  const last = new Map<string, DomainCheckResult>();

  for (const provider of providers) {
    const pending = [...unresolved];
    if (pending.length === 0) break;
    for (const domain of pending) attempts.get(domain)!.push(provider.id);

    let providerResults: DomainCheckResult[];
    try {
      providerResults = await provider.checkMany(pending);
    } catch {
      providerResults = pending.map((domain) => ({
        ...baseResult(provider, domain),
        status: "error",
        message: `No se pudo completar la consulta con ${provider.id}.`
      }));
    }

    for (const result of providerResults) {
      const domain = result.domain.toLowerCase();
      const withAttempts = {
        ...result,
        attemptedProviders: [...(attempts.get(domain) ?? [provider.id])]
      };
      last.set(domain, withAttempts);
      if (DEFINITIVE_STATUSES.has(result.status)) {
        final.set(domain, withAttempts);
        unresolved.delete(domain);
      }
    }
  }

  const dnsResults = await dns.checkMany(normalized);
  const dnsByDomain = new Map(dnsResults.map((result) => [result.domain.toLowerCase(), result]));

  return normalized.map((domain) => {
    const result = final.get(domain) ?? last.get(domain) ?? fallbackResult(domain, attempts.get(domain) ?? []);
    return {
      ...result,
      secondarySignal: dnsByDomain.get(domain)?.secondarySignal ?? null
    };
  });
}

export async function checkDomains(
  domains: readonly string[]
): Promise<DomainCheckResult[]> {
  return checkDomainsWithProviders(domains, configuredDomainProviders());
}

export async function checkDomain(domain: string): Promise<DomainCheckResult> {
  return (await checkDomains([domain]))[0]!;
}
