
const Coupon=require('../../models/couponSchema')
const getCoupon=async(req,res,next)=>{
    try {
        const coupons=await Coupon.find().lean();
        console.log(coupons)
      
        // const endDate=coupons.expireOn.toLocalDateString()

        res.render("coupon",{coupons})
    } catch (error) {
        next(error)
    }
}

const addCoupon=async(req,res,next)=>{
    try {
        
const data={
    couponName:req.body.couponName,
        startDate:new Date(req.body.startDate + "T00:00:00"),
    endDate:new Date(req.body.endDate + "T00:00:00"),
    offerPrice:parseInt(req.body.offerPrice),
    minPrice:parseInt(req.body.minimumPrice)
}
const newCoupon=new Coupon({
    name:data.couponName,
    createdOn:data.startDate,
    expireOn:data.endDate,
    offerPrice:data.offerPrice,
    minimumPrice:data.minPrice
})
await newCoupon.save()
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