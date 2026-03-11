const express = require("express")
const {
    getRepo,
    getCommits,
    getContributors,
    getIssues,
    getPullRequests
} = require("../githubService")
const { calculateRiskScore } = require("../riskAnalyzer")

const router = express.Router()

router.get("/", async (req, res) => {
    const repo = req.query.repo

    if (!repo) {
        return res.status(400).json({
            error: "repo query required"
        })
    }

    const [owner, name] = repo.split("/")

    try {
        const repoData = await getRepo(owner, name)
        console.log("repo ok")

        const commits = await getCommits(owner, name)
        console.log("commits ok")

        const contributors = await getContributors(owner, name)
        console.log("contributors ok")

        const issues = await getIssues(owner, name)
        console.log("issues ok")

        const pulls = await getPullRequests(owner, name)
        console.log("pulls ok")

        const totalContributors = contributors.length
        const totalContributions = contributors.reduce((sum, c) => {
            return sum + c.contributions
        }, 0)

        const topContributor = contributors[0] || null
        const topContributorRatio =
            totalContributions > 0 && topContributor
                ? topContributor.contributions / totalContributions
                : 0

        const realIssues = issues.filter(issue => !issue.pull_request)
        const openIssues = realIssues.filter(issue => issue.state === "open")
        const closedIssues = realIssues.filter(issue => issue.state === "closed")
        const totalIssues = realIssues.length
        const openIssueRate = totalIssues > 0 ? openIssues.length / totalIssues : 0

        const totalPullRequests = pulls.length
        const openPullRequests = pulls.filter(pr => pr.state === "open")
        const mergedPullRequests = pulls.filter(pr => pr.merged_at !== null)
        const closedPullRequests = pulls.filter(
            pr => pr.state === "closed" && pr.merged_at === null
        )

        const prMergeRate =
            totalPullRequests > 0 ? mergedPullRequests.length / totalPullRequests : 0

        const latestCommitDate = commits[0]?.commit?.author?.date || null
        const topContributorRatioPercent = Number((topContributorRatio * 100).toFixed(2))
        const openIssueRatePercent = Number((openIssueRate * 100).toFixed(2))
        const prMergeRatePercent = Number((prMergeRate * 100).toFixed(2))

        const scoreResult = calculateRiskScore({
            latest_commit_date: latestCommitDate,
            top_contributor_ratio: topContributorRatioPercent,
            open_issue_rate: openIssueRatePercent,
            pr_merge_rate: prMergeRatePercent
        })

        res.json({
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
        })
    } catch (error) {
        console.error("ERROR:", error.response?.data || error.message)

        res.status(500).json({
            error: "failed to fetch repo data",
            detail: error.response?.data || error.message
        })
    }
})

module.exports = router