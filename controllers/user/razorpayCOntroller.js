const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const RazorPay = require("razorpay");
const mongoose = require("mongoose");

const razorpayInstance = require("../../config/razorpay");
const env = require("dotenv").config();
const crypto = require("crypto");
const Ledger = require("../../models/ledgerSchema");

const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const couponId = req.session.coupon;
    const { addressId, paymentMethod, amount, shippingCharge, orderId } =
      req.body;

    if (!addressId || !paymentMethod) {
      return res
        .status(400)
        .json({ message: "Address and payment method required." });
    }

    const amountPay = amount - shippingCharge;
    // 1. Get user's cart
    const findCartItems = await Cart.findOne({ userId })
      .populate("cartItems.productId")
      .lean();

    const userCart = findCartItems.cartItems.filter(
      (item) => item.productId.quantity > 0
    );

    // 2. Calculate totals
    const finalAmount = userCart.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    ); // Sum of all item totals
    const totalAmount = userCart.reduce(
      (sum, item) => sum + item.totalSalePrice,
      0
    );
    const discount = totalAmount - finalAmount;
    const couponDiscount = finalAmount - amountPay;

    const newOrder = new Order({
      userId,
      orderItems: userCart.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        status: "Pending",
        discountedAmount: item.totalSalePrice - item.totalPrice,
      })),
      totalPrice: totalAmount,
      discount,
      couponDiscount: couponDiscount,
      finalAmount: amountPay,
      couponUsed: couponId,
      address: addressId,
      paymentMethod: paymentMethod,
      invoiceDate: new Date(),
      razorpayStatus: "created",
      shipping: shippingCharge,
    });

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: String(newOrder._id),
      payment_capture: 1,
    });

    await newOrder.save();
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
      },
    });
  } catch (error) {
    console.log(error);
    console.error("Razorpay Order Creation Error:", error);
    res
      .status(500)
      .json({ message: "Server error while creating Razorpay order." });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } =
      req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid signature" });
    }
    const order = await Order.findById(orderId);

    await Order.findByIdAndUpdate(orderId, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      razorpayStatus: "paid",
      orderStatus: "Placed",
    });

    if (req.session.coupon) {
      await Coupon.updateOne(
        { _id: req.session.coupon },
        { $addToSet: { usedUsers: req.session.user } }
      );
      req.session.coupon = null;
    }
    const updatedOrder = await Order.findById(orderId);

    if (updatedOrder && updatedOrder.razorpayStatus === "paid") {
      await Ledger.create({
        user: updatedOrder.userId,
        orderId: updatedOrder._id,
        type: "credit",
        amount: updatedOrder.finalAmount,
        paymentMethod: updatedOrder.paymentMethod,
        description: `Order payment received for Order ${updatedOrder.orderId}`,
      });
    }
    for (let item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
    }

    await Cart.findOneAndDelete({ userId: order.userId });

    res.status(200).json({ message: "Payment verified" });
  } catch (err) {
    console.error("Payment verification failed:", err);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

const retryRazorpayPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.razorpayStatus === "paid") {
      return res.status(400).json({ message: "Order is already paid" });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: order.finalAmount * 100, // in paise
      currency: "INR",
      receipt: String(order._id),
      payment_capture: 1,
    });

    await Order.findByIdAndUpdate(orderId, {
      $set: { razorpayStatus: "retry", razorpayOrderId: razorpayOrder.id },
    });

    res.status(200).json({
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      razorpayOrderId: razorpayOrder.id,
      orderId: order._id,
    });
  } catch (error) {
    console.error("Retry Razorpay Payment Error:", error);
    res.status(500).json({ message: "Retry failed. Please try again later." });
  }
};

const retryOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const user = req.session.user;
    const userData = await User.findById(user).lean();
    const order = await Order.findOne({ orderId: orderId })

      .populate("orderItems.product")
      .lean();
    let hasCoupon;
    if (order.couponUsed) {
      hasCoupon = true;
    }

    const orderProducts = order.orderItems;
    const addressId = order.address;
    const address = await Address.findOne({ userId: user }).lean();
    const coupons = await Coupon.find({
      minimumPrice: { $lt: order.finalAmount },
      isList: true,
    }).lean();

    if (!address || !address.address || address.address.length === 0) {
      return res.render("checkout", {
        addresses: [],
        message: "No saved addresses found.",
        cartProducts: orderProducts, // if you show all saved addresses
        finalSalePrice: order.totalPrice,
        finalTotalPrice: order.finalAmount + order.couponDiscount,
        shippingCharge: order.shipping || 0,
        coupons,
        totalDiscount: order.discount,

        user: userData, // needed to reuse same order
        retry: true,
      });
    }
    const addresses = address.address;
    res.render("checkout", {
      addresses,
      cartProducts: orderProducts, // if you show all saved addresses
      finalSalePrice: order.totalPrice,
      finalTotalPrice: order.finalAmount + order.couponDiscount,
      shippingCharge: order.shipping || 0,
      coupons,
      totalDiscount: order.discount,
      wallet: userData.wallet,

      user: userData, // needed to reuse same order
      retry: true,
      orderId: orderId || null,
    });
  } catch (error) {
    console.log(error);
  }
};
const retryRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const existingOrder = await Order.findOne({ orderId: orderId });

    const totalAmount = existingOrder.finalAmount * 100; // amount in paise

    if (!totalAmount || isNaN(totalAmount)) {
      return res.status(400).json({ error: "Amount is invalid or missing" });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt: `${String(existingOrder._id)}-retry`,
      payment_capture: 1,
    });

    await Order.updateOne(
      { orderId: orderId },
      {
        $set: {
          razorpayOrderId: razorpayOrder.id,
          status: "payment_pending",
          paymentStatus: "pending",
        },
      }
    );

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: existingOrder._id,
      razorpayOrderId: razorpayOrder.id,
    });
  } catch (error) {
    console.error("Razorpay retry failed:", error);
    res.status(500).json({ error: "Retry failed" });
  }
};

const deletePendingOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    await Order.deleteOne({ _id: orderId });
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  retryRazorpayPayment,
  retryOrder,
  retryRazorpayOrder,
  deletePendingOrder,
};
