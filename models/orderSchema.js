const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const User = require('./userSchema');

const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String,
    default: () => uuidv4(), 
    unique: true,
  },
userId:{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
},
  orderItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
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
    status: {
    type: String,
    required: true,
    enum: ['Pending', 'Shipped', 'Out for Delivery','Delivered', 'Cancelled', 'Returned'],
  },
  returnStatus:{
    type:String,
    enum:['Rejected','Approved','Requested',]
  },
  returnReason:{
type:String,
  },
  deliveredAt:{
    type:Date,
    
  }
  }],

  totalPrice: {
    type: Number,
    required: true,
  },

  discount: {
    type: Number,
    default: 0,
  },

  finalAmount: {
    type: Number,
    required: true,
  },

  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true,
  },
  paymentMethod: {
  type: String,
  enum: ['cod', 'creditCard', 'paypal'], 
  required: true,
},
invoiceDate: {
    type: Date,
  },

createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
updatedOn: {
  type: Date,
  default: null,
}

 
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
