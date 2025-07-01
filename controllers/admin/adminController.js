const { ObjectId } = require("mongodb");
const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");
const pageError = async (req, res) => {
  res.render("admin-error");
};

const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  console.log("loginpage");
  res.render("admin-login", { message: null });
};

const login = async (req, res) => {
  try {
    console.log("login reached");
    const { email, password } = req.body;
    console.log(email);
    console.log(password);

    const admin = await User.findOne({ email: email, isAdmin: true });
    console.log(admin);
    if (admin) {
      const passwordmatch = await bcrypt.compare(password, admin.password);
      if (passwordmatch) {
        req.session.admin = admin._id;
        console.log("succedd");
        return res.redirect("/admin/dashboard");
      } else {
        console.log("error");
        return redirect("/admin-login");
      }
    }
  } catch (error) {
    console.log("login failed", error);
    return res.redirect("/pageerror");
  }
};
const adminlogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error occured destroying session", err);
        return res.redirect("/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log("unexpected error during logout");
    res.redirect("/pageerror");
  }
};

const getTopproducts = async () => {
  return await Order.aggregate([
    { $unwind: "$orderItems" },
    { $match: { "orderItems.status": { $ne: "Cancelled" } } },

    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },

    {
      $addFields: {
        "productDetails.categoryObjId": {
          $toObjectId: "$productDetails.category",
        },
      },
    },

    {
      $lookup: {
        from: "categories",
        localField: "productDetails.categoryObjId",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    { $unwind: "$categoryDetails" },

    {
      $group: {
        _id: "$productDetails._id",
        name: { $first: "$productDetails.productName" },
        category: { $first: "$categoryDetails.name" },
        price: { $first: "$orderItems.price" },
        totalSales: { $sum: "$orderItems.price" },
        sold: { $sum: "$orderItems.quantity" },
      },
    },
    { $sort: { sold: -1 } },
    { $limit: 10 },
  ]);
};

const getCategories = async () => {
  return await Order.aggregate([
    { $unwind: "$orderItems" },
    { $match: { "orderItems.status": { $ne: "Cancelled" } } },

    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },

    {
      $addFields: {
        "productDetails.categoryObjId": {
          $toObjectId: "$productDetails.category",
        },
      },
    },

    {
      $lookup: {
        from: "categories",
        localField: "productDetails.categoryObjId", // use converted ObjectId
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    { $unwind: "$categoryDetails" },

    {
      $group: {
        _id: "$categoryDetails._id",
        name: { $first: "$categoryDetails.name" },
        productsSold: { $sum: "$orderItems.quantity" },

        totalSalesAmount: {
          $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
        },
        productIds: { $addToSet: "$productDetails._id" },
      },
    },
    {
      $addFields: {
        numberOfProducts: { $size: "$productIds" },
      },
    },

    { $sort: { productsSold: -1 } },
    { $limit: 10 },
  ]);
};
const getTopBrands = async () => {
  return await Order.aggregate([
    { $unwind: "$orderItems" },
    { $match: { "orderItems.status": { $ne: "Cancelled" } } },

    {
      $lookup: {
        from: "products",
        localField: "orderItems.product",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $addFields: {
        "productDetails.brandObjId": {
          $toObjectId: "$productDetails.brand",
        },
      },
    },

    {
      $lookup: {
        from: "brands",
        localField: "productDetails.brandObjId",
        foreignField: "_id",
        as: "brandDetails",
      },
    },
    { $unwind: "$brandDetails" },
    {
      $group: {
        _id: "$brandDetails._id",
        name: { $first: "$brandDetails.brandName" },
        productsSold: { $sum: "$orderItems.quantity" },

        totalSalesAmount: {
          $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
        },
        productIds: { $addToSet: "$productDetails._id" },
      },
    },
    {
      $addFields: {
        numberOfProducts: { $size: "$productIds" },
      },
    },
    { $sort: { productsSold: -1 } },
    { $limit: 10 },
  ]);
};

const loadDashboard = async (req, res) => {
  try {
    const {
      reportType,
      fromDate,
      toDate,
      paymentMethod,
      status,
      search,

      page,
    } = req.query;


    const currentPage = parseInt(page) || 1;
    const itemsPerPage = 10;
    const skip = (currentPage - 1) * itemsPerPage;
    const filter = {};

    if (paymentMethod && paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod;
    }

    let startDate, endDate;
    const now = new Date();

    switch (reportType) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - 7));
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
          endDate = new Date(toDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
    }

    if (startDate && endDate) {
      filter.createdOn = { $gte: startDate, $lte: endDate };
    }

    let orders = await Order.find(filter)
      .populate("couponUsed")
      .populate("userId")
      .sort({ createdOn: -1 })
      .lean();
    console.log(orders);
    if (search) {
      orders = orders.filter((order) =>
        order.orderId.toLowerCase().includes(search.toLowerCase())
      );
    }

    const totalOrders = orders.length;
    let totalSales = 0,
      totalDiscount = 0,
      totalCouponDiscount = 0;

    orders.forEach((order) => {
      totalSales += order.totalPrice || 0;
      totalDiscount += order.discount || 0;
      totalCouponDiscount += Number(order.couponDiscount ?? 0);
    });

    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const paginatedOrders = orders.slice(skip, skip + itemsPerPage);

    const topProducts = await getTopproducts();
    const topCategories = await getCategories();
    const topBrands = await getTopBrands();
    console.log("hhhhh", topProducts);
    const shipcharge = orders.shipping;

    const orderStatusList = orders.map((order) => {
      const statusList = order.orderItems.map((item) => item.status);

      if (
        statusList.some((status) =>
          ["Pending", "Processing", "Shipped"].includes(status)
        )
      ) {
        return "Pending";
      } else if (statusList.every((status) => status === "Cancelled")) {
        return "Cancelled";
      } else if (statusList.every((status) => status === "Returned")) {
        return "Returned";
      } else {
        return "Complete";
      }
    });

    return res.render("dashboard", {
      totalOrders,
      orderStatusList,
      totalSale: totalSales.toLocaleString(),
      totalDiscount: totalDiscount.toLocaleString(),
      totalCouponDiscount: totalCouponDiscount.toLocaleString(),
      orders: paginatedOrders,
      filterData: req.query,
      totalPages,
      currentPage,
      topProducts,
      topCategories,
      topBrands,
      shipcharge,
      search,
      
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

function getGroupAndDateFormat(chartReportType) {
  let groupId;
  let dateFormat;

  switch (chartReportType) {
    case "daily":
      groupId = {
        year: { $year: "$createdOn" },
        month: { $month: "$createdOn" },
        day: { $dayOfMonth: "$createdOn" },
      };
      dateFormat = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdOn" },
      };
      break;

    case "monthly":
      groupId = {
        year: { $year: "$createdOn" },
        month: { $month: "$createdOn" },
      };
      dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdOn" } };
      break;
    case "weekly":
      groupId = {
        year: { $isoWeekYear: "$createdOn" },
        week: { $isoWeek: "$createdOn" },
      };
      dateFormat = {
        $concat: [
          { $toString: { $isoWeekYear: "$createdOn" } },
          "-W",
          {
            $cond: {
              if: { $lte: [{ $isoWeek: "$createdOn" }, 9] },
              then: {
                $concat: ["0", { $toString: { $isoWeek: "$createdOn" } }],
              },
              else: { $toString: { $isoWeek: "$createdOn" } },
            },
          },
        ],
      };
      break;

    case "yearly":
      groupId = {
        year: { $year: "$createdOn" },
      };
      dateFormat = { $dateToString: { format: "%Y", date: "$createdOn" } };
      break;

    default:
      groupId = {
        year: { $year: "$createdOn" },
        month: { $month: "$createdOn" },
        day: { $dayOfMonth: "$createdOn" },
      };
      dateFormat = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdOn" },
      };
  }

  return { groupId, dateFormat };
}

const loadchartData = async (req, res) => {
  try {
    const {
      chartReportType = "daily",
      fromDate,
      toDate,
      paymentMethod,
    } = req.query;

    const filter = {};

    if (paymentMethod && paymentMethod !== "all") {
      filter.paymentMethod = paymentMethod;
    }

    if (fromDate && toDate) {
      filter.createdOn = {
        $gte: new Date(fromDate),
        $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
      };
    }

    const { groupId, dateFormat } = getGroupAndDateFormat(chartReportType);

    const chartAggregation = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: groupId,
          totalSales: { $sum: "$totalPrice" },
          count: { $sum: 1 },
          date: { $first: dateFormat },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } },
    ]);

    let chartLabels = [];
    let chartData = [];

    if (chartReportType === "monthly") {
      const year = new Date().getFullYear();

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Ju",
        "Aug",
        "Sept",
        "Oct",
        "Nov",
        "Dec",
      ];

      chartLabels = monthNames.map((m) => `${m}`);

      const salesMap = new Map(
        chartAggregation.map((item) => [item._id.month, item.totalSales])
      );

      chartData = [];
      for (let m = 1; m <= 12; m++) {
        chartData.push(salesMap.get(m) || 0);
      }
    } else if (chartReportType === "yearly") {
      const startYear = 2021;
      const endYear = new Date().getFullYear();

      chartLabels = [];
      for (let y = startYear; y <= endYear; y++) {
        chartLabels.push(`${y}`);
      }

      const salesMap = new Map(
        chartAggregation.map((item) => [item.date, item.totalSales])
      );

      chartData = chartLabels.map((label) => salesMap.get(label) || 0);
    } else {
      chartLabels = chartAggregation.map((item) => item.date);
      chartData = chartAggregation.map((item) => item.totalSales);
    }
    res.json({ labels: chartLabels, data: chartData });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: "Failed to load chart data" });
  }
};

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageError,
  adminlogout,
  loadchartData,
};
