const express=require('express')
const app= express();
const env=require("dotenv").config();
const connectDb=require("./config/db")
connectDb()


app.listen(process.env.PORT,()=>{
    console.log("Server Running........")
    
})



module.exports = app