const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const { createApp } = require("../src/app");
const { AttemptService } = require("../src/services/attemptService");
const { CompositeEvaluator } = require("../src/evaluation/composite");
const { DeterministicEvaluator } = require("../src/evaluation/deterministic");
const { EvaluationError } = require("../src/evaluation/errors");

class SkipLlm {
  get sourceName() {
    return "llm";
  }
  async evaluate() {
    throw new EvaluationError("skip");
  }
}

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const service = new AttemptService(
    new CompositeEvaluator({ primary: new DeterministicEvaluator(), secondary: new SkipLlm() })
  );
  app = createApp(service);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("health and problems", async () => {
  const health = await request(app).get("/health");
  expect(health.body.status).toBe("ok");
  const problems = await request(app).get("/api/problems");
  expect(problems.body.length).toBeGreaterThanOrEqual(3);
  expect(problems.body[0].rubric).toBeTruthy();
});

test("unknown problem and missing attempt are client errors", async () => {
  const bad = await request(app).post("/api/attempts").send({ problemId: "nope" });
  expect(bad.status).toBe(400);
  const missing = await request(app).get("/api/attempts/ffffffffffffffffffffffff");
  expect(missing.status).toBe(404);
  const missingProblem = await request(app).get("/api/problems/does-not-exist");
  expect(missingProblem.status).toBe(404);
});

test("cannot submit empty draft", async () => {
  const start = await request(app)
    .post("/api/attempts")
    .send({ problemId: "elevator", learnerId: "empty-sub" });
  const submit = await request(app).post(`/api/attempts/${start.body.id}/submit`);
  expect(submit.status).toBe(400);
});

test("practice flow end to end", async () => {
  const start = await request(app)
    .post("/api/attempts")
    .send({ problemId: "parking-lot", learnerId: "test-learner" });
  expect(start.status).toBe(201);
  const attemptId = start.body.id;

  const save = await request(app)
    .put(`/api/attempts/${attemptId}/submission`)
    .send({
      summary: "Parking lot design",
      classes: [{ name: "ParkingLot", responsibilities: ["orchestrate"], collaborators: ["Spot"] }],
      keyFlows: ["park"],
      tradeOffs: "Simple assignment policy first.",
    });
  expect(save.status).toBe(200);

  const submit = await request(app).post(`/api/attempts/${attemptId}/submit`);
  expect(submit.status).toBe(200);
  expect(submit.body.status).toBe("evaluating");

  await new Promise((r) => setTimeout(r, 50));
  const final = await request(app).get(`/api/attempts/${attemptId}`);
  expect(["completed", "failed", "evaluating"]).toContain(final.body.status);

  const history = await request(app).get("/api/learners/test-learner/attempts");
  expect(history.body.some((h) => h.id === attemptId)).toBe(true);
});
