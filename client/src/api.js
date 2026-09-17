const API = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  problems: () => request("/problems"),
  problem: (id) => request(`/problems/${id}`),
  startAttempt: (problemId, learnerId) =>
    request("/attempts", { method: "POST", body: JSON.stringify({ problemId, learnerId }) }),
  getAttempt: (id) => request(`/attempts/${id}`),
  saveSubmission: (id, submission) =>
    request(`/attempts/${id}/submission`, { method: "PUT", body: JSON.stringify(submission) }),
  submit: (id) => request(`/attempts/${id}/submit`, { method: "POST" }),
  history: (learnerId, problemId) => {
    const q = problemId ? `?problemId=${encodeURIComponent(problemId)}` : "";
    return request(`/learners/${encodeURIComponent(learnerId)}/attempts${q}`);
  },
};
