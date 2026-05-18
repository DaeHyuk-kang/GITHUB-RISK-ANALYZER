const nodemailer = require("nodemailer");
const logger = require("../config/logger");

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const transporter = (process.env.SMTP_HOST && process.env.SMTP_USER)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  : null;

async function sendAlertEmail({ to, repo, score, level, threshold }) {
  if (!transporter) {
    logger.warn("Email alert skipped: SMTP not configured", { service: "email", to });
    return;
  }

  try {
    await transporter.sendMail({
      from: `"GitHub Risk Analyzer" <${process.env.SMTP_USER}>`,
      to,
      subject: `⚠️ Risk Alert: ${esc(repo)} scored ${score}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; background: #0d1117; color: #c9d1d9; border-radius: 12px;">
          <h2 style="color: #58a6ff;">⚠️ Risk Score Alert</h2>
          <p>The repository <strong>${esc(repo)}</strong> has dropped below your alert threshold.</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #30363d;">
              <td style="padding: 10px; color: #8b949e;">Risk Score</td>
              <td style="padding: 10px; font-weight: bold; color: #f85149;">${score}</td>
            </tr>
            <tr style="border-bottom: 1px solid #30363d;">
              <td style="padding: 10px; color: #8b949e;">Risk Level</td>
              <td style="padding: 10px; font-weight: bold;">${esc(level)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #8b949e;">Your Threshold</td>
              <td style="padding: 10px;">${threshold}</td>
            </tr>
          </table>
          <p style="color: #8b949e; font-size: 0.85rem;">You are receiving this because you subscribed to alerts for this repository.</p>
        </div>
      `
    });
    logger.info(`Alert email sent`, { service: "email", to, repo, score, threshold });
  } catch (err) {
    logger.error(`Failed to send alert email`, { service: "email", to, repo, error: err.message });
  }
}

module.exports = { sendAlertEmail };
