import express from "express";
import { authenticateToken, currentUser } from "../middleware/auth";
import EnemyRequestController from "../controller/enemyRequestController";
import { handle } from "./handle";
import { validate } from "../middleware/validate";
import { acceptRequestBody, createRequestBody, updateRequestBody } from "../validation/requests";

const enemyRequestRouter = express.Router();

const controller = (req: express.Request) => new EnemyRequestController(currentUser(req));

enemyRequestRouter.post(
  "/",
  authenticateToken,
  validate({ body: createRequestBody }),
  handle((req) => controller(req).createRequest(req.body))
);

enemyRequestRouter.get(
  "/",
  authenticateToken,
  handle((req) => controller(req).getActiveRequests())
);

enemyRequestRouter.get(
  "/inactive",
  authenticateToken,
  handle((req) => controller(req).getInactiveRequests())
);

enemyRequestRouter.post(
  "/accept",
  authenticateToken,
  validate({ body: acceptRequestBody }),
  handle((req) => controller(req).acceptRequest(req.body))
);

enemyRequestRouter.get(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).getEnemyRequest(req.params["entityId"]))
);

enemyRequestRouter.patch(
  "/:entityId",
  authenticateToken,
  validate({ body: updateRequestBody }),
  handle((req) => controller(req).updateEnemyRequest(req.body, req.params["entityId"]))
);

enemyRequestRouter.delete(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).deleteEnemyRequest(req.params["entityId"]))
);

export default enemyRequestRouter;
