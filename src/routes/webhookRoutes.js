const express = require("express");
const { handleGitHubWebhook } = require("../controllers/webhookController");

const router = express.Router();

router.post("/github", handleGitHubWebhook);

module.exports = router;
