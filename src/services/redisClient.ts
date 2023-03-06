import { Client } from "redis-om";

export default class RedisClient {
  private static instance: Client;
  
  private constructor() {}

  static getInstance() {
    if (!RedisClient.instance) {
      RedisClient.instance = new Client();
    }
    return RedisClient.instance;
  }
}
