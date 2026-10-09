import { Schema } from "redis-om";

const courtSchema = new Schema("Court", {
  uuid: { type: "string" },
  name: { type: "string" },
  surface: { type: "string" },
  stands: { type: "boolean" },
  roof: { type: "boolean" },
  double: { type: "boolean" },
  kind: { type: "string" },
  club: { type: "string" },
  ownerId: { type: "string" },
  address: { type: "string" },
  city: { type: "string" },
  country: { type: "string" },
  currency: { type: "string" },
  pricePerHourMinor: { type: "number" },
  active: { type: "boolean" },
  timeZone: { type: "string" },
  openingHours: { type: "string" },
  location: { type: "string" },
  createdAt: { type: "number", sortable: true },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { courtSchema };
