const redisClient = require('../config/redis');

const addToCart = async (req, res) => {
  try {
    const { product_id, sku, quantity } = req.body;
    // Fall back to a guest identifier if user isn't logged in
    const userId = req.user ? req.user.id : `guest:${req.headers['x-forwarded-for'] || 'session'}`;
    const cartKey = `cart:${userId}`;

    // Store sub-properties using Redis Hashes (HSET field value)
    await redisClient.hSet(cartKey, `${product_id}:${sku}`, quantity.toString());
    
    // Set rolling expiration TTL (Cart expires after 24 hours of inactivity)
    await redisClient.expire(cartKey, 86400);

    res.json({ message: 'Item appended to Redis-driven cart storage successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : `guest:${req.headers['x-forwarded-for'] || 'session'}`;
    const cartKey = `cart:${userId}`;

    const cartItems = await redisClient.hGetAll(cartKey);
    res.json({ source: 'Redis In-Memory State', cart: cartItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { addToCart, getCart };