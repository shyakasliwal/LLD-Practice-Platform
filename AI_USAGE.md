AI Usage — Meaningful Decisions

This project was built with the help of Cursor and LLMs. I used AI mainly to explore different approaches and then decided whether to accept, modify, or reject those suggestions based on the project requirements and the 2-day MVP scope.

1. Submission Format

The AI suggested starting with a Mermaid diagram upload so that learners could submit their LLD in a more visual format.

I decided to use structured fields such as classes, responsibilities, collaborators, flows, and trade-offs as the main submission format for now.

The main reason was that structured data is easier to evaluate consistently and works well with deterministic checks and future LLM-based evaluation. Diagram support can be added later by converting diagrams into the same SubmissionPayload format.

2. Hybrid Evaluation

The AI initially suggested using an LLM for the complete evaluation and scoring process.

I rejected that approach and implemented a DeterministicEvaluator that always runs. An optional LLMEvaluator can also be used, with both results combined through a CompositeEvaluator.

I made this decision because things like structure, coverage, and basic rubric checks can be evaluated reliably through code. The LLM is more useful for providing explanations and additional feedback. This also means the application can work even when an LLM API key is not available.

3. Expected Entities

The AI suggested comparing the learner's design directly against a reference UML diagram and treating missing or different classes as errors.

I changed this to use expected_entities as soft hints instead.

They are only used to generate suggestions in the deterministic feedback and are not used to decide whether a submission passes or fails.

The reason is that there can be multiple valid ways to design an LLD. A learner should not be marked wrong simply because their class structure is different from one reference solution.

4. Evaluation Orchestration

The AI suggested using Celery and Redis to process submissions through a background queue.

I decided not to use them for the MVP. Instead, evaluation runs in the Express process using setImmediate, while the Attempt model stores the evaluation status.

The states evaluating, failed, and completed allow the frontend to poll for the result.

This keeps the MVP simple while still leaving room to introduce a proper queue and worker architecture if the system needs to scale later.

5. Domain Layering

The AI suggested keeping the initial implementation as a simple prototype with most of the logic inside route handlers.

I decided to use a layered Express architecture instead, with separate domain, evaluation, and service layers along with Mongoose models, REST routes, and the React UI.

I chose this because the project focuses heavily on LLD and domain design. Keeping responsibilities separated makes it easier to add new evaluators, submission formats, and other features later.

6. Tech Stack

I used the MERN stack: MongoDB, Express, React, and Node.js, as a single-repository MVP.

This keeps the implementation aligned with the required stack while allowing the core ideas of LLD practice, hybrid evaluation, and the submission-feedback loop to remain independent of the technology choices.
