const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    requitred: true,
  },
  numberOfProducts: {
    type: Number,
    default: 0,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  categoryoffer: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
