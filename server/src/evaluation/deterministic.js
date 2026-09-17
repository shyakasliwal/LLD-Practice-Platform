function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

class DeterministicEvaluator {
  get sourceName() {
    return "deterministic";
  }

  async evaluate(problem, submission) {
    const classes = submission.classes || [];
    const classNames = new Set(
      classes.map((c) => normalizeName(c.name)).filter(Boolean)
    );
    const expected = (problem.expectedEntities || []).map(normalizeName);
    const entityHits = expected.filter((e) =>
      [...classNames].some((cn) => cn.includes(e) || e.includes(cn))
    ).length;
    const entityRatio = entityHits / Math.max(expected.length, 1);
    const entityScore = Math.min(5, Math.round(entityRatio * 5));

    const hasResponsibilities = classes.filter(
      (c) => (c.responsibilities || []).length >= 1
    ).length;
    const respScore = classes.length ? Math.min(5, hasResponsibilities) : 0;

    const collabCount = classes.reduce(
      (sum, c) => sum + (c.collaborators || []).length,
      0
    );
    const relationshipScore = Math.min(
      5,
      Math.floor(collabCount / Math.max(classes.length, 1)) + 1
    );

    const flows = submission.keyFlows || [];
    const flowScore = Math.min(5, flows.length);

    const tradeOffLen = String(submission.tradeOffs || "").trim().length;
    const tradeScore = tradeOffLen > 120 ? 5 : tradeOffLen > 40 ? 3 : 1;

    const notes = `${submission.rawNotes || ""} ${submission.summary || ""}`.toLowerCase();
    const patternHints = ["strategy", "factory", "state", "observer", "facade"].filter(
      (p) => notes.includes(p)
    );
    const extensibilitySignals = [...(submission.patternsUsed || []), ...patternHints];
    const extScore = Math.min(5, 2 + new Set(extensibilitySignals).size);

    const criterionScores = (problem.rubric || []).map((crit) => {
      let score = 3;
      let scoreNotes = "General rubric check.";
      if (crit.id === "separation_of_concerns") {
        score = respScore;
        scoreNotes = classes.length
          ? `${hasResponsibilities}/${classes.length} classes list responsibilities.`
          : "Add named classes with responsibilities.";
      } else if (crit.id === "relationships") {
        score = relationshipScore;
        scoreNotes = `Collaborators referenced ${collabCount} time(s) across classes.`;
      } else if (crit.id === "extensibility") {
        score = extScore;
        scoreNotes = extensibilitySignals.length
          ? "Patterns or extension points mentioned."
          : "Consider naming patterns or extension hooks.";
      } else if (crit.id === "behavior_coverage") {
        score = flowScore;
        scoreNotes = `${flows.length} key flow(s) documented.`;
      } else if (crit.id === "trade_offs") {
        score = tradeScore;
        scoreNotes =
          tradeScore >= 3
            ? "Trade-offs section is substantive."
            : "Expand trade-offs (simplicity vs flexibility, etc.).";
      }
      return {
        criterionId: crit.id,
        title: crit.title,
        score: Math.min(score, crit.maxScore || 5),
        maxScore: crit.maxScore || 5,
        notes: scoreNotes,
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
        `Name or split classes toward expected concepts: ${(problem.expectedEntities || []).join(", ")}.`
      );
    }

    const emptyResp = classes.filter((c) => !(c.responsibilities || []).length).map((c) => c.name);
    if (emptyResp.length) {
      improvements.push(`Add responsibilities for: ${emptyResp.slice(0, 3).join(", ")}.`);
    }
    if (flows.length < 2) {
      improvements.push("Document at least 2 end-to-end flows (happy path + edge case).");
    }
    if (tradeScore < 3) {
      improvements.push("Explain at least one trade-off you made in this design.");
    }
    if (!strengths.length) {
      strengths.push("Submission structure is valid and reviewable.");
    }

    const avg =
      criterionScores.reduce((sum, c) => sum + c.score, 0) / Math.max(criterionScores.length, 1);

    return {
      overallSummary: `Deterministic review: average rubric score ${avg.toFixed(1)}/5. This checks structure and coverage, not full design correctness.`,
      strengths,
      improvements,
      criterionScores,
      suggestedNextSteps: [
        "Compare collaborators against requirements — remove circular dependencies.",
        "Re-run after adding one extensibility hook (Strategy/Factory/State).",
      ],
      evaluatorSources: [this.sourceName],
    };
  }
}

module.exports = { DeterministicEvaluator };
