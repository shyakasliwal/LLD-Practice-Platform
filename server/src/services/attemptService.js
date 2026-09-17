const { Attempt, serializeAttempt } = require("../models/Attempt");
const { getProblem } = require("../domain/problems");
const { CompositeEvaluator } = require("../evaluation/composite");
const { EvaluationError } = require("../evaluation/errors");

class AttemptNotFoundError extends Error {
  constructor(id) {
    super(`Attempt not found: ${id}`);
    this.name = "AttemptNotFoundError";
    this.statusCode = 404;
  }
}

class AttemptService {
  constructor(evaluator) {
    this.evaluator = evaluator || new CompositeEvaluator();
  }

  async startAttempt(problemId, learnerId = "default-learner") {
    if (!getProblem(problemId)) {
      const err = new Error(`Unknown problem: ${problemId}`);
      err.statusCode = 400;
      throw err;
    }
    const record = await Attempt.create({
      learnerId,
      problemId,
      status: "draft",
    });
    return serializeAttempt(record);
  }

  async saveDraft(attemptId, submission) {
    const record = await this._getAttempt(attemptId);
    if (!["draft", "failed"].includes(record.status)) {
      const err = new Error("Cannot edit submission after evaluation started");
      err.statusCode = 400;
      throw err;
    }
    record.submission = submission;
    record.updatedAt = new Date();
    await record.save();
    return serializeAttempt(record);
  }

  async submit(attemptId) {
    const record = await this._getAttempt(attemptId);
    if (!record.submission) {
      const err = new Error("Submission is empty");
      err.statusCode = 400;
      throw err;
    }
    if (record.status === "evaluating") {
      const err = new Error("Evaluation already in progress");
      err.statusCode = 400;
      throw err;
    }
    record.status = "evaluating";
    record.submittedAt = new Date();
    record.evaluationError = null;
    record.feedback = null;
    await record.save();
    return serializeAttempt(record);
  }

  async runEvaluation(attemptId) {
    const record = await this._getAttempt(attemptId);
    const problem = getProblem(record.problemId);
    if (!problem) {
      record.status = "failed";
      record.evaluationError = "Problem not found";
      await record.save();
      return serializeAttempt(record);
    }

    try {
      const payload = record.submission?.toObject
        ? record.submission.toObject()
        : record.submission;
      const feedback = await this.evaluator.evaluate(problem, payload);
      record.feedback = feedback;
      record.status = "completed";
      record.evaluationError = null;
    } catch (err) {
      record.status = "failed";
      record.evaluationError =
        err instanceof EvaluationError ? err.message : `Unexpected error: ${err.message}`;
    }
    await record.save();
    return serializeAttempt(record);
  }

  async listHistory(learnerId, problemId) {
    const query = { learnerId };
    if (problemId) query.problemId = problemId;
    const records = await Attempt.find(query).sort({ createdAt: -1 });
    return records.map(serializeAttempt);
  }

  async getAttempt(attemptId) {
    const record = await this._getAttempt(attemptId);
    return serializeAttempt(record);
  }

  async _getAttempt(attemptId) {
    if (!attemptId.match(/^[a-fA-F0-9]{24}$/)) {
      throw new AttemptNotFoundError(attemptId);
    }
    const record = await Attempt.findById(attemptId);
    if (!record) throw new AttemptNotFoundError(attemptId);
    return record;
  }
}

module.exports = { AttemptService, AttemptNotFoundError };
