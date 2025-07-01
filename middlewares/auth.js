const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
  const userId = req.session.user;

  if (!userId) {
    return res.redirect("/login");
  }

  User.findById(userId)
    .then((user) => {
      if (user && !user.isBlocked) {
        next();
      } else {
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
          }
          res.redirect("/login");
        });
      }
    })
    .catch((error) => {
      console.error("Error in userAuth middleware:", error);
      res.status(500).send("Internal server error");
    });
};

const adminAuth = async (req, res, next) => {
  try {
    const adminId = req.session.admin;

    if (!adminId) {
      return res.redirect("/admin/login");
    }

    const admin = await User.findOne({ _id: adminId, isAdmin: true }).lean();

    if (!admin) {
      return res.redirect("/admin/login");
    }

    next();
  } catch (error) {
    console.error("Error in admin auth middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  userAuth,
  adminAuth,
};
