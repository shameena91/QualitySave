const User = require("../../models/userSchema")

const getWallet=async(req,res)=>{
    try {

        const userId=req.session.user
        const userData=await User.findById(userId).lean()
        
console.log(userData.wallet)
        return res.render("wallet",{user:userData})
    } catch (error) {
        
    }
}

module.exports={
    getWallet
}