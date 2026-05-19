require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const registerSocket = require("./sockets/socketHandler");
const { createRedisClient } = require("./config/redis");
const scheduleService = require("./services/scheduleService");
const logger = require("./config/logger");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "*"
  }
});

// Setup Redis Subscription for Worker updates
const subscriber = createRedisClient();

subscriber.subscribe("job-updates", (err, count) => {
  if (err) {
    logger.error("Failed to subscribe to Redis updates", { error: err.message });
  } else {
    logger.info(`Subscribed to job-updates channel`, { subscribers: count });
  }
});

subscriber.on("message", (channel, message) => {
  if (channel === "job-updates") {
    try {
      const payload = JSON.parse(message);
      io.to(`job:${payload.jobId}`).emit("job:update", payload);
      // 스케줄 분석처럼 특정 룸을 구독한 클라이언트가 없는 경우를 위해
      // 완료/실패 시 전체 브로드캐스트 (Recent Analyses 갱신 트리거용)
      if (payload.status === "DONE" || payload.status === "FAILED") {
        const room = payload.userId ? `user:${payload.userId}` : null;
        const target = room ? io.to(room) : io;
        target.emit("analysis:complete", { jobId: payload.jobId, status: payload.status });
      }
    } catch (err) {
      logger.error("Failed to parse job-updates message", { error: err.message });
    }
  }
});

registerSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  try {
    await scheduleService.restoreSchedules();
  } catch (err) {
    logger.error("Failed to restore schedules on startup", { error: err.message });
  }
});
