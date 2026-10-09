import express from "express";
import { authenticateToken, currentUser } from "../middleware/auth";
import ClubsController from "../controller/clubController";
import { handle } from "./handle";
import { validate } from "../middleware/validate";
import { createClubBody, updateClubBody } from "../validation/clubs";

const clubRouter = express.Router();

const controller = (req: express.Request) => new ClubsController(currentUser(req));

clubRouter.get(
  "/all",
  authenticateToken,
  handle((req) => controller(req).getAllClubs())
);

clubRouter.post(
  "/",
  authenticateToken,
  validate({ body: createClubBody }),
  handle((req) => controller(req).createClub(req.body))
);

clubRouter.get(
  "/city/:city",
  authenticateToken,
  handle((req) => controller(req).getClubsByCity(req.params["city"]))
);

clubRouter.get(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).getById(req.params["entityId"]))
);

clubRouter.delete(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).deleteClub(req.params["entityId"]))
);

clubRouter.patch(
  "/:entityId",
  authenticateToken,
  validate({ body: updateClubBody }),
  handle((req) => controller(req).updateClub(req.body, req.params["entityId"]))
);

export default clubRouter;
