const Cart = require("../../models/cartSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Wishlist = require("../../models/wishlistSchema");

const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("userId from session:", userId);

    const user = await User.findById(userId).lean();
    if (!user) {
      console.log("User not found");
      return res.redirect("/pageNotFound");
    }

    let cart = await Cart.findOne({ userId })
      .populate("cartItems.productId");

    if (!cart || cart.cartItems.length === 0) {
      return res.render("cart", {
        hasStock: 0,
        cartProducts: [],
        sumTotalPrice: 0,
        sumSalePrice: 0,
        discount: 0,
        user,
        shippingCharge: 0,
        emptyMessage: "Your cart is empty.",
      });
    }

    cart.cartItems.forEach(item => {
      if (
        item.productId &&
        item.quantity > item.productId.quantity
      ) {
        item.quantity = item.productId.quantity;
        item.totalPrice = item.price * item.quantity;
        item.totalSalePrice = item.salePrice * item.quantity;
      }
    });

    await cart.save();

    cart = cart.toObject();
    const cartProducts = cart.cartItems;

    const availableProducts = cartProducts.filter(
      item => item.productId && item.productId.quantity > 0
    );

  
    const sumTotalPrice = availableProducts.reduce(
      (acc, curr) => acc + curr.totalPrice,
      0
    );
    const sumSalePrice = availableProducts.reduce(
      (acc, curr) => acc + curr.totalSalePrice,
      0
    );
    const discount = sumSalePrice - sumTotalPrice;

    let hasStock = 1;
    if (cartProducts.length === 1) {
      hasStock = cartProducts[0]?.productId?.quantity || 0;
    }

    res.render("cart", {
      hasStock,
      cartProducts,
      sumTotalPrice,
      sumSalePrice,
      discount,
      user,
      shippingCharge: 40,
      emptyMessage: null,
    });

  } catch (error) {
    console.error("Get Cart Error:", error);
    return res.status(500).render("errorPage", { message: "Internal Server Error" });
  }
};


const addToCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({
          status: false,
          message: "Please log in to add products to your cart.",
        });
    }
    const productId = req.body.proId;
    const userId = req.session.user;
    const findProduct=await Product.findById(productId)

    const wishlist = await Wishlist.findOne({ userId: userId });
    if (!productId || !userId) {
      return res
        .status(400)
        .json({ status: false, message: "Missing product or user ID" });
    }
    const product = await Product.findById(productId);
    const categoryData = await Category.findById(product.category);
    console.log(categoryData);

    if (!product) {
      return res
        .status(404)
        .json({ status: false, message: "Product not found" });
    }

    if (wishlist) {
      const productExists = wishlist.products.some(
        (p) => p.productId.toString() === productId
      );
      if (productExists) {
        await wishlist.updateOne({
          $pull: { products: { productId: productId } },
        });
      }
    }
    const offer =
      categoryData && categoryData.categoryoffer > product.productOffer
        ? categoryData.categoryoffer
        : product.productOffer;
    console.log("ooooo", offer);
    const quantity = 1;
    let maxQuantity = 5;

    const price = product.discountedPrice;
    const totalPrice = quantity * price;
    const salePrice = product.salePrice;
    const totalSalePrice = quantity * salePrice;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        cartItems: [
          {
            productId,
            quantity,
            price,
            salePrice,
            totalPrice,
            totalSalePrice,
            offer,
          },
        ],
      });
    } else {
      const productExists = cart.cartItems.find(
        (item) => item.productId.toString() === productId
      );
      if (productExists) {
if(findProduct.quantity<productExists.quantity+1){
     return res
          .status(200)
          .json({ status: false, message: `Only ${findProduct.quantity} left` });
}


        if (productExists.quantity + 1 > maxQuantity) {
          return res
            .status(200)
            .json({
              status: false,
              message: `Only ${product.quantity} units left of "${product.productName}". Please update your cart.`,
          
            
            });
        }




        
if(findProduct.quantity<productExists.quantity+1){
  productExists.quantity =findProduct.quantity;
  productExists.totalPrice = productExists.quantity * price;
        productExists.totalSalePrice = productExists.quantity * salePrice;
}
else{
        productExists.quantity += 1;
        productExists.totalPrice = productExists.quantity * price;
        productExists.totalSalePrice = productExists.quantity * salePrice;
}

        await cart.save();
        return res
          .status(200)
          .json({ status: true, message: "Your cart updated successfully" });
      }
    
     

      cart.cartItems.push({
        productId,
        quantity,
        price,
        salePrice,
        totalPrice,
        totalSalePrice,
        offer,
      });
    }

    await cart.save();
    return res
      .status(200)
      .json({ status: true, message: "Product added to your cart" });
  } catch (error) {
    console.error("Add to Cart Error:", error);
    return res.status(500).json({ status: false, message: "Server Error" });
  }
};

const updateCart = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log("User ID:", userId);
    const { productId, quantity, totalPrice, totalSalePrice } = req.body;
    console.log("Received Data:", req.body);

    let cart = await Cart.findOne({ userId: userId });
    if (!cart) {
      return res.status(404).json({ status: false, message: "Cart not found" });
    }
    console.log("Cart Items:", cart);

    const cartItem = cart.cartItems.find(
      (item) => item.productId.toString() === productId
    );
    //   console.log("Cart Items:", cart.cartItems); //
    if (cartItem) {
     
      cartItem.quantity = quantity;
      cartItem.totalPrice = totalPrice;
      cartItem.totalSalePrice = totalSalePrice;
    }




// if(findProduct.quantity<productExists.quantity+1){
//   productExists.quantity =findProduct.quantity;
//   productExists.totalPrice = productExists.quantity * price;
//         productExists.totalSalePrice = productExists.quantity * salePrice;
// }
// else{
//         productExists.quantity += 1;
//         productExists.totalPrice = productExists.quantity * price;
//         productExists.totalSalePrice = productExists.quantity * salePrice;
// }



    await cart.save();
    res.status(200).json({ status: true });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
};
const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;

    const cart = await Cart.findOne({ userId });
    cart.cartItems = cart.cartItems.filter(
      (item) => item.productId.toString() !== productId
    );

    await cart.save();
    res.status(200).json({ status: true });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
};


const checkStock = async (req, res) => {
  try {
    const userId = req.session.user;

    const cart = await Cart.findOne({ userId }).populate('cartItems.productId');
    const unavailable = [];

    const availableItems = [];

    for (let item of cart.cartItems) {
      const product = item.productId;

      if (product.quantity === 0) {
        unavailable.push({
          name: product.productName,
          image: product.productImage?.[0] || 'default.jpg'
        });
      } else {
        availableItems.push(item);
      }
    }

 
    cart.cartItems = availableItems;
    await cart.save();

    res.json({ unavailable });
  } catch (err) {
    console.error("Stock check error:", err);
    res.status(500).json({ error: 'Server error' });
  }
};


module.exports = {
  getCart,
  addToCart,
  updateCart,
  removeCartItem,
  checkStock
};
