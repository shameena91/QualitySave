const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");

const getCart = async (req, res) => {
  try {
 const userId = req.session.user; 
    console.log("userId from session:", userId);

    const user = await User.findById(userId); 
    if (!user) {
      console.log("User not found");
      return res.redirect("/pageNotFound"); 
    }
   const cart=await Cart.findOne({userId:userId})
   .populate('cartItems.productId')
   .lean()
   if (!cart) {
      console.log("cart not found");
      return res.redirect("/pageNotFound"); 
    }
   console.log("Wishlist data:", cart); 
  const cartProducts=cart? cart.cartItems :[];
    res.render("cart",{cartProducts});
  }catch (error) {
  console.error("Get Cart Error:", error);
  return res.status(500).render("errorPage", { message: "Internal Server Error" });
}
};

const addToCart = async (req, res) => {
  try {
    const productId = req.body.proId;
    const userId = req.session.user;

    if (!productId || !userId) {
      return res.status(400).json({ status: false, message: "Missing product or user ID" });
    }
      const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }
     const quantity = 1;
        const price = product.discountedPrice;
        const totalPrice = quantity * price;
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        cartItems: [{ 
            productId,
            quantity,
            price,
            totalPrice
        }]
      });
    } else {
      // Check if product already exists in cart
      const productExists = cart.cartItems.find(item => item.productId.toString() === productId);
      if (productExists) {
        productExists.quantity += 1;
        productExists.totalPrice = productExists.quantity * price;

        // Save the updated cart
        await cart.save();
        return res.status(200).json({ status: true, message: "Your cart updated successfully" });
      }
       
        cart.cartItems.push({ productId,
            quantity,
            price,
            totalPrice });
    }

    await cart.save();
    return res.status(200).json({ status: true, message: "Product added to your cart" });

  } catch (error) {
    console.error("Add to Cart Error:", error);
    return res.status(500).json({ status: false, message: "Server Error" });
  }
};

const updateCart = async (req, res) => {
  try {
    const userId = req.session.user;
      console.log("User ID:", userId);
    const { productId, quantity, totalPrice } = req.body;
    console.log("Received Data:", req.body);
   
    

    let cart = await Cart.findOne({ userId:userId });
    if (!cart) {
  return res.status(404).json({ status: false, message: "Cart not found" });
}
     console.log("Cart Items:", cart);

    const cartItem = cart.cartItems.find(item => item.productId.toString() === productId);
//   console.log("Cart Items:", cart.cartItems); //
    if (cartItem) {
      cartItem.quantity = quantity;
      cartItem.totalPrice = totalPrice; // Update totalPrice based on quantity
    }

    await cart.save();
    res.status(200).json({ status: true });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
};
const removeCartItem=async(req,res)=>{
    try {
    const { productId } = req.body;
    const userId = req.session.user;

    const cart = await Cart.findOne({ userId });
    cart.cartItems = cart.cartItems.filter(item => item.productId.toString() !== productId);

    await cart.save();
    res.status(200).json({ status: true });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }

}


module.exports = {
  getCart,
  addToCart,
  updateCart,
  removeCartItem
};
