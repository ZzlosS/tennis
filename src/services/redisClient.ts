import { Client } from "redis-om";
import { config } from "../config";

export default class RedisClient {
  private static instance: Client;
  private static connecting: Promise<Client> | undefined;

  private constructor() {}

  static getInstance() {
    if (!RedisClient.instance) {
      RedisClient.instance = new Client();
    }
    return RedisClient.instance;
  }

  // One shared connection. Concurrent first callers wait for the same attempt.
  static connect(url: string = config.REDIS_URL): Promise<Client> {
    if (!RedisClient.connecting) {
      RedisClient.connecting = RedisClient.getInstance()
        .open(url)
        .catch((error) => {
          RedisClient.connecting = undefined;
          throw error;
        });
    }
    return RedisClient.connecting;
  }

  static async disconnect() {
    RedisClient.connecting = undefined;
    await RedisClient.getInstance().close();
  }

  // Raw Redis command for what redis-om does not cover (locks, TTL keys).
  static async execute(...command: (string | number)[]): Promise<unknown> {
    const client = await RedisClient.connect();
    return client.execute(command);
  }
}
