const mongoose = require("mongoose");
const Review = require("./reviewSchema");
const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    productImage: {
      type: [String],
      required: true,
    },
    brand: {
      type: String,
      ref: "Brand",
    },
    category: {
      type: String,
      ref: "Category",
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      required: true,
    },
    discountedPrice: {
      type: Number,
      default: 0,
    },
    productOffer: {
      type: Number,
      default: 0,
    },

    quantity: {
      type: Number,
      default: 0,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },


  reviews: [{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Review"
  }],
    numReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },


  },
  { timestamps: true }
);
const Product = mongoose.model("Product", productSchema);
module.exports = Product;
