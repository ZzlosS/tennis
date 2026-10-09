import { Schema } from "redis-om";

const bookingSchema = new Schema("Booking", {
  uuid: { type: "string" },
  court: { type: "string" },
  startsAt: { type: "date" },
  endsAt: { type: "date" },
  totalPriceMinor: { type: "number" },
  currency: { type: "string" },
  player: { type: "string" },
  bookingType: { type: "string" },
  createdAt: { type: "number", sortable: true },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { bookingSchema };
