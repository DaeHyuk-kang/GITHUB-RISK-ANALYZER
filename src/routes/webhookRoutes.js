const express = require("express");
const { handleGitHubWebhook } = require("../controllers/webhookController");

const router = express.Router();

// express.raw() captures the body as a Buffer before any JSON parsing,
// which is required to correctly verify GitHub's HMAC-SHA256 signature.
router.post("/github", express.raw({ type: "application/json" }), handleGitHubWebhook);

module.exports = router;
