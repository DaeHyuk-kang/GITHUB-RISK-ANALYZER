const analysisModel = require("../models/analysisModel");
const analyzeQueue = require("../queues/analyzeQueue");
const { parseRepo } = require("../utils/parseRepo");

class AnalysisService {
  /**
   * 단일 저장소 분석 요청 (DB 저장 및 큐 추가)
   */
  async requestAnalysis(repoName) {
    repoName = parseRepo(repoName);

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
    if (!Array.isArray(repos) || repos.length === 0 || repos.length > 10) {
      throw new Error("repos must be an array of 1 to 10 items");
    }
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

    const state = await job.getState();
    const { dbId, repo } = job.data;
    const dbRecord = dbId ? await analysisModel.getById(dbId) : null;

    let result = null;
    if (state === "completed" && repo) {
      // previous_detail_scores 포함된 비교 데이터 반환
      const withComparison = await this.getLatestResultByRepo(repo);
      if (withComparison) {
        result = {
          ...(withComparison.result_data || {}),
          risk_score: withComparison.risk_score,
          risk_level: withComparison.risk_level,
          previous_score: withComparison.previous_score,
          previous_risk_level: withComparison.previous_risk_level,
          previous_detail_scores: withComparison.previous_detail_scores,
          score_diff: withComparison.score_diff
        };
      }
    }

    if (!result) {
      result = job.returnvalue || (dbRecord ? dbRecord.result_data : null);
    }

    return {
      success: true,
      jobId,
      status: state.toUpperCase(),
      progress: job.progress,
      result,
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

    if (current.result_data && typeof current.result_data === 'string') {
      current.result_data = JSON.parse(current.result_data);
    }

    let previousResultData = null;
    if (previous?.result_data) {
      previousResultData = typeof previous.result_data === 'string'
        ? JSON.parse(previous.result_data)
        : previous.result_data;
    }

    return {
      ...current,
      previous_score: previous ? previous.risk_score : null,
      previous_risk_level: previous ? previous.risk_level : null,
      previous_detail_scores: previousResultData?.detail_scores || null,
      score_diff: previous ? (current.risk_score - previous.risk_score) : 0
    };
  }

  /**
   * 특정 저장소의 분석 히스토리 조회
   */
  async getRepoHistory(repoName) {
    return await analysisModel.getHistoryByRepo(repoName);
  }

}

module.exports = new AnalysisService();
