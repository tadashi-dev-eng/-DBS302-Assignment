const mongoose = require('mongoose');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const redisClient = require('../config/redis');

/**
 * Requirement 4.4: Place an order utilizing an ACID Transaction Session boundary
 */
const placeOrder = async (req, res) => {
  const user_id = req.user.id;
  const { items } = req.body; // Array of { product_id, sku, quantity }

  // 1. Initialize a strict Multi-Document ACID Session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalPrice = 0;
    const computedLineItems = [];

    for (const item of items) {
      // 2. Fetch inventory with session isolation locks active
      const inventoryItem = await Inventory.findOne({ product_id: item.product_id }).session(session);
      if (!inventoryItem || inventoryItem.stock_level < item.quantity) {
        throw new Error(`Insufficient stock for product ID: ${item.product_id}`);
      }

      // 3. Fetch exact base pricing from Product Catalog safely inside transaction boundary
      const product = await Product.findById(item.product_id).session(session);
      const targetVariant = product.variants.find(v => v.sku === item.sku) || product.variants[0];
      const cost = targetVariant.price * item.quantity;
      totalPrice += cost;

      // 4. Perform atomic stock level depletion mutation
      inventoryItem.stock_level -= item.quantity;
      await inventoryItem.save({ session });

      computedLineItems.push({
        product_id: item.product_id,
        sku: item.sku,
        quantity: item.quantity,
        price_paid: targetVariant.price
      });
    }

    // 5. Commit historical Order generation payload 
    const order = new Order({
      user_id,
      items: computedLineItems,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      status: 'Placed'
    });
    await order.save({ session });

    // 6. Complete and resolve MongoDB changes simultaneously
    await session.commitTransaction();
    session.endSession();

    // 7. Post-Transaction Optimization: Clear customer's Redis shopping cart and increment Leaderboard sales metrics
    const cartKey = `cart:${user_id}`;
    await redisClient.del(cartKey);
    for (const item of items) {
      await redisClient.zIncrBy('analytics:top_sellers_leaderboard', item.quantity, item.product_id);
    }

    res.status(201).json({ message: 'Order committed securely through ACID transaction boundary.', order });
  } catch (error) {
    // If ANY step above failed, reverse changes instantly to restore original data states
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: `Transaction aborted and rolled back cleanly: ${error.message}` });
  }
};

/**
 * Requirement 4.4: Order history retrieval by user
 * Fetches all persistent historical records belonging to the authenticated client, sorted reverse-chronologically.
 */
const getOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    res.json({ source: 'MongoDB Atlas Historical Ledger', orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unified Module Exports Map
module.exports = { 
  placeOrder, 
  getOrderHistory 
};