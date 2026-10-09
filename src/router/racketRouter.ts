import express from "express";
import { authenticateToken, currentUser } from "../middleware/auth";
import RacketController from "../controller/racketController";
import { handle } from "./handle";
import { validate } from "../middleware/validate";
import { assignRacketBody, createRacketBody, updateRacketBody } from "../validation/rackets";

const racketRouter = express.Router();

const controller = (req: express.Request) => new RacketController(currentUser(req));

racketRouter.delete(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).deleteRacket(req.params["entityId"]))
);

racketRouter.get(
  "/",
  authenticateToken,
  handle((req) => controller(req).getRackets())
);

racketRouter.get(
  "/all",
  authenticateToken,
  handle((req) => controller(req).getAllRackets())
);

racketRouter.post(
  "/",
  authenticateToken,
  validate({ body: createRacketBody }),
  handle((req) => controller(req).createRacket(req.body))
);

racketRouter.post(
  "/assign",
  authenticateToken,
  validate({ body: assignRacketBody }),
  handle((req) => controller(req).assignRacketToPlayer(req.body))
);

racketRouter.patch(
  "/:entityId",
  authenticateToken,
  validate({ body: updateRacketBody }),
  handle((req) => controller(req).updateRacket(req.body, req.params["entityId"]))
);

racketRouter.get(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).getRacket(req.params["entityId"]))
);

export default racketRouter;
