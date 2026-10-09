import { config } from "./config";
import { createApp } from "./app";
import RedisClient from "./services/redisClient";

async function main() {
  await RedisClient.connect(config.REDIS_URL);

  const app = createApp();
  app.listen(config.PORT, () => {
    console.log(`Server is running on PORT ${config.PORT} 🚀 `);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
