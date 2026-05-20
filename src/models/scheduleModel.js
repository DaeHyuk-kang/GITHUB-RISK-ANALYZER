const db = require("../config/database");

class ScheduleModel {
  async upsert(userId, repoName, cronPattern) {
    await db.execute(
      "INSERT INTO scheduled_repos (user_id, repo_name, cron_pattern) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cron_pattern = ?",
      [userId, repoName, cronPattern, cronPattern]
    );
  }

  async delete(userId, repoName) {
    await db.execute("DELETE FROM scheduled_repos WHERE user_id = ? AND repo_name = ?", [userId, repoName]);
  }

  async getAll(userId) {
    const [rows] = await db.execute("SELECT * FROM scheduled_repos WHERE user_id = ? ORDER BY created_at DESC", [userId]);
    return rows;
  }

  async getByRepo(userId, repoName) {
    const [rows] = await db.execute("SELECT * FROM scheduled_repos WHERE user_id = ? AND repo_name = ?", [userId, repoName]);
    return rows[0] || null;
  }

  async getAllForRestore() {
    const [rows] = await db.execute("SELECT * FROM scheduled_repos ORDER BY created_at DESC");
    return rows;
  }
}

module.exports = new ScheduleModel();
