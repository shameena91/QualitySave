const mongoose=require('mongoose')
const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true

    },
    phone:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    gender:{
        type:String,
        required:false,
        default:null
    },
    profileImage:{
        type:String,
        required:false
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true,
       
    },
    password:{
        type:String,
        required:false,       
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    wallet:{
        type:Number,
        default:0
    },
    walletHistory: [
  {
    amount: {
         type: Number, 
        required: true 
    },
    type: { 
        type: String,
         enum: ['credit', 'debit'],
          required: true
     },
    reason: { 
        type: String
     },
    date: { 
        type: Date, 
        default: Date.now }
  }
],
 referralCode: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: String,
    default: null,
  }
   


})



const User=mongoose.model("User",userSchema)
module.exports =User