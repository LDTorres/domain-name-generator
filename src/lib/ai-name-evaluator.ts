import type { GeneratedCandidate } from "@/types/naming";

export interface AIEvaluation {
  configured: boolean;
  narrative?: string;
  connotations?: string[];
  slogans?: string[];
  message: string;
}

export interface AINameEvaluator {
  evaluate(candidate: GeneratedCandidate): Promise<AIEvaluation>;
  proposeVariations(candidate: GeneratedCandidate, count: number): Promise<string[]>;
}

export class NotConfiguredAINameEvaluator implements AINameEvaluator {
  async evaluate(_candidate: GeneratedCandidate): Promise<AIEvaluation> {
    void _candidate;
    return {
      configured: false,
      message: "Evaluador de IA no configurado. La puntuación local sigue disponible."
    };
  }

  async proposeVariations(_candidate: GeneratedCandidate, _count: number): Promise<string[]> {
    void _candidate;
    void _count;
    return [];
  }
}
