const logger = require("../config/logger");

function registerSocket(io) {
  io.on("connection", (socket) => {
    logger.info("Client connected", { socketId: socket.id });

    socket.on("join-job", (jobId) => {
      socket.join(`job:${jobId}`);
    });

    socket.on("join-user", (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected", { socketId: socket.id });
    });
  });
}

module.exports = registerSocket;
