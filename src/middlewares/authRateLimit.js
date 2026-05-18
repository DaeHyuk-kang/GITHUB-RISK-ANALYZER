const redis = require("../config/redis");

async function authRateLimit(req, res, next) {
  try {
    const key = `rate:auth:${req.ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);

    if (count > 5) {
      return res.status(429).json({
        success: false,
        message: "Too many authentication attempts. Please try again in a minute."
      });
    }

    next();
  } catch (err) {
    console.error("Auth rate limit error:", err);
    return res.status(503).json({ success: false, message: "Service temporarily unavailable" });
  }
}

module.exports = authRateLimit;
