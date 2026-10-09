import BaseEntity from "./baseEntity";

type Club = BaseEntity & {
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  currency: string;
  admins: string[];
};

export { Club };
