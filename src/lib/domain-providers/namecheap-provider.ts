import {
  baseResult,
  type DomainCheckResult,
  type DomainProvider
} from "@/lib/domain-providers/types";

interface NamecheapCredentials {
  apiUser: string;
  apiKey: string;
  username: string;
  clientIp: string;
}

export class NamecheapProvider implements DomainProvider {
  readonly id = "namecheap";
  readonly configured: boolean;

  constructor(private readonly credentials: Partial<NamecheapCredentials>) {
    this.configured = Boolean(
      credentials.apiUser && credentials.apiKey && credentials.username && credentials.clientIp
    );
  }

  async check(domain: string): Promise<DomainCheckResult> {
    return (await this.checkMany([domain]))[0]!;
  }

  async checkMany(domains: readonly string[]): Promise<DomainCheckResult[]> {
    if (domains.length === 0) return [];
    const bases = domains.map((domain) => baseResult(this, domain));
    if (!this.configured) {
      return bases.map((item) => ({
        ...item,
        status: "unknown" as const,
        message: "Namecheap no configurado: faltan credenciales en las variables de entorno."
      }));
    }

    const credentials = this.credentials as NamecheapCredentials;
    const parameters = new URLSearchParams({
      ApiUser: credentials.apiUser,
      ApiKey: credentials.apiKey,
      UserName: credentials.username,
      ClientIp: credentials.clientIp,
      Command: "namecheap.domains.check",
      DomainList: domains.join(",")
    });

    try {
      const response = await fetch(`https://api.namecheap.com/xml.response?${parameters}`, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store"
      });
      const xml = await response.text();
      if (!response.ok || /Status="ERROR"/i.test(xml)) {
        return bases.map((item) => ({
          ...item,
          status: "error" as const,
          message: "Namecheap rechazó la consulta. Revisa credenciales, IP autorizada y límites."
        }));
      }
      return bases.map((item) => {
        const escaped = item.domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const tag = xml.match(new RegExp(`<DomainCheckResult[^>]*Domain="${escaped}"[^>]*>`, "i"))?.[0];
        if (!tag) {
          return {
            ...item,
            status: "unknown" as const,
            message: "Namecheap no devolvió un resultado para este dominio."
          };
        }
        const available = /Available="true"/i.test(tag);
        const premium = /IsPremiumName="true"/i.test(tag);
        const price = tag.match(/PremiumRegistrationPrice="([^"]+)"/i)?.[1];
        const renewalPrice = tag.match(/PremiumRenewalPrice="([^"]+)"/i)?.[1];
        return {
          ...item,
          status: premium ? "premium" as const : available ? "available" as const : "registered" as const,
          price: price ? Number(price) : null,
          renewalPrice: renewalPrice ? Number(renewalPrice) : null,
          currency: price || renewalPrice ? "USD" : null,
          message: premium
            ? "Namecheap informa que el dominio es premium."
            : available
              ? "Namecheap informa que el dominio está disponible."
              : "Namecheap informa que el dominio está registrado."
        };
      });
    } catch {
      return bases.map((item) => ({
        ...item,
        status: "error" as const,
        message: "No se pudo contactar Namecheap."
      }));
    }
  }
}

export function namecheapFromEnvironment(): NamecheapProvider {
  return new NamecheapProvider({
    apiUser: process.env.NAMECHEAP_API_USER ?? "",
    apiKey: process.env.NAMECHEAP_API_KEY ?? "",
    username: process.env.NAMECHEAP_USERNAME ?? "",
    clientIp: process.env.NAMECHEAP_CLIENT_IP ?? ""
  });
}
