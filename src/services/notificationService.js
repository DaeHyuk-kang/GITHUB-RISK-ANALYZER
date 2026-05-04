const axios = require("axios");

async function sendSlackAlert({ repo, score, level, threshold }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await axios.post(webhookUrl, {
      text: `⚠️ *Risk Alert*: \`${repo}\` scored *${score}* (${level}), which is below the threshold of *${threshold}*.`
    });
  } catch (err) {
    console.error("Failed to send Slack alert:", err.message);
  }
}

module.exports = { sendSlackAlert };
