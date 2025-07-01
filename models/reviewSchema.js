const mongoose = require("mongoose");
const reviewSchema = new mongoose.Schema({
        product: { type: mongoose.Schema.Types.ObjectId,
             ref: "Product",
              required: true },

    
    user: { type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true },

    userName:{
        type:String,
    },
  rating: {
    type: Number,
    required: true,
  },

comment: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;