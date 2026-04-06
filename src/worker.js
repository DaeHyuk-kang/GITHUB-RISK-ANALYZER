require("dotenv").config();
const { analyzeWorker } = require("./workers/analyzeWorker");

console.log("🚀 Analysis Worker process started and listening for jobs...");

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await analyzeWorker.close();
  process.exit(0);
});
