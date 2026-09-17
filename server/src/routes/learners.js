import { Router } from "express";
import { AttemptService } from "../services/attemptService.js";

const router = Router();
const service = new AttemptService();

router.get("/:learnerId/attempts", async (req, res) => {
  const { problem_id: problemId } = req.query;
  const attempts = await service.listHistory(req.params.learnerId, problemId || null);
  res.json(attempts);
});

export default router;
