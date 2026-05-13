const redis = require("../config/redis");
const { parseRepo } = require("../utils/parseRepo");

async function rateLimit(req, res, next) {
  try {
    // 1. IP-based Rate Limiting (e.g., 10 requests per minute)
    const ipKey = `rate:ip:${req.ip}`;
    const ipCount = await redis.incr(ipKey);

    if (ipCount === 1) {
      await redis.expire(ipKey, 60);
    }

    if (ipCount > 10) {
      return res.status(429).json({
        success: false,
        message: "Too many requests from this IP. Please try again in a minute."
      });
    }

    // 2. Repository-based Lock (prevent duplicate analysis of the same repo within 30s)
    const { repo, repos } = req.body;
    const rawRepos = repos || (repo ? [repo] : []);

    // 정규화된 이름으로 락 키 생성 (URL·SSH 형식 등 우회 방지)
    let normalizedRepos;
    try {
      normalizedRepos = rawRepos.map(r => parseRepo(r));
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    for (const r of normalizedRepos) {
      const repoKey = `rate:repo:${r}`;
      // SET NX is atomic: returns "OK" if key was set, null if already existed
      const locked = await redis.set(repoKey, "locked", "EX", 30, "NX");

      if (!locked) {
        return res.status(409).json({
          success: false,
          message: `Repository '${r}' is already being analyzed or was recently analyzed. Please wait 30 seconds.`
        });
      }
    }

    next();
  } catch (err) {
    console.error("Rate limit middleware error:", err);
    return res.status(503).json({ success: false, message: "Service temporarily unavailable" });
  }
}

module.exports = rateLimit;
