const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for admin transactions
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'paypal', 'cod', 'wallet'],
    required: false
  },
  description: {
    type: String,
    required: true
  },
 
  createdAt: {
    type: Date,
    default: Date.now
  }
});

   const Ledger=mongoose.model("Ledger",ledgerSchema)
   
   module.exports=Ledger
