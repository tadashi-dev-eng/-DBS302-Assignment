const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  stock_level: { type: Number, required: true, default: 0 },
  reserved_stock: { type: Number, default: 0 }
});

module.exports = mongoose.model('Inventory', InventorySchema);