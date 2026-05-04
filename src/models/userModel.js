const db = require("../config/database");
const bcrypt = require("bcryptjs");

class UserModel {
  async create(email, password) {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [email, hash]
    );
    return result.insertId;
  }

  async findByEmail(email) {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0] || null;
  }

  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
}

module.exports = new UserModel();
