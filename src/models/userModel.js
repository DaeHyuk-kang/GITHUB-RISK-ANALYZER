const db = require("../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

class UserModel {
  async create(email, password) {
    const hash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const [result] = await db.execute(
      "INSERT INTO users (email, password_hash, verification_token) VALUES (?, ?, ?)",
      [email, hash, verificationToken]
    );
    return { userId: result.insertId, verificationToken };
  }

  async findByEmail(email) {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0] || null;
  }

  async updatePassword(userId, password) {
    const hash = await bcrypt.hash(password, 10);
    await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId]);
  }

  async findByVerificationToken(token) {
    const [rows] = await db.execute("SELECT * FROM users WHERE verification_token = ?", [token]);
    return rows[0] || null;
  }

  async verifyEmail(userId) {
    await db.execute(
      "UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?",
      [userId]
    );
  }

  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
}

module.exports = new UserModel();
