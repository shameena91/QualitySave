const ExcelJS = require("exceljs");
const Order = require("../../models/orderSchema");
const PDFDocument = require("pdfkit");


const downloadExcel = async (req, res) => {
  try {
    const { reportType, fromDate, toDate, paymentMethod, status, search } = req.query;
    const filter = {};
    const now = new Date();
    let startDate, endDate;

    switch (reportType) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date();
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date();
        break;
      case "custom":
        if (fromDate && toDate) {
          startDate = new Date(fromDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(toDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
    }

    if (startDate && endDate) {
      filter.createdOn = { $gte: startDate, $lte: endDate };
    }
    if (paymentMethod && paymentMethod !== "all") filter.paymentMethod = paymentMethod;
    if (status && status !== "all") filter.status = status;

    let orders = await Order.find(filter).populate("couponUsed").lean();
    if (search) {
      orders = orders.filter((order) =>
        order.orderId.toLowerCase().includes(search.toLowerCase())
      );
    }

    let totalPriceSum = 0, discountSum = 0, couponDiscountSum = 0, finalAmountSum = 0;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Order ID", key: "orderId", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Payment Method", key: "paymentMethod", width: 20 },
      { header: "Total Amount", key: "totalPrice", width: 20 },
      { header: "Discount", key: "discount", width: 15 },
      { header: "Coupon Discount", key: "couponDiscount", width: 20 },
      { header: "Coupon", key: "coupon", width: 20 },
    ];

    orders.forEach((order) => {
      const discount = (order.discount || 0) + (order.couponDiscount || 0);
      const finalAmount = order.totalPrice - discount;

      worksheet.addRow({
        date: new Date(order.createdOn).toLocaleDateString(),
        orderId: order.orderId.toString().slice(-6).toUpperCase(),
        status: order.status,
        paymentMethod: order.paymentMethod,
        totalPrice: order.totalPrice,
        discount: discount,
        couponDiscount: order.couponDiscount || 0,
        coupon: order.couponUsed?.name || "N/A",
      });

      totalPriceSum += order.totalPrice;
      discountSum += discount;
      couponDiscountSum += order.couponDiscount || 0;
      finalAmountSum += finalAmount;
    });

    worksheet.addRow({});
    worksheet.addRow({
      date: "Summary",
      totalPrice: totalPriceSum,
      discount: discountSum,
      couponDiscount: couponDiscountSum,
      coupon: "Revenue: ₹" + finalAmountSum.toFixed(2),
    });

    worksheet.getRow(1).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="SalesReport.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating Excel report");
  }
};

const downloadPDF = async (req, res) => {
  try {
    const { reportType, fromDate, toDate, paymentMethod, status, search } = req.query;
    const filter = {};
    const now = new Date();
    let startDate, endDate;

    switch (reportType) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date();
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date();
        break;
      case "custom":
        if (fromDate && toDate) {
          startDate = new Date(fromDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(toDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
    }

    if (startDate && endDate) {
      filter.createdOn = { $gte: startDate, $lte: endDate };
    }
    if (paymentMethod && paymentMethod !== "all") filter.paymentMethod = paymentMethod;
    if (status && status !== "all") filter.status = status;

    let orders = await Order.find(filter).populate("couponUsed").lean();
    if (search) {
      orders = orders.filter((order) =>
        order.orderId.toLowerCase().includes(search.toLowerCase())
      );
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=SalesReport.pdf");

    doc.pipe(res);

    doc.fontSize(18).text("Sales Report", { align: "center" });
    doc.moveDown(1);

    const tableTop = doc.y;
    const columnPositions = {
      date: 50,
      orderId: 110,
      payment: 210,
      total: 270,
      final: 335,
      discount: 420,
      coupon: 480,
    };

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Date", columnPositions.date, tableTop);
    doc.text("Order ID", columnPositions.orderId, tableTop);
    doc.text("Payment", columnPositions.payment, tableTop);
    doc.text("TotalPrice", columnPositions.total, tableTop);
    doc.text("FinalAmount", columnPositions.final, tableTop);
    doc.text("Discount", columnPositions.discount, tableTop);
    doc.text("Coupon", columnPositions.coupon, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(570, tableTop + 15).stroke();
    doc.font("Helvetica").fontSize(10);

    let y = tableTop + 25;
    let totalPriceSum = 0, discountSum = 0, couponDiscountSum = 0, finalAmountSum = 0;

    for (let order of orders) {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      const discount = (order.discount || 0) + (order.couponDiscount || 0);
      const finalAmount = order.totalPrice - discount;

      totalPriceSum += order.totalPrice;
      discountSum += discount;
      couponDiscountSum += order.couponDiscount || 0;
      finalAmountSum += finalAmount;
      orderId= order.orderId.toString().slice(-8).toUpperCase()
     

      doc.text(new Date(order.createdOn).toLocaleDateString(), columnPositions.date, y);
      doc.fontSize(10).text(orderId, columnPositions.orderId, y, { width: 90 });
      doc.fontSize(10);
      doc.text(order.paymentMethod, columnPositions.payment, y);
      doc.text(order.totalPrice.toFixed(2), columnPositions.total, y);
      doc.text(finalAmount.toFixed(2), columnPositions.final, y);
      doc.text(discount.toFixed(2), columnPositions.discount, y);
      doc.text(order.couponUsed?.name || "N/A", columnPositions.coupon, y);

      y += 20;
    }

    if (y > 700) {
      doc.addPage();
      y = 50;
    }
 const totalOrders = orders.length;
    doc.moveDown(2).font("Helvetica-Bold").fontSize(12);
    doc.text("Summary", 50, y + 10);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Total Sales: ${totalPriceSum.toFixed(2)}`, 50, y + 30);
    doc.text(`Total Discount: ${discountSum.toFixed(2)}`, 50, y + 45);
    doc.text(`Total orders: ${totalOrders}`, 50, y + 60);
    doc.text(`Final Revenue: ${finalAmountSum.toFixed(2)}`, 50, y + 75);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating PDF report");
  }
};

module.exports = {
  downloadExcel,
  downloadPDF,
};

