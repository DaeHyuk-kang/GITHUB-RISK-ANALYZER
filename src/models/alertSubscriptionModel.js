const db = require("../config/database");

class AlertSubscriptionModel {
  async upsert(userId, repoName, threshold) {
    await db.execute(
      `INSERT INTO alert_subscriptions (user_id, repo_name, threshold)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE threshold = ?`,
      [userId, repoName, threshold, threshold]
    );
  }

  async delete(userId, repoName) {
    await db.execute(
      "DELETE FROM alert_subscriptions WHERE user_id = ? AND repo_name = ?",
      [userId, repoName]
    );
  }

  async getByUser(userId) {
    const [rows] = await db.execute(
      "SELECT * FROM alert_subscriptions WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    return rows;
  }

  async getForUser(userId, repoName) {
    const [rows] = await db.execute(
      "SELECT * FROM alert_subscriptions WHERE user_id = ? AND repo_name = ?",
      [userId, repoName]
    );
    return rows[0] || null;
  }

  // 분석 완료 후 해당 repo 구독자 전체 조회 (이메일 포함)
  async getSubscribersForRepo(repoName) {
    const [rows] = await db.execute(
      `SELECT sub.threshold, u.email
       FROM alert_subscriptions sub
       JOIN users u ON u.id = sub.user_id
       WHERE sub.repo_name = ?`,
      [repoName]
    );
    return rows;
  }
}

module.exports = new AlertSubscriptionModel();
