const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const { editAddressPage } = require("./addressController");

const getCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    const userAddressDoc = await Address.findOne({ userId: userId }).lean();
    const user = await User.findById(userId).lean();
    const cartItemsDoc = await Cart.findOne({ userId: userId })
      .populate("cartItems.productId")
      .lean();

    if (
      !userAddressDoc ||
      !userAddressDoc.address ||
      userAddressDoc.address.length === 0
    ) {
      return res.render({
        addresses: [],
        message: "No saved addresses found.",
      });
    }

    const addresses = userAddressDoc.address;
    const cartProducts = cartItemsDoc.cartItems;

    const finalSalePrice = cartProducts.reduce((acc, curr) => {
      return acc + curr.totalSalePrice;
    }, 0);

    const finalTotalPrice = cartProducts.reduce((acc, curr) => {
      return acc + curr.totalPrice;
    }, 0);
    const totalDiscount = finalSalePrice - finalTotalPrice;

    res.render("checkout", {
      user,
      addresses,
      cartProducts,
      finalSalePrice,
      finalTotalPrice,
      totalDiscount,
    });
  } catch (error) {
    console.error("Error in getCheckout:", error.message);
    res
      .status(500)
      .render("errorPage", {
        message: "Something went wrong during checkout.",
      });
  }
};

const checkoutAddaddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      fullName,
      phone,
      pincode,
      city,
      houseDetails,
      state,
      landMark,
      altphone,
      addressType,
    } = req.body;
    console.log(fullName, phone, pincode, city, houseDetails, addressType);
    const userData = await User.findOne({ _id: userId });

    const userAddress = await Address.findOne({ userId: userData._id });
    if (!userAddress) {
      const newAddress = new Address({
        userId: userData._id,
        address: [
          {
            addressType,
            fullName,
            houseDetails,
            city,
            landMark,
            state,
            pincode,
            phone,
            altphone,
          },
        ],
      });
      await newAddress.save();
    } else {
      userAddress.address.push({
        addressType,
        fullName,
        houseDetails,
        city,
        landMark,
        state,
        pincode,
        phone,
        altphone,
      });
      await userAddress.save();
    }
    res.redirect("/checkout");
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

const createOrder = async (req, res) => {
  try {
    const userId = req.session.user;

    const { addressId, paymentMethod } = req.body;
    // const userAddressDoc = await Address.findOne({ userId:userId }).lean();

    console.log(addressId);
    console.log(paymentMethod);

    const cartItemsDoc = await Cart.findOne({ userId: userId })
      .populate("cartItems.productId")
      .lean();
    console.log("docssss", cartItemsDoc);

    const orderItems = cartItemsDoc.cartItems.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.price,
      status: "Pending",
    }));
    console.log("odrer", orderItems);

    const finalAmount = cartItemsDoc.cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    ); // Sum of all item totals
    const totalAmount = cartItemsDoc.cartItems.reduce(
      (sum, item) => sum + item.totalSalePrice,
      0
    );
    const discount = totalAmount - finalAmount;
    console.log("amounu:", finalAmount);
    console.log(totalAmount);

    const newOrder = new Order({
      userId: userId,
      orderItems,
      totalPrice: totalAmount,
      discount,
      finalAmount: finalAmount,
      address: addressId,

      invoiceDate: new Date(),
      paymentMethod,
    });
    console.log("nnnn", newOrder);
    await newOrder.save();
    await Cart.findOneAndDelete({ userId: userId });

    for (let item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity },
      });
    }

    res
      .status(201)
      .json({
        message: "Order created successfully.",
        orderId: newOrder.orderId,
      });
  } catch (error) {
    console.error("Error creating order:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while creating the order." });
  }
};

const getOrderSuccess = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user;
    const user = await User.findById(userId).lean();

    res.render("orderPlaced", { orderId, user });
  } catch (error) {
    console.error( error);
    res.status(500).send("Internal Server Error");
  }
};

const getMyOrders = async (req, res) => {
  try {
    const search = req.query.search || "";
    const userId = req.session.user;
      const page = parseInt(req.query.page) || 1;
    const limit = 5;  // number of products per page to show
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).lean();
    const searchExpn = new RegExp(search.trim(), "i");
    const productIds = await Product.find({ productName: searchExpn })
      .distinct("_id")
   
    console.log("kkkkkkkkkkkk", productIds);
    console.log(searchExpn)

    const query = {userId,
     
      $or: [
        { orderId: { $regex: searchExpn } },
        { "orderItems.product": { $in: productIds } },
      ],
    };

    const orederedProduct = await Order.find(query)
      .sort({ createdOn: -1 })
      .populate("orderItems.product")
      .lean();
 console.log("Orderssssssssssss:", orederedProduct);
    const products =
     orederedProduct.flatMap((order) =>

       order.orderItems
    .filter((item) => {
      if (!search) return true;
      return (
        item.product?.productName?.match(searchExpn) ||
        order.orderId.match(searchExpn)
      );
    })
    

   .map((item) => ({
        orderId: order.orderId,
        orderDate: order.createdOn.toLocaleDateString(),
        orderTime: order.createdOn.toLocaleDateString(),
        productName: item.product?.productName || "deletedProduct",
        productImage: item.product?.productImage[0],
        quantity: item.quantity,
        price: item.price * item.quantity,
        productId: item.product?._id,

        status: item.status,
        productId: item.product._id,
      }))
    );
    const paginatedProducts = products.slice(0, skip + limit);

    const totalProductsCount = products.length;

    const hasMore = page * limit < totalProductsCount;
   
    console.log("All Ordered Products:", products);

    res.render("myOrders", { orederedProduct, products:paginatedProducts, user ,search,
      currentPage: page,
      hasMore,});
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId, productId } = req.params;
    console.log("orderid", orderId);
    const user = await User.findById(userId).lean();

    console.log("proid", productId);
    const order = await Order.findOne({ orderId: orderId, userId: userId })
      .populate("orderItems.product")
      .lean();

    console.log(order);
    const addressId = order.address;
    const viewAddress = await Address.findOne({ userId: userId }).lean();
    specifiedAddress = viewAddress.address.find((item) => {
      console.log("aaai", item._id);
      return item._id.toString() === addressId.toString();
    });
    console.log("add", addressId, specifiedAddress);

    const specifiedProduct = order.orderItems.find((item) => {
      //    console.log(item.product.toString())
      return item.product._id.toString() === productId;
    });

    console.log("ggggg", specifiedProduct);
    const totalPrice =
      specifiedProduct.product.salePrice * specifiedProduct.quantity;
    const finalAmount = specifiedProduct.price * specifiedProduct.quantity;
    const discount = totalPrice - finalAmount;
    res.render("viewOrderDetail", {
      product: specifiedProduct.product,
      quantity: specifiedProduct.quantity,
      price: specifiedProduct.price,
      status: specifiedProduct.status,
      returnStatus: specifiedProduct.returnStatus,
      specifiedAddress,
      totalPrice,
      finalAmount,
      discount,
      orderId,
      user,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId, productId, reason } = req.body;
    console.log(
      `Order ${orderId}, Product ${productId} cancelled for reason: ${reason}`
    );

    const order = await Order.findOne({ userId: userId, orderId: orderId });
    console.log("lasttt", order);
    const specifiedProduct = order.orderItems.find((item) => {
      return item.product._id.toString() === productId;
    });
    specifiedProduct.status = "Cancelled";

    await order.save();
    await Product.findByIdAndUpdate(productId, {
      $inc: { quantity: specifiedProduct.quantity },
    });

    res.redirect("/my-orders");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cancelling the order");
  }
};

const returnRequest = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    console.log(orderId, productId);
    const { reason } = req.body;
    console.log(reason);

    const order = await Order.findOne({ orderId: orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.orderItems.find(
      (i) => i.product.toString() === productId
    );
    if (!item)
      return res.status(404).json({ message: "Product not found in order" });

    if (item.status !== "Delivered") {
      return res
        .status(400)
        .json({ message: "Return can only be requested for delivered items" });
    }
    if (item.returnStatus) {
      return res
        .status(400)
        .json({ message: "Already send return request cannot send again" });
    } else {
      item.returnStatus = "Requested";
      item.returnReason = reason;
      await order.save();

      res.json({ message: "Return request submitted successfully." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  getCheckout,
  createOrder,
  getOrderSuccess,
  getMyOrders,
  getOrderDetail,
  cancelOrder,
  returnRequest,
  checkoutAddaddress,
};
