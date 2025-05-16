const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");

const getOrderDetails = async (req, res) => {
  try {
    const search = req.query.search || "";
    const statusFilter = req.query.statusFilter;
   
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 4;
    const skip = (currentPage - 1) * itemsPerPage;

    const searchExp = new RegExp(search.trim(), "i");

    // Find user IDs matching search
    const userIds = await User.find({ name: { $regex: searchExp } }).distinct("_id");

    // Build filter
    const query = {
      $or: [
        { userId: { $in: userIds} },
        { orderId: { $regex: searchExp } }
      ]
    };

    if (statusFilter) {
      query["orderItems.status"] = statusFilter;
    }

    const orderdata = await Order.find(query)
      .populate("orderItems.product")
      .populate("userId")
      .sort({createdOn:-1})  
      .lean();
  

 
      const allOrders= await Order.find()

      const requestItem = allOrders.flatMap(order =>
  order.orderItems.filter(item => item.returnStatus === "Requested")
);
      console.log( "lllllllll",requestItem.length)
     

    

    if (orderdata.length === 0) {
      return res.render("notFound", { search,statusFilter });
    }

    
    const products = orderdata.flatMap(order =>
      order.orderItems.map(item => ({
        orderId: order.orderId,
        orderDate: order.createdOn.toLocaleDateString(),
        orderTime: order.createdOn.toLocaleTimeString(),
        productName: item.product?.productName || "deletedProduct",
        productImage:item.product?.productImage[0],
        quantity: item.quantity,
        price: item.price * item.quantity,
        user: order.userId?.name,
        status: item.status,
        productId:item.product._id,
        returnStatus:item.returnStatus,
      
      }))
    );
    console.log(products)
    console.log("length:",products.length)
    const requestProduct=products.filter(item=>{
      return item.returnStatus==="Requested"
    })

    const totalPages = Math.ceil(products.length / itemsPerPage);
    const paginatedProducts = products.slice(skip, skip + itemsPerPage);

        console.log(totalPages)
    res.render("orderManagement", {
      products:paginatedProducts,
      totalPages,
      currentPage,
      search,
      statusFilter,
      requestCount:requestItem.length,
      requestProduct
    
    });

  } catch (error) {
    console.error("Error in getOrderDetails:", error);
    res.status(500).send("Internal Server Error");
  }
};



const updateStatus=async(req, res)=> {
  try {
    const { orderId ,productId} = req.params;
    const { status } = req.body;
    console.log("productid:",orderId,productId)
console.log(status)
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const order= await Order.findOne({orderId:orderId})
    console.log(order)

    const orderProduct = order.orderItems.find(item => 
        item.product.toString() === productId);
console.log(orderProduct)
   orderProduct.status=status

  
   

if (orderProduct.status === 'Delivered') {
  orderProduct.deliveredAt = new Date();
}
      await order.save();
      if(status === "Cancelled"){
        await Product.findByIdAndUpdate(productId, {
              $inc: { quantity:  orderProduct.quantity }
            });
        }else{
           await Product.findByIdAndUpdate(productId, {
              $inc: { quantity:  -orderProduct.quantity }
            }); 
        }
    res.json({ message: "Status updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

const orderView = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findOne({ orderId:orderId })
      .populate("orderItems.product")
      .lean();

    const addressId = order.address.toString();
    const userId = order.userId.toString();

    const addressList = await Address.findOne({userId: userId })
    .populate("address")
    .lean(); 
    

    const productshipAddress = addressList.address.find(item =>{
      return item._id.toString() === addressId
  });

    const orderProduct = order.orderItems.find(
       item => {
        return item.product._id.toString() === productId
  });
const totalPrice=orderProduct.product.salePrice * orderProduct.quantity
  const finalAmount=orderProduct.price * orderProduct.quantity
const discount=totalPrice-finalAmount
const date = order.createdOn
  ? order.createdOn.toLocaleDateString()
  : "N/A";
  const time = order.createdOn
  ? order.createdOn.toLocaleTimeString()
  : "N/A";

  const deliveryDate=orderProduct.deliveredAt?
  orderProduct.deliveredAt.toLocaleDateString():"N/A"
  const deliveryTime=orderProduct.deliveredAt?
  orderProduct.deliveredAt.toLocaleTimeString():"N/A"

  
console.log("nnn",deliveryDate)
    res.render("viewOrder", {
      productshipAddress,
      orderProduct,
      totalPrice,
      finalAmount,
      discount,
      orderId,
      date,
      time,
      deliveryDate,
      deliveryTime
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};


const updateReturnStatus = async (req, res) => {
 

  try {
     const { orderId, productId } = req.params;
  const { returnStatus } = req.body;
    const order = await Order.findOne({orderId:orderId});
     if (!order) {
      return res.status(404).json({ message: "Order not found" });
     
    }
     console.log("oooooooooo",order)
    const orderProduct = order.orderItems.find(
       item => {
        return item.product._id.toString() === productId
  });
  console.log("ppp",orderProduct)
    if (!orderProduct) {
      return res.status(404).json({ message: "Product not found in order" });
    }

    orderProduct.returnStatus = returnStatus;
    const userId=order.userId

    if (returnStatus === "Approved") {

       await Product.findByIdAndUpdate(productId, {
        $inc: { quantity:  orderProduct.quantity }
      });
      const user=await User.findById(userId)

      user.wallet=user.wallet+orderProduct.price*orderProduct.quantity
      await user.save()
     
    }

    await order.save();
    res.json({ message: "Return status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports={
    getOrderDetails,
    updateStatus,
    orderView,
    updateReturnStatus

}