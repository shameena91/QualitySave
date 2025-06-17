const User = require("../../models/userSchema");
const RazorPay = require("razorpay");
const mongoose = require("mongoose");
const razorpayInstance = require("../../config/razorpay");

const env = require("dotenv").config();
const crypto = require("crypto");
const getWallet = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId)
    .lean();

    const walletHistory = userData.walletHistory?.slice(-3).reverse();
    return res.render("wallet", { user: userData, walletHistory });
  } catch (error) {}
};
const walletTransaction = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const userId = req.session.user;
    const userData = await User.findById(userId)
    .lean();

    const walletHistory = userData.walletHistory?.reverse();
    const paginatedwalletHistory = walletHistory.slice(0, skip + limit);

    const totalCount = walletHistory.length;

    const hasMore = page * limit < totalCount;
    return res.render("walletTransaction", {
      user: userData,
      walletHistory: paginatedwalletHistory,
      currentPage: page,
      hasMore,
    });
  } catch (error) {}
};

const createWalletOrder = async (req, res) => {
  const { amount } = req.body;
  const userId = req.session.user;

  try {
    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency: "INR",
      receipt: `wallet_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      userId,
    });
  } catch (err) {
    console.error("Razorpay Wallet Order Error:", err);
    res.status(500).json({ message: "Failed to create wallet order" });
  }
};

const verifyWalletPayment = async (req, res) => {
  const { amount, userId } = req.body;

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } =
      req.body;
    console.log(
      "ttttttt",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderId
    );
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    console.log("gggggg", generatedSignature);
    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid signature" });
    }
    await User.findByIdAndUpdate(userId, {
      $inc: { wallet: amount / 100 },
      $push: {
        walletHistory: {
          amount: amount / 100,
          type: "credit",
          reason: "Wallet top-up",
          date: new Date(),
        },
      },
    });

    res.json({ message: "Wallet updated" });
  } catch (err) {
    console.error("Wallet Payment Verification Error:", err);
    res.status(500).json({ message: "Failed to update wallet" });
  }
};

module.exports = {
  getWallet,
  walletTransaction,
  createWalletOrder,
  verifyWalletPayment,
};
