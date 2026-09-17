const express = require("express");
const cors = require("cors");
const { createRouter } = require("./routes");
const { AttemptNotFoundError } = require("./services/attemptService");

function createApp(service) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api", createRouter(service));
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || 500;
    res.status(status).json({ detail: err.message || "Server error" });
  });
  return app;
}

module.exports = { createApp };
