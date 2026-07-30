import { z } from "zod";
import {
  baseResult,
  extensionOf,
  unavailableResult,
  type DomainCheckResult,
  type DomainProvider
} from "@/lib/domain-providers/types";

const responseSchema = z.array(
  z.object({
    domain: z.string().nullable(),
    is_available: z.boolean(),
    is_alternative: z.boolean().optional(),
    restriction: z.string().nullable().optional()
  })
);

function labelOf(domain: string): string {
  return domain.slice(0, -extensionOf(domain).length);
}

export class HostingerProvider implements DomainProvider {
  readonly id = "hostinger";
  readonly configured: boolean;

  constructor(private readonly apiToken: string) {
    this.configured = apiToken.trim().length > 0;
  }

  async check(domain: string): Promise<DomainCheckResult> {
    return (await this.checkMany([domain]))[0]!;
  }

  async checkMany(domains: readonly string[]): Promise<DomainCheckResult[]> {
    if (domains.length === 0) return [];
    if (!this.configured) {
      return domains.map((domain) =>
        unavailableResult(
          this,
          domain,
          "Hostinger no configurado: falta HOSTINGER_API_TOKEN."
        )
      );
    }

    const groups = new Map<string, string[]>();
    for (const domain of domains) {
      const label = labelOf(domain);
      groups.set(label, [...(groups.get(label) ?? []), domain]);
    }

    const results: DomainCheckResult[] = [];
    for (const [label, groupDomains] of groups) {
      const bases = new Map(groupDomains.map((domain) => [domain, baseResult(this, domain)]));
      try {
        const response = await fetch("https://developers.hostinger.com/api/domains/v1/availability", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            domain: label,
            tlds: groupDomains.map((domain) => extensionOf(domain).slice(1)),
            with_alternatives: false
          }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store"
        });
        if (!response.ok) {
          const message =
            response.status === 429
              ? "Hostinger alcanzó su límite de 10 consultas por minuto."
              : `Hostinger respondió con estado HTTP ${response.status}.`;
          results.push(
            ...groupDomains.map((domain) => ({
              ...bases.get(domain)!,
              status: response.status === 429 ? "unknown" as const : "error" as const,
              message
            }))
          );
          continue;
        }
        const parsed = responseSchema.safeParse(await response.json());
        if (!parsed.success) {
          results.push(
            ...groupDomains.map((domain) => ({
              ...bases.get(domain)!,
              status: "error" as const,
              message: "Hostinger devolvió una respuesta con formato inesperado."
            }))
          );
          continue;
        }
        const byDomain = new Map(
          parsed.data
            .filter((item): item is typeof item & { domain: string } => Boolean(item.domain))
            .map((item) => [item.domain.toLowerCase(), item])
        );
        results.push(
          ...groupDomains.map((domain) => {
            const item = byDomain.get(domain.toLowerCase());
            if (!item) {
              return {
                ...bases.get(domain)!,
                status: "unknown" as const,
                message: "Hostinger no devolvió un resultado para este TLD."
              };
            }
            return {
              ...bases.get(domain)!,
              status: item.is_available ? "available" as const : "registered" as const,
              message: item.is_available
                ? `Hostinger informa que el dominio está disponible.${item.restriction ? ` Restricción: ${item.restriction}` : ""}`
                : "Hostinger informa que el dominio no está disponible."
            };
          })
        );
      } catch {
        results.push(
          ...groupDomains.map((domain) => ({
            ...bases.get(domain)!,
            status: "error" as const,
            message: "No se pudo contactar Hostinger."
          }))
        );
      }
    }
    return domains.map(
      (domain) =>
        results.find((result) => result.domain === domain) ??
        unavailableResult(this, domain, "Hostinger no devolvió resultado.")
    );
  }
}

export function hostingerFromEnvironment(): HostingerProvider {
  return new HostingerProvider(process.env.HOSTINGER_API_TOKEN ?? "");
}
