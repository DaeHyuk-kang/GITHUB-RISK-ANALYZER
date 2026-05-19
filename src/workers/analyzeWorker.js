const { Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const { createRedisClient } = require("../config/redis");
const logger = require("../config/logger");
const analysisModel = require("../models/analysisModel");
const {
  getRepo,
  getCommits,
  getContributors,
  getIssues,
  getPullRequests
} = require("../services/githubService");
const { calculateRiskScore } = require("../services/riskAnalyzer");
const { sendSlackAlert } = require("../services/notificationService");
const { sendAlertEmail } = require("../services/emailService");
const alertSubscriptionModel = require("../models/alertSubscriptionModel");

// Redis Publisher 생성 (진행 상황 전송용)
const publisher = createRedisClient();

function emitJobUpdate(jobId, payload) {
  // Redis 채널로 진행 상황 발행 (서버가 받아서 소켓으로 전달함)
  publisher.publish("job-updates", JSON.stringify({
    jobId,
    ...payload
  }));
}

const analyzeWorker = new Worker(
  "analyze-repo",
  async (job) => {
    const { repo, userId } = job.data;
    let { dbId } = job.data;
    const [owner, name] = repo.split("/");

    try {
      // 스케줄 작업은 dbId 없이 실행되므로 여기서 직접 생성
      if (!dbId) {
        dbId = await analysisModel.create({ repoName: repo, userId });
      }
      logger.info(`Analysis started`, { service: "worker", repo, jobId: job.id });

      emitJobUpdate(job.id, {
        status: "PROCESSING",
        progress: 10,
        step: "fetching repository info..."
      });
      await job.updateProgress(10);
      const repoData = await getRepo(owner, name);

      emitJobUpdate(job.id, {
        status: "PROCESSING",
        progress: 25,
        step: "fetching recent commits..."
      });
      await job.updateProgress(25);
      const commits = await getCommits(owner, name);

      emitJobUpdate(job.id, {
        status: "PROCESSING",
        progress: 45,
        step: "fetching contributors..."
      });
      await job.updateProgress(45);
      const contributors = await getContributors(owner, name);

      emitJobUpdate(job.id, {
        status: "PROCESSING",
        progress: 65,
        step: "fetching issues..."
      });
      await job.updateProgress(65);
      const issues = await getIssues(owner, name);

      emitJobUpdate(job.id, {
        status: "PROCESSING",
        progress: 85,
        step: "fetching pull requests..."
      });
      await job.updateProgress(85);
      const pulls = await getPullRequests(owner, name);

      emitJobUpdate(job.id, {
        status: "PROCESSING",
        progress: 95,
        step: "calculating risk scores..."
      });
      await job.updateProgress(95);

      // 데이터 가공 및 점수 계산 로직
      const totalContributors = contributors.length;
      const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);

      const topContributor = contributors[0] || null;
      const topContributorRatio =
        totalContributions > 0 && topContributor
          ? topContributor.contributions / totalContributions
          : 0;

      const realIssues = issues.filter(issue => !issue.pull_request);
      const openIssues = realIssues.filter(issue => issue.state === "open");
      const closedIssues = realIssues.filter(issue => issue.state === "closed");
      const totalIssues = realIssues.length;
      const openIssueRate = totalIssues > 0 ? openIssues.length / totalIssues : 0;

      const totalPullRequests = pulls.length;
      const openPullRequests = pulls.filter(pr => pr.state === "open");
      const mergedPullRequests = pulls.filter(pr => pr.merged_at !== null);
      const closedPullRequests = pulls.filter(
        pr => pr.state === "closed" && pr.merged_at === null
      );

      const prMergeRate = totalPullRequests > 0 ? mergedPullRequests.length / totalPullRequests : 0;

      const latestCommitDate = commits[0]?.commit?.author?.date || null;
      const topContributorRatioPercent = Number((topContributorRatio * 100).toFixed(2));
      const openIssueRatePercent = Number((openIssueRate * 100).toFixed(2));
      const prMergeRatePercent = Number((prMergeRate * 100).toFixed(2));

      const scoreResult = calculateRiskScore({
        latest_commit_date: latestCommitDate,
        top_contributor_ratio: topContributorRatioPercent,
        open_issue_rate: openIssueRatePercent,
        pr_merge_rate: prMergeRatePercent
      });

      const result = {
        name: repoData.name,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        last_update: repoData.updated_at,

        recent_commit_count: commits.length,
        latest_commit_date: latestCommitDate,

        contributor_count: totalContributors,
        top_contributor: topContributor?.login || null,
        top_contributor_ratio: topContributorRatioPercent,

        total_issues: totalIssues,
        open_issues: openIssues.length,
        closed_issues: closedIssues.length,
        open_issue_rate: openIssueRatePercent,

        total_pull_requests: totalPullRequests,
        open_pull_requests: openPullRequests.length,
        merged_pull_requests: mergedPullRequests.length,
        closed_unmerged_pull_requests: closedPullRequests.length,
        pr_merge_rate: prMergeRatePercent,

        risk_score: scoreResult.totalScore,
        risk_level: scoreResult.riskLevel,
        detail_scores: {
          activity: scoreResult.activityScore,
          contributor: scoreResult.contributorScore,
          issue: scoreResult.issueScore,
          pr: scoreResult.prScore
        }
      };

      // DB 업데이트
      await analysisModel.update(dbId, {
        status: "COMPLETED",
        score: result.risk_score,
        level: result.risk_level,
        resultData: result
      });

      // Slack 글로벌 알림
      const slackThreshold = Number(process.env.ALERT_SCORE_THRESHOLD) || 60;
      if (result.risk_score < slackThreshold) {
        await sendSlackAlert({ repo, score: result.risk_score, level: result.risk_level, threshold: slackThreshold });
      }

      // 구독자별 이메일 알림 (병렬 전송)
      const subscribers = await alertSubscriptionModel.getSubscribersForRepo(repo);
      await Promise.all(
        subscribers
          .filter(sub => result.risk_score < sub.threshold)
          .map(sub => sendAlertEmail({
            to: sub.email,
            repo,
            score: result.risk_score,
            level: result.risk_level,
            threshold: sub.threshold
          }))
      );

      // 이전 점수 조회 (변화량 계산)
      const results = await analysisModel.getTwoLatestByRepo(repo);
      const previous = results[1] || null;
      const scoreDiff = previous ? (result.risk_score - previous.risk_score) : 0;

      let previousResultData = null;
      if (previous?.result_data) {
        previousResultData = typeof previous.result_data === 'string'
          ? JSON.parse(previous.result_data)
          : previous.result_data;
      }

      emitJobUpdate(job.id, {
        status: "DONE",
        progress: 100,
        step: "analysis completed",
        userId,
        result: {
          ...result,
          previous_score: previous ? previous.risk_score : null,
          previous_risk_level: previous ? previous.risk_level : null,
          previous_detail_scores: previousResultData?.detail_scores || null,
          score_diff: scoreDiff
        }
      });
      logger.info(`Analysis completed`, { service: "worker", repo, jobId: job.id, score: result.risk_score, level: result.risk_level });
      await job.updateProgress(100);
      publisher.del(`rate:repo:${repo}`).catch(() => {});

      return result;
    } catch (error) {
      logger.error(`Analysis failed`, { service: "worker", repo, jobId: job.id, error: error.message });

      // analysisModel.create 자체가 실패한 경우 dbId가 없을 수 있음
      if (dbId) {
        await analysisModel.update(dbId, {
          status: "FAILED",
          score: 0,
          level: "UNKNOWN",
          resultData: { error: error.message }
        });
      }
      
      emitJobUpdate(job.id, {
        status: "FAILED",
        progress: 100,
        step: "analysis failed",
        userId,
        error: error.message
      });
      publisher.del(`rate:repo:${repo}`).catch(() => {});

      throw error;
    }
  },
  {
    connection: redisConnection
  }
);

module.exports = {
  analyzeWorker
};
