const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");

const getOrderDetails=async(req,res)=>{
    try {


        const orderdata=await Order.find()
        .populate('orderItems.product')
        .populate('userId')
        .lean()
        console.log("ordre:",orderdata)
      const products=orderdata.flatMap(order =>
      order.orderItems.map(item =>({
        orderId:order.orderId,
        orderDate:order.createdOn.toLocaleDateString(),
        orderTime:order.createdOn.toLocaleTimeString(),
        productName:item.product?.productName|| 'deletedProduct',
        quantity:item.quantity,
        price:item.price * item.quantity,
        user:order.userId?.name,
        status:item.status,
      }))
      )
      
console.log(products)
       
        // const orederItems=orderdata.orderItems
        // console.log("ordreit:",orederItems)

    //      const search = req.query.search || "";
    // const page = parseInt(req.query.page) || 1;
    // const limit = 8;
    //   const searchExp = new RegExp(search.trim(), "i"); 
    // const orderIds = await Order.find({ orderId: { $regex: searchExp } }).distinct("_id");
    // const user = await User.find({ name: { $regex: searchExp } }).distinct("_id");
    // console.log("cat:",orderIds)

    // const orderData = await Order.find({
    //   $or: [
       
    //     { name: { $in: user } },
    //     { orderId: { $in: orderIds } }
    //   ],
    // })
    //   .populate("orderItems")
    //   .limit(limit)
    //   .skip((page - 1) * limit)
    //   .sort({createdAt:-1})
    //   .lean()
    //   .exec();
    //   console.log("Search term:", search);  // Log the search term
    
    // const countProduct = await Order.countDocuments({
    //   $or: [
    //      { name: { $in: user } },
    //     { orderId: { $in: orderIds } }
    //   ],
    // });

    // const totalPages = Math.ceil(countProduct / limit);

    // // const category = await Category.find({ isListed: true });
    // // const brand = await Brand.find({ isBlocked: false });
    res.render("orderManagement",{
     products
    })
    } catch (error) {
        console.log(error)
    }
}

module.exports={
    getOrderDetails
}