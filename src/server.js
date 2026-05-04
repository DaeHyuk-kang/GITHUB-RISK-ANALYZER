require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const app = require("./app");
const registerSocket = require("./sockets/socketHandler");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "*"
  }
});

// Setup Redis Subscription for Worker updates
const subscriber = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null
});

subscriber.subscribe("job-updates", (err, count) => {
  if (err) {
    console.error("❌ Failed to subscribe to Redis updates:", err);
  } else {
    console.log(`✅ Subscribed to job-updates channel (${count} subscribers)`);
  }
});

subscriber.on("message", (channel, message) => {
  if (channel === "job-updates") {
    try {
      const payload = JSON.parse(message);
      io.to(`job:${payload.jobId}`).emit("job:update", payload);
    } catch (err) {
      console.error("Failed to parse job-updates message:", err.message);
    }
  }
});

registerSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
