import BaseEntity from "./baseEntity";

type Club = BaseEntity & {
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  courts: number;
  admins: string[];
};

export { Club };
