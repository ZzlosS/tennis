// Fields every stored record has. `entityId` is not stored: the repositories copy it from
// redis-om's EntityId symbol when they load a record, so the rest of the code can read a plain property.
type BaseEntity = {
  entityId: string;
  uuid: string | null;
  createdAt: number | null;
  deleted: boolean;
  deletedAt: number | null;
};

export default BaseEntity;
