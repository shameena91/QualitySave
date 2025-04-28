const mongoose=require('mongoose')
const productSchema=new mongoose.Schema({
productName:{
    type:String,
    required:true
},
description:{
    type:String,
    required:true
},
productImage:{
    type:[String],
    required:true
},
brand:{
    type:String,
    required:true
},
category:{
    type:String,
    ref:"Category",
},
regularPrice:{
    type:Number,
    required:true
},
salePrice:{
    type:Number,
    required:true
},
productOffer:{
    type:Number,
    default:0
},
quantity:{
    type:Number,
    default:0
},
isBlocked:{
    type:Boolean,
    default:false
},
unit:{
    type:String,enum: ['kg', 'gm', 'ltr', 'ml', 'pcs'],
     required: true,
     default:"gm"
    },
status:{
    type:String,
    enum:["Available","Out of stock","Discontinued"],
    default:"Available"
}

},{timestamps:true})
const Product=mongoose.model("Product",productSchema)
module.exports=Product