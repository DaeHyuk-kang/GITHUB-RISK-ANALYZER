const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { calculateRiskScore } = require("../src/services/riskAnalyzer");

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe("calculateRiskScore", () => {
  describe("activity score (30% weight)", () => {
    test("committed within 7 days → activity 100", () => {
      const { activityScore } = calculateRiskScore({
        latest_commit_date: daysAgo(3),
        top_contributor_ratio: 10,
        open_issue_rate: 10,
        pr_merge_rate: 90
      });
      assert.equal(activityScore, 100);
    });

    test("committed 31 days ago → activity 60", () => {
      const { activityScore } = calculateRiskScore({
        latest_commit_date: daysAgo(31),
        top_contributor_ratio: 10,
        open_issue_rate: 10,
        pr_merge_rate: 90
      });
      assert.equal(activityScore, 60);
    });

    test("no commit date → activity 0", () => {
      const { activityScore } = calculateRiskScore({
        latest_commit_date: null,
        top_contributor_ratio: 10,
        open_issue_rate: 10,
        pr_merge_rate: 90
      });
      assert.equal(activityScore, 0);
    });
  });

  describe("contributor score (20% weight)", () => {
    test("top contributor ratio 15% → contributor 100", () => {
      const { contributorScore } = calculateRiskScore({
        latest_commit_date: daysAgo(1),
        top_contributor_ratio: 15,
        open_issue_rate: 10,
        pr_merge_rate: 90
      });
      assert.equal(contributorScore, 100);
    });

    test("top contributor ratio 95% → contributor 20", () => {
      const { contributorScore } = calculateRiskScore({
        latest_commit_date: daysAgo(1),
        top_contributor_ratio: 95,
        open_issue_rate: 10,
        pr_merge_rate: 90
      });
      assert.equal(contributorScore, 20);
    });
  });

  describe("issue score (30% weight)", () => {
    test("open issue rate 10% → issue 100", () => {
      const { issueScore } = calculateRiskScore({
        latest_commit_date: daysAgo(1),
        top_contributor_ratio: 10,
        open_issue_rate: 10,
        pr_merge_rate: 90
      });
      assert.equal(issueScore, 100);
    });

    test("open issue rate 90% → issue 20", () => {
      const { issueScore } = calculateRiskScore({
        latest_commit_date: daysAgo(1),
        top_contributor_ratio: 10,
        open_issue_rate: 90,
        pr_merge_rate: 90
      });
      assert.equal(issueScore, 20);
    });
  });

  describe("PR score (20% weight)", () => {
    test("PR merge rate 85% → pr 100", () => {
      const { prScore } = calculateRiskScore({
        latest_commit_date: daysAgo(1),
        top_contributor_ratio: 10,
        open_issue_rate: 10,
        pr_merge_rate: 85
      });
      assert.equal(prScore, 100);
    });

    test("PR merge rate 10% → pr 20", () => {
      const { prScore } = calculateRiskScore({
        latest_commit_date: daysAgo(1),
        top_contributor_ratio: 10,
        open_issue_rate: 10,
        pr_merge_rate: 10
      });
      assert.equal(prScore, 20);
    });
  });

  describe("totalScore & riskLevel", () => {
    test("healthy repo → Low Risk", () => {
      const result = calculateRiskScore({
        latest_commit_date: daysAgo(3),
        top_contributor_ratio: 10,
        open_issue_rate: 10,
        pr_merge_rate: 90
      });
      // 100*0.3 + 100*0.2 + 100*0.3 + 100*0.2 = 100
      assert.equal(result.totalScore, 100);
      assert.equal(result.riskLevel, "Low Risk");
    });

    test("inactive repo with 1 contributor → Very High Risk", () => {
      const result = calculateRiskScore({
        latest_commit_date: daysAgo(365),
        top_contributor_ratio: 100,
        open_issue_rate: 100,
        pr_merge_rate: 0
      });
      // 20*0.3 + 20*0.2 + 20*0.3 + 20*0.2 = 20
      assert.equal(result.totalScore, 20);
      assert.equal(result.riskLevel, "Very High Risk");
    });

    test("totalScore is rounded to 2 decimal places", () => {
      const result = calculateRiskScore({
        latest_commit_date: daysAgo(3),   // activity 100
        top_contributor_ratio: 50,        // contributor 60
        open_issue_rate: 50,              // issue 60
        pr_merge_rate: 50                 // pr 60
      });
      // 100*0.3 + 60*0.2 + 60*0.3 + 60*0.2 = 30 + 12 + 18 + 12 = 72
      assert.equal(result.totalScore, 72);
      assert.equal(result.riskLevel, "Medium Risk");
    });
  });
});
