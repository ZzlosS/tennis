import express from "express";
import RedisClient from "../services/redisClient";

const healthRouter = express.Router();

// For uptime checks and the container healthcheck: no login, and 503 when Redis cannot be reached.
healthRouter.get("/health", async (_req, res) => {
  try {
    await RedisClient.execute("PING");
    return res.json({ status: "ok" });
  } catch {
    return res.status(503).json({ status: "unavailable" });
  }
});

export default healthRouter;
