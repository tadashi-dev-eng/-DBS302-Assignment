const Product = require('../models/Product');
const redisClient = require('../config/redis');

/**
 * Requirement 4.2: Get all products with text search, category filtering, sorting, and pagination
 */
const getProducts = async (req, res) => {
  try {
    const { search, category, sort, page = 1, limit = 10 } = req.query;
    let query = {};

    // 1. Full-Text Search on Product Name, Description, and Tags
    if (search) {
      query.$text = { $search: search };
    }

    // 2. Category Filtering
    if (category) {
      query.category_id = category;
    }

    // Build the query execution structure
    let mongooseQuery = Product.find(query);

    // 3. Sorting (e.g., sort=price_asc or sort=price_desc)
    if (sort) {
      if (sort === 'price_asc') mongooseQuery = mongooseQuery.sort({ 'variants.price': 1 });
      if (sort === 'price_desc') mongooseQuery = mongooseQuery.sort({ 'variants.price': -1 });
    }

    // 4. Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    mongooseQuery = mongooseQuery.skip(skip).limit(parseInt(limit));

    const products = await mongooseQuery.exec();
    res.json({ page: parseInt(page), limit: parseInt(limit), count: products.length, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Requirement 4.2 & 4.5: Get a single product using the Cache-Aside Pattern
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:cache:${id}`;

    // 1. Read from Redis Cache
    const cachedProduct = await redisClient.get(cacheKey);
    if (cachedProduct) {
      // Add Real-Time Analytics updates to Redis before returning
      await trackProductMetrics(id, req.headers['x-forwarded-for'] || req.ip);
      return res.json({ source: 'Redis Cache', data: JSON.parse(cachedProduct) });
    }

    // 2. Cache Miss - Query MongoDB
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // 3. Write back to Redis Cache with a 1-Hour TTL + Jitter (Stampede Protection)
    const baseTTL = 3600; 
    const jitter = Math.floor(Math.random() * 300); // Random addition up to 5 minutes
    await redisClient.set(cacheKey, JSON.stringify(product), { EX: baseTTL + jitter });

    // Track analytics for the cache miss too
    await trackProductMetrics(id, req.headers['x-forwarded-for'] || req.ip);

    res.json({ source: 'MongoDB Source of Truth', data: product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Requirement 4.2: Create a new product (Admin Privileges)
 */
const createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) { 
    res.status(400).json({ error: error.message }); 
  }
};

/**
 * Requirement 4.2: Delete a product from the catalog (Admin Privileges)
 */
const deleteProduct = async (req, res) => {
  try {
    const result = await Product.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // Optimization: Clear product from cache if deleted so we don't serve dead items
    await redisClient.del(`product:cache:${req.params.id}`);
    
    res.json({ message: 'Product deleted from catalog successfully' });
  } catch (error) { 
    res.status(400).json({ error: error.message }); 
  }
};

/**
 * Helper to update Redis real-time analytics (Leaderboard & HyperLogLog)
 */
const trackProductMetrics = async (productId, userIp) => {
  try {
    // Increment Trending Score in a Sorted Set (ZSET)
    await redisClient.zIncrBy('analytics:trending_products', 1, productId);

    // Track Unique Visits using HyperLogLog (HLL)
    await redisClient.pfAdd(`views:product:${productId}`, userIp);
  } catch (err) {
    console.error('Analytics tracking failed:', err.message);
  }
};

// Unified Export Object
module.exports = {
  getProducts,
  getProductById,
  createProduct,
  deleteProduct
};