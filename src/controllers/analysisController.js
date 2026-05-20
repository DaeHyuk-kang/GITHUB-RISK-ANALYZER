const analysisService = require("../services/analysisService");

class AnalysisController {
  /**
   * 단일 저장소 분석 요청
   * POST /api/analyze
   */
  async createJob(req, res) {
    try {
      const { repo } = req.body;
      const result = await analysisService.requestAnalysis(repo, req.user.userId);
      return res.status(202).json({ success: true, ...result });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async compare(req, res) {
    try {
      const { repoA, repoB } = req.body;

      const result = await analysisService.compareRepos(repoA, repoB);

      return res.json({ success: true, data: result });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * 대량 분석 요청
   * POST /api/analyze/bulk
   */
  async createBulkJobs(req, res) {
    try {
      const { repos } = req.body;
      const jobs = await analysisService.requestBulkAnalysis(repos, req.user.userId);
      return res.status(202).json({ success: true, jobs });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * 최근 분석 리스트 조회 (10개)
   * GET /api/analyses/recent
   */
  async getRecent(req, res) {
    try {
      const list = await analysisService.getRecentAnalyses(req.user.userId);
      return res.json({ success: true, count: list.length, data: list });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 작업 상태 조회 (Polling fallback용)
   * GET /api/jobs/:id
   */
  async getJobStatus(req, res) {
    try {
      const { id } = req.params;
      const status = await analysisService.getJobStatus(id, req.user.userId);
      return res.json(status);
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  }

  /**
   * 작업 재시도
   * POST /api/jobs/:id/retry
   */
  async retryJob(req, res) {
    try {
      const { id } = req.params;
      const result = await analysisService.retryJob(id);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * 특정 저장소의 가장 최근 결과 조회
   * GET /api/analyses/repo/:owner/:repo
   */
  async getRepoResult(req, res) {
    try {
      const { owner, repo } = req.params;
      const repoName = `${owner}/${repo}`;
      const result = await analysisService.getLatestResultByRepo(repoName);

      if (!result) {
        return res.status(404).json({ success: false, message: "No analysis found for this repo" });
      }
      return res.json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * 특정 저장소의 분석 히스토리 조회
   * GET /api/analyses/repo/:owner/:repo/history
   */
  async getRepoHistory(req, res) {
    try {
      const { owner, repo } = req.params;
      const repoName = `${owner}/${repo}`;
      const history = await analysisService.getRepoHistory(repoName);
      return res.json({ success: true, count: history.length, data: history });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

}

module.exports = new AnalysisController();
