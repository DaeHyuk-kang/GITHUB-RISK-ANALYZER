require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const registerSocket = require("./sockets/socketHandler");
const { setIo } = require("./workers/analyzeWorker");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

registerSocket(io);
setIo(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
