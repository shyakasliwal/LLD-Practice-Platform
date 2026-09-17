class EvaluationError extends Error {
  constructor(message) {
    super(message);
    this.name = "EvaluationError";
  }
}

module.exports = { EvaluationError };
