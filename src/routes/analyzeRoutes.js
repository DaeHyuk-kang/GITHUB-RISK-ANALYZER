const express = require("express");
const analysisController = require("../controllers/analysisController");
const rateLimit = require("../middlewares/rateLimit");

const router = express.Router();

// 분석 요청 관련
router.post("/analyze", rateLimit, (req, res) => analysisController.createJob(req, res));
router.post("/analyze/bulk", rateLimit, (req, res) => analysisController.createBulkJobs(req, res));
router.post("/analyze/reanalyze", rateLimit, (req, res) => analysisController.reanalyze(req, res));
router.get("/jobs/:id", (req, res) => analysisController.getJobStatus(req, res));
router.post("/jobs/:id/retry", (req, res) => analysisController.retryJob(req, res));

// 결과 조회 관련
router.get("/analyses/recent", (req, res) => analysisController.getRecent(req, res));
router.get("/analyses/repo/:owner/:repo/history", (req, res) => analysisController.getRepoHistory(req, res));
router.get("/analyses/repo/:owner/:repo", (req, res) => analysisController.getRepoResult(req, res));
router.post("/analyses/compare", (req, res) => analysisController.compare(req, res));
module.exports = router;
