"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Check,
  Download,
  Globe2,
  Heart,
  Languages,
  LoaderCircle,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BRAND_STYLES,
  SOUND_PROFILES,
  resolveBasicConfiguration,
  type BasicBrief,
  type BrandStyle,
  type ConfigurationMetadata,
  type PresetDefinition,
  type SoundProfile
} from "@/lib/configuration/profiles";
import type { GenerationConfig } from "@/lib/naming-engine/schema";
import { LANGUAGES, type Language } from "@/types/naming";

type Preset = PresetDefinition;

interface ScoreRecord {
  total: number;
  memorability: number;
  spanishPronunciation: number;
  englishPronunciation: number;
  spelling: number;
  length: number;
  sound: number;
  distinctiveness: number;
  conceptualFit: number;
  internationalFit: number;
  confusionRisk: number;
  negativeMeaningRisk: number;
  domainAvailability: number;
}

interface DomainRecord {
  id: string;
  domain: string;
  extension: string;
  status: string;
  provider: string;
  attemptedProviders: string;
  message: string | null;
  configured?: boolean;
  price: number | null;
  renewalPrice: number | null;
  currency: string | null;
  secondarySignal: string | null;
  checkedAt: string;
}

interface FavoriteRecord {
  comment: string;
  manualScore: number | null;
  status: string;
}

interface CandidateRecord {
  id: string;
  name: string;
  normalized: string;
  meaning: string;
  pronunciation: string;
  strategy: string;
  roots: string;
  explanation: string;
  syllableCount: number;
  status: string;
  score: ScoreRecord;
  brandRisk: {
    level: "low" | "medium" | "high" | "unknown";
    explanation: string;
  } | null;
  favorite: FavoriteRecord | null;
  domainChecks: DomainRecord[];
}

interface FormState {
  projectName: string;
  description: string;
  industry: string;
  concepts: string;
  keywords: string;
  languages: Language[];
  count: number;
  minLength: number;
  maxLength: number;
  maxSyllables: number;
  prefixes: string;
  suffixes: string;
  endings: string;
  forbiddenSequences: string;
  forbiddenWords: string;
  extensions: string[];
  seed: string;
  soundProfile: SoundProfile;
  brandStyle: BrandStyle;
}

const DEFAULT_FORM: FormState = {
  projectName: "NidoProps",
  description:
    "Plataforma PropTech para encontrar, comprar, alquilar y publicar propiedades en Latinoamérica, con ambición global.",
  industry: "PropTech",
  concepts:
    "belonging, belong, home, haven, nest, dwell, place, settle, arrive, journey, path, route, locus, terra, door, key, find, discover, move, origin, community, neighborhood, trust, clarity",
  keywords: "home, place, nest, haven, key",
  languages: ["english", "spanish", "latin", "italian", "portuguese"],
  count: 1000,
  minLength: 5,
  maxLength: 10,
  maxSyllables: 3,
  prefixes: "",
  suffixes: "",
  endings: "ly, io, eo, ia, ora, ena, ero, aro, iva, ivo, o, a",
  forbiddenSequences: "",
  forbiddenWords: "",
  extensions: [".com", ".io", ".co"],
  seed: "nidoprops-v1",
  soundProfile: "combined",
  brandStyle: "warm"
};

const SOUND_LABELS: Record<SoundProfile, { title: string; detail: string }> = {
  spanish: { title: "Española", detail: "Romance, clara y cercana" },
  english: { title: "Inglesa", detail: "Global, directa y tecnológica" },
  combined: { title: "Combinada", detail: "Equilibrio internacional" }
};

const STYLE_LABELS: Record<BrandStyle, string> = {
  minimal: "Minimalista",
  warm: "Cálida",
  technology: "Tecnológica",
  premium: "Premium",
  bold: "Audaz"
};

const scoreLabels: Array<[keyof ScoreRecord, string]> = [
  ["memorability", "Memorabilidad"],
  ["spanishPronunciation", "Pronunciación ES"],
  ["englishPronunciation", "Pronunciación EN"],
  ["spelling", "Escritura"],
  ["length", "Longitud"],
  ["sound", "Sonoridad"],
  ["distinctiveness", "Distintividad"],
  ["conceptualFit", "Relación conceptual"],
  ["internationalFit", "Escalabilidad"],
  ["confusionRisk", "Bajo riesgo de confusión"],
  ["negativeMeaningRisk", "Bajo riesgo negativo"],
  ["domainAvailability", "Dominio"]
];

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function briefFromForm(form: FormState): BasicBrief {
  return {
    projectName: form.projectName,
    industry: form.industry,
    description: form.description,
    soundProfile: form.soundProfile,
    brandStyle: form.brandStyle
  };
}

function configFromForm(form: FormState): GenerationConfig {
  return {
    projectName: form.projectName,
    description: form.description,
    industry: form.industry,
    concepts: splitList(form.concepts),
    keywords: splitList(form.keywords),
    languages: form.languages,
    soundProfile: form.soundProfile,
    count: form.count,
    minLength: form.minLength,
    maxLength: form.maxLength,
    maxSyllables: form.maxSyllables,
    allowedPrefixes: splitList(form.prefixes),
    allowedSuffixes: splitList(form.suffixes),
    preferredEndings: splitList(form.endings),
    forbiddenSequences: splitList(form.forbiddenSequences),
    forbiddenWords: splitList(form.forbiddenWords),
    domainExtensions: form.extensions as GenerationConfig["domainExtensions"],
    seed: form.seed
  };
}

function applyConfigToForm(current: FormState, config: GenerationConfig): FormState {
  return {
    ...current,
    projectName: config.projectName,
    description: config.description,
    industry: config.industry,
    concepts: config.concepts.join(", "),
    keywords: config.keywords.join(", "),
    languages: config.languages,
    soundProfile: config.soundProfile,
    count: config.count,
    minLength: config.minLength,
    maxLength: config.maxLength,
    maxSyllables: config.maxSyllables,
    prefixes: config.allowedPrefixes.join(", "),
    suffixes: config.allowedSuffixes.join(", "),
    endings: config.preferredEndings.join(", "),
    forbiddenSequences: config.forbiddenSequences.join(", "),
    forbiddenWords: config.forbiddenWords.join(", "),
    extensions: config.domainExtensions,
    seed: config.seed
  };
}

const selectClass =
  "h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

function parseOrigins(candidate: CandidateRecord): Array<{
  root: string;
  meaning: string;
  language?: string;
}> {
  try {
    return JSON.parse(candidate.roots) as Array<{
      root: string;
      meaning: string;
      language?: string;
    }>;
  } catch {
    return [];
  }
}

function riskClass(level: string): string {
  if (level === "high") return "bg-red-50 text-red-700";
  if (level === "medium") return "bg-amber-50 text-amber-700";
  if (level === "low") return "bg-emerald-50 text-emerald-700";
  return "bg-neutral-100 text-neutral-600";
}

function parseProviderAttempts(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function BrandStudio({ presets }: { presets: Preset[] }) {
  const [form, setForm] = useState<FormState>(() => {
    const preset = presets.find((item) => item.industry === DEFAULT_FORM.industry);
    return applyConfigToForm(
      DEFAULT_FORM,
      resolveBasicConfiguration(briefFromForm(DEFAULT_FORM), preset)
    );
  });
  const [configurationView, setConfigurationView] = useState<"basic" | "advanced">("basic");
  const [configurationMeta, setConfigurationMeta] = useState<ConfigurationMetadata>({
    source: "local",
    model: null,
    promptVersion: null,
    summary: null
  });
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<CandidateRecord[]>([]);
  const [view, setView] = useState<"results" | "favorites">("results");
  const [busy, setBusy] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [message, setMessage] = useState("");
  const [generationMeta, setGenerationMeta] = useState<{
    generatedCount: number;
    rejectedCount: number;
    seed: string;
  } | null>(null);
  const [minimumScore, setMinimumScore] = useState(0);
  const [maximumLength, setMaximumLength] = useState(10);
  const [ending, setEnding] = useState("");
  const [originLanguage, setOriginLanguage] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [syllableFilter, setSyllableFilter] = useState("all");
  const [sort, setSort] = useState("score");

  const visibleCandidates = useMemo(() => {
    const base = view === "favorites" ? candidates.filter((item) => item.favorite) : candidates;
    return base
      .filter((candidate) => candidate.score.total >= minimumScore)
      .filter((candidate) => candidate.name.length <= maximumLength)
      .filter((candidate) => !ending || candidate.normalized.endsWith(ending.toLowerCase()))
      .filter(
        (candidate) =>
          !originLanguage ||
          parseOrigins(candidate).some((origin) => origin.language === originLanguage)
      )
      .filter(
        (candidate) =>
          riskFilter === "all" || (candidate.brandRisk?.level ?? "unknown") === riskFilter
      )
      .filter(
        (candidate) =>
          syllableFilter === "all" || candidate.syllableCount === Number(syllableFilter)
      )
      .filter((candidate) => {
        if (domainFilter === "all") return true;
        if (domainFilter === "available") {
          return candidate.domainChecks.some((check) => check.status === "available");
        }
        return candidate.domainChecks.length === 0;
      })
      .sort((left, right) => {
        if (sort === "short") return left.name.length - right.name.length;
        if (sort === "distinctive")
          return right.score.distinctiveness - left.score.distinctiveness;
        if (sort === "domain") {
          return (
            Number(right.domainChecks.some((item) => item.status === "available")) -
            Number(left.domainChecks.some((item) => item.status === "available"))
          );
        }
        if (sort === "pronunciation") {
          const leftScore =
            left.score.spanishPronunciation + left.score.englishPronunciation;
          const rightScore =
            right.score.spanishPronunciation + right.score.englishPronunciation;
          return rightScore - leftScore;
        }
        return right.score.total - left.score.total;
      });
  }, [
    candidates,
    domainFilter,
    ending,
    maximumLength,
    minimumScore,
    originLanguage,
    riskFilter,
    sort,
    syllableFilter,
    view
  ]);

  function applyPreset(presetId: string) {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    setForm((current) => {
      const next = {
        ...current,
        industry: preset.industry,
        description: preset.description
      };
      return applyConfigToForm(
        next,
        resolveBasicConfiguration(briefFromForm(next), preset)
      );
    });
    setConfigurationMeta({
      source: "local",
      model: null,
      promptVersion: null,
      summary: null
    });
  }

  function toggleLanguage(language: Language) {
    setForm((current) => ({
      ...current,
      languages: current.languages.includes(language)
        ? current.languages.filter((item) => item !== language)
        : [...current.languages, language]
    }));
    setConfigurationMeta({
      source: "custom",
      model: null,
      promptVersion: null,
      summary: "Configuración ajustada manualmente."
    });
  }

  function updateAdvanced(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setConfigurationMeta({
      source: "custom",
      model: null,
      promptVersion: null,
      summary: "Configuración ajustada manualmente."
    });
  }

  function updateBasic(patch: Partial<FormState>) {
    setForm((current) => {
      const next = { ...current, ...patch };
      try {
        const preset = presets.find((item) => item.industry === next.industry);
        return applyConfigToForm(
          next,
          resolveBasicConfiguration(briefFromForm(next), preset)
        );
      } catch {
        return next;
      }
    });
    setConfigurationMeta({
      source: "local",
      model: null,
      promptVersion: null,
      summary: null
    });
  }

  async function optimizeConfiguration() {
    setOptimizing(true);
    setMessage("OpenRouter está optimizando la configuración…");
    try {
      const response = await fetch("/api/configuration/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: briefFromForm(form) })
      });
      const payload = (await response.json()) as {
        config?: GenerationConfig;
        model?: string;
        promptVersion?: string;
        summary?: string;
        error?: string;
      };
      if (!response.ok || !payload.config || !payload.model || !payload.promptVersion) {
        throw new Error(payload.error ?? "OpenRouter no devolvió una configuración válida.");
      }
      setForm((current) => applyConfigToForm(current, payload.config!));
      setConfigurationMeta({
        source: "openrouter",
        model: payload.model,
        promptVersion: payload.promptVersion,
        summary: payload.summary ?? null
      });
      setMessage(`Optimizado con IA usando ${payload.model}.`);
    } catch (error) {
      setMessage(
        `${error instanceof Error ? error.message : "La optimización falló"} La configuración local no cambió.`
      );
    } finally {
      setOptimizing(false);
    }
  }

  async function generate() {
    setBusy(true);
    setMessage("Preparando el proyecto…");
    setComparison([]);
    try {
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.projectName,
          description: form.description,
          industry: form.industry
        })
      });
      const projectPayload = (await projectResponse.json()) as {
        project?: { id: string };
        error?: string;
      };
      if (!projectResponse.ok || !projectPayload.project) {
        throw new Error(projectPayload.error ?? "No se pudo crear el proyecto.");
      }

      setMessage(`Generando ${form.count.toLocaleString("es")} candidatos con seed ${form.seed}…`);
      const generationResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectPayload.project.id,
          config: configFromForm(form),
          configurationMeta
        })
      });
      const payload = (await generationResponse.json()) as {
        candidates?: CandidateRecord[];
        generatedCount?: number;
        rejectedCount?: number;
        seed?: string;
        error?: string;
      };
      if (!generationResponse.ok || !payload.candidates) {
        throw new Error(payload.error ?? "La generación falló.");
      }
      setCandidates(payload.candidates);
      setGenerationMeta({
        generatedCount: payload.generatedCount ?? payload.candidates.length,
        rejectedCount: payload.rejectedCount ?? 0,
        seed: payload.seed ?? form.seed
      });
      setView("results");
      setMessage(`Listo: mostrando los ${payload.candidates.length} candidatos mejor puntuados.`);
      window.setTimeout(() => document.querySelector("#results")?.scrollIntoView(), 50);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite(candidate: CandidateRecord) {
    const nextFavorite = !candidate.favorite;
    const response = await fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: candidate.id,
        favorite: nextFavorite,
        comment: candidate.favorite?.comment ?? "",
        manualScore: candidate.favorite?.manualScore ?? null,
        status: candidate.favorite?.status ?? "new"
      })
    });
    const payload = (await response.json()) as { favorite: FavoriteRecord | null };
    if (response.ok) {
      setCandidates((items) =>
        items.map((item) =>
          item.id === candidate.id ? { ...item, favorite: payload.favorite } : item
        )
      );
    }
  }

  async function saveFavorite(candidate: CandidateRecord, favorite: FavoriteRecord) {
    const response = await fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: candidate.id, favorite: true, ...favorite })
    });
    if (response.ok) {
      const payload = (await response.json()) as { favorite: FavoriteRecord };
      setCandidates((items) =>
        items.map((item) =>
          item.id === candidate.id ? { ...item, favorite: payload.favorite } : item
        )
      );
      setMessage(`Notas de ${candidate.name} guardadas.`);
    }
  }

  async function discard(candidate: CandidateRecord) {
    const response = await fetch(`/api/candidates/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "discarded" })
    });
    if (response.ok) {
      setCandidates((items) => items.filter((item) => item.id !== candidate.id));
      setSelected((items) => items.filter((id) => id !== candidate.id));
    }
  }

  async function checkDomains(candidate: CandidateRecord) {
    setMessage(`Consultando dominios para ${candidate.name}; esta acción usa red externa…`);
    const response = await fetch("/api/domains/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: candidate.id,
        name: candidate.normalized,
        extensions: form.extensions
      })
    });
    const payload = (await response.json()) as {
      results?: DomainRecord[];
      providers?: Array<{ id: string; configured: boolean }>;
      error?: string;
    };
    if (!response.ok || !payload.results) {
      setMessage(payload.error ?? "No se pudieron consultar los dominios.");
      return;
    }
    setCandidates((items) =>
      items.map((item) =>
        item.id === candidate.id ? { ...item, domainChecks: payload.results ?? [] } : item
      )
    );
    const hasCommercialProvider = payload.providers?.some(
      (provider) => provider.id !== "rdap" && provider.configured
    );
    setMessage(
      hasCommercialProvider
        ? `Consulta terminada para ${candidate.name}. Revisa estado, proveedor y fecha.`
        : `Consulta auxiliar terminada para ${candidate.name}. No hay un registrador comercial configurado; RDAP/DNS no pueden confirmar disponibilidad.`
    );
  }

  async function generateVariations(candidate: CandidateRecord) {
    setBusy(true);
    setMessage(`Generando variaciones deterministas de ${candidate.name}…`);
    try {
      const response = await fetch("/api/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidate.id,
          count: 20,
          seed: `${form.seed}-${candidate.normalized}`
        })
      });
      const payload = (await response.json()) as {
        candidates?: CandidateRecord[];
        error?: string;
      };
      if (!response.ok || !payload.candidates) throw new Error(payload.error ?? "Error.");
      setCandidates(payload.candidates);
      setSelected([]);
      setMessage(`Mostrando 20 variaciones de ${candidate.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se generaron variaciones.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((items) =>
      items.includes(id)
        ? items.filter((item) => item !== id)
        : items.length < 5
          ? [...items, id]
          : items
    );
  }

  async function compare() {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateIds: selected })
    });
    const payload = (await response.json()) as { candidates?: CandidateRecord[]; error?: string };
    if (response.ok && payload.candidates) {
      setComparison(payload.candidates);
      setMessage(`Comparando ${payload.candidates.length} finalistas.`);
      window.setTimeout(() => document.querySelector("#comparison")?.scrollIntoView(), 50);
    } else {
      setMessage(payload.error ?? "Selecciona entre 2 y 5 candidatos.");
    }
  }

  async function exportCandidates(format: "csv" | "json" | "markdown") {
    const ids = selected.length > 0 ? selected : visibleCandidates.map((item) => item.id);
    if (ids.length === 0) return;
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateIds: ids.slice(0, 100), format })
    });
    if (!response.ok) {
      setMessage("No se pudo crear la exportación.");
      return;
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `brandforge-export.${format === "markdown" ? "md" : format}`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-neutral-200/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="font-bold tracking-tight">Brandforge</div>
              <div className="text-[11px] text-neutral-500">Naming inteligente, sin humo</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-neutral-500 sm:flex">
            <span className="size-2 rounded-full bg-emerald-500" />
            Motor local · IA opcional
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-10 lg:px-8">
        <div className="mb-9 max-w-3xl">
          <Badge className="mb-4 bg-orange-100 text-orange-700">Naming workspace</Badge>
          <h1 className="text-4xl font-bold tracking-[-0.045em] text-neutral-950 sm:text-5xl">
            Nombres que suenan a marca,
            <span className="text-orange-500"> no a combinación aleatoria.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
            Combina raíces lingüísticas, reglas fonéticas y puntuación explicable.
            Reproduce cualquier exploración con el mismo seed.
          </p>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
          <Card className="xl:sticky xl:top-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Configuración</h2>
                  <p className="mt-1 text-xs text-neutral-500">Define el territorio de la marca.</p>
                </div>
                <SlidersHorizontal className="size-5 text-neutral-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 rounded-xl bg-neutral-100 p-1">
                {(["basic", "advanced"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setConfigurationView(mode)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      configurationView === mode
                        ? "bg-white text-neutral-950 shadow-sm"
                        : "text-neutral-500"
                    }`}
                  >
                    {mode === "basic" ? "Básico" : "Avanzado"}
                  </button>
                ))}
              </div>

              {configurationView === "basic" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="project">Proyecto</Label>
                      <Input
                        id="project"
                        value={form.projectName}
                        onChange={(event) => updateBasic({ projectName: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="preset">Industria</Label>
                      <select
                        id="preset"
                        className={`${selectClass} w-full`}
                        value={
                          presets.find((preset) => preset.industry === form.industry)?.id ?? ""
                        }
                        onChange={(event) => applyPreset(event.target.value)}
                      >
                        {presets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.industry}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">¿Qué estás construyendo?</Label>
                    <Textarea
                      id="description"
                      className="min-h-28"
                      value={form.description}
                      onChange={(event) => updateBasic({ description: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Sonoridad esperada</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {SOUND_PROFILES.map((profile) => {
                        const active = form.soundProfile === profile;
                        return (
                          <button
                            key={profile}
                            type="button"
                            onClick={() => updateBasic({ soundProfile: profile })}
                            className={`rounded-xl border p-2 text-left transition ${
                              active
                                ? "border-orange-400 bg-orange-50"
                                : "border-neutral-200 bg-white hover:border-neutral-400"
                            }`}
                          >
                            <Languages
                              className={`mb-2 size-4 ${
                                active ? "text-orange-600" : "text-neutral-400"
                              }`}
                            />
                            <span className="block text-xs font-bold">
                              {SOUND_LABELS[profile].title}
                            </span>
                            <span className="mt-1 hidden text-[10px] leading-4 text-neutral-500 sm:block">
                              {SOUND_LABELS[profile].detail}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label>Personalidad</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {BRAND_STYLES.map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => updateBasic({ brandStyle: style })}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                            form.brandStyle === style
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-200 bg-white text-neutral-600"
                          }`}
                        >
                          {STYLE_LABELS[style]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-violet-950">
                          Afinar parámetros con IA
                        </div>
                        <div className="mt-0.5 text-[10px] leading-4 text-violet-700">
                          Envía este brief a OpenRouter. Los nombres se siguen generando localmente.
                        </div>
                      </div>
                      <Badge className="shrink-0 bg-white text-violet-700">
                        {configurationMeta.source === "openrouter"
                          ? "Optimizado"
                          : configurationMeta.source === "custom"
                            ? "Manual"
                            : "Local"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-violet-200 bg-white"
                      disabled={optimizing || busy || form.description.length < 10}
                      onClick={optimizeConfiguration}
                    >
                      {optimizing ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4 text-violet-600" />
                      )}
                      {configurationMeta.source === "openrouter"
                        ? "Volver a optimizar"
                        : "Optimizar con IA"}
                    </Button>
                    {configurationMeta.summary && (
                      <p className="mt-2 text-[10px] leading-4 text-violet-800">
                        {configurationMeta.summary}
                        {configurationMeta.model && ` · ${configurationMeta.model}`}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] leading-4 text-violet-700">
                      Privacidad: al pulsar el botón se enviarán proyecto, industria,
                      descripción, sonoridad y estilo a OpenRouter.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="industry">Industria personalizada</Label>
                    <Input
                      id="industry"
                      value={form.industry}
                      onChange={(event) => updateAdvanced({ industry: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="concepts">Conceptos</Label>
                    <Textarea
                      id="concepts"
                      className="min-h-20"
                      value={form.concepts}
                      onChange={(event) => updateAdvanced({ concepts: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="keywords">Keywords</Label>
                    <Input
                      id="keywords"
                      value={form.keywords}
                      onChange={(event) => updateAdvanced({ keywords: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fuentes lingüísticas</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {LANGUAGES.map((language) => {
                        const active = form.languages.includes(language);
                        return (
                          <button
                            key={language}
                            type="button"
                            onClick={() => toggleLanguage(language)}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                              active
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-200 bg-white text-neutral-600"
                            }`}
                          >
                            {active && <Check className="mr-1 inline size-3" />}
                            {language}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Mín.</Label>
                      <Input
                        type="number"
                        min={3}
                        value={form.minLength}
                        onChange={(event) =>
                          updateAdvanced({ minLength: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label>Máx.</Label>
                      <Input
                        type="number"
                        max={20}
                        value={form.maxLength}
                        onChange={(event) =>
                          updateAdvanced({ maxLength: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label>Sílabas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={form.maxSyllables}
                        onChange={(event) =>
                          updateAdvanced({ maxSyllables: Number(event.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Terminaciones preferidas</Label>
                    <Input
                      value={form.endings}
                      onChange={(event) => updateAdvanced({ endings: event.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Prefijos permitidos</Label>
                      <Input
                        placeholder="vacío = dataset"
                        value={form.prefixes}
                        onChange={(event) => updateAdvanced({ prefixes: event.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Sufijos permitidos</Label>
                      <Input
                        placeholder="vacío = dataset"
                        value={form.suffixes}
                        onChange={(event) => updateAdvanced({ suffixes: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Secuencias prohibidas</Label>
                      <Input
                        value={form.forbiddenSequences}
                        onChange={(event) =>
                          updateAdvanced({ forbiddenSequences: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Palabras prohibidas</Label>
                      <Input
                        value={form.forbiddenWords}
                        onChange={(event) =>
                          updateAdvanced({ forbiddenWords: event.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="count">Cantidad</Label>
                      <Input
                        id="count"
                        type="number"
                        min={100}
                        max={5000}
                        value={form.count}
                        onChange={(event) =>
                          updateAdvanced({ count: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="seed">Seed reproducible</Label>
                      <Input
                        id="seed"
                        className="font-mono text-xs"
                        value={form.seed}
                        onChange={(event) => updateAdvanced({ seed: event.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Dominios bajo demanda</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {[".com", ".io", ".co", ".app", ".ai", ".lat", ".com.ar"].map(
                        (extension) => (
                          <button
                            type="button"
                            key={extension}
                            onClick={() =>
                              updateAdvanced({
                                extensions: form.extensions.includes(extension)
                                  ? form.extensions.filter((item) => item !== extension)
                                  : [...form.extensions, extension]
                              })
                            }
                            className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs ${
                              form.extensions.includes(extension)
                                ? "border-orange-300 bg-orange-50 text-orange-700"
                                : "border-neutral-200 text-neutral-500"
                            }`}
                          >
                            {extension}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
              <Button
                size="lg"
                variant="accent"
                className="w-full"
                disabled={
                  busy ||
                  optimizing ||
                  form.languages.length === 0 ||
                  form.extensions.length === 0 ||
                  form.description.length < 10
                }
                onClick={generate}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Generar nombres
              </Button>
              {message && (
                <p role="status" className="rounded-xl bg-neutral-100 px-3 py-2 text-xs leading-5 text-neutral-600">
                  {message}
                </p>
              )}
            </CardContent>
          </Card>

          <section id="results" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1">
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    view === "results" ? "bg-neutral-950 text-white" : "text-neutral-500"
                  }`}
                  onClick={() => setView("results")}
                >
                  Resultados <span className="ml-1 opacity-60">{candidates.length}</span>
                </button>
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    view === "favorites" ? "bg-neutral-950 text-white" : "text-neutral-500"
                  }`}
                  onClick={() => setView("favorites")}
                >
                  Favoritos{" "}
                  <span className="ml-1 opacity-60">
                    {candidates.filter((item) => item.favorite).length}
                  </span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selected.length < 2}
                  onClick={compare}
                >
                  Comparar {selected.length > 0 && `(${selected.length})`}
                </Button>
                {(["csv", "json", "markdown"] as const).map((format) => (
                  <Button
                    key={format}
                    variant="outline"
                    size="sm"
                    disabled={visibleCandidates.length === 0}
                    onClick={() => exportCandidates(format)}
                  >
                    <Download className="size-3.5" />
                    {format === "markdown" ? "MD" : format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {generationMeta && (
              <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-neutral-200 bg-white p-4 text-center">
                <div>
                  <div className="text-lg font-bold">{generationMeta.generatedCount}</div>
                  <div className="text-[11px] text-neutral-500">válidos generados</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{generationMeta.rejectedCount}</div>
                  <div className="text-[11px] text-neutral-500">filtrados</div>
                </div>
                <div>
                  <div className="truncate font-mono text-sm font-bold">{generationMeta.seed}</div>
                  <div className="text-[11px] text-neutral-500">seed</div>
                </div>
              </div>
            )}

            <div className="mb-4 grid gap-2 rounded-2xl border border-neutral-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              <div>
                <Label>Puntuación ≥ {minimumScore}</Label>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={minimumScore}
                  onChange={(event) => setMinimumScore(Number(event.target.value))}
                  className="px-1"
                />
              </div>
              <div>
                <Label>Longitud ≤ {maximumLength}</Label>
                <Input
                  type="range"
                  min={4}
                  max={15}
                  value={maximumLength}
                  onChange={(event) => setMaximumLength(Number(event.target.value))}
                  className="px-1"
                />
              </div>
              <div>
                <Label>Terminación</Label>
                <Input
                  placeholder="ora"
                  value={ending}
                  onChange={(event) => setEnding(event.target.value)}
                />
              </div>
              <div>
                <Label>Idioma raíz</Label>
                <select
                  className={`${selectClass} w-full`}
                  value={originLanguage}
                  onChange={(event) => setOriginLanguage(event.target.value)}
                >
                  <option value="">Todos</option>
                  {LANGUAGES.map((language) => (
                    <option key={language}>{language}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Dominio</Label>
                <select
                  className={`${selectClass} w-full`}
                  value={domainFilter}
                  onChange={(event) => setDomainFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="available">Disponible</option>
                  <option value="unchecked">Sin consultar</option>
                </select>
              </div>
              <div>
                <Label>Riesgo / sílabas</Label>
                <div className="flex gap-1">
                  <select
                    aria-label="Riesgo de marca"
                    className={`${selectClass} min-w-0 flex-1 px-2`}
                    value={riskFilter}
                    onChange={(event) => setRiskFilter(event.target.value)}
                  >
                    <option value="all">Riesgo</option>
                    <option value="low">Bajo</option>
                    <option value="medium">Medio</option>
                    <option value="high">Alto</option>
                  </select>
                  <select
                    aria-label="Cantidad de sílabas"
                    className={`${selectClass} w-16 px-2`}
                    value={syllableFilter}
                    onChange={(event) => setSyllableFilter(event.target.value)}
                  >
                    <option value="all">Σ</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Orden</Label>
                <select
                  className={`${selectClass} w-full`}
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="score">Mejor puntuación</option>
                  <option value="short">Más corto</option>
                  <option value="distinctive">Más distintivo</option>
                  <option value="domain">Mejor dominio</option>
                  <option value="pronunciation">Pronunciación</option>
                </select>
              </div>
            </div>

            {visibleCandidates.length === 0 ? (
              <Card className="flex min-h-[430px] items-center justify-center border-dashed bg-white/50">
                <div className="max-w-sm px-6 text-center">
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <Sparkles className="size-6" />
                  </div>
                  <h2 className="text-lg font-bold">
                    {candidates.length === 0 ? "Tu shortlist empieza aquí" : "No hay coincidencias"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    {candidates.length === 0
                      ? "Configura el proyecto y genera una exploración. Verás los 100 nombres con mejor puntuación."
                      : "Ajusta los filtros o vuelve a la vista de resultados."}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-3 2xl:grid-cols-2">
                {visibleCandidates.map((candidate, index) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    rank={index + 1}
                    selected={selected.includes(candidate.id)}
                    selectionDisabled={selected.length >= 5 && !selected.includes(candidate.id)}
                    onSelect={() => toggleSelected(candidate.id)}
                    onFavorite={() => toggleFavorite(candidate)}
                    onSaveFavorite={(favorite) => saveFavorite(candidate, favorite)}
                    onDiscard={() => discard(candidate)}
                    onDomains={() => checkDomains(candidate)}
                    onVariations={() => generateVariations(candidate)}
                  />
                ))}
              </div>
            )}

            {comparison.length >= 2 && (
              <ComparisonTable
                candidates={comparison}
                onClose={() => setComparison([])}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function CandidateCard({
  candidate,
  rank,
  selected,
  selectionDisabled,
  onSelect,
  onFavorite,
  onSaveFavorite,
  onDiscard,
  onDomains,
  onVariations
}: {
  candidate: CandidateRecord;
  rank: number;
  selected: boolean;
  selectionDisabled: boolean;
  onSelect(): void;
  onFavorite(): void;
  onSaveFavorite(favorite: FavoriteRecord): void;
  onDiscard(): void;
  onDomains(): void;
  onVariations(): void;
}) {
  const origins = parseOrigins(candidate);
  const [draft, setDraft] = useState<FavoriteRecord>(
    candidate.favorite ?? { comment: "", manualScore: null, status: "new" }
  );

  return (
    <Card className={`overflow-hidden transition ${selected ? "border-orange-400 ring-2 ring-orange-100" : ""}`}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <button
            aria-label={`Seleccionar ${candidate.name} para comparar`}
            disabled={selectionDisabled}
            onClick={onSelect}
            className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border ${
              selected
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-neutral-300 disabled:opacity-30"
            }`}
          >
            {selected && <Check className="size-3" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-neutral-400">#{rank}</span>
              <h3 className="truncate text-2xl font-bold tracking-tight">{candidate.name}</h3>
            </div>
            <p className="mt-1 truncate text-sm text-neutral-500">{candidate.meaning}</p>
          </div>
          <div
            className="score-ring relative flex size-14 shrink-0 items-center justify-center rounded-full"
            style={{ "--score": candidate.score.total } as React.CSSProperties}
          >
            <div className="flex size-11 items-center justify-center rounded-full bg-white text-sm font-bold">
              {candidate.score.total}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Badge>{candidate.syllableCount} sílabas</Badge>
          <Badge>{candidate.strategy}</Badge>
          <Badge className={riskClass(candidate.brandRisk?.level ?? "unknown")}>
            Marca: {candidate.brandRisk?.level ?? "unknown"}
          </Badge>
          {origins.slice(0, 2).map((origin, index) => (
            <Badge key={`${origin.root}-${index}`} className="bg-blue-50 text-blue-700">
              {origin.root} · {origin.meaning}
            </Badge>
          ))}
        </div>

        {candidate.domainChecks.length > 0 && (
          <div className="mb-4 space-y-1.5 rounded-xl bg-neutral-50 p-3">
            {candidate.domainChecks.map((check) => (
              <div key={check.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
                <span className="font-mono font-medium">{check.domain}</span>
                <span
                  className={riskClass(
                    check.status === "available"
                      ? "low"
                      : check.status === "registered"
                        ? "high"
                        : "unknown"
                  )}
                >
                  <span className="rounded-full px-2 py-0.5">{check.status}</span>
                </span>
                <span
                  className="truncate text-[10px] text-neutral-400"
                  title={`Consultados: ${parseProviderAttempts(check.attemptedProviders).join(", ") || check.provider}`}
                >
                  {check.provider}
                  {parseProviderAttempts(check.attemptedProviders).length > 1 &&
                    ` · ${parseProviderAttempts(check.attemptedProviders).length} intentos`}
                  {check.secondarySignal && ` · DNS: ${check.secondarySignal}`}
                </span>
                {(check.price !== null || check.renewalPrice !== null) && (
                  <span className="text-right text-[10px] tabular-nums text-neutral-500">
                    {check.price !== null &&
                      `${check.currency ?? "USD"} ${check.price.toFixed(2)}`}
                    {check.renewalPrice !== null &&
                      ` · renueva ${check.renewalPrice.toFixed(2)}`}
                  </span>
                )}
              </div>
            ))}
            {candidate.domainChecks.some((check) => check.configured === false) && (
              <p className="text-xs text-amber-700">Proveedor comercial no configurado.</p>
            )}
          </div>
        )}

        <details className="group mb-4">
          <summary className="cursor-pointer text-xs font-semibold text-neutral-500 hover:text-neutral-900">
            Ver desglose de puntuación
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {scoreLabels.map(([key, label]) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-[10px] text-neutral-500">
                  <span>{label}</span>
                  <span>{candidate.score[key]}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${candidate.score[key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            {candidate.pronunciation}. {candidate.brandRisk?.explanation}
          </p>
        </details>

        {candidate.favorite && (
          <div className="mb-4 grid gap-2 rounded-xl border border-rose-100 bg-rose-50/40 p-3 sm:grid-cols-[1fr_90px_110px_auto]">
            <Input
              aria-label="Comentario"
              placeholder="Comentario"
              value={draft.comment}
              onChange={(event) => setDraft((current) => ({ ...current, comment: event.target.value }))}
            />
            <Input
              aria-label="Puntuación manual"
              type="number"
              min={0}
              max={100}
              placeholder="0–100"
              value={draft.manualScore ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  manualScore: event.target.value === "" ? null : Number(event.target.value)
                }))
              }
            />
            <select
              aria-label="Estado del favorito"
              className={selectClass}
              value={draft.status}
              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="new">Nuevo</option>
              <option value="finalist">Finalista</option>
              <option value="discarded">Descartado</option>
            </select>
            <Button size="sm" variant="outline" onClick={() => onSaveFavorite(draft)}>
              Guardar
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={candidate.favorite ? "default" : "outline"}
            onClick={onFavorite}
          >
            <Heart className={`size-3.5 ${candidate.favorite ? "fill-current" : ""}`} />
            {candidate.favorite ? "Favorito" : "Guardar"}
          </Button>
          <Button size="sm" variant="outline" onClick={onDomains}>
            <Globe2 className="size-3.5" />
            Consultar dominios
          </Button>
          <Button size="sm" variant="ghost" onClick={onVariations}>
            <RefreshCw className="size-3.5" />
            Variaciones
          </Button>
          <Button size="sm" variant="danger" className="ml-auto" onClick={onDiscard}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonTable({
  candidates,
  onClose
}: {
  candidates: CandidateRecord[];
  onClose(): void;
}) {
  const rows: Array<[string, (candidate: CandidateRecord) => string | number]> = [
    ["Pronunciación", (candidate) => candidate.pronunciation],
    ["Memorabilidad", (candidate) => candidate.score.memorability],
    ["Escritura", (candidate) => candidate.score.spelling],
    ["Significado", (candidate) => candidate.meaning],
    [
      "Dominio",
      (candidate) =>
        candidate.domainChecks.find((item) => item.status === "available")?.domain ??
        (candidate.domainChecks.length > 0 ? "Sin disponibilidad confirmada" : "No consultado")
    ],
    ["Escalabilidad", (candidate) => candidate.score.internationalFit],
    ["Riesgo legal", (candidate) => candidate.brandRisk?.level ?? "unknown"],
    ["Puntuación automática", (candidate) => candidate.score.total],
    ["Puntuación manual", (candidate) => candidate.favorite?.manualScore ?? "Sin asignar"]
  ];

  return (
    <Card id="comparison" className="mt-6 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ArrowDownUp className="size-5 text-orange-500" />
            Comparador de finalistas
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Señal automática; el riesgo legal requiere revisión profesional.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b p-3 text-left text-xs text-neutral-400">Criterio</th>
              {candidates.map((candidate) => (
                <th key={candidate.id} className="border-b p-3 text-left text-lg">
                  {candidate.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, accessor]) => (
              <tr key={label} className="even:bg-neutral-50/70">
                <th className="p-3 text-left text-xs font-semibold text-neutral-500">{label}</th>
                {candidates.map((candidate) => (
                  <td key={candidate.id} className="max-w-60 p-3 align-top">
                    {accessor(candidate)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
