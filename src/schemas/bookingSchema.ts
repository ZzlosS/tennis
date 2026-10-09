import { Schema } from "redis-om";

const bookingSchema = new Schema("Booking", {
  uuid: { type: "string" },
  court: { type: "string" },
  startsAt: { type: "date", sortable: true },
  endsAt: { type: "date" },
  totalPriceMinor: { type: "number" },
  currency: { type: "string" },
  player: { type: "string" },
  bookingType: { type: "string" },
  status: { type: "string" },
  seriesId: { type: "string" },
  paidAt: { type: "number" },
  cancelledAt: { type: "number" },
  cancelledBy: { type: "string" },
  createdAt: { type: "number", sortable: true },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { bookingSchema };
