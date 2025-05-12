const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");



const getCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    const userAddressDoc = await Address.findOne({ userId:userId }).lean();

    const cartItemsDoc=await Cart.findOne({userId:userId})
    .populate("cartItems.productId")
    .lean();

    if (!userAddressDoc || !userAddressDoc.address || userAddressDoc.address.length === 0) {
      return res.render("checkout", { addresses: [], message: "No saved addresses found." });
    }

    const addresses = userAddressDoc.address;
    const cartProducts=cartItemsDoc.cartItems

    const finalSalePrice=cartProducts.reduce((acc,curr)=>{
        return acc+curr.totalSalePrice
    },0)

 const finalTotalPrice=cartProducts.reduce((acc,curr)=>{
        return acc+curr.totalPrice
    },0)
    const totalDiscount=finalSalePrice-finalTotalPrice





    res.render("checkout", { addresses,cartProducts,finalSalePrice,finalTotalPrice,totalDiscount });
  } catch (error) {
    console.error("Error in getCheckout:", error.message);
    res.status(500).render("errorPage", { message: "Something went wrong during checkout." });
  }
};
 const createOrder=async(req,res)=>{
    try {
            const userId = req.session.user;

        const {addressId,paymentMethod}=req.body
            // const userAddressDoc = await Address.findOne({ userId:userId }).lean();

        console.log(addressId)
            console.log(paymentMethod)

        const cartItemsDoc=await Cart.findOne({userId:userId}).populate('cartItems.productId')
    .populate("cartItems.productId")
    .lean();
            console.log("docssss",cartItemsDoc)

    const orderItems=cartItemsDoc.cartItems.map(item=>({
        product:item.productId,
        quantity:item.quantity,
        price:item.price
    }))
    console.log("odrer",orderItems)

const finalAmount = cartItemsDoc.cartItems.reduce((sum, item) => sum + item.totalPrice, 0);  // Sum of all item totals
   const totalAmount=cartItemsDoc.cartItems.reduce((sum, item) => sum + item.totalSalePrice, 0);
const discount=totalAmount-finalAmount
console.log("amounu:",finalAmount)
console.log(totalAmount)

const newOrder = new Order({
      userId: userId,
      orderItems,
      totalPrice:totalAmount,
      discount,
      finalAmount:finalAmount,
      address: addressId,
      status: 'Pending',
      invoiceDate: new Date(),
      paymentMethod,
    });
console.log(newOrder)
    await newOrder.save();
    await Cart.findOneAndDelete({ userId: userId });
    res.status(201).json({ message: 'Order created successfully.', orderId: newOrder.orderId });

    } catch (error) {
        
    }
 }

module.exports={
    getCheckout,
    createOrder

}