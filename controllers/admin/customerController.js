const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const searchExp = new RegExp(search.trim(), "i");
    const limit = 5;
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex:searchExp } },
        { email: { $regex: searchExp } },
      ],
    })
    .sort({createdAt:-1})
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()
      .exec();

    countUsers = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    }).countDocuments();
    const totalPages = Math.ceil(countUsers / limit);
    res.render("customer-info", {
      userData,
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const customerBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/users");
  } catch (error) {
    res.redirect("/pageerror");
  }
};
const customerUnBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/users");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

module.exports = { customerInfo, customerBlocked, customerUnBlocked };
