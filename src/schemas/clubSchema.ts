import { Schema } from "redis-om";

const clubSchema = new Schema("Club", {
  uuid: { type: "string" },
  name: { type: "string" },
  address: { type: "string" },
  description: { type: "text" },
  city: { type: "string" },
  country: { type: "string" },
  courts: { type: "number" },
  admins: { type: "string[]" },
  createdAt: { type: "number" },
  deleted: { type: "boolean" },
  deletedAt: { type: "number" },
});

export { clubSchema };
