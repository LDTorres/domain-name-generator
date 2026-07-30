import { z } from "zod";
import {
  baseResult,
  unavailableResult,
  type DomainCheckResult,
  type DomainProvider,
  type DomainStatus
} from "@/lib/domain-providers/types";

const domainSchema = z.object({
  name: z.string(),
  registrable: z.boolean(),
  reason: z
    .enum([
      "extension_not_supported_via_api",
      "extension_not_supported",
      "extension_disallows_registration",
      "domain_premium",
      "domain_unavailable"
    ])
    .optional(),
  tier: z.enum(["standard", "premium"]).optional(),
  pricing: z
    .object({
      currency: z.string(),
      registration_cost: z.string(),
      renewal_cost: z.string()
    })
    .optional()
});

const responseSchema = z.object({
  success: z.boolean(),
  result: z.object({ domains: z.array(domainSchema) })
});

function statusOf(result: z.infer<typeof domainSchema>): DomainStatus {
  if (result.tier === "premium" || result.reason === "domain_premium") return "premium";
  if (result.registrable) return "available";
  if (result.reason === "domain_unavailable") return "registered";
  return "unknown";
}

export class CloudflareProvider implements DomainProvider {
  readonly id = "cloudflare";
  readonly configured: boolean;

  constructor(
    private readonly accountId: string,
    private readonly apiToken: string
  ) {
    this.configured = Boolean(accountId.trim() && apiToken.trim());
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
          "Cloudflare no configurado: faltan cuenta o token de Registrar."
        )
      );
    }

    const chunks: string[][] = [];
    for (let index = 0; index < domains.length; index += 20) {
      chunks.push([...domains.slice(index, index + 20)]);
    }
    const found = new Map<string, DomainCheckResult>();
    for (const chunk of chunks) {
      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/registrar/domain-check`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ domains: chunk }),
            signal: AbortSignal.timeout(8000),
            cache: "no-store"
          }
        );
        if (!response.ok) {
          for (const domain of chunk) {
            found.set(domain, {
              ...baseResult(this, domain),
              status: response.status === 429 ? "unknown" : "error",
              message: `Cloudflare respondió con estado HTTP ${response.status}.`
            });
          }
          continue;
        }
        const parsed = responseSchema.safeParse(await response.json());
        if (!parsed.success || !parsed.data.success) {
          for (const domain of chunk) {
            found.set(domain, {
              ...baseResult(this, domain),
              status: "error",
              message: "Cloudflare devolvió una respuesta con formato inesperado."
            });
          }
          continue;
        }
        for (const item of parsed.data.result.domains) {
          const pricing = item.pricing;
          const status = statusOf(item);
          found.set(item.name.toLowerCase(), {
            ...baseResult(this, item.name.toLowerCase()),
            status,
            price: pricing ? Number(pricing.registration_cost) : null,
            renewalPrice: pricing ? Number(pricing.renewal_cost) : null,
            currency: pricing?.currency ?? null,
            message:
              status === "available"
                ? "Cloudflare confirma disponibilidad en tiempo real."
                : status === "premium"
                  ? "Cloudflare identifica el dominio como premium."
                  : status === "registered"
                    ? "Cloudflare informa que el dominio no está disponible."
                    : `Cloudflare no puede confirmar este dominio (${item.reason ?? "sin detalle"}).`
          });
        }
      } catch {
        for (const domain of chunk) {
          found.set(domain, {
            ...baseResult(this, domain),
            status: "error",
            message: "No se pudo contactar Cloudflare."
          });
        }
      }
    }
    return domains.map(
      (domain) =>
        found.get(domain.toLowerCase()) ??
        unavailableResult(this, domain, "Cloudflare no devolvió resultado.")
    );
  }
}

export function cloudflareFromEnvironment(): CloudflareProvider {
  return new CloudflareProvider(
    process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    process.env.CLOUDFLARE_API_TOKEN ?? ""
  );
}
