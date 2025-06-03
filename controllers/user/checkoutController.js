const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Coupon=require("../../models/couponSchema")
const RazorPay=require('razorpay')

const razorpayInstance=require('../../config/razorpay')
const env=require('dotenv').config();
const crypto = require("crypto");

const { editAddressPage } = require("./addressController");
const Ledger = require("../../models/ledgerSchema");



const applyCoupon=async(req,res)=>{
  try {
    const code=req.body.code
    const couponId=req.body.couponId
    const userId=req.session.user
    const coupon=await Coupon.findById(couponId)
   
    if (!coupon.usedUsers) {
      coupon.usedUsers = [];
    }
     if (!coupon.usedUsers.includes(userId)) {
      coupon.usedUsers.push(userId);
      await coupon.save();
       req.session.coupon=couponId
      //  req.session.couponId=id
       return res.json({ success: true });
    }else
    {
      return res.json({ success: false });
    }




  } catch (error) {
    console.error('Error updating coupon usage:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

const removeCoupon=async(req,res)=>{
  try {
    const couponId=req.session.coupon
    const userId=req.session.user

    const coupon=await Coupon.findByIdAndUpdate(couponId,
      {$pull:{usedUsers:userId}})
       req.session.coupon = null;
    
    await coupon.save()
     return res.json({ success: true });
    
  } catch (error) {
    console.error('Error updating coupon usage:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

const getCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    const userAddressDoc = await Address.findOne({ userId: userId }).lean();
    const user = await User.findById(userId).lean();
    const cartItemsDoc = await Cart.findOne({ userId: userId })
      .populate("cartItems.productId")
      .lean();


    

    const cartProducts = cartItemsDoc.cartItems;

    const finalSalePrice = cartProducts.reduce((acc, curr) => {
      return acc + curr.totalSalePrice;
    }, 0);

    const finalTotalAmount= cartProducts.reduce((acc, curr) => {
      return acc + curr.totalPrice;
    }, 0);
    const totalDiscount = finalSalePrice - finalTotalAmount;
const coupons = await Coupon.find({
  minimumPrice: { $lt: finalTotalAmount },
  isList: true
}).lean();



let shippingCharge = 0;

if (finalTotalAmount < 850) {
  shippingCharge = 40;
}

const finalTotalPrice = finalTotalAmount + shippingCharge;
console.log( shippingCharge )

if (
      !userAddressDoc ||
      !userAddressDoc.address ||
      userAddressDoc.address.length === 0
    ) {
      return res.render("checkout",{
        addresses: [],
        message: "No saved addresses found.",
        cartProducts,
      finalSalePrice,
      finalTotalPrice,
      totalDiscount,
      coupons,
      user,shippingCharge

      });
    }
    const addresses = userAddressDoc.address;

  console.log("coupons",coupons)
    res.render("checkout", {
      user,
      addresses,
      cartProducts,
      finalSalePrice,
      finalTotalPrice,
      totalDiscount,
      coupons,shippingCharge
   
    });
  } catch (error) {
    console.error("Error in getCheckout:", error.message);
    res.status(500).render("page-404", {
        message: "Something went wrong during checkout.",
      });
  }
};

const checkoutAddaddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      fullName,
      phone,
      pincode,
      city,
      houseDetails,
      state,
      landMark,
      altphone,
      addressType,
    } = req.body;
    console.log(fullName, phone, pincode, city, houseDetails, addressType);
    const userData = await User.findOne({ _id: userId });

    const userAddress = await Address.findOne({ userId: userData._id });
    if (!userAddress) {
      const newAddress = new Address({
        userId: userData._id,
        address: [
          {
            addressType,
            fullName,
            houseDetails,
            city,
            landMark,
            state,
            pincode,
            phone,
            altphone,
          },
        ],
      });
      await newAddress.save();
    } else {
      userAddress.address.push({
        addressType,
        fullName,
        houseDetails,
        city,
        landMark,
        state,
        pincode,
        phone,
        altphone,
      });
      await userAddress.save();
    }
    res.redirect("/checkout");
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

const createOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const couponId=req.session.coupon
    const { addressId, paymentMethod,amount,shippingCharge } = req.body;
    // const userAddressDoc = await Address.findOne({ userId:userId }).lean();

    console.log(addressId);
    console.log(paymentMethod);
    console.log("ggggggggg",amount);
    const amountPay=amount-shippingCharge
//     if(paymentMethod==="cod")
//       {
// paymentMethod="Cash on delivery"
//       }
    
    

    const cartItemsDoc = await Cart.findOne({ userId: userId })
      .populate("cartItems.productId")
      .lean();
    console.log("docssss", cartItemsDoc);

    const orderItems = cartItemsDoc.cartItems.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.price,
      status: "Pending",
    }));
    console.log("odrer", orderItems);

    const finalAmount = cartItemsDoc.cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    ); // Sum of all item totals
    const totalAmount = cartItemsDoc.cartItems.reduce(
      (sum, item) => sum + item.totalSalePrice,
      0
    );

    const discount = totalAmount - finalAmount;
    console.log("amounu:", finalAmount);
    console.log(totalAmount);
   

    let shippin=0
    if(finalAmount<850){
      shippin=40
    }

 const couponDiscount= finalAmount-amountPay
    const newOrder = new Order({
      userId: userId,
      orderItems,
      totalPrice: totalAmount,
      discount,
      couponDiscount:couponDiscount,
      finalAmount: amount,
      address: addressId,
couponUsed:couponId,
      invoiceDate: new Date(),
      paymentMethod:paymentMethod,
      shipping:shippin
    });
    console.log("nnnn", newOrder);
    await newOrder.save();
    await Cart.findOneAndDelete({ userId: userId });

    for (let item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
    }
req.session.coupon=null
    res
      .status(201)
      .json({
        message: "Order created successfully.",
        orderId: newOrder.orderId,
      });
  } catch (error) {
    console.error("Error creating order:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while creating the order." });
  }
};



const getMyOrders = async (req, res) => {
  try {
    const search = req.query.search || "";
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).lean();
    const searchExpn = new RegExp(search.trim(), "i");

    const productIds = await Product.find({ productName: searchExpn }).distinct("_id");

    const query = {
      userId,
      $or: [
        { orderId: { $regex: searchExpn } },
        { "orderItems.product": { $in: productIds } },
      ],
    };

    const orederedProduct = await Order.find(query)
      .sort({ createdOn: -1 })
      .populate("orderItems.product")
      .lean();

    const groupedOrders = orederedProduct.map(order => {
      const filteredItems = order.orderItems.filter(item => {
        if (!search) return true;
        return (
          item.product?.productName?.match(searchExpn) ||
          order.orderId.match(searchExpn)
        );
      });

      return {
        orderId: order.orderId,
        orderDate: order.createdOn.toLocaleDateString(),
        orderTime: order.createdOn.toLocaleTimeString(),
        products: filteredItems.map(item => ({
          productName: item.product?.productName || "Deleted Product",
          productImage: item.product?.productImage[0],
          quantity: item.quantity,
          price: item.price * item.quantity,
          productId: item.product?._id,
          status: item.status,
        }))
      };
    });

    const paginatedOrders = groupedOrders.slice(skip, skip + limit);
    const hasMore = page * limit < groupedOrders.length;

    res.render("myOrders", {
      orders: paginatedOrders,
      user,
      search,
      currentPage: page,
      hasMore
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId, productId } = req.params;
    console.log("orderid", orderId);
    const user = await User.findById(userId).lean();

    console.log("proid", productId);
    const order = await Order.findOne({ orderId: orderId, userId: userId })
      .populate("orderItems.product")
      .lean();

    console.log(order);
    const addressId = order.address;
    const viewAddress = await Address.findOne({ userId: userId }).lean();
    specifiedAddress = viewAddress.address.find((item) => {
      console.log("aaai", item._id);
      return item._id.toString() === addressId.toString();
    });
    console.log("add", addressId, specifiedAddress);

    const specifiedProduct = order.orderItems.find((item) => {
      //    console.log(item.product.toString())
      return item.product._id.toString() === productId;
    });

    console.log("ggggg", specifiedProduct);
    const totalPrice =
      specifiedProduct.product.salePrice * specifiedProduct.quantity;
    const finalAmount = specifiedProduct.price * specifiedProduct.quantity;
    const discount = totalPrice - finalAmount;
    res.render("viewOrderDetail", {
      product: specifiedProduct.product,
      quantity: specifiedProduct.quantity,
      price: specifiedProduct.price,
      status: specifiedProduct.status,
      returnStatus: specifiedProduct.returnStatus,
      specifiedAddress,
      totalPrice,
      finalAmount,
      discount,
      orderId,
      user,
      order
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId, productId, reason } = req.body;
    const user = await User.findById(userId);

    const order = await Order.findOne({ userId, orderId });
    const returnProduct=await Product.findById(productId)
    console.log("rrrrrrr",returnProduct)
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const specifiedProduct = order.orderItems.find(
      (item) => item.product._id.toString() === productId
    );



    if (!specifiedProduct) {
      return res.status(404).send("Product not found in order");
    }
const couponId=order.couponUsed




console.log(order.razorpayStatus)
    if (order.razorpayStatus === "paid") {

      
      if(couponId)
      {
      let returnProductPrice=specifiedProduct.price*specifiedProduct.quantity
      const remainingPrice=order.finalAmount-returnProductPrice

      console.log(couponId, returnProductPrice,remainingPrice);
      if(remainingPrice>=findCoupon.minimumPrice)
        {
      user.wallet = user.wallet + returnProductPrice;
      user.walletHistory.push({
      amount: returnProductPrice ,
      type: 'credit',
      reason: `Refund for cancelled product ${specifiedProduct.product} from order ${orderId}`,
});
       
specifiedProduct.refundPrice=returnProductPrice
order.finalAmount=order.finalAmount-returnProductPrice
order.totalPrice=order.totalPrice-returnProduct.salePrice
order.couponDiscount=order.couponDiscount-Math.floor(order.couponDiscount/order.orderItems.length)
await Ledger.create({
  user: order.userId,
  orderId: order._id,
  type: 'debit',
  amount: returnProductPrice,
  paymentMethod: 'wallet',
  description: `Refund for cancelled product${productId}`
});

}else{
          const amountTransfer=order.finalAmount-remainingPrice
            user.wallet = user.wallet + amountTransfer;
               user.walletHistory.push({
  amount: amountTransfer ,
  type: 'credit',
  reason: `Refund for cancelled product ${specifiedProduct.product} from order ${orderId}`,
});
   
  specifiedProduct.refundPrice=amountTransfer
order.finalAmount=order.finalAmount-amountTransfer
order.totalPrice=order.totalPrice-returnProduct.salePrice
order.couponDiscount=order.couponDiscount-Math.floor(order.couponDiscount/order.orderItems.length)
 await Ledger.create({
  user: order.userId,
  orderId: order._id,
  type: 'debit',
  amount: amountTransfer,
  paymentMethod: 'wallet',
  description: `Refund for cancelled product${productId}`
});     


}             
      }
else{
      const refundAmount = specifiedProduct.quantity * specifiedProduct.price;
      user.wallet += refundAmount;
      user.walletHistory.push({
        amount: refundAmount,
        type: "credit",
        reason: `Refund for cancelled product ${specifiedProduct.product.name || specifiedProduct.product} from order ${orderId}`,
      });
       specifiedProduct.status = "Cancelled";

specifiedProduct.refundPrice=refundAmount
order.finalAmount=order.finalAmount-refundAmount
order.totalPrice=order.totalPrice-returnProduct.salePrice
order.couponDiscount=order.couponDiscount-Math.floor(order.couponDiscount/order.orderItems.length)
await Ledger.create({
  user: order.userId,
  orderId: order._id,
  type: 'debit',
  amount: refundAmount,
  paymentMethod: 'wallet',
  description: `Refund for cancelled product${productId}`
});
      await user.save();
    }
  }


else{
    specifiedProduct.status = "Cancelled";
}


    await order.save();
    await Product.findByIdAndUpdate(productId, {
      $inc: { quantity: specifiedProduct.quantity },
    });

    res.redirect("/my-orders");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cancelling the order");
  }
};


const returnRequest = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    console.log(orderId, productId);
    const { reason } = req.body;
    console.log(reason);

    const order = await Order.findOne({ orderId: orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.orderItems.find(
      (i) => i.product.toString() === productId
    );
    if (!item)
      return res.status(404).json({ message: "Product not found in order" });

    if (item.status !== "Delivered") {
      return res
        .status(400)
        .json({ message: "Return can only be requested for delivered items" });
    }
    if (item.returnStatus) {
      return res
        .status(400)
        .json({ message: "Already send return request cannot send again" });
    } else {
      item.returnStatus = "Requested";
      item.returnReason = reason;
      await order.save();

      res.json({ message: "Return request submitted successfully." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethod,amount } = req.body;

    if (!addressId || !paymentMethod) {
      return res.status(400).json({ message: "Address and payment method required." });
    }

    // 1. Get user's cart
    const userCart = await Cart.findOne({ userId }).populate('cartItems.productId').lean();
    
    // 2. Calculate totals
 const finalAmount = userCart.cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    ); // Sum of all item totals
    const totalAmount = userCart.cartItems.reduce(
      (sum, item) => sum + item.totalSalePrice,
      0
    );
     const discount = totalAmount - finalAmount;
      const couponDiscount= finalAmount-amount
    // const totalPrice = userCart.cartItemsitems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    // const discount = 0; // apply logic if needed
    // const finalAmount = totalPrice - discount;

    // 3. Create the Order (not marking as paid yet)
    const newOrder = new Order({
      userId,
      orderItems: userCart.cartItems.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        status: 'Pending'
      })),
      totalPrice:totalAmount,
      discount,
       couponDiscount:couponDiscount,
      finalAmount: amount,
    
      address: addressId,
      paymentMethod:paymentMethod,
      invoiceDate: new Date(),
      razorpayStatus:"created"
    });

    await newOrder.save();


    // 4. Create Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: String(newOrder._id),
      payment_capture: 1,
    });
    

    // 5. Return data to client
    res.status(200).json({
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: newOrder._id,
      razorpayOrderId: razorpayOrder.id,
      orderDetails: {
        totalAmount,
        discount,
        finalAmount,
      
      }
    });

  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({ message: "Server error while creating Razorpay order." });
  }
};




const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;
console.log("ttttttt",razorpayOrderId, razorpayPaymentId, razorpaySignature)
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
console.log("gggggg",generatedSignature)
    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid signature" });
    }
const order= await Order.findById(orderId)
   await Order.findByIdAndUpdate(orderId, {
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  razorpayStatus: 'paid',
 
});
   const updatedOrder = await Order.findById(orderId);

if (updatedOrder && updatedOrder.razorpayStatus === "paid") {
  await Ledger.create({
    user: updatedOrder.userId,
    orderId: updatedOrder._id,
    type: "credit",
    amount: updatedOrder.finalAmount,
    paymentMethod: updatedOrder.paymentMethod,
    description: `Order payment received for Order ${updatedOrder.orderId}`
  });
}
    for (let item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity }
      });
    }

    await Cart.findOneAndDelete({ userId: order.userId });

    res.status(200).json({ message: "Payment verified" });
  } catch (err) {
    console.error("Payment verification failed:", err);
    res.status(500).json({ message: "Error verifying payment" });
  }
};


const getOrderSuccess = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user;
    const user = await User.findById(userId).lean();

    res.render("orderPlaced", { orderId, user });
  } catch (error) {
    console.error( error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderFailure=async(req,res)=>{
  try {
     const orderId = req.params.orderId;
       const userId = req.session.user;
    const user = await User.findById(userId).lean();
    res.render("orderFailure",{orderId,user})
  } catch (error) {
     console.error( error);
    res.status(500).send("Internal Server Error");
  }
}


module.exports = {
  getCheckout,
  createOrder,
  getOrderSuccess,
  getMyOrders,
  getOrderDetail,          
  cancelOrder,
  returnRequest,
  checkoutAddaddress,
  createRazorpayOrder,
  verifyPayment,
  getOrderFailure,
  applyCoupon,
  removeCoupon
};
