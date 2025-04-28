const mongoose=require('mongoose')
const{v4:uuidv4}=require('uuid')
const User = require('./userSchema')


const orderSchema=new mongoose.Schema({
    oderId:{
        type:String,
        default:()=>uuid4(),
        unique:true,
    },

    orderItems:[{
        product:{
                    type:mongoose.Schema.Types.ObjectId,
                    ref:'Product',
                    required:true,
                },
                quantity:{
                    type:Number,
                    required:true
                },
                price:{
                    type:Number,
                    required:true
                },
               


    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        defaul:0
    },

    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:mongoose.Schema.Types.ObjectId,
        refer:'User',
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Request','Returned']
    },
    createdOn:{
        type:Date,
         default:Date.now,
         required:true
    },
    couponApplied:{
type:Boolean,
default:false
    }
})

const Order=mongoose.model("Order",orderSchema)
module.exports=Order