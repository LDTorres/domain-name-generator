import { describe, expect, it } from "vitest";
import { NamecheapProvider } from "@/lib/domain-providers/namecheap-provider";
import { extensionOf } from "@/lib/domain-providers/types";

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
});
