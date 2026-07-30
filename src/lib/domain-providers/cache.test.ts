import { describe, expect, it } from "vitest";
import { isReusableDomainCache } from "@/lib/domain-providers/cache";

describe("domain provider cache", () => {
  it("reuses definitive results without contacting lower-priority providers", () => {
    expect(
      isReusableDomainCache(
        {
          status: "available",
          attemptedProviders: JSON.stringify(["hostinger"])
        },
        ["hostinger", "cloudflare", "rdap"]
      )
    ).toBe(true);
  });

  it("reuses unknown results only when every configured provider was attempted", () => {
    const cached = {
      status: "unknown",
      attemptedProviders: JSON.stringify(["hostinger", "rdap"])
    };
    expect(isReusableDomainCache(cached, ["hostinger", "rdap"])).toBe(true);
    expect(
      isReusableDomainCache(cached, ["hostinger", "cloudflare", "rdap"])
    ).toBe(false);
  });

  it("rejects malformed provider traces", () => {
    expect(
      isReusableDomainCache(
        { status: "error", attemptedProviders: "not-json" },
        ["rdap"]
      )
    ).toBe(false);
  });
});
