const User=require("../../models/userSchema")
const Product=require("../../models/productSchema")
const Wishlist = require("../../models/wishlistSchema")


const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user; 
    console.log("userId from session:", userId);

    const user = await User.findById(userId); 
    if (!user) {
      console.log("User not found");
      return res.redirect("/pageNotFound"); 
    }
   
    const wishlist = await Wishlist.findOne({ userId: userId })
    .populate('products.productId')
    .lean();
    if (!wishlist) {
      console.log("Wishlist not found");
      return res.redirect("/pageNotFound"); 
    }
    console.log("Wishlist data:", wishlist); 
    

    const wishlistItems = wishlist ?
     wishlist.products.sort((a, b) => new Date(b.addedOn) - new Date(a.addedOn)) 
      : [];
  

 console.log("Wishlist productssssss",wishlistItems);
    res.render("wishlist", {
      wishlistItems,user
    });

  } catch (error) {
    console.error("Error fetching wishlist:", error); 
    return res.redirect("/pageNotFound"); 
  }
};




const addToWishlist = async (req, res) => {
  try {
    const proId = req.body.proId;
    const userId = req.session.user;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // Create new wishlist if not exists
      wishlist = new Wishlist({
        userId,
        products: [{ productId: proId }],
      });
    } else {
      // Check if product is already in wishlist
      const productExists = wishlist.products.some(p => p.productId.toString() === proId);
      if (productExists) {
        return res.status(200).json({ status: false, message: "The product is already in your wishlist" });
      }

      wishlist.products.push({ productId: proId });
    }

    await wishlist.save();
    return res.status(200).json({ status: true, message: "Product added to your wishlist" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Server Error" });
  }
};
const removeWishlistItem=async(req,res)=>{
  try {
    const productId=req.params.id
    console.log("wishid",productId)
    const userId=req.session.user
    const user=await User.findById(userId)

    const wishlist=await Wishlist.findOne({userId:userId})
 await wishlist.updateOne({
      $pull: { products: {productId: productId } }
    });
         res.status(200).json({ message: 'Product removed from wishlist' });

  } catch (error) {
     console.error("Error removing wishlist item:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}


    module.exports={
        getWishlist,
        addToWishlist,removeWishlistItem
    }
