import { Client, EntityData, Repository, Schema } from "redis-om";
import crypto from "crypto";
import RedisClient from "../services/redisClient";
import BaseEntity from "../entities/baseEntity";
import { NotFoundError } from "../errors/appError";

export default class BaseRepository<T extends BaseEntity> {
  protected repository!: Repository<T>;
  protected schema: Schema<T>;
  private client: Client;

  constructor(schema: Schema<T>) {
    this.client = RedisClient.getInstance();
    this.schema = schema;
  }

  async openConnection() {
    this.client = await RedisClient.connect();
  }

  async createIndex() {
    this.repository.createIndex();
  }

  async initializeRepository() {
    await this.openConnection();
    this.repository = this.client.fetchRepository(this.schema);
    await this.repository.createIndex();
  }

  async save(entity: T): Promise<string> {
    await this.initializeRepository();
    return await this.repository.save(entity);
  }

  // Searches never return soft-deleted records.
  async findFirstByField(value: string, field: string) {
    await this.initializeRepository();
    return (await this.repository.search().where(field).equal(value).and("deleted").false().return.all())[0];
  }

  async findAllByField(value: string, field: string) {
    await this.initializeRepository();
    return await this.repository.search().where(field).equal(value).and("deleted").false().return.all();
  }

  async findAllByDate(value: Date | string | number, field: string) {
    await this.initializeRepository();
    return await this.repository.search().where(field).on(value).and("deleted").false().return.all();
  }

  async findByUUID(uuid: string) {
    await this.initializeRepository();
    return this.findFirstByField(uuid, "uuid");
  }

  async createAndSave(data: EntityData) {
    await this.initializeRepository();
    data.uuid = crypto.randomUUID();
    data.createdAt = new Date().getTime();
    data.deleted = false;
    const u = await this.repository.createAndSave(data);
    return u;
  }

  async createEntity() {
    await this.initializeRepository();
    const e = this.repository.createEntity();
    e.uuid = crypto.randomUUID();
    e.createdAt = new Date().getTime();
    e.deleted = false;
    return e;
  }

  async findAll() {
    await this.initializeRepository();
    return await this.repository.search().where("deleted").false().return.all();
  }

  // redis-om returns an empty entity for an unknown id, so this does not tell you whether it exists.
  // Use findByIdOrThrow when the record must exist.
  async findByEntityID(entityID: string) {
    await this.initializeRepository();
    return await this.repository.fetch(entityID);
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

    return await this.repository.save(entity);
  }
}
