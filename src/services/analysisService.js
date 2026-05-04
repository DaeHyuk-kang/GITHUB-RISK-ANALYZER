const analysisModel = require("../models/analysisModel");
const analyzeQueue = require("../queues/analyzeQueue");

class AnalysisService {
  /**
   * 단일 저장소 분석 요청 (DB 저장 및 큐 추가)
   */
  async requestAnalysis(repoName) {
    if (!repoName || !repoName.includes("/")) {
      throw new Error("Invalid repo format (owner/repo)");
    }

    // 1. DB에 기록 (PENDING)
    const dbId = await analysisModel.create({ repoName });

    // 2. BullMQ에 작업 추가
    const job = await analyzeQueue.add("analyze", {
      repo: repoName,
      dbId // DB 식별자를 전달하여 워커가 나중에 업데이트할 수 있게 함
    });

    return { jobId: job.id, dbId, status: "PENDING" };
  }
  async compareRepos(repoA, repoB) {
    const resultA = await analysisModel.getLatestByRepo(repoA);
    const resultB = await analysisModel.getLatestByRepo(repoB);

    if (!resultA || !resultB) {
      throw new Error("One or both repos have no analysis data");
    }

    return {
      repoA: {
        name: repoA,
        score: resultA.risk_score,
        level: resultA.risk_level,
        status: resultA.status,
        createdAt: resultA.created_at,
        resultData: resultA.result_data
      },
      repoB: {
        name: repoB,
        score: resultB.risk_score,
        level: resultB.risk_level,
        status: resultB.status,
        createdAt: resultB.created_at,
        resultData: resultB.result_data
      }
    };
  }
  /**
   * 대량 분석 요청
   */
  async requestBulkAnalysis(repos) {
    const results = await Promise.all(
      repos.map(repo => this.requestAnalysis(repo))
    );
    return results;
  }

  /**
   * 최근 분석 리스트 조회 (최대 10개)
   */
  async getRecentAnalyses() {
    return await analysisModel.getRecent();
  }

  /**
   * 작업 상태 및 결과 조회 (Polling용)
   */
  async getJobStatus(jobId) {
    const job = await analyzeQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const state = await job.getState(); // completed, failed, active, waiting, delayed
    const { dbId, repo } = job.data;

    let result = null;
    if (state === "completed") {
      result = await job.returnvalue;
    }

    // DB에서 최신 정보 확인 (변화량 계산 포함)
    const dbRecord = await analysisModel.getById(dbId);

    return {
      success: true,
      jobId,
      status: state.toUpperCase(),
      progress: job.progress,
      result: result || (dbRecord ? dbRecord.result_data : null),
      dbStatus: dbRecord ? dbRecord.status : null
    };
  }

  /**
   * 실패한 작업 재시도
   */
  async retryJob(jobId) {
    const job = await analyzeQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const state = await job.getState();
    if (state !== "failed") {
      throw new Error("Only failed jobs can be retried");
    }

    await job.retry();
    return { success: true, message: "Job retried successfully", jobId };
  }

  /**
   * 특정 저장소의 가장 최근 분석 결과 조회 (이전 점수와의 차이 포함)
   */
  async getLatestResultByRepo(repoName) {
    const results = await analysisModel.getTwoLatestByRepo(repoName);
    if (!results || results.length === 0) return null;

    const current = results[0];
    const previous = results[1] || null;

    // JSON 필드 파싱
    if (current.result_data && typeof current.result_data === 'string') {
      current.result_data = JSON.parse(current.result_data);
    }

    return {
      ...current,
      previous_score: previous ? previous.risk_score : null,
      score_diff: previous ? (current.risk_score - previous.risk_score) : 0
    };
  }

  /**
   * 재분석 API (기존 데이터를 무시하고 새 작업 생성)
   */
  async reanalyze(repoName) {
    return await this.requestAnalysis(repoName);
  }
}

module.exports = new AnalysisService();
