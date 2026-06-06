const redisClient = require('../config/redis');

/**
 * Atomic Redis Rate Limiter (Allows a specific number of requests per window)
 * @param {number} limit - Maximum allowed requests
 * @param {number} duration - Window expiry duration in seconds
 */
const rateLimiter = (limit, duration) => {
  return async (req, res, next) => {
    try {
      const ip = req.headers['x-forwarded-for'] || req.ip;
      const rateKey = `ratelimit:${req.baseUrl + req.path}:${ip}`;

      // 1. Atomically increment request counter
      const currentRequests = await redisClient.incr(rateKey);

      // 2. If it's the first request in this cycle, set the expiration window
      if (currentRequests === 1) {
        await redisClient.expire(rateKey, duration);
      }

      // 3. Set standard HTTP security headers for visibility
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentRequests));

      // 4. Block execution if threshold is breached
      if (currentRequests > limit) {
        return res.status(429).json({
          message: 'Too Many Requests',
          error: `Rate limit exceeded. Please try again after a brief cooldown window of ${duration} seconds.`
        });
      }

      next();
    } catch (error) {
      // Fail-open safely so database operations continue if Redis drops frames
      console.error('Rate Limiter encountered an issue:', error.message);
      next();
    }
  };
};

module.exports = rateLimiter;