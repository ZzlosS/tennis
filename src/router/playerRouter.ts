import express from "express";
import PlayerController from "../controller/playerController";
import PlayerLevel from "../enums/playerLevel";
import { authenticateToken, currentUser } from "../middleware/auth";
import { handle } from "./handle";
import { validate } from "../middleware/validate";
import { updatePlayerBody } from "../validation/auth";

const playerRouter = express.Router();

const controller = (req: express.Request) => new PlayerController(currentUser(req));

playerRouter.get(
  "/level/:level",
  authenticateToken,
  handle((req) => controller(req).getPlayersByLevel(req.params["level"] as PlayerLevel))
);

playerRouter.get(
  "/city/:city",
  authenticateToken,
  handle((req) => controller(req).getPlayersByCity(req.params["city"]))
);

playerRouter.delete(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).deletePlayer(req.params["entityId"]))
);

playerRouter.patch(
  "/:entityId",
  authenticateToken,
  validate({ body: updatePlayerBody }),
  handle((req) => controller(req).updatePlayer(req.body, req.params["entityId"]))
);

playerRouter.get(
  "/",
  authenticateToken,
  handle((req) => controller(req).getAll())
);

playerRouter.get(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).getByEntityId(req.params["entityId"]))
);

export default playerRouter;
