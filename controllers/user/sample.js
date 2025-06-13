const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId, paymentMethod,amount ,shippingCharge} = req.body;

    if (!addressId || !paymentMethod) {
      return res.status(400).json({ message: "Address and payment method required." });
    }

    const amountPay=amount-shippingCharge
    // 1. Get user's cart
    const userCart = await Cart.findOne({ userId }).populate('cartItems.productId').lean();
    console.log("111111111",amount)
    // 2. Calculate totals
 const finalAmount = userCart.cartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    ); // Sum of all item totals
    const totalAmount = userCart.cartItems.reduce(
      (sum, item) => sum + item.totalSalePrice,
      0
    );
     const discount = totalAmount - finalAmount;
      const couponDiscount= finalAmount-amountPay
console.log("jjjjjjjjjjjjjjjjjjjjjj");

      console.log(totalAmount)
      console.log(finalAmount)
      console.log(discount)

      console.log(couponDiscount)
    // const totalPrice = userCart.cartItemsitems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    // const discount = 0; // apply logic if needed
    // const finalAmount = totalPrice - discount;

    // 3. Create the Order (not marking as paid yet)
    const newOrder = new Order({
      userId,
      orderItems: userCart.cartItems.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        status: 'Pending'
      })),
      totalPrice:totalAmount,
      discount,
       couponDiscount:couponDiscount,
      finalAmount: amount,
    
      address: addressId,
      paymentMethod:paymentMethod,
      invoiceDate: new Date(),
      razorpayStatus:"created"
    });

    await newOrder.save();
    console.log(newOrder)
console.log("Creating Razorpay order with:", {
  amount: amount * 100,
  currency: "INR",
  receipt: String(newOrder._id),
  payment_capture: 1,
});
    

    // 4. Create Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amount * 100, // in paise
      currency: "INR",
      receipt: String(newOrder._id),
      payment_capture: 1,
    });
    

    // 5. Return data to client
    res.status(200).json({
      key: process.env.RAZORPAY_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: newOrder._id,
      razorpayOrderId: razorpayOrder.id,
      orderDetails: {
        totalAmount,
        discount,
        finalAmount,
      
      }
    });

  } catch (error) {
    console.log(error)
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({ message: "Server error while creating Razorpay order." });
  }
};



const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;
console.log("ttttttt",razorpayOrderId, razorpayPaymentId, razorpaySignature)
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
console.log("gggggg",generatedSignature)
    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid signature" });
    }
const order= await Order.findById(orderId)
   await Order.findByIdAndUpdate(orderId, {
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  razorpayStatus: 'paid',
 
});
   const updatedOrder = await Order.findById(orderId);

if (updatedOrder && updatedOrder.razorpayStatus === "paid") {
  await Ledger.create({
    user: updatedOrder.userId,
    orderId: updatedOrder._id,
    type: "credit",
    amount: updatedOrder.finalAmount,
    paymentMethod: updatedOrder.paymentMethod,
    description: `Order payment received for Order ${updatedOrder.orderId}`
  });
}
    for (let item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { quantity: -item.quantity }
      });
    }

    await Cart.findOneAndDelete({ userId: order.userId });

    res.status(200).json({ message: "Payment verified" });
  } catch (err) {
    console.error("Payment verification failed:", err);
    res.status(500).json({ message: "Error verifying payment" });
  }
};







const selectedAddressRadio = document.querySelector('input[name="address"]:checked');
    const selectedAddressId = selectedAddressRadio ? selectedAddressRadio.getAttribute('data-id') : null;

    const selectedPaymentRadio = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = selectedPaymentRadio ? selectedPaymentRadio.value : null;
  const finalAmountText=document.getElementById("finalAmount").textContent
const payableAmount = parseFloat(finalAmountText.replace('₹', '').trim());
  const shippingText=document.getElementById("shipping").textContent
const shipping = parseFloat(shippingText.replace('₹', '').trim());

   
   if (!selectedAddressId || !paymentMethod) {
     Swal.fire({
      title: 'Missing Information',
      text: 'Please select both an address and a payment method.',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
    }
 if (paymentMethod === 'cod') {
    // COD route
    $.ajax({
      url: '/createOrder',
      method: 'POST',
      data: {
        addressId: selectedAddressId,
        paymentMethod: 'cod',
        amount:payableAmount,
        shippingCharge:shipping
      },
      success: function (response) {
        Swal.fire({
          title: 'Order Placed!',
          text: 'Your COD order has been successfully created.',
          icon: 'success',
          confirmButtonText: 'OK'
        }).then(() => {
          window.location.href = `/orderSuccess/${response.orderId}`;
        });
      },
      error: function () {
        Swal.fire({
          title: 'Order Failed',
          text: 'Something went wrong. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  } 
  else if (paymentMethod === 'razorpay') {
    // Razorpay route
    $.ajax({
      url: '/createRazorpayOrder',
      method: 'POST',
      data: {
        addressId: selectedAddressId,
         paymentMethod: 'razorpay',
         amount:payableAmount,
          shippingCharge:shipping
      },
      success: function (response) {
        const options = {
          key: response.key,
          amount: response.amount,
          currency: response.currency,
          name: "quality save",
          description: "Order Payment",
          order_id: response.razorpayOrderId,
          handler: function (paymentResult) {
            verifyPayment(paymentResult, response.orderId);
          },
          modal: {
            ondismiss: function () {
              Swal.fire({
                title: 'Payment Cancelled',
                text: 'You cancelled the payment. Please try again.',
                icon: 'warning',
                confirmButtonText: 'OK'
              });
            }
          },
  
        };
        const rzp = new Razorpay(options);
         rzp.on('payment.failed', function () {
        window.location.href = `/orderFailure/${response.orderId}`;
      });
        rzp.open();
      },
      error: function () {
        Swal.fire({
          title: 'Order Failed',
          text: 'Something went wrong while initiating Razorpay payment.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }
}
function verifyPayment(paymentResult, orderId) {
  $.ajax({
    url: '/verifyPayment',
    method: 'POST',
    data: {
      razorpayOrderId: paymentResult.razorpay_order_id,
      razorpayPaymentId: paymentResult.razorpay_payment_id,
      razorpaySignature: paymentResult.razorpay_signature,
      orderId: orderId
    },
    success: function () {
      window.location.href = `/orderSuccess/${orderId}`;
    },
    error: function () {
      window.location.href = `/orderFailure/${orderId}`;
    }
  });
}