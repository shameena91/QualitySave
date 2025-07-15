const Ledger = require("../../models/ledgerSchema");

const getLedger = async (req, res) => {
  try {
    const { type, fromDate, toDate, page } = req.query;

    const currentPage = parseInt(page) || 1;
    const itemsPerPage = 10;
    const skip = (currentPage - 1) * itemsPerPage;

    const filter = {};

    if (type && type !== "all") {
      filter.type = type;
    }

    if (fromDate && toDate) {
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      endDate.setHours(23, 59, 59, 999);

      filter.date = { $gte: startDate, $lte: endDate };
    }

    const ledgerEntries = await Ledger.find(filter)
      .populate("user")
      .sort({ date: -1 })
      .skip(skip)

      .limit(itemsPerPage)
      .lean();

    const totalCount = await Ledger.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const allMatchingEntries = await Ledger.find(filter).lean();

    let totalSales = 0;
    let totalRefunds = 0;

    for (const entry of allMatchingEntries) {
      if (entry.type === "credit") {
        totalSales += entry.amount;
      } else if (entry.type === "debit") {
        totalRefunds += entry.amount;
      }
    }

    const totalRevenue = totalSales - totalRefunds;
 
    res.render("ledger", {
      ledgerEntries,
      currentPage,
      totalPages,
      typeFilter: type || "all",
      fromDate,
      toDate,
      totalRefunds,
      totalSales,
      totalRefunds,
      totalRevenue,
    });
  } catch (error) {
    console.error("Error fetching ledger:", error);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getLedger,
};
