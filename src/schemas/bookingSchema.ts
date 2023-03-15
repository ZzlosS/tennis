import { Schema } from "redis-om";
import { Booking } from "../entities/booking";

let bookingSchema = new Schema(Booking, {
  uuid: { type: "string" },
  court: { type: "string" },
  from: { type: "number" },
  to: { type: "number" },
  totalPrice: { type: "number" },
  player: { type: "string" },
  date: {type: "date"},
  bookingType: { type: "string" },
  createdAt: { type: "number" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { bookingSchema };
