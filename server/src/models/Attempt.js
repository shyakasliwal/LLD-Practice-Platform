const mongoose = require("mongoose");

const ClassDesignSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    responsibilities: { type: [String], default: [] },
    collaborators: { type: [String], default: [] },
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    summary: { type: String, default: "" },
    classes: { type: [ClassDesignSchema], default: [] },
    keyFlows: { type: [String], default: [] },
    tradeOffs: { type: String, default: "" },
    patternsUsed: { type: [String], default: [] },
    rawNotes: { type: String, default: "" },
  },
  { _id: false }
);

const CriterionScoreSchema = new mongoose.Schema(
  {
    criterionId: String,
    title: String,
    score: Number,
    maxScore: Number,
    notes: String,
  },
  { _id: false }
);

const FeedbackSchema = new mongoose.Schema(
  {
    overallSummary: String,
    strengths: [String],
    improvements: [String],
    criterionScores: [CriterionScoreSchema],
    suggestedNextSteps: [String],
    evaluatorSources: [String],
  },
  { _id: false }
);

const AttemptSchema = new mongoose.Schema(
  {
    learnerId: { type: String, required: true, index: true, default: "default-learner" },
    problemId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["draft", "submitted", "evaluating", "completed", "failed"],
      default: "draft",
    },
    submission: { type: SubmissionSchema, default: null },
    feedback: { type: FeedbackSchema, default: null },
    evaluationError: { type: String, default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

function serializeAttempt(doc) {
  const obj = doc.toObject({ versionKey: false });
  return {
    id: String(obj._id),
    learnerId: obj.learnerId,
    problemId: obj.problemId,
    status: obj.status,
    submission: obj.submission || null,
    feedback: obj.feedback || null,
    evaluationError: obj.evaluationError || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    submittedAt: obj.submittedAt,
  };
}

module.exports = {
  Attempt: mongoose.models.Attempt || mongoose.model("Attempt", AttemptSchema),
  serializeAttempt,
};
