const express=require('express')

const router=express.Router();
const userController=require('../controllers/user/userController');
const productController=require('../controllers/user/productController')
const profileController=require('../controllers/user/profileController')



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
router.get("/",userAuth,userController.loadHomePage)
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






module.exports=router