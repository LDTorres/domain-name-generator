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
    const base = baseResult(this, domain);
    if (!this.configured) {
      return {
        ...base,
        status: "unknown",
        message: "Namecheap no configurado: faltan credenciales en las variables de entorno."
      };
    }

    const credentials = this.credentials as NamecheapCredentials;
    const parameters = new URLSearchParams({
      ApiUser: credentials.apiUser,
      ApiKey: credentials.apiKey,
      UserName: credentials.username,
      ClientIp: credentials.clientIp,
      Command: "namecheap.domains.check",
      DomainList: domain
    });

    try {
      const response = await fetch(`https://api.namecheap.com/xml.response?${parameters}`, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store"
      });
      const xml = await response.text();
      if (!response.ok || /Status="ERROR"/i.test(xml)) {
        return {
          ...base,
          status: "error",
          message: "Namecheap rechazó la consulta. Revisa credenciales, IP autorizada y límites."
        };
      }
      const available = /Available="true"/i.test(xml);
      const premium = /IsPremiumName="true"/i.test(xml);
      const price = xml.match(/PremiumRegistrationPrice="([^"]+)"/i)?.[1];
      const renewalPrice = xml.match(/PremiumRenewalPrice="([^"]+)"/i)?.[1];
      return {
        ...base,
        status: premium ? "premium" : available ? "available" : "registered",
        price: price ? Number(price) : null,
        renewalPrice: renewalPrice ? Number(renewalPrice) : null,
        currency: price || renewalPrice ? "USD" : null,
        message: premium
          ? "Namecheap informa que el dominio es premium."
          : available
            ? "Namecheap informa que el dominio está disponible."
            : "Namecheap informa que el dominio está registrado."
      };
    } catch (error) {
      return {
        ...base,
        status: "error",
        message: error instanceof Error ? error.message : "Error desconocido consultando Namecheap."
      };
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
