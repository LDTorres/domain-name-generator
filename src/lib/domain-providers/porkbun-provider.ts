import { z } from "zod";
import {
  baseResult,
  unavailableResult,
  type DomainCheckResult,
  type DomainProvider
} from "@/lib/domain-providers/types";

const responseSchema = z.object({
  status: z.string(),
  response: z
    .object({
      avail: z.string().optional(),
      price: z.union([z.string(), z.number()]).optional(),
      regularPrice: z.union([z.string(), z.number()]).optional(),
      premium: z.union([z.string(), z.boolean()]).optional()
    })
    .optional(),
  message: z.string().optional()
});

export class PorkbunProvider implements DomainProvider {
  readonly id = "porkbun";
  readonly configured: boolean;

  constructor(
    private readonly apiKey: string,
    private readonly secretApiKey: string
  ) {
    this.configured = Boolean(apiKey.trim() && secretApiKey.trim());
  }

  async check(domain: string): Promise<DomainCheckResult> {
    const base = baseResult(this, domain);
    if (!this.configured) {
      return unavailableResult(
        this,
        domain,
        "Porkbun no configurado: faltan API key y secret API key."
      );
    }
    try {
      const response = await fetch(
        `https://api.porkbun.com/api/json/v3/domain/checkDomain/${encodeURIComponent(domain)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apikey: this.apiKey, secretapikey: this.secretApiKey }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store"
        }
      );
      if (!response.ok) {
        return {
          ...base,
          status: response.status === 429 ? "unknown" : "error",
          message: `Porkbun respondió con estado HTTP ${response.status}.`
        };
      }
      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.status.toUpperCase() !== "SUCCESS") {
        return {
          ...base,
          status: "error",
          message: parsed.success
            ? parsed.data.message ?? "Porkbun rechazó la consulta."
            : "Porkbun devolvió una respuesta con formato inesperado."
        };
      }
      const detail = parsed.data.response;
      const premium = detail?.premium === true || detail?.premium === "yes";
      const available = detail?.avail === "yes";
      const price = detail?.price === undefined ? null : Number(detail.price);
      const renewal =
        detail?.regularPrice === undefined ? null : Number(detail.regularPrice);
      return {
        ...base,
        status: premium ? "premium" : available ? "available" : "registered",
        price: Number.isFinite(price) ? price : null,
        renewalPrice: Number.isFinite(renewal) ? renewal : null,
        currency: price !== null || renewal !== null ? "USD" : null,
        message: premium
          ? "Porkbun identifica el dominio como premium."
          : available
            ? "Porkbun informa que el dominio está disponible."
            : "Porkbun informa que el dominio no está disponible."
      };
    } catch {
      return {
        ...base,
        status: "error",
        message: "No se pudo contactar Porkbun."
      };
    }
  }

  async checkMany(domains: readonly string[]): Promise<DomainCheckResult[]> {
    const results: DomainCheckResult[] = [];
    for (const domain of domains) results.push(await this.check(domain));
    return results;
  }
}

export function porkbunFromEnvironment(): PorkbunProvider {
  return new PorkbunProvider(
    process.env.PORKBUN_API_KEY ?? "",
    process.env.PORKBUN_SECRET_API_KEY ?? ""
  );
}
