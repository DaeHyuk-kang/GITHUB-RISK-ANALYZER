const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const { sendVerificationEmail } = require("./emailService");

class AuthService {
  async register(email, password) {
    if (!email || !password) throw new Error("Email and password are required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email format");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

    const existing = await userModel.findByEmail(email);
    if (existing && existing.email_verified) throw new Error("Email already registered");

    // 미인증 계정이면 비밀번호 업데이트 후 인증 이메일 재발송
    if (existing && !existing.email_verified) {
      await userModel.updatePassword(existing.id, password);
      await sendVerificationEmail({ to: email, token: existing.verification_token });
      return { message: "인증 이메일을 재발송했습니다. 이메일을 확인해주세요." };
    }

    const { verificationToken } = await userModel.create(email, password);
    await sendVerificationEmail({ to: email, token: verificationToken });
    return { message: "Registration successful. Please check your email to verify your account." };
  }

  async verifyEmail(token) {
    if (!token) throw new Error("Verification token is required");
    const user = await userModel.findByVerificationToken(token);
    if (!user) throw new Error("Invalid or expired verification token");
    await userModel.verifyEmail(user.id);
    return { message: "이메일 인증이 완료됐습니다." };
  }

  async checkVerified(email) {
    const user = await userModel.findByEmail(email);
    if (!user || !user.email_verified) return { verified: false };
    return { verified: true };
  }

  async login(email, password) {
    const user = await userModel.findByEmail(email);
    if (!user) throw new Error("Invalid email or password");

    if (!user.email_verified) throw new Error("Please verify your email before logging in");

    const valid = await userModel.verifyPassword(password, user.password_hash);
    if (!valid) throw new Error("Invalid email or password");

    const token = this._sign(user.id, user.email);
    return { token, email: user.email };
  }

  _sign(userId, email) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable is required");
    return jwt.sign({ userId, email }, secret, { expiresIn: "7d" });
  }
}

module.exports = new AuthService();
