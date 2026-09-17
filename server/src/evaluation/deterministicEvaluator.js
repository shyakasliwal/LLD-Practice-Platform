function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export class DeterministicEvaluator {
  get sourceName() {
    return "deterministic";
  }

  async evaluate(problem, submission) {
    const classNames = new Set(
      (submission.classes || []).filter((c) => c.name).map((c) => normalizeName(c.name))
    );
    const expected = problem.expected_entities.map(normalizeName);

    const entityHits = expected.filter((e) =>
      [...classNames].some((cn) => cn.includes(e) || e.includes(cn))
    ).length;
    const entityRatio = entityHits / Math.max(expected.length, 1);

    const classes = submission.classes || [];
    const hasResponsibilities = classes.filter((c) => (c.responsibilities || []).length >= 1).length;
    const respScore = classes.length ? Math.min(5, hasResponsibilities) : 0;

    const collabCount = classes.reduce((n, c) => n + (c.collaborators || []).length, 0);
    const relationshipScore = Math.min(5, Math.floor(collabCount / Math.max(classes.length, 1)) + 1);

    const flowScore = Math.min(5, (submission.key_flows || []).length);
    const tradeOffLen = (submission.trade_offs || "").trim().length;
    const tradeScore = tradeOffLen > 120 ? 5 : tradeOffLen > 40 ? 3 : 1;

    const summary = (submission.summary || "").toLowerCase();
    const rawNotes = (submission.raw_notes || "").toLowerCase();
    const patternKeywords = ["strategy", "factory", "state", "observer", "facade"];
    const extensibilitySignals = [
      ...(submission.patterns_used || []),
      ...patternKeywords.filter((p) => summary.includes(p) || rawNotes.includes(p)),
    ];
    const extScore = Math.min(5, 2 + new Set(extensibilitySignals).size);
    const entityScore = Math.min(5, Math.round(entityRatio * 5));

    const criterionScores = problem.rubric.map((crit) => {
      let score = 3;
      let notes = "General rubric check.";

      if (crit.id === "separation_of_concerns") {
        score = respScore;
        notes = classes.length
          ? `${hasResponsibilities}/${classes.length} classes list responsibilities.`
          : "Add named classes with responsibilities.";
      } else if (crit.id === "relationships") {
        score = relationshipScore;
        notes = `Collaborators referenced ${collabCount} time(s) across classes.`;
      } else if (crit.id === "extensibility") {
        score = extScore;
        notes = extensibilitySignals.length
          ? "Patterns or extension points mentioned."
          : "Consider naming patterns or extension hooks.";
      } else if (crit.id === "behavior_coverage") {
        score = flowScore;
        notes = `${(submission.key_flows || []).length} key flow(s) documented.`;
      } else if (crit.id === "trade_offs") {
        score = tradeScore;
        notes =
          tradeScore >= 3
            ? "Trade-offs section is substantive."
            : "Expand trade-offs (simplicity vs flexibility, etc.).";
      }

      return {
        criterion_id: crit.id,
        title: crit.title,
        score: Math.min(score, crit.max_score),
        max_score: crit.max_score,
        notes,
      };
    });

    const strengths = [];
    const improvements = [];

    if (entityScore >= 3) {
      strengths.push(
        `Core domain entities align with problem context (${entityHits}/${expected.length} expected concepts).`
      );
    } else {
      improvements.push(
        `Name or split classes toward expected concepts: ${problem.expected_entities.join(", ")}.`
      );
    }

    const emptyResp = classes.filter((c) => !(c.responsibilities || []).length).map((c) => c.name);
    if (emptyResp.length) {
      improvements.push(`Add responsibilities for: ${emptyResp.slice(0, 3).join(", ")}.`);
    }
    if ((submission.key_flows || []).length < 2) {
      improvements.push("Document at least 2 end-to-end flows (happy path + edge case).");
    }
    if (tradeScore < 3) {
      improvements.push("Explain at least one trade-off you made in this design.");
    }
    if (!strengths.length) {
      strengths.push("Submission structure is valid and reviewable.");
    }

    const avg = criterionScores.reduce((s, c) => s + c.score, 0) / criterionScores.length;

    return {
      overall_summary: `Deterministic review: average rubric score ${avg.toFixed(1)}/5. This checks structure and coverage, not full design correctness.`,
      strengths,
      improvements,
      criterion_scores: criterionScores,
      suggested_next_steps: [
        "Compare collaborators against requirements — remove circular dependencies.",
        "Re-run after adding one extensibility hook (Strategy/Factory/State).",
      ],
      evaluator_sources: [this.sourceName],
    };
  }
}
