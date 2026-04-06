function getRiskLevel(score) {
    if (score >= 80) return "Low Risk"
    if (score >= 60) return "Medium Risk"
    if (score >= 40) return "High Risk"
    return "Very High Risk"
}

function calculateActivityScore(latestCommitDate) {
    if (!latestCommitDate) return 0

    const now = new Date()
    const commitDate = new Date(latestCommitDate)
    const diffTime = now - commitDate
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    if (diffDays <= 7) return 100
    if (diffDays <= 30) return 80
    if (diffDays <= 90) return 60
    if (diffDays <= 180) return 40
    return 20
}

function calculateContributorScore(topContributorRatio) {
    if (topContributorRatio <= 20) return 100
    if (topContributorRatio <= 40) return 80
    if (topContributorRatio <= 60) return 60
    if (topContributorRatio <= 80) return 40
    return 20
}

function calculateIssueScore(openIssueRate) {
    if (openIssueRate <= 20) return 100
    if (openIssueRate <= 40) return 80
    if (openIssueRate <= 60) return 60
    if (openIssueRate <= 80) return 40
    return 20
}

function calculatePrScore(prMergeRate) {
    if (prMergeRate >= 80) return 100
    if (prMergeRate >= 60) return 80
    if (prMergeRate >= 40) return 60
    if (prMergeRate >= 20) return 40
    return 20
}

function calculateRiskScore(data) {
    const activityScore = calculateActivityScore(data.latest_commit_date)
    const contributorScore = calculateContributorScore(data.top_contributor_ratio)
    const issueScore = calculateIssueScore(data.open_issue_rate)
    const prScore = calculatePrScore(data.pr_merge_rate)

    const totalScore =
        activityScore * 0.3 +
        contributorScore * 0.2 +
        issueScore * 0.3 +
        prScore * 0.2

    const roundedScore = Number(totalScore.toFixed(2))

    return {
        activityScore,
        contributorScore,
        issueScore,
        prScore,
        totalScore: roundedScore,
        riskLevel: getRiskLevel(roundedScore)
    }
}

module.exports = {
    calculateRiskScore
}