# LLD Practice Platform (MERN MVP)

Practice **Low-Level Design** with a full learner loop: pick a problem, submit a structured design, get explainable feedback, and review attempt history.

**Stack:** MongoDB · Express · React (Vite) · Node.js

## Documentation (assignment)

| Deliverable | File |
|-------------|------|
| Research note | [docs/RESEARCH.md](docs/RESEARCH.md) |
| Design note | [docs/DESIGN.md](docs/DESIGN.md) |
| Deliverables index | [docs/DELIVERABLES.md](docs/DELIVERABLES.md) |
| AI usage | [AI_USAGE.md](AI_USAGE.md)

## Prerequisites

- Node.js 18+
- MongoDB running locally **or** a MongoDB Atlas URI

## Setup

```powershell
cd "D:\LLm Practice Platform"
npm run install:all
copy server\.env.example server\.env
```

Edit `server\.env` if needed:

- `MONGODB_URI` — default `mongodb://127.0.0.1:27017/lld_practice`
- `OPENAI_API_KEY` — optional; deterministic feedback works without it

## Run (dev)

Terminal 1 — API:

```powershell
npm run dev --prefix server
```

Terminal 2 — React:

```powershell
npm run dev --prefix client
```

Or both at once from the repo root:

```powershell
npm run dev
```

- **UI:** http://127.0.0.1:5173 (proxies `/api` to the Express server)
- **API:** http://127.0.0.1:5000/health

## Tests

Server tests use in-memory MongoDB (no local Mongo required for `npm test`):

```powershell
npm test
```

## Practice loop

1. Choose Parking Lot, Elevator, or Vending Machine.
2. Start attempt → fill classes, flows, trade-offs.
3. Save draft or **Submit for feedback**.
4. Status moves `evaluating` → `completed` or `failed` (UI polls automatically).
5. Reopen past attempts from the history panel.

## Architecture (monolith)

```
client/                 React UI (Vite)
server/src/
  domain/               Problem catalog
  evaluation/           Deterministic + optional LLM (Strategy-style classes)
  models/               Mongoose Attempt schema
  services/             Attempt lifecycle
  routes/               REST API
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/problems` | List problems |
| POST | `/api/attempts` | Start attempt |
| PUT | `/api/attempts/:id/submission` | Save draft |
| POST | `/api/attempts/:id/submit` | Submit + background evaluation |
| GET | `/api/attempts/:id` | Poll status / feedback |
| GET | `/api/learners/:id/attempts` | History |

## Limitations

- No auth (learner ID string only)
- Structured text submission (no diagram upload yet)
- Evaluation runs in-process via `setImmediate`, not a job queue
- LLM layer optional and depends on API key
