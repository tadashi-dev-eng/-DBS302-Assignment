const Order = require('../models/Order');
const Inventory = require('../models/Inventory');

const getManagementReports = async (req, res) => {
  try {
    // A. Daily and Monthly Sales Reports using MongoDB Aggregation Framework
    const salesReport = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%m", date: "$createdAt" } },
          grossRevenue: { $sum: "$totalPrice" },
          totalOrdersPlaced: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // B. Low-Stock Alert Report (Find items where stock level falls below 10 units)
    const lowStockAlerts = await Inventory.aggregate([
      { $match: { stock_level: { $lt: 20 } } }, // Flags alert thresholds early
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $project: {
          product_id: 1,
          stock_remaining: '$stock_level',
          name: '$productDetails.name'
        }
      }
    ]);

    res.json({
      source: 'MongoDB Atlas Deep Aggregation Framework Engines',
      reports: {
        financialSalesTimeline: salesReport,
        operationalLowStockAlerts: lowStockAlerts
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getManagementReports };