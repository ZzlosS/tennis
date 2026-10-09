// Adds up every confirmed match again and replaces the stored player stats with the result.
// Use it if the counters ever look wrong, or after matches were changed directly in Redis.
//
//   npm run rebuild-stats
import RedisClient from "../services/redisClient";
import StatsService from "../services/statsService";

new StatsService()
  .rebuild()
  .then((count) => console.log(`Rebuilt the stats from ${count} confirmed matches.`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => RedisClient.disconnect());
