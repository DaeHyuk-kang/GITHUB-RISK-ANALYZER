require("dotenv").config();
const { analyzeWorker } = require("./workers/analyzeWorker");
const logger = require("./config/logger");

logger.info("Analysis Worker process started and listening for jobs", { service: "worker" });

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await analyzeWorker.close();
  process.exit(0);
});
