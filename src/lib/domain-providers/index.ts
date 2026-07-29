import { DNSProvider } from "@/lib/domain-providers/dns-provider";
import { namecheapFromEnvironment } from "@/lib/domain-providers/namecheap-provider";
import { RDAPProvider } from "@/lib/domain-providers/rdap-provider";
import type { DomainCheckResult, DomainProvider } from "@/lib/domain-providers/types";

export type { DomainCheckResult, DomainProvider, DomainStatus } from "@/lib/domain-providers/types";

export function configuredDomainProvider(): DomainProvider {
  const requested = process.env.DOMAIN_PROVIDER?.toLowerCase() ?? "rdap";
  if (requested === "namecheap") return namecheapFromEnvironment();
  return new RDAPProvider();
}

export async function checkDomain(domain: string): Promise<DomainCheckResult> {
  const primary = configuredDomainProvider();
  const dns = new DNSProvider();
  const [result, secondary] = await Promise.all([primary.check(domain), dns.check(domain)]);
  return {
    ...result,
    secondarySignal: secondary.secondarySignal
  };
}
