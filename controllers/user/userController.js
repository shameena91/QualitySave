const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const nodeMailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Ledger = require("../../models/ledgerSchema");

const noDataFound = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user }).lean();
    res.render("no-data-found", { user: userData });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomePage = async (req, res) => {
  try {
    const userId = req.session.user;
    const categories = await Category.find({ isListed: true }).lean();
    let productDetails = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
    })
      .populate("brand")
      .populate("category")
      .lean();
    productDetails.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    productDetails = productDetails.slice(0, 5);

    if (userId) {
      const userData = await User.findOne({ _id: userId }).lean();
     
      res.render("userHome", { user: userData, products: productDetails });
    } else {
      return res.render("userHome", { products: productDetails, user: null });
    }
  } catch (error) {
    console.log("Home page not found");
    res.status(500).send("server error");
  }
};

const loadSignupPage = async (req, res) => {
  try {
    res.render("signUp");
  } catch (error) {
  
    res.status(500).send("server error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transport = nodeMailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const info = await transport.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account ",
      text: `Your OPT is ${otp}`,
      html: `<b>Your OTP: ${otp} </b>`,
    });
    console.log("Email send response:", info);
    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error sending Email", error);
    return false;
  }
}

function generateReferalCode(username) {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase(); 
  return `${username.slice(0, 4).toUpperCase()}${randomPart}`;
}

const userSignup = async (req, res) => {
  try {
    const { name, phone, email, password, cpassword, referalCode } = req.body;
    if (password != cpassword) {
      return res.render("signUp", { message: "password not matched" });
    }
  
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signUp", { message: "User already exists" });
    }
    const generatedReferralCode = generateReferalCode(name);

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.render("signUp", {
        message: "Failed to send OTP. Please try again.",
      });
      
    }
    req.session.userOtp = otp;
    req.session.userData = {
      email,
      password,
      name,
      phone,
      generatedReferralCode,
      referalCode,
    };
  
    res.render("otp-varify");
  } catch (error) {
    console.log("sighnup error", error);
    res.redirect("/pageNotFound");
    res.status(500).send("signserver Error");
  }
};

const securepassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("Error hashing password:", error);

    throw new Error("Password hashing failed");
  }
};

const varifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
   
    if (String(otp) === String(req.session.userOtp)) {
      const user = req.session.userData;
      const passwordHash = await securepassword(user.password);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
        referralCode: user.generatedReferralCode,
        referredBy: user.referalCode,
      });

      if (user.googleId) {
        userData.googleId = user.googleId;
      }
      await saveUserData.save();
   
      if (user.referalCode) {
        const findUser = await User.findOne({ referralCode: user.referalCode });
        if (findUser) {
          findUser.wallet = (findUser.wallet || 0) + 100;
          findUser.walletHistory = findUser.walletHistory || [];

          findUser.walletHistory.push({
            type: "credit",
            amount: 100,
            reason: `Referral reward from ${user.email}`,
            date: new Date(),
          });

          await Ledger.create({
            user: user._id,
            orderId: null,
            type: "debit",
            amount: 100,
            paymentMethod: "wallet",
            description: `Issued for referring ${findUser.email} by ${user.email}`,
          });
        }
        await findUser.save();
      }

      req.session.user = saveUserData._id;
      res.json({ success: true, redirectUrl: "/" });
    } else {
      console.log("mismatch", req.session.userOtp);
      res
        .status(400)
        .json({ success: false, message: "invalid OTP,Please Try again" });
    }
  } catch (error) {
    console.log("Error in varifying OTP", error);
    res.status(500).json({ success: false, message: "an error occured" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    const otp = generateOtp();
    req.session.userOtp = otp;
    const emailsent = await sendVerificationEmail(email, otp);
    if (emailsent) {
    
      res
        .status(200)
        .json({ success: true, message: "OTP resend successfully" });
    } else {
      res.status(500).json({
        success: false,
        message: "failed to  resend OTP.please try again",
      });
    }
  } catch (error) {
    console.error("Error resnding OTP");
    res.status(500).json({
      success: false,
      message: "Internal server error.Please try again later",
    });
  }
};

const loadLoginPage = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/PageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email });
    if (!findUser) {
      return res.render("login", { message: "user not found" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by admin" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      {
        return res.render("login", { message: "Invalid credentials" });
      }
    }
    req.session.user = findUser._id;
    res.redirect("/");
  } catch (error) {
    console.log("loginError", error);
    res.render("login", { message: "login Failed.please try again later" });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("session destruction error");
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    return res.redirect("/pageNotFound");
  }
};

const loadShopPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user }).lean();
    const categories = await Category.find({ isListed: true }).lean();

    const categoryIds = categories.map((category) => category._id.toString());
    const page = parseInt(req.query.page) || 1;
  
    const limit = 9;
    const skip = (page - 1) * limit;

    let products = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
    })
      .populate("brand")
      .populate("category")
      .sort({ createdAt: -1 })

      .skip(skip)
      .limit(limit)
      .lean();

    const totalProducts = await Product.countDocuments({
      isBlocked: false,
      category: { $in: categoryIds },
    });
    const totalPages = Math.ceil(totalProducts / limit);

    const brands = await Brand.find({ isBlocked: false }).lean();

    const categorieswithIds = categories.map((category) => ({
      _id: category._id,
      name: category.name,
    }));

    const productOffer = products.productOffer;

 

    if (req.query.clearFilters === "true") {
      req.session.filteredProducts = null;
    }

   
    res.render("shop", {
      user: userData,
      products: products,
      category: categorieswithIds,
      totalProducts: totalProducts,
      currentPage: page,
      brand: brands,
      totalPages: totalPages,
    });
  } catch (error) {
    return res.redirect("/pageNotFound");
  }
};
const filterProduct = async (req, res) => {
  try {
    const userId = req.session.user;
    const { category, brand, gt, lt, page } = req.query;

    const findUser = await User.findById(userId).lean();
    const categories = await Category.find({ isListed: true }).lean();
    const brands = await Brand.find({ isBlocked: false }).lean();

    const query = { isBlocked: false };

    if (category) query.category = category;
    if (brand) query.brand = brand;

    if (gt && lt) {
      query.discountedPrice = {
        $gt: parseInt(gt),
        $lt: parseInt(lt),
      };
    }

   let searchCat = null;
let searchBrand = null;
let catCount = null;
let brandCount = null;

if (category) {
  const findCategory = await Category.findById(category).lean();
  searchCat = findCategory?.name || null;
  catCount = await Product.countDocuments({ category, isBlocked: false });
}

if (brand) {
  const findBrand = await Brand.findById(brand).lean();
  searchBrand = findBrand?.brandName || null;
  brandCount = await Product.countDocuments({
    brand,
    isBlocked: false,
    ...(category && { category }), // only include category if present
  });
}



    let products = await Product.find(query)
      .populate("brand")
      .populate("category")
      .lean();

    if (!products || products.length === 0) {
      return res.redirect("/no-data-found");
    }

  
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const itemsPerPage = 6;
    const currentPage = parseInt(page) || 1;
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentProduct = products.slice(startIndex, startIndex + itemsPerPage);

    const selectedFilters = { category, brand, gt, lt };

    res.render("shop", {
      user: findUser,
      products: currentProduct,
      category: categories,
      brand: brands,
      totalPages,
      currentPage,
      count: products.length,
      selectedFilters,
      searchCat,
      searchBrand,
      brandCount,catCount
    });
  } catch (error) {
    console.error("Filter Product Error:", error.message);
    res.redirect("/pageNotfound");
  }
};

const searchProducts = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user }).lean();
    const search = req.body.query;

     const brands = await Brand.find({ isBlocked: false }).lean();
    const categories = await Category.find({ isListed: true }).lean();
    const categoryIds = categories.map((category) => category._id.toString());

    let searchResult = [];

    if (
      req.session.filteredProducts &&
      req.session.filteredProducts.length > 0
    ) {
      searchResult = req.session.filteredProducts.filter((product) =>
        product.productName.toLowerCase().includes(search.toLowerCase())
      );
    } else {
      searchResult = await Product.find({
        productName: { $regex: ".*" + search + ".*", $options: "i" },
        isBlocked: false,
        category: { $in: categoryIds },
      }).populate("brand")
      .populate("category")
      .lean();
    }

    if (!searchResult || searchResult.length === 0) {
      return res.redirect("/no-data-found");
    }

    searchResult.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const itemsPerPage = 6;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(searchResult.length / itemsPerPage);
    const currentProduct = searchResult.slice(startIndex, endIndex);

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      brand: brands,
      totalPages,
      currentPages: currentPage,
      count: searchResult.length,
      query: search,
    });
  } catch (error) {
    console.error("Search Product Error:", error);
    res.redirect("/pageNotFound");
  }
};

const sortProducts = async (req, res) => {
  try {
    const { sort, category, brand, gt, lt, page } = req.query;
    const userId = req.session.user;
    const userData = await User.findById(userId).lean();

    const categories = await Category.find({ isListed: true }).lean();
    const brands = await Brand.find({ isBlocked: false }).lean();

    
    const query = { isBlocked: false };
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (gt && lt) {
      query.discountedPrice = {
        $gt: parseInt(gt),
        $lt: parseInt(lt),
      };
    }


    let sortOption = {};
    if (sort === "asc") {
      sortOption = { discountedPrice: 1 };
    } else if (sort === "desc") {
      sortOption = { discountedPrice: -1 };
    } else if (sort === "az") {
      sortOption = { productName: 1 };
    } else if (sort === "za") {
      sortOption = { productName: -1 };
    }

    let products = await Product.find(query)
      .populate("brand")
      .populate("category")
      .collation({ locale: "en", strength: 2 }) 
      .sort(sortOption)
      .lean();

    if (!products || products.length === 0) {
      return res.redirect("/no-data-found");
    }


    const itemsPerPage = 9;
    const currentPage = parseInt(page) || 1;
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentProducts = products.slice(startIndex, startIndex + itemsPerPage);

    const selectedFilters = { category, brand, gt, lt };

    res.render("shop", {
      user: userData,
      products: currentProducts,
      brand: brands,
      category: categories,
      totalPages,
      currentPage,
      count: products.length,
      sort,
      selectedFilters,
      
    });
  } catch (error) {
    console.error("Sort Product Error:", error.message);
    res.redirect("/pageNotfound");
  }
};


module.exports = {
  loadHomePage,
  pageNotFound,
  loadSignupPage,
  varifyOtp,
  userSignup,
  resendOtp,
  loadLoginPage,
  login,
  logout,
  loadShopPage,
  filterProduct,
 

  searchProducts,
  noDataFound,
  sortProducts,
};
