const redisClient = require('../config/redis');
const Product = require('../models/Product');

const getDashboardAnalytics = async (req, res) => {
  try {
    // 1. Fetch Top 5 Trending Products using the Sorted Set (ZSET)
    // ZREVRANGE returns members ranked from high score to low score
    const rawTrending = await redisClient.zRangeWithScores('analytics:trending_products', 0, 4, {
      REV: true
    });

    // Hydrate trending products with real names from MongoDB for a readable response
    const trendingProducts = await Promise.all(
      rawTrending.map(async (item) => {
        const product = await Product.findById(item.value).select('name variants');
        // Fetch Unique views count using HyperLogLog (PFCOUNT)
        const uniqueViews = await redisClient.pfCount(`views:product:${item.value}`);

        return {
          product_id: item.value,
          name: product ? product.name : 'Unknown Product',
          basePrice: product ? product.variants[0].price : 0,
          totalInteractions: item.score,
          uniqueAuditedTraffic: uniqueViews
        };
      })
    );

    // 2. Fetch Top Order Sales Conversion Leaderboard
    const rawSellers = await redisClient.zRangeWithScores('analytics:top_sellers_leaderboard', 0, 4, {
      REV: true
    });

    const conversionLeaderboard = await Promise.all(
      rawSellers.map(async (item) => {
        const product = await Product.findById(item.value).select('name');
        return {
          product_id: item.value,
          name: product ? product.name : 'Unknown Product',
          unitsSold: item.score
        };
      })
    );

    // Return aggregated real-time metrics data state
    res.json({
      source: 'Redis Real-Time Telemetry Layer',
      metrics: {
        trendingShowcase: trendingProducts,
        volumeSalesLeaderboard: conversionLeaderboard
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboardAnalytics };