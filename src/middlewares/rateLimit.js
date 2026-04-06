const redis = require("../config/redis");

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
    const targetRepos = repos || (repo ? [repo] : []);

    for (const r of targetRepos) {
      const repoKey = `rate:repo:${r}`;
      const isLocked = await redis.get(repoKey);

      if (isLocked) {
        return res.status(409).json({
          success: false,
          message: `Repository '${r}' is already being analyzed or was recently analyzed. Please wait 30 seconds.`
        });
      }
      // Set a lock for 30 seconds
      await redis.set(repoKey, "locked", "EX", 30);
    }

    next();
  } catch (err) {
    console.error("Rate limit middleware error:", err);
    next(); // Continue even if Redis fails (fail-open)
  }
}

module.exports = rateLimit;
