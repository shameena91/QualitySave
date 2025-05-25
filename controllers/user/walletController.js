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
         const page = parseInt(req.query.page) || 1;
    const limit = 5;  // number of products per page to show
    const skip = (page - 1) * limit;
        const userId=req.session.user
        const userData=await User.findById(userId)
       
      
        .lean()

      const walletHistory = userData.walletHistory
      ?.reverse();
       const paginatedwalletHistory = walletHistory.slice(0, skip + limit);

    const totalCount = walletHistory.length;

    const hasMore = page * limit < totalCount;
        return res.render("walletTransaction",{user:userData,
          walletHistory:paginatedwalletHistory,
           currentPage: page,
      hasMore,
        })
      
    } catch (error) {
        
    }
}
module.exports={
    getWallet,
    walletTransaction
}