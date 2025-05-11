const mongoose=require('mongoose')

const wishlistSchema=new mongoose.Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    products:[{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
         addedOn:{
        type:Date,
        default:Date.now,

    }
    }],
   
    
},
{ timestamps: true } 
)
const Wishlist=mongoose.model("Wishlist",wishlistSchema)
module.exports=Wishlist