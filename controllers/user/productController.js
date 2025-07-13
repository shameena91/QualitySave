const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

var mongoose = require("mongoose");
const Brand = require("../../models/brandSchema");
const Order = require("../../models/orderSchema");
const Review = require("../../models/reviewSchema");

const productInfo = async (req, res) => {
  try {
    const userId = req.session.user;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const userData = await User.findById(userId).lean();
    const productData = await Product.findById(id)
      .populate("category")
      .populate("brand")
      .lean();

    if (!productData) {
      return res.redirect("/pageNotFound");
    }
const hasPurchased = await Order.findOne({
  userId: userId,
  orderItems: {
    $elemMatch: {
      product: id,
      status: { $in: ["Delivered", "Returned"] }
    }
  }
});


    const findCategory = productData.category;
    const findBrand = productData.brand;
    const brand = await Brand.findById(findBrand).lean();
    const relatedProducts = await Product.find({
      isBlocked: false,
      category: productData.category._id,
      _id: { $ne: productData._id },
    })
      .populate("category")
      .populate("brand")
      .limit(9)
      .lean();
    const productOffer = productData.productOffer;

const reviews=await Review.find({product:id}).sort({createdAt:-1}).lean()
const existingReview = await Review.findOne({ user: req.session.user, product: id});


    
    res.render("productDetail", {
      relatedProducts: relatedProducts,
      user: userData,
      product: productData,
      category: findCategory,
      productOffer: productOffer,
hasPurchased,
      stock: productData.quantity,
      brand: brand,
      reviews,
      existingReview

    });
  } catch (error) {
    console.error("Error while loading product details:", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = { productInfo };
