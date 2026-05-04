const db = require("../config/database");

class AnalysisModel {
  /**
   * 새로운 분석 기록 생성
   */
  async create({ repoName, status = "PENDING" }) {
    const [result] = await db.execute(
      "INSERT INTO analyses (repo_name, status) VALUES (?, ?)",
      [repoName, status]
    );
    return result.insertId;
  }

  /**
   * 분석 상태 및 결과 업데이트
   */
  async update(id, { status, score, level, resultData }) {
    await db.execute(
      "UPDATE analyses SET status = ?, risk_score = ?, risk_level = ?, result_data = ? WHERE id = ?",
      [status, score, level, JSON.stringify(resultData), id]
    );
  }

  /**
   * 최근 분석 리스트 조회 (중복 제거, 각 저장소별 최신 결과만)
   */
  async getRecent() {
    const [rows] = await db.execute(
      `SELECT a1.id, a1.repo_name as repo, a1.risk_score, a1.status, a1.created_at 
       FROM analyses a1
       INNER JOIN (
           SELECT repo_name, MAX(created_at) as max_created_at
           FROM analyses
           WHERE status = 'COMPLETED'
           GROUP BY repo_name
       ) a2 ON a1.repo_name = a2.repo_name AND a1.created_at = a2.max_created_at
       ORDER BY a1.created_at DESC 
       LIMIT 10`
    );
    return rows;
  }

  /**
   * 특정 저장소의 가장 최근 분석 결과 조회
   */
  async getLatestByRepo(repoName) {
    const [rows] = await db.execute(
      "SELECT * FROM analyses WHERE repo_name = ? ORDER BY created_at DESC LIMIT 1",
      [repoName]
    );
    return rows[0] || null;
  }

  /**
   * 특정 저장소의 가장 최근 분석 결과 2개 조회 (점수 변화 확인용)
   */
  async getTwoLatestByRepo(repoName) {
    const [rows] = await db.execute(
      "SELECT * FROM analyses WHERE repo_name = ? AND status = 'COMPLETED' ORDER BY created_at DESC LIMIT 2",
      [repoName]
    );
    return rows;
  }

  /**
   * ID로 분석 정보 조회
   */
  async getById(id) {
    const [rows] = await db.execute(
      "SELECT * FROM analyses WHERE id = ?",
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = new AnalysisModel();