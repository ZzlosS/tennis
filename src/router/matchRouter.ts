import express from "express";
import { authenticateToken, currentUser } from "../middleware/auth";
import MatchController from "../controller/matchController";
import { handle } from "./handle";
import { validate } from "../middleware/validate";
import { createMatchBody, updateMatchBody } from "../validation/matches";

const matchRouter = express.Router();

const controller = (req: express.Request) => new MatchController(currentUser(req));

matchRouter.post(
  "/",
  authenticateToken,
  validate({ body: createMatchBody }),
  handle((req) => controller(req).createMatch(req.body))
);

matchRouter.get(
  "/all",
  authenticateToken,
  handle((req) => controller(req).getAllMatches())
);

matchRouter.get(
  "/player/:entityId",
  authenticateToken,
  handle((req) => controller(req).getPlayersMatches(req.params["entityId"]))
);

matchRouter.get(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).getById(req.params["entityId"]))
);

matchRouter.delete(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).deleteMatch(req.params["entityId"]))
);

matchRouter.patch(
  "/:entityId",
  authenticateToken,
  validate({ body: updateMatchBody }),
  handle((req) => controller(req).updateMatch(req.body, req.params["entityId"]))
);

export default matchRouter;
