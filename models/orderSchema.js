const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const User = require("./userSchema");

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderItems: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      discountedAmount: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        required: true,
        enum: [
          "Pending",
          "Shipped",
          "Out for Delivery",
          "Delivered",
          "Cancelled",
          "Returned",
        ],
      },
      returnStatus: {
        type: String,
        enum: ["Rejected", "Approved", "Requested"],
      },
      returnReason: {
        type: String,
      },
      deliveredAt: {
        type: Date,
      },
      refundPrice: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  couponDiscount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "wallet", "razorpay"],
    required: true,
  },

  razorpayOrderId: {
    type: String,
    default: null,
  },
  razorpayPaymentId: {
    type: String,
    default: null,
  },
  razorpaySignature: {
    type: String,
    default: null,
  },
  razorpayStatus: {
    type: String,
    enum: ["created", "paid", "failed"],
    default: "created",
  },

  invoiceDate: {
    type: Date,
  },

  couponUsed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
    default: null,
  },
  shipping: {
    type: Number,
    default: 0,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  updatedOn: {
    type: Date,
    default: null,
  },
  orderStatus: {
    type: String,
    enum: ["Not placed", "Placed"],
    default: "Not placed",
  },
  retry: {
    type: Boolean,
    default: false,
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
