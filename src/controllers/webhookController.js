const crypto = require("crypto");
const analysisService = require("../services/analysisService");

/**
 * Verify GitHub Webhook Signature
 * req.body must be a raw Buffer (captured via express.raw middleware).
 */
function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("❌ GITHUB_WEBHOOK_SECRET is not set. Rejecting webhook request.");
    return false;
  }

  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(req.body).digest("hex");

  try {
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    if (signatureBuffer.length !== digestBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
  } catch (err) {
    return false;
  }
}

async function handleGitHubWebhook(req, res) {
  try {
    // 1. Signature Verification
    if (!verifySignature(req)) {
      console.error("❌ Invalid GitHub Webhook signature");
      return res.status(401).json({
        success: false,
        message: "Invalid signature"
      });
    }

    // 2. Parse raw body after signature is verified
    let payload;
    try {
      payload = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ success: false, message: "Invalid JSON payload" });
    }

    const event = req.headers["x-github-event"];

    if (!payload.repository || !payload.repository.full_name) {
      return res.status(400).json({
        success: false,
        message: "Invalid payload: Repository information missing"
      });
    }

    const repo = payload.repository.full_name;
    const relevantEvents = ["push", "issues", "pull_request"];

    if (relevantEvents.includes(event)) {
      console.log(`🔔 Verified Webhook received: Event '${event}' for repo '${repo}'`);

      // analysisService를 사용하여 DB 기록 및 큐 추가
      await analysisService.requestAnalysis(repo);
    }

    return res.status(200).json({
      success: true,
      message: `Webhook processed successfully: ${event}`
    });
  } catch (error) {
    console.error("handleGitHubWebhook error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process GitHub webhook"
    });
  }
}

module.exports = {
  handleGitHubWebhook
};
