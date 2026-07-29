type ExportCandidate = {
  name: string;
  meaning: string;
  pronunciation: string;
  strategy: string;
  roots: string;
  explanation: string;
  status: string;
  score: { total: number } | null;
  brandRisk: { level: string; explanation: string } | null;
  domainChecks: Array<{
    domain: string;
    status: string;
    provider: string;
    checkedAt: Date;
  }>;
};

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function exportCsv(candidates: ExportCandidate[]): string {
  const header = [
    "name",
    "score",
    "meaning",
    "pronunciation",
    "strategy",
    "status",
    "brandRisk",
    "domains"
  ];
  const rows = candidates.map((candidate) =>
    [
      candidate.name,
      candidate.score?.total ?? "",
      candidate.meaning,
      candidate.pronunciation,
      candidate.strategy,
      candidate.status,
      candidate.brandRisk?.level ?? "unknown",
      candidate.domainChecks.map((check) => `${check.domain}:${check.status}`).join("; ")
    ]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export function exportMarkdown(candidates: ExportCandidate[]): string {
  return [
    "# Candidatos de marca",
    "",
    `Exportado: ${new Date().toISOString()}`,
    "",
    ...candidates.flatMap((candidate) => {
      const roots = JSON.parse(candidate.roots) as Array<{ root: string; meaning: string }>;
      const explanations = JSON.parse(candidate.explanation) as string[];
      return [
        `## ${candidate.name}`,
        "",
        `- **Puntuación:** ${candidate.score?.total ?? "Sin puntuación"}/100`,
        `- **Significado:** ${candidate.meaning}`,
        `- **Pronunciación:** ${candidate.pronunciation}`,
        `- **Origen:** ${roots.map((root) => `${root.root} (${root.meaning})`).join(", ")}`,
        `- **Estrategia:** ${candidate.strategy}`,
        `- **Fortalezas:** ${explanations.slice(0, 2).join(" ")}`,
        `- **Debilidades:** ${explanations.slice(2).join(" ") || "Sin debilidades automáticas destacadas."}`,
        `- **Dominios:** ${
          candidate.domainChecks.length > 0
            ? candidate.domainChecks.map((check) => `${check.domain}: ${check.status}`).join(", ")
            : "No consultados"
        }`,
        `- **Riesgo de marca:** ${candidate.brandRisk?.level ?? "unknown"}. ${
          candidate.brandRisk?.explanation ??
          "Se requiere una búsqueda legal profesional antes de usar el nombre."
        }`,
        ""
      ];
    })
  ].join("\n");
}
