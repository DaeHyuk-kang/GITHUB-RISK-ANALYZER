const axios = require("axios")

const headers = {}

if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim() !== "") {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN.trim()}`
}

const githubApi = axios.create({
    baseURL: "https://api.github.com",
    headers
})

async function getRepo(owner, repo) {
    const response = await githubApi.get(`/repos/${owner}/${repo}`)
    return response.data
}

async function getCommits(owner, repo) {
    const response = await githubApi.get(`/repos/${owner}/${repo}/commits?per_page=100`)
    return response.data
}

async function getContributors(owner, repo) {
    const response = await githubApi.get(`/repos/${owner}/${repo}/contributors`)
    return response.data
}

async function getIssues(owner, repo) {
    const response = await githubApi.get(`/repos/${owner}/${repo}/issues?state=all&per_page=100`)
    return response.data
}

async function getPullRequests(owner, repo) {
    const response = await githubApi.get(`/repos/${owner}/${repo}/pulls?state=all&per_page=100`)
    return response.data
}

module.exports = {
    getRepo,
    getCommits,
    getContributors,
    getIssues,
    getPullRequests
}