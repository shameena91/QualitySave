
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Coupon=require("../../models/couponSchema")
const RazorPay=require('razorpay')
const mongoose=require('mongoose')

const razorpayInstance=require('../../config/razorpay')
const env=require('dotenv').config();
const crypto = require("crypto");
const Ledger = require("../../models/ledgerSchema");

const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: String(new mongoose.Types.ObjectId()),
      payment_capture: 1,
    });

    res.status(200).json({
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ message: "Error creating Razorpay order" });
  }
};





const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, addressId, paymentMethod, 
      shippingCharge } = req.body;
    const userId = req.session.user;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const userCart = await Cart.findOne({ userId }).populate("cartItems.productId").lean();
    if (!userCart || userCart.cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
console.log(shippingCharge)
    const finalAmount = userCart.cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalAmount = userCart.cartItems.reduce((sum, item) => sum + item.totalSalePrice, 0);
    const discount = totalAmount - finalAmount;
    const amountToPay = finalAmount + parseInt(shippingCharge);
    console.log("3333333333333",amountToPay)
    const couponDiscount = finalAmount - (amountToPay - shippingCharge);

    const newOrder = new Order({
      userId,
      orderItems: userCart.cartItems.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        status: 'Pending',
        discountedAmount:(item.totalSalePrice-item.totalPrice)*item.quantity

      })),
      totalPrice: totalAmount,
      discount,
      couponDiscount,
      finalAmount: amountToPay,
      address: addressId,
      paymentMethod,
      invoiceDate: new Date(),
      razorpayStatus: "paid",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    await newOrder.save();

  
    for (let item of newOrder.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity }
      });
    }


    await Ledger.create({
      user: newOrder.userId,
      orderId: newOrder._id,
      type: "credit",
      amount: newOrder.finalAmount,
      paymentMethod: newOrder.paymentMethod,
      description: `Order payment received for Order ${newOrder._id}`,
    });

    await Cart.findOneAndDelete({ userId });

    res.status(200).json({ message: "Payment verified and order placed", orderId: newOrder._id });

  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ message: "Server error verifying payment" });
  }
};


const retryRazorpayPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.razorpayStatus === 'paid') {
      return res.status(400).json({ message: "Order is already paid" });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: order.finalAmount * 100, // in paise
      currency: "INR",
      receipt: String(order._id),
      payment_capture: 1,
    });

    await Order.findByIdAndUpdate(orderId, { $set: { razorpayStatus: "retry", razorpayOrderId: razorpayOrder.id } });

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



module.exports={
createRazorpayOrder,
verifyPayment,
retryRazorpayPayment
}