import { Router } from "express";
import { AttemptService, scheduleEvaluation } from "../services/attemptService.js";

const router = Router();
const service = new AttemptService();

router.post("/", async (req, res) => {
  try {
    const { problem_id: problemId, learner_id: learnerId = "default-learner" } = req.body;
    const attempt = await service.startAttempt(problemId, learnerId);
    res.json(attempt);
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

router.get("/:attemptId", async (req, res) => {
  try {
    const attempt = await service.getAttempt(req.params.attemptId);
    res.json(attempt);
  } catch (err) {
    res.status(404).json({ detail: err.message });
  }
});

router.put("/:attemptId/submission", async (req, res) => {
  try {
    const attempt = await service.saveDraft(req.params.attemptId, req.body);
    res.json(attempt);
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

router.post("/:attemptId/submit", async (req, res) => {
  try {
    const attempt = await service.submit(req.params.attemptId);
    scheduleEvaluation(service, req.params.attemptId);
    res.json(attempt);
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

export default router;
