const mongoose=require('mongoose')

const wishlistSchema=new mongoose.Schema({

    uderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    products:[{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product",
            required:true
        }
    }],
    addedOn:{
        type:Date,
        default:Date.now,

    }
    
})
const Wishlist=mongoose.model("Wishlist",wishlistSchema)
module.exports=Wishlist