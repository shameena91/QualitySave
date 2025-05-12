const mongoose=require('mongoose')
const { schema } = require('./userSchema')

const cartSchema=new mongoose.Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true

    },
    cartItems:[{
        productId:{
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
        salePrice:{
            type:Number,
            required:false
        },
        totalSalePrice:{
type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            default:"placed"
        },
       
    }]
})

const Cart=mongoose.model("Cart",cartSchema)
module.exports=Cart