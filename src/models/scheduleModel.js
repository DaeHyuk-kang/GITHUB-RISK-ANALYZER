const db = require("../config/database");

class ScheduleModel {
  async upsert(repoName, cronPattern) {
    await db.execute(
      "INSERT INTO scheduled_repos (repo_name, cron_pattern) VALUES (?, ?) ON DUPLICATE KEY UPDATE cron_pattern = ?",
      [repoName, cronPattern, cronPattern]
    );
  }

  async delete(repoName) {
    await db.execute("DELETE FROM scheduled_repos WHERE repo_name = ?", [repoName]);
  }

  async getAll() {
    const [rows] = await db.execute("SELECT * FROM scheduled_repos ORDER BY created_at DESC");
    return rows;
  }

  async getByRepo(repoName) {
    const [rows] = await db.execute("SELECT * FROM scheduled_repos WHERE repo_name = ?", [repoName]);
    return rows[0] || null;
  }
}

module.exports = new ScheduleModel();
