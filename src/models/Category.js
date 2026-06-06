const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }
});

module.exports = mongoose.model('Category', CategorySchema);