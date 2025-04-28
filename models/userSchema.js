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
        unique:false,
        sparse:true,
        default:null
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
    cart:[{
type:mongoose.Schema.Types.ObjectId,
ref:"Cart"
    }],
    wallet:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Wallet"
    }],
    orderHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdAt:{
        type:Date,
        default:Date.now
    },
    referalCode:{
        type:String,
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory:[{
        category:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Category"
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            // default:Date.now
        } 
    }]

})



const User=mongoose.model("User",userSchema)
module.exports =User