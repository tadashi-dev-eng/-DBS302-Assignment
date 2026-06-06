const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: String,
    quantity: { type: Number, required: true },
    price_paid: { type: Number, required: true }
  }],
  totalPrice: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'], 
    default: 'Placed' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);