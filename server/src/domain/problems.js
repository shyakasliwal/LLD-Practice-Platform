const COMMON_RUBRIC = [
  {
    id: "separation_of_concerns",
    title: "Separation of concerns",
    description: "Entities have focused responsibilities; avoid god classes.",
    maxScore: 5,
  },
  {
    id: "relationships",
    title: "Relationships & collaboration",
    description: "Clear collaborations between entities; dependencies make sense.",
    maxScore: 5,
  },
  {
    id: "extensibility",
    title: "Extensibility",
    description: "Design can accommodate new types/rules without large rewrites.",
    maxScore: 5,
  },
  {
    id: "behavior_coverage",
    title: "Behavior coverage",
    description: "Key flows from requirements are reflected in the design.",
    maxScore: 5,
  },
  {
    id: "trade_offs",
    title: "Trade-offs",
    description: "Learner articulates meaningful design trade-offs.",
    maxScore: 5,
  },
];

const PROBLEMS = [
  {
    id: "parking-lot",
    title: "Parking Lot",
    difficulty: "Medium",
    description:
      "Design a parking lot system that supports multiple vehicle types (motorcycle, car, bus), multiple spot sizes, entry/exit, and fee calculation.",
    requirements: [
      "Support parking and unparking vehicles.",
      "Assign spots based on vehicle size; do not park a bus in a motorcycle spot.",
      "Track occupancy and availability per level/section if modeled.",
      "Calculate parking fee based on duration (simple hourly rate is fine).",
      "Handle lot full scenarios gracefully.",
    ],
    constraints: [
      "In-memory model is sufficient; persistence optional.",
      "Focus on object responsibilities, not REST APIs or databases.",
    ],
    hints: [
      "Consider Spot, Vehicle hierarchy, ParkingLot facade, and a pricing strategy.",
      "Who finds an available spot vs who marks it occupied?",
    ],
    rubric: COMMON_RUBRIC,
    expectedEntities: ["ParkingLot", "Spot", "Vehicle", "Ticket", "FeeCalculator"],
  },
  {
    id: "elevator",
    title: "Elevator System",
    difficulty: "Medium",
    description:
      "Design an elevator control system for a building with multiple elevators serving multiple floors.",
    requirements: [
      "Accept internal (inside cabin) and external (floor panel) requests.",
      "Move elevators to serve requests with a reasonable strategy (any clear policy).",
      "Track elevator state: idle, moving, door open.",
      "Prevent unsafe states (e.g. moving with doors open) at the model level.",
      "Support multiple elevators.",
    ],
    constraints: [
      "Simulate discrete time steps or events; real-time threading not required.",
    ],
    hints: [
      "Separate request queue, scheduler/dispatcher, and Elevator state machine.",
      "Controller orchestrates; elevators execute movement.",
    ],
    rubric: COMMON_RUBRIC,
    expectedEntities: ["Elevator", "ElevatorController", "Request", "Scheduler"],
  },
  {
    id: "vending-machine",
    title: "Vending Machine",
    difficulty: "Easy",
    description:
      "Design a vending machine that sells items, accepts coins/cashless payment, dispenses change, and handles out-of-stock.",
    requirements: [
      "Select product, accept payment, dispense item and change.",
      "Reject insufficient payment and return change on cancel where applicable.",
      "Track inventory per slot.",
      "Model states (idle, accepting payment, dispensing) clearly.",
    ],
    constraints: [
      "Payment can be simplified to an interface with coin-based implementation.",
    ],
    hints: ["State pattern fits well; Inventory and CoinStore are separate concerns."],
    rubric: COMMON_RUBRIC,
    expectedEntities: ["VendingMachine", "Inventory", "PaymentProcessor", "Product"],
  },
];

function getProblem(problemId) {
  return PROBLEMS.find((p) => p.id === problemId) || null;
}

function listProblems() {
  return PROBLEMS;
}

function publicProblem(problem) {
  const { expectedEntities, ...rest } = problem;
  return rest;
}

module.exports = { PROBLEMS, getProblem, listProblems, publicProblem };
