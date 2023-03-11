import { Client, Entity, EntityData, Repository, Schema } from "redis-om";
import crypto from "crypto";
import RedisClient from "../services/redisClient";
import BaseEntity from "../entities/baseEntity";

export default class BaseRepository<T extends BaseEntity> {
  protected repository!: Repository<T>;
  protected schema: Schema<T>;
  private client: Client;

  constructor(schema: Schema<T>) {
    this.client = RedisClient.getInstance();
    this.schema = schema;
  }

  async openConnection() {
    if (!this.client.isOpen()) {
      this.client = await this.client.open("redis://@127.0.0.1:6379");
    }
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

  async findFirstByField(value: string, field: string) {
    await this.initializeRepository();
    return (await this.repository.search().where(field).equal(value).return.all())[0];
  }

  async findAllByField(value: string, field: string) {
    await this.initializeRepository();
    return await this.repository.search().where(field).equal(value).return.all();
  }

  async findAllByDate(value: Date | string | number, field: string) {
    await this.initializeRepository();
    return await this.repository.search().where(field).on(value).return.all();
  }

  async findByUUID(uuid: string) {
    await this.initializeRepository();
    return this.findFirstByField(uuid, "uuid");
  }

  async createAndSave(data: EntityData) {
    await this.initializeRepository();
    data.uuid = crypto.randomUUID();
    data.createdAt = new Date().getTime();
    let u = await this.repository.createAndSave(data);
    return u;
  }

  async createEntity() {
    await this.initializeRepository();
    const e = this.repository.createEntity();
    e.uuid = crypto.randomUUID();
    e.createdAt = new Date().getTime();
    return e;
  }

  async findAll() {
    await this.initializeRepository();
    return await this.repository.search().return.all();
  }

  async findByEntityID(entityID: string) {
    await this.initializeRepository();
    return await this.repository.fetch(entityID);
  }

  async deleteEntity(entityID: string) {
    await this.initializeRepository();
    const entity = await this.repository.fetch(entityID);

    entity.deleted = true;
    entity.deletedAt = new Date().getTime();

    return await this.repository.save(entity);
  }
}
