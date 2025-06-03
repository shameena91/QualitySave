const Ledger = require("../../models/ledgerSchema");

const getLedger = async (req, res) => {
  try {
    const { type, fromDate, toDate, page } = req.query;
    
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = 10;
    const skip = (currentPage - 1) * itemsPerPage;

    const filter = {};

    // Filter by type if provided and not 'all'
    if (type && type !== 'all') {
      filter.type = type;
    }

    // Filter by date range if both fromDate and toDate are provided
    if (fromDate && toDate) {
      // Convert strings to Date objects
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      // Adjust endDate to include the whole day (optional)
      endDate.setHours(23, 59, 59, 999);

      filter.createdOn = { $gte: startDate, $lte: endDate };
    }

    // Fetch ledger entries with pagination and filter
    const ledgerEntries = await Ledger.find(filter)
    .populate("user")
      .sort({ createdOn: -1 })  // latest first
      .skip(skip)

      .limit(itemsPerPage)
      .lean();



    // Count total filtered documents for pagination
    const totalCount = await Ledger.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / itemsPerPage);



       const allMatchingEntries = await Ledger.find(filter).lean();

    let totalSales = 0;
    let totalRefunds = 0;

    for (const entry of allMatchingEntries) {
      if (entry.type === 'credit') {
        totalSales += entry.amount;
      } else if (entry.type === 'debit') {
        totalRefunds += entry.amount;
      }
    }

    const totalRevenue = totalSales - totalRefunds;
console.log(ledgerEntries)
    // Render ledger page with data
    res.render('ledger', {
      ledgerEntries,
      currentPage,
      totalPages,
      typeFilter: type || 'all',
      fromDate,
      toDate,
      totalRefunds,
      totalSales,
      totalRefunds,
      totalRevenue
    });

  } catch (error) {
    console.error("Error fetching ledger:", error);
    res.status(500).send("Server Error");
  }
};


module.exports={
    getLedger
}