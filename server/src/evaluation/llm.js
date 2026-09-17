const { EvaluationError } = require("./errors");

class LLMEvaluator {
  constructor(options = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.timeoutMs = Number(options.timeoutMs ?? process.env.EVALUATION_TIMEOUT_MS ?? 45000);
  }

  get sourceName() {
    return "llm";
  }

  async evaluate(problem, submission) {
    if (!this.apiKey) {
      throw new EvaluationError("OPENAI_API_KEY not configured");
    }

    const rubricText = (problem.rubric || [])
      .map((c) => `- ${c.id}: ${c.title} — ${c.description}`)
      .join("\n");

    const system =
      "You are an LLD mentor. Multiple valid designs exist. Score against rubric criteria 0-5. Be specific and explainable. Return JSON only with keys: overallSummary, strengths, improvements, criterionScores (array of criterionId, score, notes), suggestedNextSteps.";

    const user = [
      `Problem: ${problem.title}`,
      `Description: ${problem.description}`,
      "Requirements:",
      ...(problem.requirements || []).map((r) => `- ${r}`),
      "Rubric:",
      rubricText,
      "",
      "Submission JSON:",
      JSON.stringify(submission, null, 2),
    ].join("\n");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let resp;
    try {
      resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new EvaluationError(`LLM request failed: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok) {
      throw new EvaluationError(`LLM API returned ${resp.status}`);
    }

    const payload = await resp.json();
    const data = JSON.parse(payload.choices[0].message.content);
    const critById = Object.fromEntries((problem.rubric || []).map((c) => [c.id, c]));

    const criterionScores = (data.criterionScores || data.criterion_scores || []).map((item) => {
      const criterionId = item.criterionId || item.criterion_id || "";
      const crit = critById[criterionId];
      const maxScore = crit?.maxScore || 5;
      return {
        criterionId,
        title: crit?.title || criterionId,
        score: Math.min(Number(item.score || 0), maxScore),
        maxScore,
        notes: String(item.notes || ""),
      };
    });

    return {
      overallSummary: String(data.overallSummary || data.overall_summary || "LLM feedback generated."),
      strengths: (data.strengths || []).map(String),
      improvements: (data.improvements || []).map(String),
      criterionScores,
      suggestedNextSteps: (data.suggestedNextSteps || data.suggested_next_steps || []).map(String),
      evaluatorSources: [this.sourceName],
    };
  }
}

module.exports = { LLMEvaluator };
