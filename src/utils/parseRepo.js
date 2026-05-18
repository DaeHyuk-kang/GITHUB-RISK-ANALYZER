// Accepts "owner/repo" or any GitHub URL and returns "owner/repo".
// Throws if the input cannot be resolved to a valid repo identifier.
function parseRepo(input) {
  if (!input || typeof input !== "string") {
    throw new Error("repo is required");
  }

  const trimmed = input.trim().replace(/\.git$/, "");

  // GitHub URL: https://github.com/owner/repo or git@github.com:owner/repo
  const urlMatch = trimmed.match(/github\.com[/:]([\w.-]+\/[\w.-]+)/);
  if (urlMatch) return urlMatch[1];

  // Already "owner/repo"
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed;

  throw new Error(`Cannot parse repo from: "${input}". Use "owner/repo" or a GitHub URL.`);
}

module.exports = { parseRepo };
