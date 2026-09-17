import { config } from "../config.js";
import { EvaluationError } from "./errors.js";

export class LLMEvaluator {
  get sourceName() {
    return "llm";
  }

  async evaluate(problem, submission) {
    if (!config.openaiApiKey) {
      throw new EvaluationError("OPENAI_API_KEY not configured");
    }

    const rubricText = problem.rubric
      .map((c) => `- ${c.id}: ${c.title} — ${c.description}`)
      .join("\n");

    const system =
      "You are an LLD mentor. Multiple valid designs exist. " +
      "Score against rubric criteria 0-5. Be specific and explainable. " +
      "Return JSON only with keys: overall_summary, strengths, improvements, " +
      "criterion_scores (array of criterion_id, score, notes), suggested_next_steps.";

    const user = [
      `Problem: ${problem.title}`,
      `Description: ${problem.description}`,
      "Requirements:",
      ...problem.requirements.map((r) => `- ${r}`),
      "Rubric:",
      rubricText,
      "",
      `Submission JSON:\n${JSON.stringify(submission, null, 2)}`,
    ].join("\n");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.evaluationTimeoutMs);

    let resp;
    try {
      resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok) {
      const text = await resp.text();
      throw new EvaluationError(`LLM API returned ${resp.status}: ${text.slice(0, 200)}`);
    }

    const payload = await resp.json();
    const content = payload.choices?.[0]?.message?.content;
    const data = JSON.parse(content);

    const critById = Object.fromEntries(problem.rubric.map((c) => [c.id, c]));
    const criterionScores = (data.criterion_scores || []).map((item) => {
      const crit = critById[item.criterion_id];
      return {
        criterion_id: item.criterion_id,
        title: crit?.title || item.criterion_id,
        score: Math.min(Number(item.score) || 0, crit?.max_score || 5),
        max_score: crit?.max_score || 5,
        notes: String(item.notes || ""),
      };
    });

    return {
      overall_summary: String(data.overall_summary || "LLM feedback generated."),
      strengths: (data.strengths || []).map(String),
      improvements: (data.improvements || []).map(String),
      criterion_scores: criterionScores,
      suggested_next_steps: (data.suggested_next_steps || []).map(String),
      evaluator_sources: [this.sourceName],
    };
  }
}
