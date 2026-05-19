const axios = require("axios");
const logger = require("../config/logger");

async function sendSlackAlert({ repo, score, level, threshold }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await axios.post(webhookUrl, {
      text: `⚠️ *Risk Alert*: \`${repo}\` scored *${score}* (${level}), which is below the threshold of *${threshold}*.`
    });
  } catch (err) {
    logger.error("Failed to send Slack alert", { service: "slack", repo, error: err.message });
  }
}

module.exports = { sendSlackAlert };
