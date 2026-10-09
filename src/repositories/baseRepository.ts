import { EntityId, Repository, Schema, Search } from "redis-om";
import crypto from "crypto";
import RedisClient from "../services/redisClient";
import BaseEntity from "../entities/baseEntity";
import { NotFoundError } from "../errors/appError";
import { closePage, PageOfEntities, PageQuery, readPageQuery } from "../http/pagination";

// A sortable field of the schema and the direction. Lists default to oldest first.
export interface Sort {
  field: string;
  descending: boolean;
}

export default class BaseRepository<T extends BaseEntity> {
  protected repository!: Repository<T>;
  protected schema: Schema;

  // The schema lists the stored fields only; `entityId` is added on load, so it is not part of it.
  constructor(schema: Schema) {
    this.schema = schema;
  }

  async initializeRepository() {
    this.repository = new Repository(this.schema as unknown as Schema<T>, await RedisClient.connect());
    try {
      await this.repository.createIndex();
    } catch (error) {
      // Two requests that arrive together can both see no index and both create it; the second one is not a problem.
      if (!(error instanceof Error) || !/index already exists/i.test(error.message)) {
        throw error;
      }
    }
  }

  // redis-om keeps a record's id under a symbol. Copy it to a plain property so callers can read `entityId`.
  protected withId(entity: T): T {
    entity.entityId = (entity as { [EntityId]?: string })[EntityId] as string;
    return entity;
  }

  protected withIds(entities: T[]): T[] {
    return entities.map((entity) => this.withId(entity));
  }

  // Saves and returns the record's id. `entityId` is the key, so it is not stored inside the record too.
  async save(entity: T): Promise<string> {
    await this.initializeRepository();
    const { entityId, ...stored } = entity;
    const data = stored as unknown as T;
    const saved = entityId ? await this.repository.save(entityId, data) : await this.repository.save(data);
    return (saved as { [EntityId]?: string })[EntityId] as string;
  }

  // Searches never return soft-deleted records.
  async findFirstByField(value: string, field: string) {
    return (await this.findAllByField(value, field))[0];
  }

  async findAllByField(value: string, field: string) {
    await this.initializeRepository();
    const found = await this.repository
      .search()
      .where(field as never)
      .equal(value)
      .and("deleted" as never)
      .false()
      .return.all();
    return this.withIds(found);
  }

  async findAllByDate(value: Date | string | number, field: string) {
    await this.initializeRepository();
    const found = await this.repository
      .search()
      .where(field as never)
      .on(value)
      .and("deleted" as never)
      .false()
      .return.all();
    return this.withIds(found);
  }

  // One page of a search, oldest first. `filter` adds the where clauses; soft-deleted records are always left out.
  async findPage(
    filter: (search: Search<T>) => Search<T>,
    query: PageQuery,
    sort: Sort = { field: "createdAt", descending: false }
  ): Promise<PageOfEntities<T>> {
    const { limit, offset } = readPageQuery(query);
    await this.initializeRepository();
    const search = filter(this.repository.search())
      .and("deleted" as never)
      .false();
    // One extra row tells whether there is a next page.
    const sorted = sort.descending
      ? search.sortDescending(sort.field as never)
      : search.sortAscending(sort.field as never);
    const rows = await sorted.return.page(offset, limit + 1);
    return closePage(this.withIds(rows), limit, offset);
  }

  // Every match of a search, oldest first, for lists that are filtered further in code before they are paged.
  async findAllMatching(filter: (search: Search<T>) => Search<T>): Promise<T[]> {
    await this.initializeRepository();
    const search = filter(this.repository.search())
      .and("deleted" as never)
      .false();
    return this.withIds(await search.sortAscending("createdAt" as never).return.all());
  }

  async count(filter: (search: Search<T>) => Search<T>): Promise<number> {
    await this.initializeRepository();
    return await filter(this.repository.search())
      .and("deleted" as never)
      .false()
      .count();
  }

  async findByUUID(uuid: string) {
    return this.findFirstByField(uuid, "uuid");
  }

  async createEntity() {
    const e = {} as T;
    e.uuid = crypto.randomUUID();
    e.createdAt = new Date().getTime();
    e.deleted = false;
    return e;
  }

  async findAll() {
    await this.initializeRepository();
    return this.withIds(
      await this.repository
        .search()
        .where("deleted" as never)
        .false()
        .return.all()
    );
  }

  // redis-om returns an empty entity for an unknown id, so this does not tell you whether it exists.
  // Use findByIdOrThrow when the record must exist.
  async findByEntityID(entityID: string) {
    await this.initializeRepository();
    return this.withId(await this.repository.fetch(entityID));
  }

  // Unknown, malformed and soft-deleted ids all become the same 404.
  async findByIdOrThrow(entityID: string, label: string = "Record"): Promise<T> {
    const entity = entityID ? await this.findByEntityID(entityID) : undefined;
    if (!entity || entity.uuid == null || entity.deleted) {
      throw new NotFoundError(`${label} not found`);
    }
    return entity;
  }

  async deleteEntity(entityID: string) {
    const entity = await this.findByIdOrThrow(entityID);

    entity.deleted = true;
    entity.deletedAt = new Date().getTime();

    return await this.save(entity);
  }
}
