const axios = require("axios");

const headers = {};

if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim() !== "") {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
}

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers
});

function isRateLimitError(err) {
  const status = err.response?.status;
  if (status === 429) return true;
  // GitHub secondary rate limit: 403 with X-RateLimit-Remaining: 0
  if (status === 403 && err.response?.headers?.["x-ratelimit-remaining"] === "0") return true;
  return false;
}

async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = isRateLimitError(err) || (err.response?.status >= 500);
      if (!retryable || attempt === maxRetries) break;

      const retryAfter = parseInt(err.response?.headers?.["retry-after"] || "0", 10);
      const delay = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt) * 1000;
      console.warn(`GitHub API error (${err.response?.status}), retrying in ${delay}ms... (${attempt}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

async function getRepo(owner, repo) {
  return withRetry(() => githubApi.get(`/repos/${owner}/${repo}`).then(r => r.data));
}

async function getCommits(owner, repo) {
  return withRetry(() => githubApi.get(`/repos/${owner}/${repo}/commits?per_page=100`).then(r => r.data));
}

async function getContributors(owner, repo) {
  return withRetry(() => githubApi.get(`/repos/${owner}/${repo}/contributors`).then(r => r.data));
}

async function getIssues(owner, repo) {
  return withRetry(() => githubApi.get(`/repos/${owner}/${repo}/issues?state=all&per_page=100`).then(r => r.data));
}

async function getPullRequests(owner, repo) {
  return withRetry(() => githubApi.get(`/repos/${owner}/${repo}/pulls?state=all&per_page=100`).then(r => r.data));
}

module.exports = {
  getRepo,
  getCommits,
  getContributors,
  getIssues,
  getPullRequests
};
