import { describe, expect, it } from "vitest";
import { SeededRandom } from "@/lib/naming-engine/random/seeded-random";

describe("SeededRandom", () => {
  it("repeats the same sequence for the same seed", () => {
    const first = new SeededRandom("repeatable");
    const second = new SeededRandom("repeatable");
    expect(Array.from({ length: 20 }, () => first.next())).toEqual(
      Array.from({ length: 20 }, () => second.next())
    );
  });

  it("creates a different sequence for a different seed", () => {
    expect(new SeededRandom("a").next()).not.toBe(new SeededRandom("b").next());
  });
});
