const { Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const {
  getRepo,
  getCommits,
  getContributors,
  getIssues,
  getPullRequests
} = require("../services/githubService");
const { calculateRiskScore } = require("../services/riskAnalyzer");

let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function emitJobUpdate(jobId, payload) {
  if (ioInstance) {
    ioInstance.to(`job:${jobId}`).emit("job:update", {
      jobId,
      ...payload
    });
  }
}

const analyzeWorker = new Worker(
  "analyze-repo",
  async (job) => {
    const { repo } = job.data;
    const [owner, name] = repo.split("/");

    emitJobUpdate(job.id, {
      status: "PROCESSING",
      progress: 10,
      step: "fetching data from GitHub..."
    });

    const [repoData, commits, contributors, issues, pulls] = await Promise.all([
      getRepo(owner, name),
      getCommits(owner, name),
      getContributors(owner, name),
      getIssues(owner, name),
      getPullRequests(owner, name)
    ]);

    emitJobUpdate(job.id, {
      status: "PROCESSING",
      progress: 80,
      step: "data fetched, calculating risk..."
    });

    // Reuse the logic from original routes/analyze.js
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

    emitJobUpdate(job.id, {
      status: "DONE",
      progress: 100,
      step: "analysis completed",
      result
    });

    return result;
  },
  {
    connection: redisConnection
  }
);

analyzeWorker.on("failed", (job, err) => {
  emitJobUpdate(job.id, {
    status: "FAILED",
    progress: 100,
    step: "analysis failed",
    error: err.message
  });
});

module.exports = {
  analyzeWorker,
  setIo
};
