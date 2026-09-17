import { DeterministicEvaluator } from "./deterministicEvaluator.js";
import { LLMEvaluator } from "./llmEvaluator.js";
import { EvaluationError } from "./errors.js";

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function mergeCriterionScores(a, b) {
  const byId = Object.fromEntries(a.map((c) => [c.criterion_id, c]));
  for (const c of b) {
    const existing = byId[c.criterion_id];
    if (!existing) {
      byId[c.criterion_id] = c;
      continue;
    }
    const avg = Math.round((existing.score + c.score) / 2);
    byId[c.criterion_id] = {
      ...existing,
      score: Math.min(avg, existing.max_score),
      notes: `${existing.notes} | LLM: ${c.notes}`,
    };
  }
  return Object.values(byId);
}

export class CompositeEvaluator {
  constructor(primary = new DeterministicEvaluator(), secondary = new LLMEvaluator()) {
    this.primary = primary;
    this.secondary = secondary;
  }

  async evaluate(problem, submission) {
    const base = await this.primary.evaluate(problem, submission);
    const sources = [...base.evaluator_sources];

    try {
      const llmFeedback = await this.secondary.evaluate(problem, submission);
      return {
        overall_summary: llmFeedback.overall_summary,
        strengths: dedupe([...base.strengths, ...llmFeedback.strengths]),
        improvements: dedupe([...base.improvements, ...llmFeedback.improvements]),
        criterion_scores: mergeCriterionScores(base.criterion_scores, llmFeedback.criterion_scores),
        suggested_next_steps: dedupe([
          ...llmFeedback.suggested_next_steps,
          ...base.suggested_next_steps,
        ]),
        evaluator_sources: [...sources, ...llmFeedback.evaluator_sources],
      };
    } catch (err) {
      if (!(err instanceof EvaluationError)) {
        throw err;
      }
      return {
        ...base,
        overall_summary:
          base.overall_summary +
          " Qualitative LLM review was unavailable; deterministic scores still apply.",
        evaluator_sources: sources,
      };
    }
  }
}
