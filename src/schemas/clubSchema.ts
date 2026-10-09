import { Schema } from "redis-om";

const clubSchema = new Schema("Club", {
  uuid: { type: "string" },
  name: { type: "string" },
  address: { type: "string" },
  description: { type: "text" },
  city: { type: "string" },
  country: { type: "string" },
  currency: { type: "string" },
  admins: { type: "string[]" },
  createdAt: { type: "number", sortable: true },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { clubSchema };
