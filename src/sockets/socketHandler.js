function registerSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("join-job", (jobId) => {
      socket.join(`job:${jobId}`);
      console.log(`Socket ${socket.id} joined room job:${jobId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerSocket;
