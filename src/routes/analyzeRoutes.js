const express = require("express");
const analysisController = require("../controllers/analysisController");
const rateLimit = require("../middlewares/rateLimit");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/analyze", authMiddleware, rateLimit, (req, res) => analysisController.createJob(req, res));
router.post("/analyze/bulk", authMiddleware, rateLimit, (req, res) => analysisController.createBulkJobs(req, res));
router.get("/jobs/:id", authMiddleware, (req, res) => analysisController.getJobStatus(req, res));
router.post("/jobs/:id/retry", authMiddleware, (req, res) => analysisController.retryJob(req, res));

router.get("/analyses/recent", authMiddleware, (req, res) => analysisController.getRecent(req, res));
router.get("/analyses/repo/:owner/:repo/history", authMiddleware, (req, res) => analysisController.getRepoHistory(req, res));
router.get("/analyses/repo/:owner/:repo", authMiddleware, (req, res) => analysisController.getRepoResult(req, res));
router.post("/analyses/compare", authMiddleware, (req, res) => analysisController.compare(req, res));

module.exports = router;
