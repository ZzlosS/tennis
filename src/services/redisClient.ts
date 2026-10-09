import { createClient } from "redis";
import { config } from "../config";

export type RedisConnection = ReturnType<typeof createClient>;

export default class RedisClient {
  private static connection: Promise<RedisConnection> | undefined;

  private constructor() {}

  // One shared connection. Concurrent first callers wait for the same attempt.
  static connect(url: string = config.REDIS_URL): Promise<RedisConnection> {
    if (!RedisClient.connection) {
      const client = createClient({
        url,
        // Fail fast while Redis is down instead of queueing requests until it returns.
        disableOfflineQueue: true,
      });
      // Without a listener, a lost connection would crash the process.
      client.on("error", (error) => {
        if (process.env.NODE_ENV !== "test") {
          console.error(`Redis error: ${error.message}`);
        }
      });
      RedisClient.connection = client.connect().then(
        () => client,
        (error) => {
          RedisClient.connection = undefined;
          throw error;
        }
      );
    }
    return RedisClient.connection;
  }

  static async disconnect() {
    const connection = RedisClient.connection;
    RedisClient.connection = undefined;
    if (connection) {
      await (await connection).quit();
    }
  }

  // Raw Redis command for what redis-om does not cover (locks, TTL keys).
  static async execute(...command: (string | number)[]): Promise<unknown> {
    const client = await RedisClient.connect();
    return client.sendCommand(command.map(String));
  }
}
