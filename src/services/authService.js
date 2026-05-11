const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required");

class AuthService {
  async register(email, password) {
    if (!email || !password) throw new Error("Email and password are required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email format");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");

    const existing = await userModel.findByEmail(email);
    if (existing) throw new Error("Email already registered");

    const userId = await userModel.create(email, password);
    const token = this._sign(userId, email);
    return { token, email };
  }

  async login(email, password) {
    const user = await userModel.findByEmail(email);
    if (!user) throw new Error("Invalid email or password");

    const valid = await userModel.verifyPassword(password, user.password_hash);
    if (!valid) throw new Error("Invalid email or password");

    const token = this._sign(user.id, user.email);
    return { token, email: user.email };
  }

  _sign(userId, email) {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
  }
}

module.exports = new AuthService();
