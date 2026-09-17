const { DeterministicEvaluator } = require("../src/evaluation/deterministic");
const { getProblem } = require("../src/domain/problems");

describe("DeterministicEvaluator", () => {
  test("scores a structured parking-lot submission", async () => {
    const problem = getProblem("parking-lot");
    const feedback = await new DeterministicEvaluator().evaluate(problem, {
      summary: "Facade ParkingLot coordinates spot assignment and ticketing.",
      classes: [
        { name: "ParkingLot", responsibilities: ["assign spot", "calculate fee"], collaborators: ["Spot", "Ticket"] },
        { name: "Spot", responsibilities: ["track occupancy"], collaborators: ["Vehicle"] },
        { name: "Vehicle", responsibilities: ["type and size"], collaborators: [] },
        { name: "Ticket", responsibilities: ["entry time"], collaborators: ["FeeCalculator"] },
        { name: "FeeCalculator", responsibilities: ["compute fee"], collaborators: [] },
      ],
      keyFlows: ["Park car", "Exit and pay"],
      tradeOffs: "Kept pricing as Strategy for extensibility though hourly flat rate is enough for MVP.",
      patternsUsed: ["Strategy", "Facade"],
      rawNotes: "",
    });
    expect(feedback.criterionScores.length).toBeGreaterThan(0);
    expect(feedback.criterionScores.some((s) => s.score >= 3)).toBe(true);
    expect(feedback.evaluatorSources).toContain("deterministic");
  });

  test("empty submission gets improvement notes", async () => {
    const problem = getProblem("vending-machine");
    const feedback = await new DeterministicEvaluator().evaluate(problem, {
      summary: "",
      classes: [],
      keyFlows: [],
      tradeOffs: "",
      patternsUsed: [],
      rawNotes: "",
    });
    expect(feedback.improvements.length).toBeGreaterThan(0);
    const soc = feedback.criterionScores.find((s) => s.criterionId === "separation_of_concerns");
    expect(soc.score).toBeLessThanOrEqual(2);
  });
});
