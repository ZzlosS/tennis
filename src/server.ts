import { config } from "./config";
import { createApp } from "./app";
import { logger } from "./logger";
import RedisClient from "./services/redisClient";

async function main() {
  await RedisClient.connect(config.REDIS_URL);

  const app = createApp();
  app.listen(config.PORT, () => {
    logger.info(`Server is running on PORT ${config.PORT}`);
  });
}

main().catch((error) => {
  logger.fatal({ err: error }, "could not start");
  process.exit(1);
});
