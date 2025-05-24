const User = require("../../models/userSchema")

const getWallet=async(req,res)=>{
    try {

        const userId=req.session.user
        const userData=await User.findById(userId)
       
      
        .lean()

      const walletHistory = userData.walletHistory
      ?.slice(-3) // gets last 3 entries
      .reverse();
        return res.render("wallet",{user:userData,
          walletHistory})
    } catch (error) {
        
    }
}
const walletTransaction =async(req,res)=>{
    try {
       
        const userId=req.session.user
        const userData=await User.findById(userId)
       
      
        .lean()

      const walletHistory = userData.walletHistory
      ?.reverse();
        return res.render("walletTransaction",{user:userData,
          walletHistory})
      
    } catch (error) {
        
    }
}
module.exports={
    getWallet,
    walletTransaction
}