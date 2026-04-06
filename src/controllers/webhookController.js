const crypto = require("crypto");
const analyzeQueue = require("../queues/analyzeQueue");

/**
 * Verify GitHub Webhook Signature
 */
function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("⚠️ GITHUB_WEBHOOK_SECRET is not set. Skipping signature verification (NOT RECOMMENDED for production).");
    return true;
  }

  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
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

    const event = req.headers["x-github-event"];
    const payload = req.body;

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
      
      await analyzeQueue.add("analyze", { 
        repo, 
        source: "webhook", 
        event 
      }, {
        removeOnComplete: 100,
        removeOnFail: 100
      });
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
