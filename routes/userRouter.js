const express=require('express')

const router=express.Router();
const userController=require('../controllers/user/userController');
const productController=require('../controllers/user/productController')
const profileController=require('../controllers/user/profileController')
const addressController=require('../controllers/user/addressController')
const wishlistController=require('../controllers/user/wishlistController')
const cartController=require('../controllers/user/cartController')
const multer=require("multer")
const storage=require("../helpers/multer")
const uploads=multer({storage:storage})
const passport = require('passport');
const { userAuth } = require('../middlewares/auth');



router.get("/pageNotFound",userController.pageNotFound)
router.get("/no-data-found",userController.noDataFound)

router
  .route('/sign-up')
  .get(userController.loadSignupPage)
  .post(userController.userSignup);

router
    .route('/otp-varify')
    .post(userController.varifyOtp)

router
    .route('/resend-otp')
    .post(userController.resendOtp)

// home and shopping
router.get("/",userController.loadHomePage)
router.get("/shop",userAuth,userController.loadShopPage)
router.get("/filter",userAuth,userController.filterProduct)
router.get("/filterPrice",userAuth,userController.filterByPrice)
router.post("/search",userAuth,userController.searchProducts)
router.get("/sort",userAuth,userController.sortProducts)


router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

router.get('/auth/google/callback',passport
    .authenticate('google',{failureRedirect:'/signUp'}),(req,res)=>{res.redirect("/")})

router.get("/login",userController.loadLoginPage)
router.post("/login",userController.login)
router.get("/logout",userController.logout)


router
.route("/forgotPassword")
.get(profileController.loadForgotPassword)
.post(profileController.forgotPassword)

router.post("/forgetPass-varifyOtp",profileController.forgotPassVarifyOtp)
router.route("/resetPassword")
.get(profileController.getResetPassPage)
.post(profileController.resetPassword)

router.get("/resendForgotOTP",profileController.resendForgotPass)


router.get("/productDetails/:id",userAuth,productController.productInfo)


router.get("/user-profile",userAuth,profileController.userProfile)
router.patch('/user-profile',userAuth,uploads.single("image"), profileController.editUserProfile)
router.delete("/user-profile/:id",userAuth,profileController.deleteProfileImage)


router.get("/change-email",userAuth,profileController.getChangeEmail)
router.post("/change-email",userAuth,profileController.varifyChangeEmail)
router.post("/varify-email-otp",userAuth,profileController.varifyEmailOtp)
router.post("/update-email",userAuth,profileController.updateEmail)


router.get("/change-password",userAuth,profileController.getChangePwd)
router.post("/change-password",userAuth,profileController.varifyChangePswd)
router.post("/varify-pswd-otp",userAuth,profileController.varifyPswdOtp)

              

router.get("/manage-address",userAuth,addressController.getAddress)
router.get("/add-address",userAuth,addressController.getAddAddress)
router.post("/add-address",userAuth,addressController.addAddress)

router.get("/edit-address/:id",userAuth,addressController.editAddressPage)
router.post("/edit-address/:id",userAuth,addressController.updateAddress)
router.delete("/delete-address/:id",userAuth,addressController.deleteAddress)

// wishlistManagement

router.get("/wishlist",userAuth,wishlistController.getWishlist)
router.post("/addToWishlist",userAuth,wishlistController.addToWishlist)
router.delete("/delete-wishlistItem/:id",wishlistController.removeWishlistItem)

// cart management

router.route("/cart")
.get(userAuth,cartController.getCart)
router.post("/addToCart",userAuth,cartController.addToCart)
router.post('/updateCart',userAuth,cartController.updateCart)
router.post('/removeItem',userAuth,cartController.removeCartItem)


module.exports=router