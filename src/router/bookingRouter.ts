import express from "express";
import { authenticateToken, currentUser } from "../middleware/auth";
import BookingController from "../controller/bookingController";
import { handle } from "./handle";
import { validate } from "../middleware/validate";
import { createBookingBody, updateBookingBody } from "../validation/bookings";

const bookingRouter = express.Router();

const controller = (req: express.Request) => new BookingController(currentUser(req));

bookingRouter.post(
  "/",
  authenticateToken,
  validate({ body: createBookingBody }),
  handle((req) => controller(req).createBooking(req.body))
);

bookingRouter.get(
  "/",
  authenticateToken,
  handle((req) =>
    controller(req).filterBookings(
      req.query["court"] as string,
      parseInt(req.query["from"] as string),
      parseInt(req.query["to"] as string),
      req.query["player"] as string,
      req.query["date"] as string
    )
  )
);

bookingRouter.delete(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).deleteBooking(req.params["entityId"]))
);

bookingRouter.get(
  "/:entityId",
  authenticateToken,
  handle((req) => controller(req).getByEntityId(req.params["entityId"]))
);

bookingRouter.patch(
  "/:entityId",
  authenticateToken,
  validate({ body: updateBookingBody }),
  handle((req) => controller(req).updateBooking(req.body, req.params["entityId"]))
);

export default bookingRouter;
