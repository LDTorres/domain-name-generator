import { knownBrands } from "@/data";
import { normalizeName } from "@/lib/naming-engine/phonetics";
import type { BrandRiskResult } from "@/types/naming";

export function levenshtein(left: string, right: string): number {
  const a = normalizeName(left);
  const b = normalizeName(right);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let x = 1; x <= a.length; x += 1) {
    let diagonal = row[0]!;
    row[0] = x;
    for (let y = 1; y <= b.length; y += 1) {
      const previous = row[y]!;
      row[y] = Math.min(
        row[y]! + 1,
        row[y - 1]! + 1,
        diagonal + (a[x - 1] === b[y - 1] ? 0 : 1)
      );
      diagonal = previous;
    }
  }
  return row[b.length]!;
}

function phoneticKey(value: string): string {
  return normalizeName(value)
    .replace(/[aeiouy]/g, "")
    .replace(/[ckq]/g, "k")
    .replace(/[sz]/g, "s")
    .replace(/[bv]/g, "b")
    .replace(/(.)\1+/g, "$1");
}

export function assessBrandRisk(value: string): BrandRiskResult {
  const normalized = normalizeName(value);
  const exactMatches = knownBrands.filter((brand) => normalizeName(brand) === normalized);
  const similar = knownBrands
    .map((brand) => ({ brand, distance: levenshtein(normalized, brand) }))
    .filter(({ brand, distance }) => distance <= (brand.length <= 5 ? 1 : 2))
    .sort((left, right) => left.distance - right.distance || left.brand.localeCompare(right.brand))
    .slice(0, 5);
  const key = phoneticKey(normalized);
  const phoneticMatches = knownBrands.filter(
    (brand) => phoneticKey(brand) === key && normalizeName(brand) !== normalized
  );
  const level =
    exactMatches.length > 0
      ? "high"
      : similar.some(({ distance }) => distance <= 1) || phoneticMatches.length > 0
        ? "high"
        : similar.length > 0
          ? "medium"
          : "low";

  return {
    level,
    exactMatches,
    similar,
    phoneticMatches,
    explanation:
      level === "low"
        ? "No se detectaron coincidencias relevantes en la lista local."
        : `Se detectaron ${exactMatches.length + similar.length + phoneticMatches.length} posibles colisiones locales.`,
    disclaimer:
      "Esta señal no confirma disponibilidad legal. Realiza una búsqueda profesional de marcas en cada jurisdicción."
  };
}
