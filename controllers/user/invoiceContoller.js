const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const fs = require("fs").promises;
const path = require("path");
const hbs = require("express-handlebars").create();
const puppeteer = require("puppeteer");
const Handlebars = require("handlebars");

// Register needed helpers manually
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("add", (a, b) => a + b);
Handlebars.registerHelper("sub", (a, b) => a - b);
Handlebars.registerHelper("formatDate", (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
);

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.params.productId;
    const userId = req.session.user;
    const order = await Order.findOne({ orderId: orderId })
      .populate("orderItems.product")
      .populate("userId")

      .lean();
    const address = await Address.findOne({ userId: userId })
    .lean();

    console.log("sssss", address);
    if (!order) {
      return res.status(404).send("Order not found");
    }
    console.log("ddddddddddddddddddddd", order);

    const templatePath = path.join(__dirname, "../../views/user/invoice.hbs");
    console.log(templatePath);
    const templateContent = await fs.readFile(templatePath, "utf-8");

    const template = Handlebars.compile(templateContent);
    const orderDate = order.createdOn.toLocaleDateString();

    let orderProduct
if(order.paymentMethod==="razorpay")
{
  orderProduct= order.orderItems
  
deliveredTotalPrice=orderProduct.reduce((acc,item)=>{
  return acc+item.quantity*item.product.salePrice
},0)
deliveredTotaldiscount=orderProduct.reduce((acc,item)=>{
  return acc+item.discountedAmount
},0)
}
else {
  
 orderProduct  = order.orderItems.filter(item => item.status !== "Cancelled");

   deliveredTotalPrice = orderProduct
  .reduce((acc, item) => acc + item.quantity * item.product.salePrice, 0);

  deliveredTotaldiscount= orderProduct
  .reduce((acc, item) => acc +  item.discountedAmount, 0);
  
  }
  const finalAmount=deliveredTotalPrice-deliveredTotaldiscount+order.shipping
    console.log(orderProduct);

    const products = orderProduct.map((item) => ({
      productName: item.product?.productName,
      quantity: item.quantity,
      price: item.price,
      total: item.quantity * item.price,
    }));
    const deliveryAddress = address?.address?.[0] || {};
    const html = template({
      discount: order.totalPrice - order.finalAmount,
      order,
      finalAmount,
    totalDiscount:deliveredTotaldiscount,
  totalPrice:deliveredTotalPrice,
      orderDate,
      products,
      userAddress: deliveryAddress.houseDetails || "",
      userCity: deliveryAddress.city || "",
      userState: deliveryAddress.state || "",
      userPincode: deliveryAddress.pincode || "",
      userPhone: deliveryAddress.phone || "",
      userFullName: deliveryAddress.fullName || "",
    });

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px" },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice_${orderId}.pdf`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).send("Error generating PDF");
  }
};

module.exports = {
  downloadInvoice,
};
