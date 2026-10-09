import express from "express";
import { authenticateToken, currentUser } from "../middleware/auth";
import CourtController from "../controller/courtController";
import { handle } from "./handle";
import { validate } from "../middleware/validate";
import { assignCourtBody, courtPriceQuery, createCourtBody, updateCourtBody } from "../validation/clubs";

const courtRouter = express.Router();

const controller = (req: express.Request) => new CourtController(currentUser(req));

courtRouter.post(
  "/",
  authenticateToken,
  validate({ body: createCourtBody }),
  handle((req) => controller(req).createCourt(req.body))
);

courtRouter.get(
  "/price",
  authenticateToken,
  validate({ query: courtPriceQuery }),
  handle((req) => controller(req).findByPrice(Number(req.query["from"]), Number(req.query["to"])))
);

courtRouter.post(
  "/assign",
  authenticateToken,
  validate({ body: assignCourtBody }),
  handle((req) => controller(req).assignCourtToClub(req.body))
);

courtRouter.get(
  "/all",
  authenticateToken,
  handle((req) => controller(req).getAllCourts())
);

courtRouter.get(
  "/unassigned",
  authenticateToken,
  handle((req) => controller(req).getUnassignedCourts())
);

courtRouter.get(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).getById(req.params["entityId"]))
);

courtRouter.delete(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).deleteCourt(req.params["entityId"]))
);

courtRouter.patch(
  "/:entityId",
  authenticateToken,
  validate({ body: updateCourtBody }),
  handle((req) => controller(req).updateCourt(req.body, req.params["entityId"]))
);

export default courtRouter;
