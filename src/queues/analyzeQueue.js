const { Queue } = require("bullmq");
const redisConnection = require("../config/redis");

const analyzeQueue = new Queue("analyze-repo", {
  connection: redisConnection
});

module.exports = analyzeQueue;
