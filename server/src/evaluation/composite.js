const { DeterministicEvaluator } = require("./deterministic");
const { LLMEvaluator } = require("./llm");
const { EvaluationError } = require("./errors");

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = String(item || "")
      .trim()
      .toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function mergeCriterionScores(a, b) {
  const byId = Object.fromEntries(a.map((c) => [c.criterionId, c]));
  for (const c of b) {
    const existing = byId[c.criterionId];
    if (!existing) {
      byId[c.criterionId] = c;
      continue;
    }
    const avg = Math.round((existing.score + c.score) / 2);
    byId[c.criterionId] = {
      criterionId: c.criterionId,
      title: existing.title,
      score: Math.min(avg, existing.maxScore),
      maxScore: existing.maxScore,
      notes: `${existing.notes} | LLM: ${c.notes}`,
    };
  }
  return Object.values(byId);
}

class CompositeEvaluator {
  constructor({ primary, secondary } = {}) {
    this.primary = primary || new DeterministicEvaluator();
    this.secondary = secondary || new LLMEvaluator();
  }

  async evaluate(problem, submission) {
    const base = await this.primary.evaluate(problem, submission);
    try {
      const llmFeedback = await this.secondary.evaluate(problem, submission);
      return {
        overallSummary: llmFeedback.overallSummary,
        strengths: dedupe([...base.strengths, ...llmFeedback.strengths]),
        improvements: dedupe([...base.improvements, ...llmFeedback.improvements]),
        criterionScores: mergeCriterionScores(base.criterionScores, llmFeedback.criterionScores),
        suggestedNextSteps: dedupe([
          ...llmFeedback.suggestedNextSteps,
          ...base.suggestedNextSteps,
        ]),
        evaluatorSources: [...base.evaluatorSources, ...llmFeedback.evaluatorSources],
      };
    } catch (err) {
      if (!(err instanceof EvaluationError)) {
        throw err;
      }
      return {
        ...base,
        overallSummary: `${base.overallSummary} Qualitative LLM review was unavailable; deterministic scores still apply.`,
      };
    }
  }
}

module.exports = { CompositeEvaluator, mergeCriterionScores };
