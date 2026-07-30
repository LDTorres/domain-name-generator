import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AIConfigurationError,
  OpenRouterConfigurationOptimizer
} from "@/lib/ai-configuration-optimizer";
import { resolveBasicConfiguration } from "@/lib/configuration/profiles";

const brief = {
  projectName: "NidoProps",
  industry: "PropTech",
  description: "Plataforma global para encontrar un hogar confiable.",
  soundProfile: "spanish" as const,
  brandStyle: "warm" as const
};
const baseConfig = resolveBasicConfiguration(brief);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OpenRouter configuration optimizer", () => {
  it("fails explicitly when it is not configured", async () => {
    const optimizer = new OpenRouterConfigurationOptimizer("");
    await expect(optimizer.optimize(brief, baseConfig)).rejects.toMatchObject({
      status: 503
    });
  });

  it("validates structured output and constrains languages to the selected sound", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: "free/test-model",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    concepts: ["hogar", "confianza", "refugio", "comunidad"],
                    keywords: ["nido", "casa", "lugar", "terra"],
                    languages: ["spanish", "japanese"],
                    preferredEndings: ["ora", "ena", "ia"],
                    allowedPrefixes: [],
                    allowedSuffixes: ["ora"],
                    minLength: 5,
                    maxLength: 9,
                    maxSyllables: 3,
                    summary: "Prioriza una sonoridad cálida y romance para una marca global."
                  })
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const result = await new OpenRouterConfigurationOptimizer("secret").optimize(
      brief,
      baseConfig
    );
    expect(result.model).toBe("free/test-model");
    expect(result.config.languages).toEqual(["spanish"]);
    expect(result.config.seed).toBe(baseConfig.seed);
    expect(result.config.count).toBe(1000);
  });

  it("logs the exact request payload without credentials when enabled", async () => {
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: "free/test-model",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    concepts: ["hogar", "confianza", "refugio", "comunidad"],
                    keywords: ["nido", "casa", "lugar", "terra"],
                    languages: ["spanish"],
                    preferredEndings: ["ora", "ena", "ia"],
                    allowedPrefixes: [],
                    allowedSuffixes: ["ora"],
                    minLength: 5,
                    maxLength: 9,
                    maxSyllables: 3,
                    summary: "Prioriza una sonoridad cálida para una marca global."
                  })
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await new OpenRouterConfigurationOptimizer(
      "super-secret-api-key",
      "openrouter/free",
      20_000,
      true
    ).optimize(brief, baseConfig);

    const serializedLog = String(logSpy.mock.calls[0]?.[0] ?? "");
    const logEntry = JSON.parse(serializedLog) as {
      event: string;
      payload: {
        model: string;
        messages: Array<{ role: string; content: string }>;
      };
    };
    const userMessage = logEntry.payload.messages.find(
      (message) => message.role === "user"
    );
    expect(logEntry.event).toBe("openrouter.request");
    expect(logEntry.payload.model).toBe("openrouter/free");
    expect(userMessage?.content).toContain('"projectName":"NidoProps"');
    expect(serializedLog).not.toContain("super-secret-api-key");
    expect(serializedLog).not.toContain("Authorization");
    logSpy.mockRestore();
  });

  it("surfaces rate limits without exposing the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{}", { status: 429, headers: { "Retry-After": "60" } })
      )
    );
    await expect(
      new OpenRouterConfigurationOptimizer("super-secret").optimize(brief, baseConfig)
    ).rejects.toEqual(
      expect.objectContaining<Partial<AIConfigurationError>>({
        status: 429,
        retryAfterSeconds: 60
      })
    );
  });

  it.each([
    [401, "clave"],
    [503, "modelo gratuito"]
  ])("maps OpenRouter HTTP %i to an explicit error", async (status, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status }))
    );
    await expect(
      new OpenRouterConfigurationOptimizer("secret").optimize(brief, baseConfig)
    ).rejects.toMatchObject({ status, message: expect.stringContaining(message) });
  });

  it("surfaces request timeouts and keeps them distinguishable", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    await expect(
      new OpenRouterConfigurationOptimizer("secret").optimize(brief, baseConfig)
    ).rejects.toMatchObject({ status: 504 });
  });

  it("rejects invalid model output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            model: "free/test-model",
            choices: [{ message: { content: "{\"concepts\":[]}" } }]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    await expect(
      new OpenRouterConfigurationOptimizer("secret").optimize(brief, baseConfig)
    ).rejects.toMatchObject({ status: 502 });
  });
});
