const IORedis = require("ioredis");
const logger = require("./logger");

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
};

function createRedisClient() {
  return new IORedis(redisConfig);
}

const redisConnection = createRedisClient();

redisConnection.on("connect", () => {
  logger.info("Redis connected");
});

redisConnection.on("error", (err) => {
  logger.error("Redis error", { error: err.message });
});

module.exports = redisConnection;
module.exports.createRedisClient = createRedisClient;
