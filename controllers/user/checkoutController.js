const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const RazorPay = require("razorpay");

const razorpayInstance = require("../../config/razorpay");
const env = require("dotenv").config();
const crypto = require("crypto");

const { editAddressPage } = require("./addressController");
const Ledger = require("../../models/ledgerSchema");

const applyCoupon = async (req, res) => {
  try {
    const code = req.body.code;
    const couponId = req.body.couponId;
    const userId = req.session.user;
    const coupon = await Coupon.findById(couponId);

    if (!coupon.usedUsers) {
      coupon.usedUsers = [];
    }

    if (coupon.usedUsers && coupon.usedUsers.includes(userId)) {
      return res.json({ success: false, message: "Coupon already used" });
    }

    // Save coupon info in session for later
    req.session.coupon = couponId;
    return res.json({ success: true });

    // if (!coupon.usedUsers.includes(userId)) {
    //   coupon.usedUsers.push(userId);
    //   await coupon.save();
    //   req.session.coupon = couponId;
    //   //  req.session.couponId=id
    //   return res.json({ success: true });
    // } else {
    //   return res.json({ success: false });
    // }
  } catch (error) {
    console.error("Error updating coupon usage:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

const removeCoupon = async (req, res) => {
  try {
    const couponId = req.session.coupon;
    const userId = req.session.user;

    const coupon = await Coupon.findByIdAndUpdate(couponId, {
      $pull: { usedUsers: userId },
    });
    req.session.coupon = null;

    await coupon.save();
    return res.json({ success: true });
  } catch (error) {
    console.error("Error updating coupon usage:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

const getCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    const userAddressDoc = await Address.findOne({ userId: userId }).lean();
    const user = await User.findById(userId).lean();
    const cartItemsDoc = await Cart.findOne({ userId: userId })
      .populate("cartItems.productId")
      .lean();

    const cartProducts = cartItemsDoc.cartItems.filter(
      (item) => item.productId.quantity > 0
    );

    const finalSalePrice = cartProducts.reduce((acc, curr) => {
      return acc + curr.totalSalePrice;
    }, 0);

    const finalTotalAmount = cartProducts.reduce((acc, curr) => {
      return acc + curr.totalPrice;
    }, 0);
    const totalDiscount = finalSalePrice - finalTotalAmount;
    const coupons = await Coupon.find({
      minimumPrice: { $lt: finalTotalAmount },
      isList: true,
    }).lean();

    let shippingCharge = 0;

    if (finalTotalAmount < 850) {
      shippingCharge = 40;
    }

    const finalTotalPrice = finalTotalAmount + shippingCharge;
    console.log(shippingCharge);

    if (
      !userAddressDoc ||
      !userAddressDoc.address ||
      userAddressDoc.address.length === 0
    ) {
      return res.render("checkout", {
        addresses: [],
        message: "No saved addresses found.",
        cartProducts,
        finalSalePrice,
        finalTotalPrice,
        totalDiscount,
        coupons,
        user,
        shippingCharge,
        wallet: user.wallet,
      });
    }
    const addresses = userAddressDoc.address;

    console.log("coupons", coupons);
    res.render("checkout", {
      user,
      addresses,
      cartProducts,
      finalSalePrice,
      finalTotalPrice,
      totalDiscount,
      coupons,
      shippingCharge,
      wallet: user.wallet,
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
    const couponId = req.session.coupon;
    const { addressId, paymentMethod, amount, shippingCharge } = req.body;

    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("cartItems.productId").lean();

    if (!cart || cart.cartItems.length === 0) {
      return res.status(400).json({ message: "Your cart is empty." });
    }

    // Filter out-of-stock items
    const validCartItems = cart.cartItems.filter(
      (item) => item.productId.quantity > 0
    );

    if (validCartItems.length === 0) {
      return res.status(400).json({ message: "All cart items are out of stock." });
    }

    // Prepare order items
    const orderItems = validCartItems.map((item) => ({
      product: item.productId._id,
      quantity: item.quantity,
      price: item.price,
      status: "Pending",
      discountedAmount: (item.salePrice - item.price) * item.quantity,
    }));

    // Calculate totals
    const totalPrice = validCartItems.reduce(
      (sum, item) => sum + item.salePrice * item.quantity,
      0
    );
    const finalAmount = validCartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const discount = totalPrice - finalAmount;
    const couponDiscount = finalAmount - (amount - shippingCharge);

    // Create order document
    const newOrder = new Order({
      userId,
      orderItems,
      totalPrice,
      discount,
      couponDiscount,
      finalAmount: amount - shippingCharge,
      address: addressId,
      couponUsed: couponId,
      invoiceDate: new Date(),
      paymentMethod,
      shipping: shippingCharge,
      orderStatus: "Placed",
    });

    // Wallet payment processing
    if (paymentMethod === "wallet") {
      if (user.wallet < amount) {
        return res.status(400).json({
          message: "Insufficient wallet balance. Please choose another payment method.",
        });
      }

      user.wallet -= amount;
      user.walletHistory.push({
        amount,
        type: "debit",
        reason: `Amount debited for order ${newOrder.orderId}`,
      });

      await Ledger.create({
        user: userId,
        orderId: newOrder._id,
        type: "debit",
        amount,
        paymentMethod,
        description: `Payment for order ${newOrder.orderId}`,
      });

      await user.save();
    }

    // Mark coupon as used and clear session
    if (couponId) {
      await Coupon.updateOne(
        { _id: couponId },
        { $addToSet: { usedBy: userId } }
      );
      req.session.coupon = null;
    }

    // Save the order
    await newOrder.save();

    // Clear cart
    await Cart.findOneAndDelete({ userId });

    // Decrease product stock
    for (const item of orderItems) {
      await Product.updateOne(
        { _id: item.product, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } }
      );
    }

    res.status(201).json({
      message: "Order created successfully.",
      orderId: newOrder.orderId,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Something went wrong while creating the order." });
  }
};


const retryCodOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { addressId, paymentMethod, amount, shippingCharge } = req.body;
    console.log(orderId);

    if (paymentMethod !== "cod") {
      return res
        .status(400)
        .json({ message: "Invalid payment method for COD retry" });
    }

    // Update the existing order
    const order = await Order.findOne({ orderId: orderId });
    console.log("oooooo", order);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.address = addressId;
    order.paymentMethod = "cod";

    order.orderStatus = "Placed";
    order.paymentStatus = "pending";
    order.retry = true;
    order.razorpayStatus = "created";
    order.updatedOn = new Date(); // reset timestamp if needed
    console.log("ggg", order);
    await order.save();

    res
      .status(200)
      .json({ message: "COD order retried successfully", orderId: orderId });
  } catch (err) {
    console.error("Retry COD Order Error:", err);
    res.status(500).json({ message: "Internal server error" });
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

    const productIds = await Product.find({ productName: searchExpn }).distinct(
      "_id"
    );

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

    const groupedOrders = orederedProduct.map((order) => {
      const filteredItems = order.orderItems.filter((item) => {
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
        RazorPay: order.razorpayStatus,
        paymentMethod: order.paymentMethod,
        products: filteredItems.map((item) => ({
          productName: item.product?.productName || "Deleted Product",
          productImage: item.product?.productImage[0],
          quantity: item.quantity,
          price: item.price * item.quantity,
          productId: item.product?._id,
          status: item.status,
        })),
      };
    });
    console.log(groupedOrders);
    const paginatedOrders = groupedOrders.slice(0, skip + limit);
    const hasMore = page * limit < groupedOrders.length;

    res.render("myOrders", {
      orders: paginatedOrders,
      user,
      search,
      currentPage: page,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId } = req.params;
    console.log("orderid", orderId);
    const user = await User.findById(userId).lean();


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
const products=order.orderItems
console.log(products)
let invoiceStatus = "Show";
let findOrderItems = [];
let deliveredTotalPrice;
let deliveredTotaldiscount

if (order.paymentMethod === "cod") {
  const statusList = order.orderItems.map(item => item.status);

  const hasUndelivered = statusList.some(status =>
    ["Pending", "Processing", "Shipped", "Out for Delivery",].includes(status)
  );
  const allCancelled = statusList.every(status => status === "Cancelled");

  if (hasUndelivered || allCancelled) {
    invoiceStatus = "Not Show";
  }

  findOrderItems = order.orderItems.filter(item => item.status !== "Cancelled");

   deliveredTotalPrice = findOrderItems
  .reduce((acc, item) => acc + item.quantity * item.product.salePrice, 0);

  deliveredTotaldiscount= findOrderItems
  .reduce((acc, item) => acc +  item.discountedAmount, 0);
  
} else {
  findOrderItems = order.orderItems;
deliveredTotalPrice=findOrderItems.reduce((acc,item)=>{
  return acc+item.quantity*item.product.salePrice
},0)
deliveredTotaldiscount=findOrderItems.reduce((acc,item)=>{
  return acc+item.discountedAmount
},0)
}
const totalRefund=findOrderItems.reduce((acc,item)=>{
  return acc+item.refundPrice
},0)

const couponId=order.couponUsed
  let couponName = null;

    if (couponId) {
      const findCoupon = await Coupon.findById(couponId).lean();
      if (findCoupon) {
        couponName = findCoupon.name;
      }
    }




const couponDiscount=order.couponDiscount
const payableAmount=deliveredTotalPrice-deliveredTotaldiscount-couponDiscount



  console.log("INNN",invoiceStatus)
    res.render("viewOrderDetail", {
      products,
      orderId,
      order,
      invoiceStatus,
      couponDiscount,
      payableAmount,
     couponName,
      specifiedAddress,
      totalPrice:deliveredTotalPrice,
   
      totalDiscount:deliveredTotaldiscount,
      user,
      totalRefund
     
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
    const returnProduct = await Product.findById(productId);
    console.log("rrrrrrr", returnProduct);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const specifiedProduct = order.orderItems.find(
      (item) => item.product._id.toString() === productId
    );

    if (!specifiedProduct) {
      return res.status(404).send("Product not found in order");
    }
    const couponId = order.couponUsed;
    const findCoupon=await Coupon.findById(couponId)

    console.log(order.razorpayStatus);
    if (order.razorpayStatus === "paid") {
      if (couponId) {
        let returnProductPrice =
          specifiedProduct.price * specifiedProduct.quantity;
        const remainingPrice = order.finalAmount - returnProductPrice;

        console.log(couponId, returnProductPrice, remainingPrice);
        if (remainingPrice >= findCoupon.minimumPrice) {
          user.wallet = user.wallet + returnProductPrice;
          user.walletHistory.push({
            amount: returnProductPrice,
            type: "credit",
            reason: `Refund for cancelled product ${specifiedProduct.product} from order ${orderId}`,
          });

          specifiedProduct.refundPrice = returnProductPrice;
          order.finalAmount = order.finalAmount - returnProductPrice;
          order.totalPrice = order.totalPrice - returnProduct.salePrice*specifiedProduct.quantity;
          order.discount = order.discount - specifiedProduct.discountedAmount;
          // order.couponDiscount =
          //   order.couponDiscount -
          //   Math.floor(order.couponDiscount / order.orderItems.length);
          await Ledger.create({
            user: order.userId,
            orderId: order._id,
            type: "debit",
            amount: returnProductPrice,
            paymentMethod: "wallet",
            description: `Refund for cancelled product${productId}`,
          });
           specifiedProduct.status = "Cancelled";
        } else {
          const amountTransfer = order.finalAmount - remainingPrice;
          user.wallet = user.wallet + amountTransfer;
          user.walletHistory.push({
            amount: amountTransfer,
            type: "credit",
            reason: `Refund for cancelled product ${specifiedProduct.product} from order ${orderId}`,
          });

          specifiedProduct.refundPrice = amountTransfer;
          order.finalAmount = order.finalAmount - amountTransfer;
          order.totalPrice = order.totalPrice - returnProduct.salePrice*specifiedProduct.quantity;
          order.discount = order.discount - specifiedProduct.discountedAmount;
          // order.couponDiscount =
          //   order.couponDiscount -
          //   Math.floor(order.couponDiscount / order.orderItems.length);
          await Ledger.create({
            user: order.userId,
            orderId: order._id,
            type: "debit",
            amount: amountTransfer,
            paymentMethod: "wallet",
            description: `Refund for cancelled product${productId}`,
          });
        }
         specifiedProduct.status = "Cancelled";
      } else {
        const refundAmount = specifiedProduct.quantity * specifiedProduct.price;
        user.wallet += refundAmount;
        user.walletHistory.push({
          amount: refundAmount,
          type: "credit",
          reason: `Refund for cancelled product ${
            specifiedProduct.product.name || specifiedProduct.product
          } from order ${orderId}`,
        });
        specifiedProduct.status = "Cancelled";

        specifiedProduct.refundPrice = refundAmount;
        order.finalAmount = order.finalAmount - refundAmount;
        order.totalPrice = order.totalPrice - returnProduct.salePrice*specifiedProduct.quantity;
        order.discount = order.discount - specifiedProduct.discountedAmount;
        // order.couponDiscount =
        //   order.couponDiscount -
        //   Math.floor(order.couponDiscount / order.orderItems.length);
        await Ledger.create({
          user: order.userId,
          orderId: order._id,
          type: "debit",
          amount: refundAmount,
          paymentMethod: "wallet",
          description: `Refund for cancelled product${productId}`,
        });
        await user.save();
      }
    } else {
      specifiedProduct.status = "Cancelled";
      const refundAmount = specifiedProduct.quantity * specifiedProduct.price;
      order.finalAmount = order.finalAmount - refundAmount;
      order.totalPrice = order.totalPrice - returnProduct.salePrice*specifiedProduct.quantity;
      order.discount = order.discount - specifiedProduct.discountedAmount;
      // if (couponId) {
      //   // order.couponDiscount =
      //   //   order.couponDiscount -
      //   //   Math.floor(order.couponDiscount / order.orderItems.length);
      // }
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
    const { orderId,productId } = req.params;
    console.log(orderId, productId);
    const { reason } = req.body;
    console.log(reason);

    const order = await Order.findOne({ orderId: orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });
   console.log("orderrrr",order)
   console.log("bbbbbbbb",order.orderItems)
  const item=order.orderItems.find((pro)=>{
    console.log(pro.product)
    console.log(productId)
    return pro.product.toString()===productId
  })
    console.log("itemmmmmm",item)
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

const getOrderSuccess = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user;
    const user = await User.findById(userId).lean();

    res.render("orderPlaced", { orderId, user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderFailure = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user;
    const user = await User.findById(userId).lean();
    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      { razorpayStatus: "failed" },
      { new: true }
    ).lean();
    if (!order) {
      console.log("No order found to update for orderId:", orderId);
    } else {
      console.log("Order updated to failed status:", order);
    }
    await Cart.findOneAndDelete({ userId: userId });
    res.render("orderFailure", { user ,orderId});
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getCheckout,
  createOrder,
  getOrderSuccess,
  getMyOrders,
  getOrderDetail,
  cancelOrder,
  returnRequest,
  checkoutAddaddress,
  getOrderFailure,
  applyCoupon,
  removeCoupon,
  retryCodOrder,
};
