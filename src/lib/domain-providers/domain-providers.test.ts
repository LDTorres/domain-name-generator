import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("node:dns/promises", () => ({
  resolveAny: vi.fn().mockRejectedValue(new Error("not found"))
}));

import { CloudflareProvider } from "@/lib/domain-providers/cloudflare-provider";
import { DNSProvider } from "@/lib/domain-providers/dns-provider";
import { HostingerProvider } from "@/lib/domain-providers/hostinger-provider";
import {
  checkDomainsWithProviders
} from "@/lib/domain-providers";
import { NamecheapProvider } from "@/lib/domain-providers/namecheap-provider";
import { PorkbunProvider } from "@/lib/domain-providers/porkbun-provider";
import { RDAPProvider } from "@/lib/domain-providers/rdap-provider";
import {
  baseResult,
  extensionOf,
  type DomainCheckResult,
  type DomainProvider
} from "@/lib/domain-providers/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

function fixedProvider(
  id: string,
  status: DomainCheckResult["status"]
): DomainProvider {
  return {
    id,
    configured: true,
    async check(domain) {
      return (await this.checkMany([domain]))[0]!;
    },
    async checkMany(domains) {
      return domains.map((domain) => ({
        ...baseResult(this, domain),
        status,
        message: `${id}:${status}`
      }));
    }
  };
}

describe("domain providers", () => {
  it("parses simple and compound domain extensions", () => {
    expect(extensionOf("example.com")).toBe(".com");
    expect(extensionOf("example.com.ar")).toBe(".com.ar");
  });

  it("reports Namecheap as not configured without credentials", async () => {
    const provider = new NamecheapProvider({});
    const result = await provider.check("example.com");
    expect(result.configured).toBe(false);
    expect(result.status).toBe("unknown");
    expect(result.message).toContain("no configurado");
  });

  it("checks several Hostinger TLDs in one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { domain: "brand.com", is_available: true, is_alternative: false },
          { domain: "brand.io", is_available: false, is_alternative: false }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const results = await new HostingerProvider("token").checkMany([
      "brand.com",
      "brand.io"
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({
      domain: "brand",
      tlds: ["com", "io"],
      with_alternatives: false
    });
    expect(results.map((result) => result.status)).toEqual(["available", "registered"]);
  });

  it("maps Cloudflare availability, premium and prices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: {
              domains: [
                {
                  name: "brand.com",
                  registrable: true,
                  tier: "standard",
                  pricing: {
                    currency: "USD",
                    registration_cost: "8.57",
                    renewal_cost: "8.57"
                  }
                },
                {
                  name: "brand.ai",
                  registrable: false,
                  tier: "premium",
                  reason: "domain_premium"
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    const results = await new CloudflareProvider("account", "token").checkMany([
      "brand.com",
      "brand.ai"
    ]);
    expect(results[0]).toMatchObject({ status: "available", price: 8.57 });
    expect(results[1]).toMatchObject({ status: "premium" });
  });

  it("treats unsupported Cloudflare TLDs as unknown so the chain can continue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: {
              domains: [
                {
                  name: "brand.lat",
                  registrable: false,
                  reason: "extension_not_supported"
                }
              ]
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    const result = await new CloudflareProvider("account", "token").check("brand.lat");
    expect(result.status).toBe("unknown");
  });

  it("maps Porkbun availability and price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "SUCCESS",
            response: { avail: "yes", price: "9.73", regularPrice: "11.06" }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    const result = await new PorkbunProvider("key", "secret").check("brand.com");
    expect(result).toMatchObject({
      status: "available",
      price: 9.73,
      renewalPrice: 11.06
    });
  });

  it("falls back only after unknown/error and preserves the provider trace", async () => {
    const dns = fixedProvider("dns", "unknown");
    const results = await checkDomainsWithProviders(
      ["brand.com"],
      [fixedProvider("first", "unknown"), fixedProvider("second", "available")],
      dns
    );
    expect(results[0]).toMatchObject({
      provider: "second",
      status: "available",
      attemptedProviders: ["first", "second"]
    });
  });

  it("never overrides a definitive registered result", async () => {
    const second = fixedProvider("second", "available");
    const spy = vi.spyOn(second, "checkMany");
    const results = await checkDomainsWithProviders(
      ["brand.com"],
      [fixedProvider("first", "registered"), second],
      fixedProvider("dns", "unknown")
    );
    expect(results[0]).toMatchObject({ provider: "first", status: "registered" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("never turns RDAP 404 or missing DNS records into available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 404 }))
    );
    const [rdap, dns] = await Promise.all([
      new RDAPProvider().check("brand.example"),
      new DNSProvider().check("brand.example")
    ]);
    expect(rdap.status).toBe("unknown");
    expect(dns).toMatchObject({
      status: "unknown",
      secondarySignal: "does_not_resolve"
    });
  });
});
