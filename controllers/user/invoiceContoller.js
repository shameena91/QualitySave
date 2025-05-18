
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");


const fs = require('fs').promises;
const path = require('path');
const hbs = require('express-handlebars').create();
const puppeteer = require('puppeteer');

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId=req.params.productId
    const order = await Order.findOne({ orderId: orderId })
      .populate('orderItems.product')
      .populate('userId')
      .lean();

    if (!order) {
      return res.status(404).send('Order not found');
    }
console.log(order)
    // Read the Handlebars template file
    const templatePath = path.join(__dirname,'../../views/user/invoice.hbs');
    console.log(templatePath)
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Compile the template
    const template = hbs.handlebars.compile(templateContent);
const orderDate=order.createdOn.toLocaleDateString()

const orderProduct = order.orderItems.filter(item => 
    item.status === "Delivered");

console.log(orderProduct)
const products=orderProduct.map(item=>({
    productName:item.product?.productName,
    quantity:item.quantity,
    price:item.price,
    total:item.quantity * item.price

}))

    // Generate HTML with order data
    const html = template({
        order,
        orderDate,
       products
       
    });

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // helpful in some environments
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px' },
    });

    await browser.close();

    // Set response headers and send PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice_${orderId}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).send('Error generating PDF');
  }
};

module.exports={
    downloadInvoice
}