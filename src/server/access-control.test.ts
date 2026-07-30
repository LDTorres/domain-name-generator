import { describe, expect, it } from "vitest";
import {
  accessControlState,
  isAuthorizedBasicRequest
} from "@/server/access-control";

describe("application access control", () => {
  it("allows local operation without external secrets", () => {
    expect(accessControlState({ NODE_ENV: "development" })).toBe("open");
  });

  it("fails closed in production when an external secret is exposed without access auth", () => {
    expect(
      accessControlState({ NODE_ENV: "production", OPENROUTER_API_KEY: "secret" })
    ).toBe("misconfigured");
  });

  it("accepts only the configured basic credentials", () => {
    const environment = {
      NODE_ENV: "production",
      APP_ACCESS_USERNAME: "team",
      APP_ACCESS_PASSWORD: "safe-password"
    };
    expect(accessControlState(environment)).toBe("protected");
    expect(
      isAuthorizedBasicRequest(`Basic ${btoa("team:safe-password")}`, environment)
    ).toBe(true);
    expect(
      isAuthorizedBasicRequest(`Basic ${btoa("team:wrong")}`, environment)
    ).toBe(false);
  });
});
