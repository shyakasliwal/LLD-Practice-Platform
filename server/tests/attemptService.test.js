const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { AttemptService } = require("../src/services/attemptService");
const { CompositeEvaluator } = require("../src/evaluation/composite");
const { EvaluationError } = require("../src/evaluation/errors");

class FailingEvaluator {
  get sourceName() {
    return "failing";
  }
  async evaluate() {
    throw new EvaluationError("boom");
  }
}

class StubEvaluator {
  get sourceName() {
    return "stub";
  }
  async evaluate() {
    return {
      overallSummary: "ok",
      strengths: ["good"],
      improvements: [],
      criterionScores: [
        { criterionId: "separation_of_concerns", title: "Separation", score: 4, maxScore: 5, notes: "fine" },
      ],
      suggestedNextSteps: ["iterate"],
      evaluatorSources: ["stub"],
    };
  }
}

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

test("attempt lifecycle and history", async () => {
  const service = new AttemptService(
    new CompositeEvaluator({ primary: new StubEvaluator(), secondary: new FailingEvaluator() })
  );
  const record = await service.startAttempt("elevator", "learner-a");
  expect(record.status).toBe("draft");

  await service.saveDraft(record.id, {
    summary: "test",
    classes: [{ name: "Elevator", responsibilities: ["move"], collaborators: ["Scheduler"] }],
    keyFlows: ["request"],
    tradeOffs: "simple scheduler first",
    patternsUsed: [],
    rawNotes: "",
  });
  const submitted = await service.submit(record.id);
  expect(submitted.status).toBe("evaluating");

  const completed = await service.runEvaluation(record.id);
  expect(completed.status).toBe("completed");
  expect(completed.feedback).toBeTruthy();

  const history = await service.listHistory("learner-a", "elevator");
  expect(history).toHaveLength(1);
  expect(history[0].id).toBe(record.id);
});

test("submit without submission raises", async () => {
  const service = new AttemptService();
  const record = await service.startAttempt("parking-lot", "x");
  await expect(service.submit(record.id)).rejects.toThrow(/empty/);
});

test("unknown problem is rejected", async () => {
  const service = new AttemptService();
  await expect(service.startAttempt("not-a-problem", "z")).rejects.toThrow(/Unknown problem/);
});

test("missing attempt throws not found", async () => {
  const service = new AttemptService();
  await expect(service.getAttempt("ffffffffffffffffffffffff")).rejects.toThrow(/not found/);
});

test("cannot edit submission after evaluation started", async () => {
  const service = new AttemptService(
    new CompositeEvaluator({ primary: new StubEvaluator(), secondary: new FailingEvaluator() })
  );
  const record = await service.startAttempt("vending-machine", "locked");
  await service.saveDraft(record.id, {
    summary: "s",
    classes: [{ name: "VendingMachine", responsibilities: ["orchestrate"], collaborators: [] }],
    keyFlows: ["buy"],
    tradeOffs: "simple state machine",
    patternsUsed: [],
    rawNotes: "",
  });
  await service.submit(record.id);
  await expect(
    service.saveDraft(record.id, {
      summary: "changed",
      classes: [],
      keyFlows: [],
      tradeOffs: "",
      patternsUsed: [],
      rawNotes: "",
    })
  ).rejects.toThrow(/Cannot edit/);
});

test("evaluation failure marks attempt failed", async () => {
  const service = new AttemptService(
    new CompositeEvaluator({ primary: new FailingEvaluator(), secondary: new FailingEvaluator() })
  );
  const record = await service.startAttempt("parking-lot", "y");
  await service.saveDraft(record.id, {
    summary: "s",
    classes: [],
    keyFlows: [],
    tradeOffs: "",
    patternsUsed: [],
    rawNotes: "",
  });
  await service.submit(record.id);
  const failed = await service.runEvaluation(record.id);
  expect(failed.status).toBe("failed");
  expect(failed.evaluationError).toBeTruthy();
});
