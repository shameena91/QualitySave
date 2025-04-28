const moongoose=require('moongoose')

const bannerSchema=new mongoose.Schema({
    image:{
        type:String,
        required:true
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        require:true
    },
    link:{
        type:String,
    },
    startDate:{
        type:Date,
        required:true

    },
    endDate:{
        type:Date,
        required:true
    }
})

const Banner=moongoose.model("Banner",bannerSchema)
module.exports=Banner