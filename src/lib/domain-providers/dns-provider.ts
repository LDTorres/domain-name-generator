import { resolveAny } from "node:dns/promises";
import {
  baseResult,
  type DomainCheckResult,
  type DomainProvider
} from "@/lib/domain-providers/types";

export class DNSProvider implements DomainProvider {
  readonly id = "dns-secondary";
  readonly configured = true;

  async check(domain: string): Promise<DomainCheckResult> {
    const base = baseResult(this, domain);
    try {
      const records = await resolveAny(domain);
      return {
        ...base,
        status: "unknown",
        secondarySignal: records.length > 0 ? "resolves" : "no_records",
        message:
          "El dominio resuelve por DNS. Es una señal secundaria compatible con registro, no una comprobación comercial."
      };
    } catch {
      return {
        ...base,
        status: "unknown",
        secondarySignal: "does_not_resolve",
        message:
          "El dominio no resuelve por DNS. Esto no significa que esté disponible para registro."
      };
    }
  }
}
