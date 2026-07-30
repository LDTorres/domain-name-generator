import {
  baseResult,
  type DomainCheckResult,
  type DomainProvider
} from "@/lib/domain-providers/types";

export class RDAPProvider implements DomainProvider {
  readonly id = "rdap";
  readonly configured = true;

  async check(domain: string): Promise<DomainCheckResult> {
    const base = baseResult(this, domain);
    try {
      const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
        headers: { Accept: "application/rdap+json" },
        signal: AbortSignal.timeout(7000),
        cache: "no-store"
      });
      if (response.ok) {
        return {
          ...base,
          status: "registered",
          message: "RDAP devolvió un registro activo."
        };
      }
      if (response.status === 404) {
        return {
          ...base,
          status: "unknown",
          message:
            "RDAP no encontró un registro, pero esto no confirma disponibilidad. Verifica con un registrador."
        };
      }
      return {
        ...base,
        status: "unknown",
        message: `RDAP respondió con estado HTTP ${response.status}.`
      };
    } catch (error) {
      return {
        ...base,
        status: "error",
        message: error instanceof Error ? error.message : "Error desconocido consultando RDAP."
      };
    }
  }

  async checkMany(domains: readonly string[]): Promise<DomainCheckResult[]> {
    return Promise.all(domains.map((domain) => this.check(domain)));
  }
}
