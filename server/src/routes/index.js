const express = require("express");
const { listProblems, getProblem, publicProblem } = require("../domain/problems");
const { AttemptService } = require("../services/attemptService");

function createRouter(service = new AttemptService()) {
  const router = express.Router();

  router.get("/problems", (_req, res) => {
    res.json(listProblems().map(publicProblem));
  });

  router.get("/problems/:problemId", (req, res) => {
    const problem = getProblem(req.params.problemId);
    if (!problem) return res.status(404).json({ detail: "Problem not found" });
    return res.json(publicProblem(problem));
  });

  router.post("/attempts", async (req, res, next) => {
    try {
      const { problemId, learnerId } = req.body || {};
      const attempt = await service.startAttempt(problemId, learnerId || "default-learner");
      res.status(201).json(attempt);
    } catch (err) {
      next(err);
    }
  });

  router.get("/attempts/:id", async (req, res, next) => {
    try {
      res.json(await service.getAttempt(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.put("/attempts/:id/submission", async (req, res, next) => {
    try {
      const body = req.body || {};
      const submission = {
        summary: body.summary || "",
        classes: body.classes || [],
        keyFlows: body.keyFlows || body.key_flows || [],
        tradeOffs: body.tradeOffs || body.trade_offs || "",
        patternsUsed: body.patternsUsed || body.patterns_used || [],
        rawNotes: body.rawNotes || body.raw_notes || "",
      };
      res.json(await service.saveDraft(req.params.id, submission));
    } catch (err) {
      next(err);
    }
  });

  router.post("/attempts/:id/submit", async (req, res, next) => {
    try {
      const attempt = await service.submit(req.params.id);
      setImmediate(() => {
        service.runEvaluation(req.params.id).catch((err) => {
          console.error("Evaluation failed", err);
        });
      });
      res.json(attempt);
    } catch (err) {
      next(err);
    }
  });

  router.get("/learners/:learnerId/attempts", async (req, res, next) => {
    try {
      res.json(await service.listHistory(req.params.learnerId, req.query.problemId));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createRouter };
