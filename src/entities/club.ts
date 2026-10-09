import BaseEntity from "./baseEntity";

interface Club {
  name: string;
  address: string;
  description: string;
  city: string;
  country: string;
  courts: number;
  admins: string[];
}

class Club extends BaseEntity {
  courts: number = 0;
}

export { Club };
