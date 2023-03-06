import { Entity } from "redis-om";
import CreationDeletionInfo from "./interfaces/ICreationDeletionInfo";

export default class BaseEntity extends Entity implements CreationDeletionInfo {
  uuid: string | null = null;
  createdAt: number | null = null;
  deleted: boolean = false;
  deletedAt: number | null = null;
}
