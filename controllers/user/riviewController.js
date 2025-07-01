const Product = require("../../models/productSchema");
const Review = require("../../models/reviewSchema");
const User = require("../../models/userSchema");

const postReview = async (req, res) => {
  try {
    const productId = req.params.productId;
    const { rating, comment } = req.body;
    const userId = req.session.user;

    if (!rating || !comment) {
      return res.status(400).json({ error: "Rating and comment are required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Check for existing review
    let review = await Review.findOne({ user: user._id, product: productId });

    if (review) {
      review.rating = rating;
      review.comment = comment;
      await review.save();
    } else {
      review = new Review({
        rating,
        comment,
        userName: user.name,
        product: product._id,
        user: user._id,
      });
      await review.save();
      product.reviews.push(review._id);
    }

    // Recalculate averageRating
    const allReviews = await Review.find({ product: product._id });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    product.numReviews = allReviews.length;
    product.averageRating = parseFloat((totalRating / allReviews.length).toFixed(1));

    await product.save();

    res.status(200).json({ message: "Review submitted successfully", updatedReview: review });
  } catch (error) {
    console.error("Error in postReview:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


module.exports={
    postReview
}