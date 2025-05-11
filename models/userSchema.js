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
   


})



const User=mongoose.model("User",userSchema)
module.exports =User