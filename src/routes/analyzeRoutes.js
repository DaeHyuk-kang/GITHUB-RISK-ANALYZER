const express = require("express");
const {
  createAnalyzeJob,
  createBulkAnalyzeJobs,
  getJobStatus,
  retryJob
} = require("../controllers/analyzeController");
const rateLimit = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/analyze", rateLimit, createAnalyzeJob);
router.post("/analyze/bulk", rateLimit, createBulkAnalyzeJobs);
router.get("/jobs/:jobId", getJobStatus);
router.post("/jobs/:jobId/retry", retryJob);

module.exports = router;
