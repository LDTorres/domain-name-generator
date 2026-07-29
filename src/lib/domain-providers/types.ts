export type DomainStatus = "available" | "registered" | "premium" | "unknown" | "error";

export interface DomainCheckResult {
  domain: string;
  extension: string;
  status: DomainStatus;
  configured: boolean;
  provider: string;
  price: number | null;
  renewalPrice: number | null;
  currency: string | null;
  checkedAt: string;
  secondarySignal: string | null;
  message: string;
}

export interface DomainProvider {
  readonly id: string;
  readonly configured: boolean;
  check(domain: string): Promise<DomainCheckResult>;
}

export function extensionOf(domain: string): string {
  return domain.endsWith(".com.ar") ? ".com.ar" : `.${domain.split(".").at(-1) ?? ""}`;
}

export function baseResult(
  provider: DomainProvider,
  domain: string
): Omit<DomainCheckResult, "status" | "message"> {
  return {
    domain,
    extension: extensionOf(domain),
    configured: provider.configured,
    provider: provider.id,
    price: null,
    renewalPrice: null,
    currency: null,
    checkedAt: new Date().toISOString(),
    secondarySignal: null
  };
}
