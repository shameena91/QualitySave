const User=require("../../models/userSchema")
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")

var mongoose = require('mongoose');
const Brand = require("../../models/brandSchema");



const productInfo = async (req, res) => {
  try {
    const userId = req.session.user;
    const {id} = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
    console.log("setailidddddddddddd",id)

    const userData = await User.findById(userId).lean();
    const productData = await Product.findById(id)
      .populate("category")
      .populate("brand")
      .lean();

    if (!productData) {
      return res.redirect("/pageNotFound");
    }

    const findCategory = productData.category;
    const findBrand=productData.brand
    const brand=await Brand.findById(findBrand).lean()
    console.log("new brand is",brand)
    const productOffer = productData.productOffer;
    console.log("details",productData)

    const relatedProducts = await Product.find({
      isBlocked: false,
      category: productData.category._id, 
      _id: { $ne: productData._id } 
    }).limit(9).lean();

console.log("relateddddddddd",relatedProducts.length)
    res.render("productDetail", {
      relatedProducts:relatedProducts,
      user: userData,
      product: productData,
      category: findCategory,
      productOffer: productOffer,
      stock: productData.quantity,
      brand:brand
    });
  } catch (error) {
    console.error("Error while loading product details:", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = { productInfo, };
