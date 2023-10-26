import express from "express";
import PingController from "../controller/ping";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

router.get("/ping", authenticateToken, async (_req, res) => {
  const controller = new PingController();
  const response = await controller.getMessage();
  return res.send(response);
});


export default router;