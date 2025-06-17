const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("userId from session:", userId);
    const userData = await User.findById(userId)
    .lean();

    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found");
      return res.redirect("/pageNotFound");
    }

    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: "products.productId",
        populate: [
          { path: "category", model: "Category" },
          { path: "brand", model: "Brand" },
        ],
      })
      .lean();

    console.log("Wishlisthhhhhhhhhhhh", wishlist);
    if (!wishlist) {
      console.log("Wishlist not found");
      return res.redirect("/pageNotFound");
    }
    console.log("Wishlist data:", wishlist);

    const wishlistItems = wishlist
      ? wishlist.products.sort(
          (a, b) => new Date(b.addedOn) - new Date(a.addedOn)
        )
      : [];

    console.log("Wishlist productssssss", wishlistItems);
    res.render("wishlist", {
      wishlistItems,
      user: userData,
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return res.redirect("/pageNotFound");
  }
};

const addToWishlist = async (req, res, next) => {
  try {
    const proId = req.body.proId;
    const userId = req.session.user;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [{ productId: proId }],
      });
    } else {
      const productExists = wishlist.products.some(
        (p) => p.productId.toString() === proId
      );
      if (productExists) {
        return res
          .status(200)
          .json({
            status: false,
            message: "The product is already in your wishlist",
          });
      }

      wishlist.products.push({ productId: proId });
    }

    await wishlist.save();
    return res
      .status(200)
      .json({ status: true, message: "Product added to your wishlist" });
  } catch (error) {
    next(error);
  }
};
const removeWishlistItem = async (req, res, next) => {
  try {
    const productId = req.params.id;
    console.log("wishid", productId);
    const userId = req.session.user;
    const user = await User.findById(userId);

    const wishlist = await Wishlist.findOne({ userId: userId });
    await wishlist.updateOne({
      $pull: { products: { productId: productId } },
    });
    res.status(200).json({ message: "Product removed from wishlist" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeWishlistItem,
};
