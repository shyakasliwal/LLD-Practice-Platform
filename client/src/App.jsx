import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";

const emptyClass = () => ({ name: "", responsibilities: "", collaborators: "" });

function parseList(value) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function App() {
  const [learnerId, setLearnerId] = useState("default-learner");
  const [problems, setProblems] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [currentAttempt, setCurrentAttempt] = useState(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [classRows, setClassRows] = useState([emptyClass()]);
  const [keyFlows, setKeyFlows] = useState("");
  const [tradeOffs, setTradeOffs] = useState("");
  const [patternsUsed, setPatternsUsed] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const pollRef = useRef(null);

  const loadProblems = useCallback(async () => {
    setProblems(await api.problems());
  }, []);

  const loadHistory = useCallback(async () => {
    const id = learnerId.trim() || "default-learner";
    setHistory(await api.history(id));
  }, [learnerId]);

  useEffect(() => {
    loadProblems().catch((e) => alert(e.message));
  }, [loadProblems]);

  useEffect(() => {
    loadHistory().catch(console.error);
  }, [loadHistory]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  function readSubmission() {
    return {
      summary: summary.trim(),
      classes: classRows
        .map((row) => ({
          name: row.name.trim(),
          responsibilities: parseList(row.responsibilities),
          collaborators: parseList(row.collaborators),
        }))
        .filter((c) => c.name),
      keyFlows: keyFlows
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      tradeOffs: tradeOffs.trim(),
      patternsUsed: parseList(patternsUsed),
      rawNotes: rawNotes.trim(),
    };
  }

  function fillSubmission(submission) {
    const s = submission || {};
    setSummary(s.summary || "");
    setKeyFlows((s.keyFlows || s.key_flows || []).join("\n"));
    setTradeOffs(s.tradeOffs || s.trade_offs || "");
    setPatternsUsed((s.patternsUsed || s.patterns_used || []).join(", "));
    setRawNotes(s.rawNotes || s.raw_notes || "");
    const rows = (s.classes || []).map((c) => ({
      name: c.name || "",
      responsibilities: (c.responsibilities || []).join(", "),
      collaborators: (c.collaborators || []).join(", "),
    }));
    setClassRows(rows.length ? rows : [emptyClass()]);
  }

  function updateStatus(attempt) {
    if (attempt.status === "evaluating") {
      setStatusMessage("Evaluation in progress…");
    } else if (attempt.status === "failed") {
      setStatusMessage(
        attempt.evaluationError || attempt.evaluation_error || "Evaluation failed. You can edit and resubmit."
      );
    } else if (attempt.status === "completed") {
      setStatusMessage("Feedback ready. Review and try another iteration.");
    } else {
      setStatusMessage("Draft — save anytime before submitting.");
    }
  }

  function maybePoll(attempt) {
    clearInterval(pollRef.current);
    if (attempt.status !== "evaluating") return;

    pollRef.current = setInterval(async () => {
      try {
        const fresh = await api.getAttempt(attempt.id);
        setCurrentAttempt(fresh);
        updateStatus(fresh);
        if (fresh.status === "completed" || fresh.status === "failed") {
          clearInterval(pollRef.current);
          await loadHistory();
        }
      } catch (err) {
        console.error(err);
      }
    }, 1200);
  }

  async function openWorkspace(problem) {
    setCurrentProblem(problem);
    setWorkspaceOpen(true);
  }

  async function startPractice(problemId) {
    const problem = problems.find((p) => p.id === problemId);
    if (!problem) return;
    await openWorkspace(problem);
    const attempt = await api.startAttempt(problemId, learnerId.trim() || "default-learner");
    setCurrentAttempt(attempt);
    fillSubmission({});
    updateStatus(attempt);
    await loadHistory();
  }

  async function openAttempt(attemptId, problemId) {
    const problem = problems.find((p) => p.id === problemId) || (await api.problem(problemId));
    await openWorkspace(problem);
    const attempt = await api.getAttempt(attemptId);
    setCurrentAttempt(attempt);
    fillSubmission(attempt.submission);
    updateStatus(attempt);
    maybePoll(attempt);
  }

  async function saveDraft() {
    if (!currentAttempt) return;
    const attempt = await api.saveSubmission(currentAttempt.id, readSubmission());
    setCurrentAttempt(attempt);
    updateStatus(attempt);
    setStatusMessage("Draft saved.");
    await loadHistory();
  }

  async function submitAttempt() {
    if (!currentAttempt) return;
    await saveDraft();
    const attempt = await api.submit(currentAttempt.id);
    setCurrentAttempt({ ...attempt, feedback: null });
    updateStatus(attempt);
    maybePoll(attempt);
    await loadHistory();
  }

  const feedback = currentAttempt?.feedback;

  return (
    <>
      <header className="topbar">
        <div>
          <h1>LLD Practice Platform</h1>
          <p className="subtitle">MERN — choose → design → submit → feedback → iterate</p>
        </div>
        <label className="learner-id">
          Learner ID
          <input
            type="text"
            value={learnerId}
            onChange={(e) => setLearnerId(e.target.value)}
            onBlur={loadHistory}
          />
        </label>
      </header>

      <main className="layout">
        {!workspaceOpen && (
          <section className="panel">
            <h2>Problems</h2>
            <div className="problem-list">
              {problems.map((p) => (
                <div key={p.id} className="problem-card" onClick={() => startPractice(p.id)}>
                  <strong>{p.title}</strong>
                  <div className="muted">{p.difficulty}</div>
                  <p>{p.description.slice(0, 100)}…</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {workspaceOpen && currentProblem && (
          <section className="panel" style={{ gridColumn: "span 2" }}>
            <div className="workspace-header">
              <div>
                <h2>{currentProblem.title}</h2>
                <p className="muted">
                  {currentProblem.difficulty} · {currentProblem.id}
                </p>
              </div>
              <div className="actions">
                <button type="button" className="secondary" onClick={() => setWorkspaceOpen(false)}>
                  ← All problems
                </button>
                <button type="button" onClick={saveDraft}>
                  Save draft
                </button>
                <button type="button" className="primary" onClick={submitAttempt}>
                  Submit for feedback
                </button>
              </div>
            </div>

            <div className="grid-2">
              <article className="card">
                <h3>Requirements</h3>
                <ul>
                  {currentProblem.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <h3>Hints</h3>
                <ul className="muted">
                  {currentProblem.hints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </article>

              <article className="card">
                <h3>Your design</h3>
                <label>
                  Summary
                  <textarea
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="One paragraph overview of your design"
                  />
                </label>

                <div className="classes-header">
                  <h4>Classes</h4>
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() => setClassRows((rows) => [...rows, emptyClass()])}
                  >
                    + Add class
                  </button>
                </div>
                {classRows.map((row, idx) => (
                  <div className="class-row" key={idx}>
                    <input
                      placeholder="Class name"
                      value={row.name}
                      onChange={(e) => {
                        const next = [...classRows];
                        next[idx] = { ...row, name: e.target.value };
                        setClassRows(next);
                      }}
                    />
                    <input
                      placeholder="Responsibilities (comma-separated)"
                      value={row.responsibilities}
                      onChange={(e) => {
                        const next = [...classRows];
                        next[idx] = { ...row, responsibilities: e.target.value };
                        setClassRows(next);
                      }}
                    />
                    <input
                      placeholder="Collaborators (comma-separated)"
                      value={row.collaborators}
                      onChange={(e) => {
                        const next = [...classRows];
                        next[idx] = { ...row, collaborators: e.target.value };
                        setClassRows(next);
                      }}
                    />
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => setClassRows((rows) => rows.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <label>
                  Key flows (one per line)
                  <textarea rows={4} value={keyFlows} onChange={(e) => setKeyFlows(e.target.value)} />
                </label>
                <label>
                  Trade-offs
                  <textarea rows={3} value={tradeOffs} onChange={(e) => setTradeOffs(e.target.value)} />
                </label>
                <label>
                  Patterns used (comma-separated)
                  <input
                    value={patternsUsed}
                    onChange={(e) => setPatternsUsed(e.target.value)}
                    placeholder="Strategy, Factory, State"
                  />
                </label>
                <label>
                  Extra notes
                  <textarea rows={2} value={rawNotes} onChange={(e) => setRawNotes(e.target.value)} />
                </label>
              </article>
            </div>

            <article className="card">
              <h3>Attempt status</h3>
              <p className={`status-pill ${currentAttempt?.status || ""}`}>
                {currentAttempt?.status || "—"}
              </p>
              <p className="muted">{statusMessage}</p>
            </article>

            {feedback && (
              <article className="card">
                <h3>Feedback</h3>
                <p>{feedback.overallSummary || feedback.overall_summary}</p>
                <div className="feedback-columns">
                  <div>
                    <h4>Strengths</h4>
                    <ul>
                      {(feedback.strengths || []).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Improvements</h4>
                    <ul>
                      {(feedback.improvements || []).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <h4>Rubric scores</h4>
                <div className="rubric-grid">
                  {(feedback.criterionScores || feedback.criterion_scores || []).map((c) => (
                    <div className="rubric-item" key={c.criterionId || c.criterion_id}>
                      <strong>{c.title}</strong>
                      <div>
                        {c.score}/{c.maxScore || c.max_score}
                      </div>
                      <div className="muted">{c.notes}</div>
                    </div>
                  ))}
                </div>
                <h4>Suggested next steps</h4>
                <ul>
                  {(feedback.suggestedNextSteps || feedback.suggested_next_steps || []).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </article>
            )}
          </section>
        )}

        <section className="panel">
          <h2>Your attempts</h2>
          <p className="muted">Improvement over time — reopen or start fresh.</p>
          <div className="history-list">
            {!history.length && <p className="muted">No attempts yet.</p>}
            {history.map((a) => {
              const title = problems.find((p) => p.id === a.problemId)?.title || a.problemId;
              return (
                <div
                  key={a.id}
                  className="history-item"
                  onClick={() => openAttempt(a.id, a.problemId)}
                >
                  <strong>{title}</strong>
                  <div className="muted">{new Date(a.createdAt).toLocaleString()}</div>
                  <div>Status: {a.status}</div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
