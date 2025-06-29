const PDFDocument = require("pdfkit");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user;

    const order = await Order.findOne({ orderId })
      .populate("orderItems.product")
      .populate("userId")
      .lean();

    const address = await Address.findOne({ userId }).lean();
    if (!order) return res.status(404).send("Order not found");

    const orderDate = new Date(order.createdOn).toLocaleDateString();
    const deliveryAddress = address?.address?.[0] || {};

    let orderItems = order.orderItems;
    if (order.paymentMethod !== "razorpay") {
      orderItems = orderItems.filter((item) => item.status !== "Cancelled");
    }
    if(order.paymentMethod === "wallet")
    {
          orderItems = order.orderItems;

    }

    let subtotal = 0;
    let discountTotal = 0;
    orderItems.forEach(item => {
      subtotal += item.quantity * item.product.salePrice;
      discountTotal += item.discountedAmount;
    });

    const couponDiscount = order.couponDiscount || 0;
    const finalAmount = subtotal - discountTotal - couponDiscount + order.shipping;

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${orderId}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text("INVOICE", { align: "center" }).moveDown();

    doc.fontSize(12).text("From:", { underline: true });
    doc.text("Quality Save\n123 Business Street\nKollam, Kerala 691536\nPhone: 9876543210\nEmail: support@yourstore.com").moveDown();

    doc.text("To:", { underline: true });
    doc.text(`${deliveryAddress.fullName || ""}\n${deliveryAddress.houseDetails || ""}\n${deliveryAddress.city || ""}, ${deliveryAddress.state || ""} - ${deliveryAddress.pincode || ""}\nPhone: ${deliveryAddress.phone || ""}`).moveDown();

let detailsY = doc.y;

doc.font("Helvetica-Bold").text("Order ID:", 50, detailsY, { continued: true });
doc.font("Helvetica").text(` ${order.orderId}`, { continued: true });

doc.font("Helvetica-Bold").text("    Order Date:", { continued: true });
doc.font("Helvetica").text(` ${orderDate}`);
let currentY = doc.y;

doc.font("Helvetica-Bold").text("Payment Method:", 50, currentY, { continued: true });

doc.font("Helvetica").text(` ${order.paymentMethod === "razorpay" ? "Online" : order.paymentMethod}`);

doc.moveDown();

    const startY = doc.y + 10;
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Product", 50, startY);
    doc.text("Qty", 300, startY, { width: 30, align: "right" });
    doc.text("Price", 360, startY, { width: 60, align: "right" });
    doc.text("Total", 440, startY, { width: 80, align: "right" });

    doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();

    let y = startY + 25;
    doc.font("Helvetica").fontSize(10);

    orderItems.forEach(item => {
      const name = item.product?.productName || "Unnamed Product";
      const qty = item.quantity;
      const price = item.price;
      const total = qty * price;

      if (y > 720) {
        doc.addPage();
        y = 50;
      }

      doc.text(name, 50, y, { width: 230 });
      doc.text(`${qty}`, 300, y, { width: 30, align: "right" });
      doc.text(`${price.toFixed(2)}`, 360, y, { width: 60, align: "right" });
      doc.text(`${total.toFixed(2)}`, 440, y, { width: 80, align: "right" });
      y += 20;
    });

    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 20;

    doc.font("Helvetica-Bold");
    doc.text(`Subtotal:`, 360, y, { width: 100, align: "right" });
    doc.text(`${subtotal.toFixed(2)}`, 470, y, { width: 80, align: "right" });
    y += 15;

    doc.text(`Discount:`, 360, y, { width: 100, align: "right" });
    doc.text(`- ${discountTotal.toFixed(2)}`, 470, y, { width: 80, align: "right" });
    y += 15;

    if (couponDiscount > 0) {
      doc.text(`Coupon Discount:`, 360, y, { width: 100, align: "right" });
      doc.text(`- ${couponDiscount.toFixed(2)}`, 470, y, { width: 80, align: "right" });
      y += 15;
    }

    doc.text(`Shipping:`, 360, y, { width: 100, align: "right" });
    doc.text(`${order.shipping.toFixed(2)}`, 470, y, { width: 80, align: "right" });
    y += 15;

    doc.fontSize(13).text(`Grand Total:`, 360, y, { width: 100, align: "right", underline: true });
    doc.text(`${finalAmount.toFixed(2)}`, 470, y, { width: 80, align: "right", underline: true });

    doc.end();
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).send("Error generating PDF");
  }
};

module.exports = {
  downloadInvoice,
};



