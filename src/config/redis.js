const IORedis = require("ioredis");

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
  console.log("✅ Redis connected");
});

redisConnection.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

module.exports = redisConnection;
module.exports.createRedisClient = createRedisClient;
