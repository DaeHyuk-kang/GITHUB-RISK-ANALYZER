const nodemailer = require("nodemailer");
const logger = require("../config/logger");

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const transporter = (process.env.SMTP_HOST && process.env.SMTP_USER)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      family: 4
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

async function sendVerificationEmail({ to, token }) {
  if (!transporter) {
    logger.warn("Verification email skipped: SMTP not configured", { service: "email", to });
    return;
  }
  const verifyUrl = `${process.env.ALLOWED_ORIGIN}/api/auth/verify-email?token=${token}`;
  try {
    await transporter.sendMail({
      from: `"GitHub Risk Analyzer" <${process.env.SMTP_USER}>`,
      to,
      subject: "이메일 인증을 완료해주세요",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; background: #0d1117; color: #c9d1d9; border-radius: 12px;">
          <h2 style="color: #58a6ff;">✉️ 이메일 인증</h2>
          <p>GitHub Risk Analyzer에 가입해주셔서 감사합니다.</p>
          <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
          <a href="${verifyUrl}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #238636; color: #fff; border-radius: 6px; text-decoration: none; font-weight: bold;">이메일 인증하기</a>
          <p style="color: #8b949e; font-size: 0.85rem;">버튼이 작동하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요.<br/>${verifyUrl}</p>
        </div>
      `
    });
    logger.info("Verification email sent", { service: "email", to });
  } catch (err) {
    logger.error("Failed to send verification email", { service: "email", to, error: err.message });
  }
}

module.exports = { sendAlertEmail, sendVerificationEmail };
