
const Coupon=require('../../models/couponSchema')
const getCoupon = async (req, res, next) => {
  try {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // Update expired coupons to inactive and not listed
    await Coupon.updateMany(
      { expireOn: { $lt: todayDate }, isList: true },
      { $set: { status: "Inactive" } }
    );

    // Fetch only active & listed coupons
    const coupons = await Coupon.find({ isList: true}).sort({createdOn:-1})
    .lean();

    res.render("coupon", { coupons });
  } catch (error) {
    next(error);
  }
};


const addCoupon=async(req,res,next)=>{
    try {
        
const data={
    couponName:req.body.couponName,
        startDate:new Date(req.body.startDate + "T00:00:00"),
    endDate:new Date(req.body.endDate + "T00:00:00"),
    offerPrice:parseInt(req.body.offerPrice),
    minPrice:parseInt(req.body.minimumPrice)
}
   const coupons = await Coupon.find({ isList: true}).sort({createdOn:-1})
    .lean()
const couponExist=await Coupon.findOne({name:data.couponName})
if(couponExist)
{
 
  return res.render("coupon",{coupons, message: "Coupon Name  already exists" });
   
}
else
{
const newCoupon=new Coupon({
    name:data.couponName,
    createdOn:data.startDate,
    expireOn:data.endDate,
    offerPrice:data.offerPrice,
    minimumPrice:data.minPrice
})
await newCoupon.save()
    }

return res.redirect("/admin/coupons")
    } catch (error) {
       next(error ) 
    }
}


const updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { code, discount, minimumPrice, startDate, endDate } = req.body;
    console.log(couponId)

    await Coupon.findByIdAndUpdate(couponId, {
      name: code,
      offerPrice: discount,
      minimumPrice: minimumPrice,
      createdOn: new Date(startDate),
      expireOn: new Date(endDate)
    }, { new: true }
);

    res.status(200).json({ success: true, message: "Coupon updated" });
  } catch (error) {
    console.error("Update Coupon Error:", error);
    res.status(500).json({ success: false, message: "Failed to update coupon" });
  }
};
const deleteCoupon=async(req,res)=>{
    try {
        const {couponId}=req.params
        await Coupon.findByIdAndDelete(couponId)
         res.status(200).json({ success: true, message: "Coupon updated" });

    } catch (error) {
      console.log("ErrorDeleting coupon",error) 
       res.status(500).json({ success: false, message: "Failed to update coupon" }) 
    }
}
module.exports={getCoupon,
    addCoupon,
    updateCoupon,
    deleteCoupon
}