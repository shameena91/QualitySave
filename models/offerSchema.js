const mongoose=require ('mongoose')
const offerSchema= new mongoose.Schema({
offerName: {
    type: String,
     required: true 
    },
  type:{ 
    type: String,
     enum: ['product', 'category'], 
     required: true
     },
  code:{ 
    type: String,
     required: true, 
     unique: true 
    },
  discount:{ 
    type: Number, 
    required: true 
},
  validUntil:{ 
    type: Date,
     required: true 
    },
  products:[{ 
    type: mongoose.Schema.Types.ObjectId,
     ref: 'Product' 
    }], 
     
  category:{ 
    type: mongoose.Schema.Types.ObjectId,
     ref: 'Category' }, 
     
}, { timestamps: true });

   const Offer=mongoose.model("Offer",offerSchema)
   
   module.exports=Offer