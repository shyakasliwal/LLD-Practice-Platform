import { Router } from "express";
import { getProblem, listProblems } from "../domain/problems.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(listProblems());
});

router.get("/:problemId", (req, res) => {
  const problem = getProblem(req.params.problemId);
  if (!problem) {
    return res.status(404).json({ detail: "Problem not found" });
  }
  return res.json(problem);
});

export default router;
