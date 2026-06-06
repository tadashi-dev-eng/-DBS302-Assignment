const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  tags: [String],
  variants: [{
    sku: String,
    color: String,
    size: String,
    price: Number
  }],
  // Flexible Map to allow different attributes based on category
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed }
});

// Create full-text search index as required by NFRs
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', ProductSchema);